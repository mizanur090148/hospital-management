<?php

namespace App\Modules\HR\Http\Controllers;

use App\Core\Enums\RosterStatus;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Department;
use App\Modules\HR\Models\ShiftTemplate;
use App\Modules\HR\Models\StaffRoster;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RosterController extends Controller
{
    /**
     * Display the hospital duty roster and shift planning workstation.
     */
    public function index(Request $request): Response
    {
        $startDate = $request->input('start_date', now()->startOfWeek()->toDateString());
        $endDate = $request->input('end_date', now()->endOfWeek()->toDateString());
        $departmentId = $request->input('department_id');
        $branchId = $request->input('branch_id');

        $query = StaffRoster::with([
            'user',
            'shiftTemplate',
            'department',
            'branch',
        ])
            ->whereBetween('duty_date', [$startDate, $endDate])
            ->orderBy('duty_date')
            ->orderBy('created_at');

        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $rosters = $query->get();

        $shiftTemplates = ShiftTemplate::where('is_active', true)->orderBy('start_time')->get();
        $departments = Department::where('is_active', true)->orderBy('name')->get();
        $branches = Branch::where('is_active', true)->orderBy('name')->get();

        // Eligible staff users (Doctors, Nurses, Pharmacists, Lab Techs, Staff)
        $staffMembers = User::whereIn('user_type', ['doctor', 'nurse', 'pharmacist', 'laboratorian', 'radiologist', 'staff', 'hospital_admin'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'user_type', 'department_id', 'branch_id']);

        return Inertia::render('HR/RosterIndex', [
            'rosters' => $rosters,
            'shiftTemplates' => $shiftTemplates,
            'departments' => $departments,
            'branches' => $branches,
            'staffMembers' => $staffMembers,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'department_id' => $departmentId,
                'branch_id' => $branchId,
            ],
            'rosterStatuses' => array_column(RosterStatus::cases(), 'value'),
        ]);
    }

    /**
     * Create a new shift template (e.g. Morning, Evening, Night Emergency, On-Call).
     */
    public function storeTemplate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:50'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            'break_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId();

        ShiftTemplate::create([
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'break_minutes' => $validated['break_minutes'] ?? 60,
            'color' => $validated['color'] ?? 'cyan',
            'is_active' => true,
        ]);

        return back()->with('success', "Shift template '{$validated['name']}' created successfully.");
    }

    /**
     * Schedule a staff member onto a duty shift.
     */
    public function storeRoster(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId();
        $currentBranchId = app(TenantContext::class)->getBranchId();

        $validated = $request->validate([
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'department_id' => ['required', 'uuid', 'exists:departments,id'],
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'shift_template_id' => ['required', 'uuid', 'exists:shift_templates,id'],
            'duty_date' => ['required', 'date'],
            'role_title' => ['nullable', 'string', 'max:100'],
            'room_or_station' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::find($validated['user_id']);
        $branchId = $validated['branch_id'] ?? $currentBranchId ?? $user?->branch_id ?? Branch::where('tenant_id', $tenantId)->first()?->id;
        $roleTitle = $validated['room_or_station'] ?? $validated['role_title'] ?? ($user ? ucfirst(str_replace('_', ' ', $user->user_type->value ?? 'staff')) : 'Staff Member');

        // Prevent double booking on identical shift and date
        $exists = StaffRoster::where('tenant_id', $tenantId)
            ->where('user_id', $validated['user_id'])
            ->where('duty_date', $validated['duty_date'])
            ->where('shift_template_id', $validated['shift_template_id'])
            ->exists();

        if ($exists) {
            return back()->withErrors(['user_id' => 'Staff member is already scheduled for this shift on this date.']);
        }

        StaffRoster::create([
            'tenant_id' => $tenantId,
            'branch_id' => $branchId,
            'department_id' => $validated['department_id'],
            'user_id' => $validated['user_id'],
            'shift_template_id' => $validated['shift_template_id'],
            'duty_date' => $validated['duty_date'],
            'role_title' => $roleTitle,
            'status' => RosterStatus::Scheduled,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Staff shift scheduled successfully.');
    }

    /**
     * Update the status of a duty roster slot.
     */
    public function updateStatus(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:SCHEDULED,COMPLETED,ABSENT,SWAPPED,CANCELLED'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $roster = StaffRoster::findOrFail($id);
        $roster->update([
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? $roster->notes,
        ]);

        return back()->with('success', "Shift status updated to {$validated['status']}.");
    }
}
