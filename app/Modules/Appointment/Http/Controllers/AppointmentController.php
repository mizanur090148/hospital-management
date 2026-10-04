<?php

namespace App\Modules\Appointment\Http\Controllers;

use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\AppointmentType;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    /**
     * Display a listing of appointments.
     */
    public function index(Request $request): Response
    {
        $date = $request->input('date', date('Y-m-d'));
        $doctorId = $request->input('doctor_id');
        $status = $request->input('status');
        $search = $request->input('search');

        $query = Appointment::with(['doctor.user', 'doctor.department', 'patient', 'branch'])
            ->orderBy('appointment_date')
            ->orderBy('start_time');

        if ($date) {
            $query->whereDate('appointment_date', $date);
        }

        if ($doctorId) {
            $query->where('doctor_id', $doctorId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('appointment_number', 'ilike', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('mrn', 'ilike', "%{$search}%")
                            ->orWhere('phone', 'ilike', "%{$search}%");
                    });
            });
        }

        $appointments = $query->paginate(20)->withQueryString();

        $doctors = Doctor::with(['user', 'department', 'schedules'])->where('status', 'ACTIVE')->get();
        $patients = Patient::where('status', 'ACTIVE')->orderBy('first_name')->limit(50)->get();
        $branches = Branch::where('is_active', true)->get();

        return Inertia::render('Appointments/Index', [
            'appointments' => $appointments,
            'doctors' => $doctors,
            'patients' => $patients,
            'branches' => $branches,
            'filters' => [
                'date' => $date,
                'doctor_id' => $doctorId,
                'status' => $status,
                'search' => $search,
            ],
            'types' => array_column(AppointmentType::cases(), 'value'),
            'statuses' => array_column(AppointmentStatus::cases(), 'value'),
        ]);
    }

    /**
     * Store a newly created appointment with pessimistic lock concurrency check.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'appointment_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'type' => ['required', 'string', 'in:OPD,FOLLOW_UP,EMERGENCY,TELECONSULTATION'],
            'reason_for_visit' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $doctor = Doctor::findOrFail($validated['doctor_id']);

        $appointment = DB::transaction(function () use ($validated, $tenantId, $doctor) {
            // Pessimistic double-booking guard
            $hasConflict = Appointment::where('doctor_id', $validated['doctor_id'])
                ->whereDate('appointment_date', $validated['appointment_date'])
                ->whereTime('start_time', $validated['start_time'])
                ->where('status', '!=', AppointmentStatus::Cancelled->value)
                ->lockForUpdate()
                ->exists();

            if ($hasConflict) {
                throw ValidationException::withMessages([
                    'start_time' => 'This appointment slot is already reserved. Please select another slot.',
                ]);
            }

            $validated['tenant_id'] = $tenantId;
            $validated['appointment_number'] = SequenceGenerator::generateAppointmentNumber($tenantId);
            $validated['status'] = AppointmentStatus::Scheduled;
            $validated['consultation_fee'] = match ($validated['type']) {
                'FOLLOW_UP' => $doctor->follow_up_fee ?: $doctor->consultation_fee,
                'EMERGENCY' => $doctor->emergency_fee ?: ($doctor->consultation_fee * 1.5),
                default => $doctor->consultation_fee,
            };

            return Appointment::create($validated);
        });

        return redirect()->route('appointments.index')->with('success', "Appointment {$appointment->appointment_number} scheduled successfully.");
    }

    /**
     * Update appointment status.
     */
    public function updateStatus(Request $request, string $id): RedirectResponse
    {
        $appointment = Appointment::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:SCHEDULED,CONFIRMED,CHECKED_IN,IN_CONSULTATION,COMPLETED,CANCELLED,NO_SHOW'],
        ]);

        $appointment->update([
            'status' => $validated['status'],
        ]);

        return redirect()->back()->with('success', "Appointment status updated to {$validated['status']}.");
    }
}
