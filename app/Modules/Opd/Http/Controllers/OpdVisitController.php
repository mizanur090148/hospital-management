<?php

namespace App\Modules\Opd\Http\Controllers;

use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\PrescriptionStatus;
use App\Core\Enums\VisitStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Opd\Models\Prescription;
use App\Modules\Opd\Models\PrescriptionItem;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OpdVisitController extends Controller
{
    /**
     * Display the Doctor's OPD Clinical Workstation.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $doctorId = $request->input('doctor_id');
        $selectedPatientId = $request->input('patient_id');
        $selectedAppointmentId = $request->input('appointment_id');
        $today = date('Y-m-d');

        // Fetch doctors in tenant
        $doctors = Doctor::with(['user', 'department'])->where('status', 'ACTIVE')->get();

        // Default to first doctor or logged in doctor if linked
        if (! $doctorId && $doctors->isNotEmpty()) {
            $userDoctor = $doctors->firstWhere('user_id', auth()->id());
            $doctorId = $userDoctor ? $userDoctor->id : $doctors->first()->id;
        }

        // Waiting queue: checked-in appointments today
        $waitingQueue = Appointment::with(['patient', 'branch'])
            ->where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $today)
            ->whereIn('status', [AppointmentStatus::CheckedIn->value, AppointmentStatus::Confirmed->value, AppointmentStatus::Scheduled->value])
            ->orderBy('start_time')
            ->get();

        // Active consultations in-progress
        $inProgressVisits = OpdVisit::with(['patient', 'doctor.user'])
            ->where('doctor_id', $doctorId)
            ->where('status', VisitStatus::InProgress->value)
            ->whereDate('arrived_at', $today)
            ->latest('arrived_at')
            ->get();

        // Completed consultations today
        $completedToday = OpdVisit::with(['patient', 'prescriptions.items'])
            ->where('doctor_id', $doctorId)
            ->where('status', VisitStatus::Completed->value)
            ->whereDate('completed_at', $today)
            ->latest('completed_at')
            ->get();

        // Selected patient details for chart
        $activePatient = null;
        if ($selectedPatientId) {
            $activePatient = Patient::with([
                'opdVisits' => function ($q) {
                    $q->latest()->limit(5);
                },
                'prescriptions.items',
            ])->find($selectedPatientId);
        }

        // Standard ICD-10 reference quicklist
        $icd10Reference = [
            ['code' => 'I10', 'description' => 'Essential (primary) hypertension'],
            ['code' => 'E11.9', 'description' => 'Type 2 diabetes mellitus without complications'],
            ['code' => 'J06.9', 'description' => 'Acute upper respiratory infection, unspecified'],
            ['code' => 'J45.909', 'description' => 'Unspecified asthma, uncomplicated'],
            ['code' => 'K21.9', 'description' => 'Gastro-esophageal reflux disease without esophagitis'],
            ['code' => 'R51.9', 'description' => 'Headache, unspecified'],
            ['code' => 'M54.5', 'description' => 'Low back pain'],
            ['code' => 'R07.9', 'description' => 'Chest pain, unspecified'],
            ['code' => 'R50.9', 'description' => 'Fever, unspecified'],
            ['code' => 'N39.0', 'description' => 'Urinary tract infection, site not specified'],
        ];

        return Inertia::render('Opd/Workstation', [
            'doctors' => $doctors,
            'selectedDoctorId' => $doctorId,
            'waitingQueue' => $waitingQueue,
            'inProgressVisits' => $inProgressVisits,
            'completedToday' => $completedToday,
            'activePatient' => $activePatient,
            'selectedAppointmentId' => $selectedAppointmentId,
            'icd10Reference' => $icd10Reference,
        ]);
    }

    /**
     * Start an OPD consultation encounter.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'appointment_id' => ['nullable', 'uuid', 'exists:appointments,id'],
            'chief_complaint' => ['required', 'string', 'max:500'],
            'history_of_present_illness' => ['nullable', 'string'],
            'physical_examination' => ['nullable', 'string'],
            'clinical_notes' => ['nullable', 'string'],
            'vitals' => ['nullable', 'array'],
            'vitals.systolic' => ['nullable', 'numeric'],
            'vitals.diastolic' => ['nullable', 'numeric'],
            'vitals.pulse_rate' => ['nullable', 'numeric'],
            'vitals.temperature' => ['nullable', 'numeric'],
            'vitals.respiratory_rate' => ['nullable', 'numeric'],
            'vitals.spo2' => ['nullable', 'numeric'],
            'vitals.weight_kg' => ['nullable', 'numeric'],
            'vitals.height_cm' => ['nullable', 'numeric'],
            'vitals.bmi' => ['nullable', 'numeric'],
            'diagnoses' => ['nullable', 'array'],
            'diagnoses.*.code' => ['required', 'string'],
            'diagnoses.*.description' => ['required', 'string'],
            'diagnoses.*.is_primary' => ['boolean'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        // Branch fallback
        if (empty($validated['branch_id'])) {
            $validated['branch_id'] = Branch::first()->id;
        }

        $visit = DB::transaction(function () use ($validated, $tenantId) {
            $validated['tenant_id'] = $tenantId;
            $validated['visit_number'] = SequenceGenerator::generateVisitNumber($tenantId);
            $validated['status'] = VisitStatus::InProgress;
            $validated['arrived_at'] = now();

            $created = OpdVisit::create($validated);

            if (! empty($validated['appointment_id'])) {
                Appointment::where('id', $validated['appointment_id'])->update([
                    'status' => AppointmentStatus::InConsultation->value,
                ]);
            }

            return $created;
        });

        return redirect()->route('opd.workstation', [
            'doctor_id' => $validated['doctor_id'],
            'patient_id' => $validated['patient_id'],
        ])->with('success', "Encounter {$visit->visit_number} started.");
    }

    /**
     * Finalize and complete the OPD consultation encounter with optional prescription.
     */
    public function complete(Request $request, string $id): RedirectResponse
    {
        $visit = OpdVisit::findOrFail($id);

        $validated = $request->validate([
            'chief_complaint' => ['nullable', 'string'],
            'clinical_notes' => ['nullable', 'string'],
            'physical_examination' => ['nullable', 'string'],
            'vitals' => ['nullable', 'array'],
            'diagnoses' => ['nullable', 'array'],
            'advice' => ['nullable', 'string'],
            'follow_up_date' => ['nullable', 'date'],
            'prescription_items' => ['nullable', 'array'],
            'prescription_items.*.medicine_name' => ['required', 'string'],
            'prescription_items.*.dosage' => ['required', 'string'],
            'prescription_items.*.frequency' => ['required', 'string'],
            'prescription_items.*.route' => ['nullable', 'string'],
            'prescription_items.*.duration_days' => ['required', 'integer', 'min:1'],
            'prescription_items.*.instructions' => ['nullable', 'string'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        DB::transaction(function () use ($visit, $validated, $tenantId) {
            // 1. Update OPD Visit
            $updateData = [
                'status' => VisitStatus::Completed,
                'completed_at' => now(),
            ];

            if (isset($validated['clinical_notes'])) {
                $updateData['clinical_notes'] = $validated['clinical_notes'];
            }
            if (isset($validated['vitals'])) {
                $updateData['vitals'] = $validated['vitals'];
            }
            if (isset($validated['diagnoses'])) {
                $updateData['diagnoses'] = $validated['diagnoses'];
            }

            $visit->update($updateData);

            // 2. Mark linked appointment as completed
            if ($visit->appointment_id) {
                Appointment::where('id', $visit->appointment_id)->update([
                    'status' => AppointmentStatus::Completed->value,
                ]);
            }

            // 3. Create digital prescription if medicines prescribed
            if (! empty($validated['prescription_items'])) {
                $prescription = Prescription::create([
                    'tenant_id' => $tenantId,
                    'patient_id' => $visit->patient_id,
                    'doctor_id' => $visit->doctor_id,
                    'opd_visit_id' => $visit->id,
                    'prescription_number' => SequenceGenerator::generatePrescriptionNumber($tenantId),
                    'advice' => $validated['advice'] ?? null,
                    'follow_up_date' => $validated['follow_up_date'] ?? null,
                    'status' => PrescriptionStatus::Finalized,
                ]);

                foreach ($validated['prescription_items'] as $item) {
                    PrescriptionItem::create([
                        'prescription_id' => $prescription->id,
                        'medicine_name' => $item['medicine_name'],
                        'dosage' => $item['dosage'],
                        'frequency' => $item['frequency'],
                        'route' => $item['route'] ?? 'ORAL',
                        'duration_days' => $item['duration_days'],
                        'instructions' => $item['instructions'] ?? null,
                    ]);
                }
            }
        });

        return redirect()->route('opd.workstation', [
            'doctor_id' => $visit->doctor_id,
        ])->with('success', "Encounter {$visit->visit_number} successfully finalized.");
    }
}
