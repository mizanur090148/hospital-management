<?php

namespace App\Modules\Facility\Http\Controllers;

use App\Core\Enums\BedStatus;
use App\Core\Enums\DepartmentType;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Facility\Models\Bed;
use App\Modules\Facility\Models\Department;
use App\Modules\Facility\Models\Room;
use App\Modules\Facility\Models\Ward;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FacilityController extends Controller
{
    public function index(Request $request, TenantContext $context): Response
    {
        $tenant = $context->getTenant();
        if (! $tenant) {
            abort(404, 'No active hospital tenant found.');
        }

        $activeBranch = $context->getBranch();

        // 1. Branches
        $branches = $tenant->branches()
            ->withCount(['departments', 'wards'])
            ->orderByDesc('is_main')
            ->orderBy('name')
            ->get();

        // 2. Departments
        $departmentsQuery = Department::with(['branch:id,name,code', 'headUser:id,name,email'])
            ->withCount(['wards', 'users']);

        if ($activeBranch) {
            $departmentsQuery->where(function ($q) use ($activeBranch) {
                $q->where('branch_id', $activeBranch->id)
                    ->orWhereNull('branch_id');
            });
        }
        $departments = $departmentsQuery->orderBy('name')->get();

        // 3. Wards, Rooms & Beds Live Tracker
        $wardsQuery = Ward::with([
            'branch:id,name,code',
            'department:id,name,code',
            'rooms.beds',
        ]);

        if ($activeBranch) {
            $wardsQuery->where('branch_id', $activeBranch->id);
        }
        $wards = $wardsQuery->orderBy('name')->get();

        // 4. Live Bed Metrics
        $totalBeds = Bed::count();
        $availableBeds = Bed::where('status', BedStatus::Available)->count();
        $occupiedBeds = Bed::where('status', BedStatus::Occupied)->count();
        $cleaningBeds = Bed::where('status', BedStatus::Cleaning)->count();
        $maintenanceBeds = Bed::where('status', BedStatus::Maintenance)->count();
        $occupancyRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 1) : 0;

        return Inertia::render('Facility/Index', [
            'branches' => $branches,
            'departments' => $departments,
            'wards' => $wards,
            'metrics' => [
                'totalBeds' => $totalBeds,
                'availableBeds' => $availableBeds,
                'occupiedBeds' => $occupiedBeds,
                'cleaningBeds' => $cleaningBeds,
                'maintenanceBeds' => $maintenanceBeds,
                'occupancyRate' => $occupancyRate,
            ],
            'departmentTypes' => array_map(fn ($type) => [
                'value' => $type->value,
                'label' => $type->label(),
            ], DepartmentType::cases()),
            'bedStatuses' => array_map(fn ($status) => [
                'value' => $status->value,
                'label' => $status->label(),
                'variant' => $status->badgeVariant(),
            ], BedStatus::cases()),
        ]);
    }

    public function storeBranch(Request $request, TenantContext $context): RedirectResponse
    {
        $tenant = $context->getTenant();
        if (! $tenant) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:16', 'alpha_dash'],
            'phone' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'address' => ['nullable', 'array'],
            'is_main' => ['boolean'],
        ]);

        $code = Str::upper($validated['code']);

        if (Branch::where('tenant_id', $tenant->id)->where('code', $code)->exists()) {
            return back()->with('error', "A branch with code [{$code}] already exists in this hospital.");
        }

        if (! empty($validated['is_main'])) {
            Branch::where('tenant_id', $tenant->id)->update(['is_main' => false]);
        }

        Branch::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'code' => $code,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? [],
            'is_main' => $validated['is_main'] ?? false,
            'is_active' => true,
        ]);

        return back()->with('success', "Branch [{$validated['name']}] created successfully.");
    }

    public function storeDepartment(Request $request, TenantContext $context): RedirectResponse
    {
        $tenant = $context->getTenant();
        if (! $tenant) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:32', 'alpha_dash'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'department_type' => ['required', 'string'],
            'description' => ['nullable', 'string'],
            'head_user_id' => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $code = Str::upper($validated['code']);

        if (Department::where('tenant_id', $tenant->id)->where('code', $code)->exists()) {
            return back()->with('error', "A department with code [{$code}] already exists.");
        }

        Department::create([
            'tenant_id' => $tenant->id,
            'branch_id' => $validated['branch_id'] ?? null,
            'name' => $validated['name'],
            'code' => $code,
            'department_type' => $validated['department_type'],
            'description' => $validated['description'] ?? null,
            'head_user_id' => $validated['head_user_id'] ?? null,
            'is_active' => true,
        ]);

        return back()->with('success', "Department [{$validated['name']}] created successfully.");
    }

    public function storeWard(Request $request, TenantContext $context): RedirectResponse
    {
        $tenant = $context->getTenant();
        if (! $tenant) {
            abort(404);
        }

        $validated = $request->validate([
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:32', 'alpha_dash'],
            'ward_type' => ['required', 'string'],
            'gender_allowed' => ['required', 'string', 'in:any,male,female'],
            'floor' => ['nullable', 'string', 'max:64'],
        ]);

        $code = Str::upper($validated['code']);

        Ward::create([
            'tenant_id' => $tenant->id,
            'branch_id' => $validated['branch_id'],
            'department_id' => $validated['department_id'] ?? null,
            'name' => $validated['name'],
            'code' => $code,
            'ward_type' => $validated['ward_type'],
            'gender_allowed' => $validated['gender_allowed'],
            'floor' => $validated['floor'] ?? null,
            'is_active' => true,
        ]);

        return back()->with('success', "Ward [{$validated['name']}] created successfully.");
    }

    public function storeRoom(Request $request, TenantContext $context): RedirectResponse
    {
        $tenant = $context->getTenant();
        if (! $tenant) {
            abort(404);
        }

        $validated = $request->validate([
            'ward_id' => ['required', 'uuid', 'exists:wards,id'],
            'room_number' => ['required', 'string', 'max:32'],
            'room_type' => ['required', 'string'],
        ]);

        Room::create([
            'tenant_id' => $tenant->id,
            'ward_id' => $validated['ward_id'],
            'room_number' => $validated['room_number'],
            'room_type' => $validated['room_type'],
            'is_active' => true,
        ]);

        return back()->with('success', "Room [{$validated['room_number']}] added.");
    }

    public function storeBed(Request $request, TenantContext $context): RedirectResponse
    {
        $tenant = $context->getTenant();
        if (! $tenant) {
            abort(404);
        }

        $validated = $request->validate([
            'room_id' => ['required', 'uuid', 'exists:rooms,id'],
            'bed_number' => ['required', 'string', 'max:32'],
            'bed_type' => ['required', 'string'],
            'daily_rate' => ['required', 'numeric', 'min:0'],
        ]);

        Bed::create([
            'tenant_id' => $tenant->id,
            'room_id' => $validated['room_id'],
            'bed_number' => $validated['bed_number'],
            'bed_type' => $validated['bed_type'],
            'daily_rate' => $validated['daily_rate'],
            'status' => BedStatus::Available,
            'is_active' => true,
        ]);

        return back()->with('success', "Bed [{$validated['bed_number']}] provisioned and marked Available.");
    }

    public function updateBedStatus(Request $request, Bed $bed): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:available,occupied,reserved,cleaning,maintenance'],
        ]);

        $bed->update(['status' => $validated['status']]);

        return back()->with('success', "Bed [{$bed->bed_number}] status changed to ".ucfirst($validated['status']).'.');
    }
}
