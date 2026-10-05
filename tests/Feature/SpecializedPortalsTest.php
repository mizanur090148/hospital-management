<?php

namespace Tests\Feature;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\AppointmentType;
use App\Core\Enums\BloodGroup;
use App\Core\Enums\DiagnosticPriority;
use App\Core\Enums\Gender;
use App\Core\Enums\InvoiceStatus;
use App\Core\Enums\LabOrderStatus;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\PaymentMethod;
use App\Core\Enums\PrescriptionStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Enums\VisitStatus;
use App\Core\Tenancy\TenantContext;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Auth\Models\User;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\LabOrderItem;
use App\Modules\Diagnostics\Models\LabResult;
use App\Modules\Diagnostics\Models\LabTestTemplate;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\Diagnostics\Models\RadiologyTemplate;
use App\Modules\Facility\Models\Department;
use App\Modules\IPD\Models\Admission;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Opd\Models\Prescription;
use App\Modules\Patient\Models\Patient;
use App\Modules\Portal\Models\DoctorOrderTemplate;
use App\Modules\Portal\Models\TeleconsultationSession;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SpecializedPortalsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Department $cardiologyDept;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected User $patientUser;

    protected Patient $patient;

    protected LabTestTemplate $cbcTemplate;

    protected RadiologyTemplate $chestXrayTemplate;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'st-jude-portals-test',
            'legal_name' => 'St. Jude Portals Health',
            'trade_name' => 'St. Jude Specialized Care',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'PORTAL-MAIN',
            'name' => 'St. Jude Outpatient & Surgical Pavilion',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->cardiologyDept = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'CARDIO-DEPT',
            'name' => 'Department of Cardiology & Vascular Medicine',
            'is_active' => true,
        ]);

        // Doctor User & Doctor Profile
        $this->doctorUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->cardiologyDept->id,
            'user_type' => UserType::Doctor,
            'name' => 'Dr. Robert Chase',
            'email' => 'dr.chase@st-jude.test',
            'phone' => '+15559876543',
            'password' => Hash::make('Secret123!'),
            'status' => UserStatus::Active,
        ]);

        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'department_id' => $this->cardiologyDept->id,
            'license_number' => 'MD-CARDIO-8899',
            'qualification' => 'MBBS, MD, FACC (Cardiology)',
            'specialization' => 'Interventional Cardiology',
            'consultation_fee' => 150.00,
            'is_available_for_teleconsult' => true,
            'status' => 'ACTIVE',
        ]);

        // Patient User & Patient Profile
        $this->patientUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'user_type' => UserType::Patient,
            'name' => 'Sarah Connor',
            'email' => 'sarah.connor@patient.test',
            'phone' => '+15554443322',
            'password' => Hash::make('Secret123!'),
            'status' => UserStatus::Active,
        ]);

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->patientUser->id,
            'mrn' => 'MRN-2026-000888',
            'first_name' => 'Sarah',
            'last_name' => 'Connor',
            'dob' => '1985-05-12',
            'gender' => Gender::Female,
            'blood_group' => BloodGroup::ONegative,
            'phone' => '+15554443322',
            'email' => 'sarah.connor@patient.test',
            'allergies' => ['Penicillin', 'Sulfa Drugs'],
            'chronic_conditions' => ['Hypertension', 'Mild Asthma'],
            'status' => PatientStatus::Active,
            'portal_activated_at' => now(),
        ]);

        // Catalogs for CPOE
        $this->cbcTemplate = LabTestTemplate::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'CBC-01',
            'name' => 'Complete Blood Count (CBC) with Differential',
            'category' => 'HEMATOLOGY',
            'sample_type' => 'Whole Blood',
            'price' => 45.00,
            'is_active' => true,
        ]);

        $this->chestXrayTemplate = RadiologyTemplate::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'CXR-PA-01',
            'name' => 'Chest X-Ray PA View',
            'modality' => 'XRAY',
            'body_part' => 'Chest',
            'price' => 75.00,
            'is_active' => true,
        ]);

        // Tenancy context
        app(TenantContext::class)->setTenant($this->tenant);
        app(TenantContext::class)->setBranch($this->branch);
    }

    public function test_patient_can_render_portal_dashboard_with_clinical_summary(): void
    {
        $response = $this->actingAs($this->patientUser)
            ->get('/portal/patient');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Patient/Dashboard')
            ->has('patient')
            ->where('patient.mrn', 'MRN-2026-000888')
            ->has('upcomingAppointments')
            ->has('recentPrescriptions')
            ->has('recentLabOrders')
            ->has('recentInvoices')
            ->has('outstandingBalance')
        );
    }

    public function test_patient_can_self_service_book_appointment_with_concurrency_guard(): void
    {
        $bookingDate = now()->addDays(2)->toDateString();

        $response = $this->actingAs($this->patientUser)
            ->post('/portal/patient/appointments', [
                'doctor_id' => $this->doctor->id,
                'branch_id' => $this->branch->id,
                'appointment_date' => $bookingDate,
                'start_time' => '10:00',
                'end_time' => '10:30',
                'type' => 'OPD',
                'reason_for_visit' => 'Follow up on blood pressure medications',
            ]);

        $response->assertRedirect();

        $appointment = Appointment::where('patient_id', $this->patient->id)
            ->whereDate('appointment_date', $bookingDate)
            ->where('start_time', '10:00')
            ->first();

        $this->assertNotNull($appointment);
        $this->assertEquals(AppointmentStatus::Scheduled, $appointment->status);
        $this->assertEquals(AppointmentType::OPD, $appointment->type);
        $this->assertEquals(150.00, (float) $appointment->consultation_fee);

        // Attempting to book the identical slot by another patient must be prevented by pessimistic conflict check
        $secondPatient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-000999',
            'first_name' => 'Kyle',
            'last_name' => 'Reese',
            'dob' => '1988-08-15',
            'gender' => Gender::Male,
            'phone' => '+15552221111',
            'status' => PatientStatus::Active,
        ]);

        $conflictResponse = $this->actingAs($this->patientUser)
            ->post('/portal/patient/appointments', [
                'doctor_id' => $this->doctor->id,
                'branch_id' => $this->branch->id,
                'appointment_date' => $bookingDate,
                'start_time' => '10:00',
                'end_time' => '10:30',
                'type' => 'OPD',
                'reason_for_visit' => 'Emergency cardiology check',
            ]);

        $conflictResponse->assertSessionHasErrors(['start_time']);
    }

    public function test_patient_can_book_teleconsultation_and_receive_virtual_room(): void
    {
        $bookingDate = now()->addDays(3)->toDateString();

        $response = $this->actingAs($this->patientUser)
            ->post('/portal/patient/appointments', [
                'doctor_id' => $this->doctor->id,
                'branch_id' => $this->branch->id,
                'appointment_date' => $bookingDate,
                'start_time' => '15:00',
                'end_time' => '15:30',
                'type' => 'TELECONSULTATION',
                'reason_for_visit' => 'Virtual review of ECG rhythm reports',
            ]);

        $response->assertRedirect();

        $appointment = Appointment::where('patient_id', $this->patient->id)
            ->whereDate('appointment_date', $bookingDate)
            ->where('start_time', '15:00')
            ->first();

        $this->assertNotNull($appointment);
        $this->assertEquals(AppointmentType::Teleconsultation, $appointment->type);

        // Assert Teleconsultation Session room provisioned
        $session = TeleconsultationSession::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($session);
        $this->assertStringStartsWith('tele-', $session->room_name);
        $this->assertEquals('SCHEDULED', $session->session_status);
    }

    public function test_patient_can_cancel_scheduled_appointment(): void
    {
        $appointment = Appointment::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'appointment_number' => 'APT-2026-TEST01',
            'appointment_date' => now()->addDays(5)->toDateString(),
            'start_time' => '11:00',
            'end_time' => '11:30',
            'type' => AppointmentType::OPD,
            'status' => AppointmentStatus::Scheduled,
            'consultation_fee' => 150.00,
        ]);

        $cancelResponse = $this->actingAs($this->patientUser)
            ->delete("/portal/patient/appointments/{$appointment->id}");

        $cancelResponse->assertRedirect();
        $this->assertEquals(AppointmentStatus::Cancelled, $appointment->fresh()->status);
    }

    public function test_patient_can_view_medical_records_and_diagnostic_dossier(): void
    {
        // 1. Seed prescription
        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'prescription_number' => 'RX-2026-999901',
            'advice' => 'Low sodium diet, daily aerobic walking',
            'status' => PrescriptionStatus::Finalized,
        ]);

        // 2. Seed lab order & panic result
        $labOrder = LabOrder::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'order_number' => 'LAB-2026-999901',
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'priority' => DiagnosticPriority::Urgent,
            'status' => LabOrderStatus::Verified,
            'ordered_at' => now(),
        ]);

        $labItem = LabOrderItem::create([
            'tenant_id' => $this->tenant->id,
            'lab_order_id' => $labOrder->id,
            'template_id' => $this->cbcTemplate->id,
            'test_name' => 'Hemoglobin & Hematocrit',
            'price' => 45.00,
            'status' => 'VERIFIED',
        ]);

        LabResult::create([
            'tenant_id' => $this->tenant->id,
            'lab_order_item_id' => $labItem->id,
            'parameter_name' => 'Hemoglobin (Hb)',
            'observed_value' => '6.8',
            'unit' => 'g/dL',
            'reference_range' => '12.0 - 16.0',
            'is_abnormal' => true,
            'is_panic_critical' => true,
        ]);

        $response = $this->actingAs($this->patientUser)
            ->get('/portal/patient/medical-records');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Patient/MedicalRecords')
            ->has('patient')
            ->has('prescriptions', 1)
            ->where('prescriptions.0.prescription_number', 'RX-2026-999901')
            ->has('labOrders', 1)
            ->where('labOrders.0.order_number', 'LAB-2026-999901')
            ->has('radiologyOrders')
            ->has('admissions')
        );
    }

    public function test_patient_can_view_billing_and_settle_invoice_online(): void
    {
        // Create an invoice with patient copay balance
        $invoice = Invoice::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'invoice_number' => 'INV-2026-99001',
            'invoice_date' => now()->toDateString(),
            'subtotal' => 500.00,
            'discount_amount' => 0.00,
            'tax_amount' => 0.00,
            'insurance_covered_amount' => 350.00,
            'patient_payable_amount' => 150.00,
            'total_amount' => 500.00,
            'paid_amount' => 0.00,
            'status' => InvoiceStatus::Issued,
        ]);

        $response = $this->actingAs($this->patientUser)
            ->get('/portal/patient/billing');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Patient/Billing')
            ->has('invoices', 1)
            ->where('invoices.0.invoice_number', 'INV-2026-99001')
            ->where('summary.outstanding_balance', fn ($v) => (float) $v === 150.0)
            ->where('summary.insurance_covered', fn ($v) => (float) $v === 350.0)
        );

        // Patient performs self-service online settlement
        $payResponse = $this->actingAs($this->patientUser)
            ->post("/portal/patient/billing/{$invoice->id}/pay", [
                'payment_method' => 'CREDIT_CARD',
                'amount' => 150.00,
                'transaction_reference' => 'STRIPE-CHG-998877',
            ]);

        $payResponse->assertRedirect();

        $freshInvoice = $invoice->fresh();
        $this->assertEquals(InvoiceStatus::Paid, $freshInvoice->status);
        $this->assertEquals(150.00, (float) $freshInvoice->paid_amount);

        // Check Payment receipt record generated
        $payment = Payment::where('invoice_id', $invoice->id)->first();
        $this->assertNotNull($payment);
        $this->assertEquals(PaymentMethod::CreditCard, $payment->payment_method);
        $this->assertEquals(150.00, (float) $payment->amount);
        $this->assertStringStartsWith('RCP-', $payment->receipt_number);
    }

    public function test_doctor_can_render_rapid_clinical_workstation_with_queue_and_patient_360(): void
    {
        // Schedule an appointment today to appear in queue
        $appointment = Appointment::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'appointment_number' => 'APT-2026-TODAY01',
            'appointment_date' => now()->toDateString(),
            'start_time' => '09:00',
            'end_time' => '09:30',
            'type' => AppointmentType::OPD,
            'status' => AppointmentStatus::Scheduled,
            'consultation_fee' => 150.00,
        ]);

        $response = $this->actingAs($this->doctorUser)
            ->get("/doctor/workstation?doctor_id={$this->doctor->id}&patient_id={$this->patient->id}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Doctor/Workstation/Index')
            ->has('doctor')
            ->where('doctor.id', $this->doctor->id)
            ->has('waitingQueue', 1)
            ->has('activePatient')
            ->where('activePatient.id', $this->patient->id)
            ->has('catalogs.medicines')
            ->has('catalogs.lab_templates')
            ->has('catalogs.radiology_templates')
        );
    }

    public function test_doctor_can_complete_single_screen_rapid_consultation_with_integrated_cpoe(): void
    {
        $appointment = Appointment::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
            'appointment_number' => 'APT-2026-RAPID01',
            'appointment_date' => now()->toDateString(),
            'start_time' => '10:00',
            'end_time' => '10:30',
            'type' => AppointmentType::OPD,
            'status' => AppointmentStatus::Scheduled,
            'consultation_fee' => 150.00,
        ]);

        $response = $this->actingAs($this->doctorUser)
            ->post('/doctor/workstation/consultation', [
                'doctor_id' => $this->doctor->id,
                'patient_id' => $this->patient->id,
                'appointment_id' => $appointment->id,
                'chief_complaint' => 'Severe substernal crushing chest pain with diaphoresis',
                'history_of_present_illness' => 'Onset 2 hours ago while climbing stairs, not relieved by rest',
                'physical_examination' => 'BP 160/100, S4 gallop audible, lungs clear to auscultation',
                'clinical_notes' => 'High clinical suspicion of Acute Coronary Syndrome (NSTEMI vs STEMI)',
                'advice' => 'Immediate bed rest, sublingual nitroglycerin PRN, urgent cardiology workup',
                'follow_up_date' => now()->addDays(7)->toDateString(),
                'vitals' => [
                    'systolic' => '160',
                    'diastolic' => '100',
                    'pulse_rate' => '98',
                    'temperature' => '98.4',
                    'respiratory_rate' => '22',
                    'spo2' => '96',
                    'weight_kg' => '82',
                    'height_cm' => '175',
                    'bmi' => '26.8',
                ],
                'diagnoses' => [
                    ['code' => 'I20.0', 'description' => 'Unstable Angina Pectoris', 'is_primary' => true],
                    ['code' => 'I10', 'description' => 'Essential Hypertension', 'is_primary' => false],
                ],
                'prescription_items' => [
                    [
                        'medicine_name' => 'Aspirin 81mg Chewable',
                        'dosage' => '324mg (4 tabs)',
                        'frequency' => 'STAT',
                        'route' => 'ORAL',
                        'duration_days' => 1,
                        'instructions' => 'Chew immediately',
                    ],
                    [
                        'medicine_name' => 'Atorvastatin 80mg',
                        'dosage' => '1 Tablet',
                        'frequency' => '0-0-1',
                        'route' => 'ORAL',
                        'duration_days' => 30,
                        'instructions' => 'At bedtime',
                    ],
                ],
                'lab_orders' => [
                    [
                        'template_id' => $this->cbcTemplate->id,
                        'priority' => 'STAT',
                    ],
                ],
                'radiology_orders' => [
                    [
                        'template_id' => $this->chestXrayTemplate->id,
                        'priority' => 'STAT',
                        'clinical_indication' => 'Evaluate cardiomegaly and pulmonary edema in acute chest pain',
                    ],
                ],
                'recommend_ipd_admission' => true,
                'admitting_department_id' => $this->cardiologyDept->id,
                'admitting_diagnosis' => 'Admit to Coronary Care Unit (CCU) for continuous telemetry monitoring',
            ]);

        $response->assertRedirect();

        // 1. Assert OPD Visit completed
        $visit = OpdVisit::where('patient_id', $this->patient->id)
            ->where('doctor_id', $this->doctor->id)
            ->latest()
            ->first();

        $this->assertNotNull($visit);
        $this->assertEquals(VisitStatus::Completed, $visit->status);
        $this->assertStringStartsWith('OPD-', $visit->visit_number);
        $this->assertEquals('160', $visit->vitals['systolic']);

        // 2. Assert Appointment marked Completed
        $this->assertEquals(AppointmentStatus::Completed, $appointment->fresh()->status);

        // 3. Assert Digital Prescription created
        $prescription = Prescription::where('opd_visit_id', $visit->id)->first();
        $this->assertNotNull($prescription);
        $this->assertCount(2, $prescription->items);
        $this->assertEquals('Aspirin 81mg Chewable', $prescription->items[0]->medicine_name);

        // 4. Assert CPOE Lab Order generated
        $labOrder = LabOrder::where('patient_id', $this->patient->id)->latest('ordered_at')->first();
        $this->assertNotNull($labOrder);
        $this->assertEquals(DiagnosticPriority::Stat, $labOrder->priority);
        $this->assertCount(1, $labOrder->items);

        // 5. Assert CPOE Radiology Order generated
        $radOrder = RadiologyOrder::where('patient_id', $this->patient->id)->latest('ordered_at')->first();
        $this->assertNotNull($radOrder);
        $this->assertEquals('Evaluate cardiomegaly and pulmonary edema in acute chest pain', $radOrder->clinical_indication);

        // 6. Assert Fast-Track Inpatient (IPD) Admission created
        $admission = Admission::where('patient_id', $this->patient->id)
            ->where('admitting_department_id', $this->cardiologyDept->id)
            ->latest('admitted_at')
            ->first();

        $this->assertNotNull($admission);
        $this->assertStringStartsWith('IPD-', $admission->ipd_number);
        $this->assertEquals(AdmissionStatus::Admitted, $admission->status);
    }

    public function test_doctor_can_save_quick_order_template(): void
    {
        $response = $this->actingAs($this->doctorUser)
            ->post('/doctor/workstation/templates', [
                'doctor_id' => $this->doctor->id,
                'template_type' => 'PRESCRIPTION_FAVORITE',
                'title' => 'Standard Post-MI Discharge Regimen',
                'content' => [
                    ['medicine_name' => 'Aspirin 81mg', 'dosage' => '1 tab', 'frequency' => '1-0-0'],
                    ['medicine_name' => 'Metoprolol Succinate 50mg', 'dosage' => '1 tab', 'frequency' => '1-0-0'],
                    ['medicine_name' => 'Rosuvastatin 40mg', 'dosage' => '1 tab', 'frequency' => '0-0-1'],
                ],
            ]);

        $response->assertRedirect();

        $template = DoctorOrderTemplate::where('doctor_id', $this->doctor->id)
            ->where('title', 'Standard Post-MI Discharge Regimen')
            ->first();

        $this->assertNotNull($template);
        $this->assertEquals('PRESCRIPTION_FAVORITE', $template->template_type);
        $this->assertCount(3, $template->content);
    }
}
