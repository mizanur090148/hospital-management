<?php

namespace App\Modules\Clinical\Http\Controllers;

use App\Core\Enums\DoctorStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Appointment\Services\AppointmentSlotEngine;
use App\Modules\Auth\Models\User;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Clinical\Models\DoctorSchedule;
use App\Modules\Facility\Models\Department;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DoctorController extends Controller
{
    /**
     * Display a listing of doctors and their schedules.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $departmentId = $request->input('department_id');
        $status = $request->input('status');

        $query = Doctor::with(['user', 'department', 'schedules.branch'])
            ->latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('specialization', 'ilike', "%{$search}%")
                    ->orWhere('qualification', 'ilike', "%{$search}%")
                    ->orWhere('license_number', 'ilike', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $doctors = $query->paginate(15)->withQueryString();

        $departments = Department::where('is_active', true)->orderBy('name')->get();
        $branches = Branch::where('is_active', true)->orderBy('name')->get();

        // Users eligible to become doctor profiles (user_type = doctor or staff)
        $eligibleUsers = User::whereIn('user_type', [UserType::Doctor, UserType::Staff, UserType::HospitalAdmin])
            ->where('status', UserStatus::Active)
            ->whereDoesntHave('doctor')
            ->orderBy('name')
            ->get();

        return Inertia::render('Doctors/Index', [
            'doctors' => $doctors,
            'departments' => $departments,
            'branches' => $branches,
            'eligibleUsers' => $eligibleUsers,
            'filters' => [
                'search' => $search,
                'department_id' => $departmentId,
                'status' => $status,
            ],
            'statuses' => array_column(DoctorStatus::cases(), 'value'),
        ]);
    }

    /**
     * Store a newly created doctor profile.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'department_id' => ['required', 'uuid', 'exists:departments,id'],
            'license_number' => ['required', 'string', 'max:50'],
            'qualification' => ['required', 'string', 'max:150'],
            'specialization' => ['required', 'string', 'max:150'],
            'consultation_fee' => ['required', 'numeric', 'min:0'],
            'follow_up_fee' => ['nullable', 'numeric', 'min:0'],
            'emergency_fee' => ['nullable', 'numeric', 'min:0'],
            'bio' => ['nullable', 'string'],
            'is_available_for_teleconsult' => ['boolean'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        // Check uniqueness within tenant
        $existsUser = Doctor::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $validated['user_id'])
            ->exists();

        if ($existsUser) {
            return redirect()->back()->withErrors(['user_id' => 'This user is already registered as a doctor.']);
        }

        $existsLicense = Doctor::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('license_number', $validated['license_number'])
            ->exists();

        if ($existsLicense) {
            return redirect()->back()->withErrors(['license_number' => 'License number already in use.']);
        }

        $validated['tenant_id'] = $tenantId;
        $validated['status'] = DoctorStatus::Active;
        $validated['follow_up_fee'] = $validated['follow_up_fee'] ?? $validated['consultation_fee'];
        $validated['emergency_fee'] = $validated['emergency_fee'] ?? ($validated['consultation_fee'] * 1.5);

        Doctor::create($validated);

        return redirect()->route('doctors.index')->with('success', 'Doctor profile created successfully.');
    }

    /**
     * Save weekly schedules for a doctor.
     */
    public function saveSchedules(Request $request, string $doctorId): RedirectResponse
    {
        $doctor = Doctor::findOrFail($doctorId);

        $validated = $request->validate([
            'schedules' => ['required', 'array'],
            'schedules.*.branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:1,7'],
            'schedules.*.start_time' => ['required', 'date_format:H:i'],
            'schedules.*.end_time' => ['required', 'date_format:H:i', 'after:schedules.*.start_time'],
            'schedules.*.slot_duration_minutes' => ['required', 'integer', 'min:5', 'max:120'],
            'schedules.*.max_patients' => ['required', 'integer', 'min:1'],
            'schedules.*.is_active' => ['boolean'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        // Replace doctor schedules
        DoctorSchedule::where('doctor_id', $doctor->id)->delete();

        foreach ($validated['schedules'] as $sched) {
            DoctorSchedule::create([
                'tenant_id' => $tenantId,
                'doctor_id' => $doctor->id,
                'branch_id' => $sched['branch_id'],
                'day_of_week' => $sched['day_of_week'],
                'start_time' => $sched['start_time'],
                'end_time' => $sched['end_time'],
                'slot_duration_minutes' => $sched['slot_duration_minutes'],
                'max_patients' => $sched['max_patients'],
                'is_active' => $sched['is_active'] ?? true,
            ]);
        }

        return redirect()->back()->with('success', 'Doctor schedules updated successfully.');
    }

    /**
     * Get available appointment slots for a doctor on a specific date.
     */
    public function availableSlots(Request $request, string $doctorId): JsonResponse
    {
        $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $date = $request->input('date');
        $slotEngine = new AppointmentSlotEngine;
        $slots = $slotEngine->getSlots($doctorId, $date);

        return response()->json([
            'date' => $date,
            'doctor_id' => $doctorId,
            'slots' => $slots,
        ]);
    }
}
