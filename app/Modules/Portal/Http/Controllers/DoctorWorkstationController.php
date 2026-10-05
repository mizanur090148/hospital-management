<?php

namespace App\Modules\Portal\Http\Controllers;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AdmissionType;
use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\DiagnosticPriority;
use App\Core\Enums\LabOrderStatus;
use App\Core\Enums\PrescriptionStatus;
use App\Core\Enums\RadiologyOrderStatus;
use App\Core\Enums\VisitStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\LabOrderItem;
use App\Modules\Diagnostics\Models\LabTestTemplate;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\Diagnostics\Models\RadiologyTemplate;
use App\Modules\Facility\Models\Department;
use App\Modules\IPD\Models\Admission;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Opd\Models\Prescription;
use App\Modules\Opd\Models\PrescriptionItem;
use App\Modules\Patient\Models\Patient;
use App\Modules\Pharmacy\Models\Medicine;
use App\Modules\Portal\Models\DoctorOrderTemplate;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DoctorWorkstationController extends Controller
{
    /**
     * Display the Doctor's Single-Screen Rapid Clinical Charting Workstation.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $user = $request->user();

        // 1. Resolve active Doctor
        $doctorId = $request->input('doctor_id');
        $doctor = null;

        if ($doctorId) {
            $doctor = Doctor::with(['user', 'department'])->find($doctorId);
        }

        if (! $doctor && $user && $user->doctor) {
            $doctor = $user->doctor->load(['user', 'department']);
        }

        if (! $doctor) {
            $doctor = Doctor::with(['user', 'department'])->where('tenant_id', $tenantId)->first();
        }

        // All active doctors for quick switching/delegation
        $allDoctors = Doctor::with(['user', 'department'])
            ->where('tenant_id', $tenantId)
            ->where('status', 'ACTIVE')
            ->get();

        $today = date('Y-m-d');
        $waitingQueue = collect();
        $inProgressQueue = collect();
        $completedQueue = collect();

        if ($doctor) {
            // Patient Queue Today
            $waitingQueue = Appointment::with(['patient', 'branch'])
                ->where('doctor_id', $doctor->id)
                ->whereDate('appointment_date', $today)
                ->whereIn('status', [
                    AppointmentStatus::Scheduled->value,
                    AppointmentStatus::Confirmed->value,
                    AppointmentStatus::CheckedIn->value,
                ])
                ->orderBy('start_time')
                ->get();

            $inProgressQueue = OpdVisit::with(['patient', 'appointment'])
                ->where('doctor_id', $doctor->id)
                ->where('status', VisitStatus::InProgress->value)
                ->whereDate('arrived_at', $today)
                ->latest('arrived_at')
                ->get();

            $completedQueue = OpdVisit::with(['patient', 'appointment'])
                ->where('doctor_id', $doctor->id)
                ->where('status', VisitStatus::Completed->value)
                ->whereDate('completed_at', $today)
                ->latest('completed_at')
                ->get();
        }

        // 2. Resolve Active Patient Dossier
        $selectedPatientId = $request->input('patient_id');
        $selectedAppointmentId = $request->input('appointment_id');

        if (! $selectedPatientId && $selectedAppointmentId) {
            $apt = Appointment::find($selectedAppointmentId);
            $selectedPatientId = $apt?->patient_id;
        }

        // Fallback to first waiting patient if available
        if (! $selectedPatientId && $waitingQueue->isNotEmpty()) {
            $selectedPatientId = $waitingQueue->first()->patient_id;
            $selectedAppointmentId = $waitingQueue->first()->id;
        }

        $activePatient = null;
        $patientHistory = [
            'visits' => [],
            'prescriptions' => [],
            'lab_results' => [],
            'radiology_orders' => [],
            'admissions' => [],
        ];

        if ($selectedPatientId) {
            $activePatient = Patient::find($selectedPatientId);

            if ($activePatient) {
                $patientHistory['visits'] = OpdVisit::where('patient_id', $activePatient->id)
                    ->with('doctor.user')
                    ->latest('completed_at')
                    ->limit(5)
                    ->get();

                $patientHistory['prescriptions'] = Prescription::where('patient_id', $activePatient->id)
                    ->with(['items', 'doctor.user'])
                    ->latest()
                    ->limit(5)
                    ->get();

                $patientHistory['lab_results'] = LabOrder::where('patient_id', $activePatient->id)
                    ->with(['items.template', 'items.results', 'orderingDoctor.user'])
                    ->latest('ordered_at')
                    ->limit(5)
                    ->get();

                $patientHistory['radiology_orders'] = RadiologyOrder::where('patient_id', $activePatient->id)
                    ->with(['template', 'orderingDoctor.user', 'reportingDoctor.user'])
                    ->latest('ordered_at')
                    ->limit(5)
                    ->get();

                $patientHistory['admissions'] = Admission::where('patient_id', $activePatient->id)
                    ->with(['attendingDoctor.user', 'admittingDepartment'])
                    ->latest('admitted_at')
                    ->limit(5)
                    ->get();
            }
        }

        // 3. Fast-Order Catalogs (CPOE)
        $medicines = Medicine::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('brand_name')
            ->limit(150)
            ->get(['id', 'brand_name', 'generic_name', 'strength', 'dosage_form', 'requires_prescription']);

        $labTemplates = LabTestTemplate::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'category', 'price']);

        $radiologyTemplates = RadiologyTemplate::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'modality', 'price']);

        $orderTemplates = $doctor ? DoctorOrderTemplate::where('doctor_id', $doctor->id)->get() : collect();
        $departments = Department::where('tenant_id', $tenantId)->where('is_active', true)->get();
        $branches = Branch::where('tenant_id', $tenantId)->where('is_active', true)->get();

        return Inertia::render('Doctor/Workstation/Index', [
            'doctor' => $doctor,
            'allDoctors' => $allDoctors,
            'waitingQueue' => $waitingQueue,
            'inProgressQueue' => $inProgressQueue,
            'completedQueue' => $completedQueue,
            'activePatient' => $activePatient,
            'activeAppointmentId' => $selectedAppointmentId,
            'patientHistory' => $patientHistory,
            'catalogs' => [
                'medicines' => $medicines,
                'lab_templates' => $labTemplates,
                'radiology_templates' => $radiologyTemplates,
                'order_templates' => $orderTemplates,
                'departments' => $departments,
                'branches' => $branches,
            ],
        ]);
    }

    /**
     * Complete consultation in one single-screen atomic action:
     * - Records clinical examination, notes, vitals, and ICD-10 diagnoses.
     * - Generates multi-item Prescription.
     * - Dispatches CPOE Lab Requisitions & Radiology Orders.
     * - Optional direct IPD admission referral.
     * - Closes OPD visit & appointment.
     */
    public function completeConsultation(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'appointment_id' => ['nullable', 'uuid', 'exists:appointments,id'],
            'chief_complaint' => ['required', 'string'],
            'history_of_present_illness' => ['nullable', 'string'],
            'physical_examination' => ['nullable', 'string'],
            'clinical_notes' => ['nullable', 'string'],
            'advice' => ['nullable', 'string'],
            'follow_up_date' => ['nullable', 'date'],
            'vitals' => ['nullable', 'array'],
            'diagnoses' => ['nullable', 'array'],
            'diagnoses.*.code' => ['required', 'string'],
            'diagnoses.*.description' => ['required', 'string'],
            'diagnoses.*.is_primary' => ['boolean'],

            // CPOE Prescriptions
            'prescription_items' => ['nullable', 'array'],
            'prescription_items.*.medicine_name' => ['required', 'string'],
            'prescription_items.*.dosage' => ['required', 'string'],
            'prescription_items.*.frequency' => ['required', 'string'],
            'prescription_items.*.route' => ['nullable', 'string'],
            'prescription_items.*.duration_days' => ['required', 'integer', 'min:1'],
            'prescription_items.*.instructions' => ['nullable', 'string'],

            // CPOE Diagnostic Lab Orders
            'lab_orders' => ['nullable', 'array'],
            'lab_orders.*.template_id' => ['required', 'uuid', 'exists:lab_test_templates,id'],
            'lab_orders.*.priority' => ['nullable', 'string', 'in:ROUTINE,URGENT,STAT'],

            // CPOE Radiology Orders
            'radiology_orders' => ['nullable', 'array'],
            'radiology_orders.*.template_id' => ['required', 'uuid', 'exists:radiology_templates,id'],
            'radiology_orders.*.priority' => ['nullable', 'string', 'in:ROUTINE,URGENT,STAT'],
            'radiology_orders.*.clinical_indication' => ['nullable', 'string'],

            // Direct IPD Admission Flag
            'recommend_ipd_admission' => ['nullable', 'boolean'],
            'admitting_department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'admitting_diagnosis' => ['nullable', 'string'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $branchId = Branch::where('tenant_id', $tenantId)->first()?->id;

        DB::transaction(function () use ($validated, $tenantId, $branchId) {
            // 1. Create or complete OPD Visit
            $visitNumber = SequenceGenerator::generateVisitNumber($tenantId);

            $visit = OpdVisit::create([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'patient_id' => $validated['patient_id'],
                'doctor_id' => $validated['doctor_id'],
                'appointment_id' => $validated['appointment_id'] ?? null,
                'visit_number' => $visitNumber,
                'chief_complaint' => $validated['chief_complaint'],
                'history_of_present_illness' => $validated['history_of_present_illness'] ?? null,
                'physical_examination' => $validated['physical_examination'] ?? null,
                'clinical_notes' => $validated['clinical_notes'] ?? null,
                'vitals' => $validated['vitals'] ?? null,
                'diagnoses' => $validated['diagnoses'] ?? null,
                'status' => VisitStatus::Completed,
                'arrived_at' => now()->subMinutes(15),
                'completed_at' => now(),
            ]);

            // 2. Mark appointment as completed
            if (! empty($validated['appointment_id'])) {
                Appointment::where('id', $validated['appointment_id'])->update([
                    'status' => AppointmentStatus::Completed->value,
                ]);
            }

            // 3. CPOE Digital Prescription
            if (! empty($validated['prescription_items'])) {
                $prescription = Prescription::create([
                    'tenant_id' => $tenantId,
                    'patient_id' => $validated['patient_id'],
                    'doctor_id' => $validated['doctor_id'],
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
                        'total_quantity' => ($item['duration_days'] * 3),
                    ]);
                }
            }

            // 4. CPOE Lab Test Orders
            if (! empty($validated['lab_orders'])) {
                $labOrderNumber = SequenceGenerator::generateLabOrderNumber($tenantId);

                $labOrder = LabOrder::create([
                    'tenant_id' => $tenantId,
                    'branch_id' => $branchId,
                    'order_number' => $labOrderNumber,
                    'patient_id' => $validated['patient_id'],
                    'ordering_doctor_id' => $validated['doctor_id'],
                    'encounter_type' => 'OPD',
                    'encounter_id' => $visit->id,
                    'priority' => DiagnosticPriority::from($validated['lab_orders'][0]['priority'] ?? 'ROUTINE'),
                    'clinical_notes' => 'CPOE ordered from Doctor Workstation: '.$validated['chief_complaint'],
                    'status' => LabOrderStatus::Ordered,
                    'ordered_at' => now(),
                ]);

                foreach ($validated['lab_orders'] as $lOrder) {
                    $tmpl = LabTestTemplate::find($lOrder['template_id']);
                    if ($tmpl) {
                        LabOrderItem::create([
                            'tenant_id' => $tenantId,
                            'lab_order_id' => $labOrder->id,
                            'template_id' => $tmpl->id,
                            'test_name' => $tmpl->name,
                            'price' => $tmpl->price,
                            'status' => 'PENDING',
                        ]);
                    }
                }
            }

            // 5. CPOE Radiology Scan Orders
            if (! empty($validated['radiology_orders'])) {
                foreach ($validated['radiology_orders'] as $rOrder) {
                    $tmpl = RadiologyTemplate::find($rOrder['template_id']);
                    if ($tmpl) {
                        RadiologyOrder::create([
                            'tenant_id' => $tenantId,
                            'branch_id' => $branchId,
                            'order_number' => SequenceGenerator::generateRadiologyOrderNumber($tenantId),
                            'patient_id' => $validated['patient_id'],
                            'ordering_doctor_id' => $validated['doctor_id'],
                            'template_id' => $tmpl->id,
                            'priority' => DiagnosticPriority::from($rOrder['priority'] ?? 'ROUTINE'),
                            'clinical_indication' => $rOrder['clinical_indication'] ?? $validated['chief_complaint'],
                            'status' => RadiologyOrderStatus::Ordered,
                            'ordered_at' => now(),
                        ]);
                    }
                }
            }

            // 6. Fast-Track IPD Inpatient Referral
            if (! empty($validated['recommend_ipd_admission']) && ! empty($validated['admitting_department_id'])) {
                Admission::create([
                    'tenant_id' => $tenantId,
                    'branch_id' => $branchId,
                    'patient_id' => $validated['patient_id'],
                    'attending_doctor_id' => $validated['doctor_id'],
                    'admitting_department_id' => $validated['admitting_department_id'],
                    'ipd_number' => SequenceGenerator::generateIpdNumber($tenantId),
                    'admission_type' => AdmissionType::Emergency,
                    'admitting_diagnosis' => $validated['admitting_diagnosis'] ?? ($validated['chief_complaint'] ?? 'Admitted via Doctor Workstation'),
                    'initial_deposit' => 0.00,
                    'admitted_at' => now(),
                    'status' => AdmissionStatus::Admitted,
                ]);
            }
        });

        return redirect()->route('doctor.workstation.index', [
            'doctor_id' => $validated['doctor_id'],
        ])->with('success', 'Consultation finalized & CPOE orders dispatched successfully.');
    }

    /**
     * Store a quick clinical order template / favorite for the doctor.
     */
    public function storeOrderTemplate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'template_type' => ['required', 'string', 'in:PRESCRIPTION_FAVORITE,LAB_PANEL,CLINICAL_SNIPPET'],
            'title' => ['required', 'string', 'max:100'],
            'content' => ['required', 'array'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        DoctorOrderTemplate::create([
            'tenant_id' => $tenantId,
            'doctor_id' => $validated['doctor_id'],
            'template_type' => $validated['template_type'],
            'title' => $validated['title'],
            'content' => $validated['content'],
        ]);

        return redirect()->back()->with('success', "Order template '{$validated['title']}' saved to doctor favorites.");
    }
}
