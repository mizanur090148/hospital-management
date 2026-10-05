<?php

namespace App\Modules\HR\Http\Controllers;

use App\Core\Enums\AttendanceStatus;
use App\Core\Enums\LeaveStatus;
use App\Core\Enums\LeaveType;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Auth\Models\User;
use App\Modules\HR\Models\LeaveRequest;
use App\Modules\HR\Models\StaffAttendance;
use App\Modules\Tenancy\Models\Branch;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    /**
     * Display the hospital attendance tracker and leave management board.
     */
    public function index(Request $request): Response
    {
        $date = $request->input('date', now()->toDateString());
        $branchId = $request->input('branch_id');

        $query = StaffAttendance::with(['user', 'branch'])
            ->where('attendance_date', $date)
            ->orderBy('clock_in', 'asc');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $attendances = $query->get();

        // Leave Requests
        $leaveRequests = LeaveRequest::with(['user', 'approver'])
            ->latest('created_at')
            ->limit(50)
            ->get();

        $branches = Branch::where('is_active', true)->orderBy('name')->get();
        $staffMembers = User::whereIn('user_type', ['doctor', 'nurse', 'pharmacist', 'laboratorian', 'radiologist', 'staff', 'hospital_admin'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'user_type', 'branch_id']);

        // Quick statistics for the selected date
        $totalStaff = $staffMembers->count();
        $presentCount = $attendances->where('status', AttendanceStatus::Present)->count();
        $lateCount = $attendances->where('status', AttendanceStatus::Late)->count();
        $pendingLeaves = $leaveRequests->where('status', LeaveStatus::Pending)->count();

        return Inertia::render('HR/AttendanceIndex', [
            'attendances' => $attendances,
            'leaveRequests' => $leaveRequests,
            'branches' => $branches,
            'staffMembers' => $staffMembers,
            'stats' => [
                'total_staff' => $totalStaff,
                'present_count' => $presentCount,
                'late_count' => $lateCount,
                'pending_leaves' => $pendingLeaves,
            ],
            'filters' => [
                'date' => $date,
                'branch_id' => $branchId,
            ],
            'leaveTypes' => array_column(LeaveType::cases(), 'value'),
            'attendanceStatuses' => array_column(AttendanceStatus::cases(), 'value'),
        ]);
    }

    /**
     * Record a staff clock-in event.
     */
    public function clockIn(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'clock_in' => ['nullable', 'string'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId();
        $user = User::find($validated['user_id']);
        $branchId = $validated['branch_id'] ?? app(TenantContext::class)->getBranchId() ?? $user?->branch_id ?? Branch::where('tenant_id', $tenantId)->first()?->id;

        $now = ! empty($validated['clock_in'])
            ? Carbon::parse(now()->toDateString().' '.$validated['clock_in'])
            : now();
        $date = $now->toDateString();

        // Check if attendance record already exists for today
        $attendance = StaffAttendance::firstOrNew([
            'tenant_id' => $tenantId,
            'user_id' => $validated['user_id'],
            'attendance_date' => $date,
        ]);

        if ($attendance->clock_in) {
            return back()->withErrors(['user_id' => 'Staff member has already clocked in for today.']);
        }

        // Determine if LATE (e.g. clock-in past 09:15 AM)
        $status = AttendanceStatus::Present;
        if ($now->format('H:i') > '09:15') {
            $status = AttendanceStatus::Late;
        }

        $attendance->fill([
            'branch_id' => $branchId,
            'clock_in' => $now,
            'status' => $status,
            'verification_method' => 'WEB',
            'notes' => $validated['notes'] ?? $attendance->notes,
        ])->save();

        return back()->with('success', 'Staff clocked in successfully.');
    }

    /**
     * Record a staff clock-out event and calculate working hours.
     */
    public function clockOut(Request $request, string $id): RedirectResponse
    {
        $attendance = StaffAttendance::findOrFail($id);

        if (! $attendance->clock_in) {
            return back()->withErrors(['error' => 'Cannot clock out without an active clock-in.']);
        }

        $attDate = $attendance->attendance_date instanceof \DateTimeInterface
            ? $attendance->attendance_date->format('Y-m-d')
            : (string) $attendance->attendance_date;

        $clockOutTime = $request->filled('clock_out')
            ? Carbon::parse($attDate.' '.$request->input('clock_out'))
            : now();

        $attendance->clock_out = $clockOutTime;

        $totalMinutes = Carbon::parse($attendance->clock_in)->diffInMinutes($clockOutTime);
        $totalHours = round($totalMinutes / 60, 2);
        $attendance->total_hours = $totalHours;

        // Overtime beyond 8 hours standard shift
        if ($totalHours > 8.00) {
            $attendance->overtime_hours = round($totalHours - 8.00, 2);
        }

        $attendance->save();

        return back()->with('success', "Clocked out successfully. Total shift duration: {$totalHours} hrs.");
    }

    /**
     * Submit a staff leave request.
     */
    public function storeLeave(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'leave_type' => ['required', 'string', 'in:ANNUAL,SICK,CASUAL,MATERNITY,PATERNITY,UNPAID'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId();
        $start = Carbon::parse($validated['start_date']);
        $end = Carbon::parse($validated['end_date']);
        $totalDays = $start->diffInDays($end) + 1;

        LeaveRequest::create([
            'tenant_id' => $tenantId,
            'user_id' => $validated['user_id'],
            'leave_type' => $validated['leave_type'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'total_days' => $totalDays,
            'reason' => $validated['reason'],
            'status' => LeaveStatus::Pending,
        ]);

        return back()->with('success', 'Leave application submitted for approval.');
    }

    /**
     * Approve or reject a staff leave request.
     */
    public function reviewLeave(Request $request, string $id): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:APPROVED,REJECTED'],
            'rejection_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $leave = LeaveRequest::findOrFail($id);
        $currentUser = $request->user();

        $leave->update([
            'status' => $validated['status'],
            'approved_by_user_id' => $currentUser?->id,
            'approved_at' => now(),
            'rejection_reason' => $validated['rejection_reason'] ?? null,
        ]);

        return back()->with('success', "Leave request has been {$validated['status']}.");
    }
}
