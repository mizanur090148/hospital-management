<?php

namespace Tests\Feature;

use App\Core\Enums\AnesthesiaType;
use App\Core\Enums\DiagnosticPriority;
use App\Core\Enums\DoctorStatus;
use App\Core\Enums\Gender;
use App\Core\Enums\LabOrderStatus;
use App\Core\Enums\LabSampleStatus;
use App\Core\Enums\OtRoomStatus;
use App\Core\Enums\RadiologyModality;
use App\Core\Enums\RadiologyOrderStatus;
use App\Core\Enums\SurgeryStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Auth\Models\User;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\LabOrderItem;
use App\Modules\Diagnostics\Models\LabResult;
use App\Modules\Diagnostics\Models\LabSample;
use App\Modules\Diagnostics\Models\LabTestTemplate;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\Diagnostics\Models\RadiologyTemplate;
use App\Modules\Facility\Models\Department;
use App\Modules\OperationTheatre\Models\OperationTheatre;
use App\Modules\OperationTheatre\Models\Surgery;
use App\Modules\Patient\Models\Patient;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class DiagnosticsAndOperationTheatreTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Department $department;

    protected User $adminUser;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected Patient $patient;

    protected LabTestTemplate $labTemplate;

    protected RadiologyTemplate $radTemplate;

    protected OperationTheatre $theatre1;

    protected OperationTheatre $theatre2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apollo-diag-test',
            'legal_name' => 'Apollo Diagnostics & Surgical Corp',
            'trade_name' => 'Apollo Diagnostics Center',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN-DIAG',
            'name' => 'Apollo Diagnostics Campus',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Pathology & Surgery',
            'code' => 'PATH-SURG',
            'department_type' => 'diagnostic',
            'is_active' => true,
        ]);

        $adminRole = Role::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Hospital Admin',
            'slug' => 'hospital_admin',
            'guard_name' => 'web',
            'is_system' => true,
        ]);

        $this->adminUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'user_type' => UserType::HospitalAdmin,
            'name' => 'Admin Diagnostics',
            'email' => 'admin.diag@apollo.test',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);
        $this->adminUser->assignRole($adminRole);

        $this->doctorUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'user_type' => UserType::Doctor,
            'name' => 'Dr. William Halsted, MD',
            'email' => 'dr.halsted@apollo.test',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'department_id' => $this->department->id,
            'license_number' => 'DOC-SURG-551',
            'qualification' => 'MBBS, MS, FACS',
            'specialization' => 'General & Vascular Surgery',
            'consultation_fee' => 100.00,
            'status' => DoctorStatus::Active,
        ]);

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-880001',
            'first_name' => 'Thomas',
            'last_name' => 'Edison',
            'dob' => '1975-02-11',
            'gender' => Gender::Male,
            'phone' => '+1 (555) 990-2211',
            'status' => 'ACTIVE',
        ]);

        $this->labTemplate = LabTestTemplate::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'CBC-AUTO',
            'name' => 'Complete Blood Count (CBC)',
            'category' => 'Hematology',
            'sample_type' => 'Whole Blood (EDTA)',
            'price' => 40.00,
            'turnaround_time_hours' => 4,
            'reference_ranges' => [
                ['parameter' => 'Hemoglobin', 'range' => '13.5-17.5', 'unit' => 'g/dL'],
            ],
            'is_active' => true,
        ]);

        $this->radTemplate = RadiologyTemplate::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'RAD-CXR-01',
            'name' => 'Chest Radiography (X-Ray)',
            'modality' => RadiologyModality::XRay,
            'body_part' => 'Chest',
            'price' => 110.00,
            'is_active' => true,
        ]);

        $this->theatre1 = OperationTheatre::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'OT-101',
            'name' => 'Surgical Suite 101',
            'theatre_type' => 'Major OT',
            'status' => OtRoomStatus::Available,
            'is_active' => true,
        ]);

        $this->theatre2 = OperationTheatre::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'OT-102',
            'name' => 'Surgical Suite 102',
            'theatre_type' => 'Cardiac OT',
            'status' => OtRoomStatus::Available,
            'is_active' => true,
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
        app(TenantContext::class)->setBranch($this->branch);
    }

    public function test_can_render_laboratory_index_page(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/laboratory');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('Diagnostics/LabIndex')
                ->has('labOrders')
                ->has('templates')
                ->has('metrics')
            );
    }

    public function test_can_requisition_lab_order_with_items_and_generate_sample_barcodes(): void
    {
        $payload = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'priority' => 'URGENT',
            'clinical_notes' => 'Pre-operative routine screening',
            'template_ids' => [$this->labTemplate->id],
        ];

        $response = $this->actingAs($this->adminUser)->post('/laboratory/orders', $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('lab_orders', [
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'priority' => 'URGENT',
            'status' => 'ORDERED',
        ]);

        $order = LabOrder::where('patient_id', $this->patient->id)->first();
        $this->assertNotNull($order);
        $this->assertMatchesRegularExpression('/^LAB-\d{4}-\d{6}$/', $order->order_number);

        $this->assertDatabaseHas('lab_order_items', [
            'tenant_id' => $this->tenant->id,
            'lab_order_id' => $order->id,
            'template_id' => $this->labTemplate->id,
            'test_name' => $this->labTemplate->name,
        ]);

        // Asserts sample barcode generated
        $this->assertDatabaseHas('lab_samples', [
            'tenant_id' => $this->tenant->id,
            'lab_order_id' => $order->id,
            'sample_type' => 'Whole Blood (EDTA)',
            'status' => 'PENDING',
        ]);

        $sample = LabSample::where('lab_order_id', $order->id)->first();
        $this->assertMatchesRegularExpression('/^SMP-\d{4}-\d{6}$/', $sample->sample_barcode);
    }

    public function test_can_collect_lab_specimen(): void
    {
        $order = LabOrder::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'order_number' => 'LAB-2026-000099',
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'priority' => DiagnosticPriority::Routine,
            'status' => LabOrderStatus::Ordered,
            'ordered_at' => now(),
        ]);

        $sample = LabSample::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'lab_order_id' => $order->id,
            'sample_barcode' => 'SMP-2026-000099',
            'sample_type' => 'Whole Blood (EDTA)',
            'status' => LabSampleStatus::Pending,
        ]);

        $response = $this->actingAs($this->adminUser)->post("/laboratory/samples/{$sample->id}/collect", [
            'status' => 'COLLECTED',
        ]);

        $response->assertRedirect();

        $freshSample = $sample->fresh();
        $this->assertEquals(LabSampleStatus::Collected, $freshSample->status);
        $this->assertNotNull($freshSample->collected_at);
        $this->assertEquals($this->adminUser->id, $freshSample->collected_by_user_id);

        // Order status advances to SAMPLE_COLLECTED
        $this->assertEquals(LabOrderStatus::SampleCollected, $order->fresh()->status);
    }

    public function test_can_enter_lab_results_with_abnormal_and_critical_flags(): void
    {
        $order = LabOrder::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'order_number' => 'LAB-2026-000100',
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'priority' => DiagnosticPriority::Routine,
            'status' => LabOrderStatus::SampleCollected,
            'ordered_at' => now(),
        ]);

        $item = LabOrderItem::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'lab_order_id' => $order->id,
            'template_id' => $this->labTemplate->id,
            'test_name' => $this->labTemplate->name,
            'price' => 40.00,
            'status' => 'ORDERED',
        ]);

        $payload = [
            'results' => [
                [
                    'parameter_name' => 'Hemoglobin',
                    'observed_value' => '8.2',
                    'reference_range' => '13.5-17.5',
                    'unit' => 'g/dL',
                    'is_abnormal' => true,
                    'critical_flag' => true,
                    'pathologist_notes' => 'Severe normocytic anemia detected',
                ],
            ],
        ];

        $response = $this->actingAs($this->adminUser)->post("/laboratory/items/{$item->id}/results", $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('lab_results', [
            'tenant_id' => $this->tenant->id,
            'lab_order_item_id' => $item->id,
            'parameter_name' => 'Hemoglobin',
            'observed_value' => '8.2',
            'is_abnormal' => true,
            'critical_flag' => true,
        ]);

        // Order status advances to IN_ANALYSIS
        $this->assertEquals(LabOrderStatus::InAnalysis, $order->fresh()->status);
    }

    public function test_can_verify_and_release_finalized_lab_order(): void
    {
        $order = LabOrder::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'order_number' => 'LAB-2026-000101',
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'priority' => DiagnosticPriority::Routine,
            'status' => LabOrderStatus::InAnalysis,
            'ordered_at' => now(),
        ]);

        $item = LabOrderItem::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'lab_order_id' => $order->id,
            'template_id' => $this->labTemplate->id,
            'test_name' => $this->labTemplate->name,
            'price' => 40.00,
            'status' => 'IN_ANALYSIS',
        ]);

        $result = LabResult::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'lab_order_item_id' => $item->id,
            'parameter_name' => 'Hemoglobin',
            'observed_value' => '15.2',
            'reference_range' => '13.5-17.5',
            'unit' => 'g/dL',
            'is_abnormal' => false,
            'critical_flag' => false,
            'status' => 'DRAFT',
        ]);

        $response = $this->actingAs($this->adminUser)->post("/laboratory/orders/{$order->id}/verify");

        $response->assertRedirect();

        $this->assertEquals(LabOrderStatus::Verified, $order->fresh()->status);
        $this->assertEquals('VERIFIED', $result->fresh()->status);
        $this->assertNotNull($result->fresh()->verified_at);
        $this->assertEquals($this->adminUser->id, $result->fresh()->verified_by_user_id);
    }

    public function test_can_render_radiology_index_page(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/radiology');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('Diagnostics/RadiologyIndex')
                ->has('radiologyOrders')
                ->has('templates')
                ->has('metrics')
            );
    }

    public function test_can_requisition_radiology_order_with_auto_generated_order_number(): void
    {
        $payload = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'template_id' => $this->radTemplate->id,
            'priority' => 'STAT',
            'clinical_indication' => 'Suspected rib fracture and pneumothorax following fall',
        ];

        $response = $this->actingAs($this->adminUser)->post('/radiology/orders', $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('radiology_orders', [
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'template_id' => $this->radTemplate->id,
            'priority' => 'STAT',
            'status' => 'ORDERED',
        ]);

        $order = RadiologyOrder::where('patient_id', $this->patient->id)->first();
        $this->assertNotNull($order);
        $this->assertMatchesRegularExpression('/^RAD-\d{4}-\d{6}$/', $order->order_number);
    }

    public function test_can_capture_radiology_imaging_and_link_dicom_study(): void
    {
        $order = RadiologyOrder::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'order_number' => 'RAD-2026-000099',
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'template_id' => $this->radTemplate->id,
            'priority' => DiagnosticPriority::Routine,
            'clinical_indication' => 'Routine chest radiograph',
            'status' => RadiologyOrderStatus::Ordered,
            'ordered_at' => now(),
        ]);

        $response = $this->actingAs($this->adminUser)->post("/radiology/orders/{$order->id}/capture", [
            'dicom_study_uid' => '1.2.840.113619.2.55.12345678',
        ]);

        $response->assertRedirect();

        $fresh = $order->fresh();
        $this->assertEquals(RadiologyOrderStatus::Captured, $fresh->status);
        $this->assertEquals('1.2.840.113619.2.55.12345678', $fresh->dicom_study_uid);
    }

    public function test_can_draft_and_verify_radiology_diagnostic_report(): void
    {
        $order = RadiologyOrder::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'order_number' => 'RAD-2026-000100',
            'patient_id' => $this->patient->id,
            'ordering_doctor_id' => $this->doctor->id,
            'template_id' => $this->radTemplate->id,
            'priority' => DiagnosticPriority::Routine,
            'clinical_indication' => 'Persistent cough',
            'status' => RadiologyOrderStatus::Captured,
            'ordered_at' => now(),
        ]);

        // Draft Report
        $response = $this->actingAs($this->adminUser)->post("/radiology/orders/{$order->id}/report", [
            'reporting_doctor_id' => $this->doctor->id,
            'findings' => 'Clear lung fields bilaterally. Normal cardiac size.',
            'impression' => 'No acute cardiopulmonary disease.',
            'radiologist_notes' => 'Routine study.',
        ]);

        $response->assertRedirect();
        $this->assertEquals(RadiologyOrderStatus::Reported, $order->fresh()->status);
        $this->assertEquals('No acute cardiopulmonary disease.', $order->fresh()->impression);

        // Verify Report
        $verifyResponse = $this->actingAs($this->adminUser)->post("/radiology/orders/{$order->id}/verify");
        $verifyResponse->assertRedirect();

        $verified = $order->fresh();
        $this->assertEquals(RadiologyOrderStatus::Verified, $verified->status);
        $this->assertNotNull($verified->verified_at);
    }

    public function test_can_render_operation_theatre_index_page(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/operation-theatres');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('OperationTheatre/Index')
                ->has('theatres')
                ->has('surgeries')
                ->has('metrics')
            );
    }

    public function test_can_create_operation_theatre_suite(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/operation-theatres', [
            'branch_id' => $this->branch->id,
            'code' => 'OT-NEURO',
            'name' => 'Neurosurgical Suite 3',
            'theatre_type' => 'Neuro OT',
            'floor' => '5th Floor',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('operation_theatres', [
            'tenant_id' => $this->tenant->id,
            'code' => 'OT-NEURO',
            'theatre_type' => 'Neuro OT',
            'status' => 'AVAILABLE',
        ]);
    }

    public function test_can_schedule_surgery_with_auto_generated_number(): void
    {
        $payload = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'primary_surgeon_id' => $this->doctor->id,
            'operation_theatre_id' => $this->theatre1->id,
            'procedure_name' => 'Laparoscopic Appendectomy',
            'anesthesia_type' => 'GENERAL',
            'scheduled_date' => date('Y-m-d'),
            'scheduled_start_time' => '09:00',
            'scheduled_end_time' => '11:00',
            'pre_op_diagnosis' => 'Acute suppurative appendicitis',
        ];

        $response = $this->actingAs($this->adminUser)->post('/operation-theatres/surgeries', $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('surgeries', [
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'primary_surgeon_id' => $this->doctor->id,
            'operation_theatre_id' => $this->theatre1->id,
            'procedure_name' => 'Laparoscopic Appendectomy',
            'status' => 'SCHEDULED',
        ]);

        $surgery = Surgery::where('patient_id', $this->patient->id)->first();
        $this->assertNotNull($surgery);
        $this->assertMatchesRegularExpression('/^SUR-\d{4}-\d{6}$/', $surgery->surgery_number);
    }

    public function test_anti_conflict_engine_prevents_double_booking_ot_suite(): void
    {
        // 1st surgery scheduled in theatre1 between 09:00 and 11:00
        Surgery::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'surgery_number' => 'SUR-2026-000091',
            'patient_id' => $this->patient->id,
            'primary_surgeon_id' => $this->doctor->id,
            'operation_theatre_id' => $this->theatre1->id,
            'procedure_name' => 'Primary Procedure',
            'anesthesia_type' => AnesthesiaType::General,
            'scheduled_date' => date('Y-m-d'),
            'scheduled_start_time' => '09:00',
            'scheduled_end_time' => '11:00',
            'status' => SurgeryStatus::Scheduled,
        ]);

        // Attempt to book 2nd surgery in same theatre overlapping between 10:00 and 12:00 with another surgeon
        $doctor2User = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'user_type' => UserType::Doctor,
            'name' => 'Dr. Harvey Cushing',
            'email' => 'dr.cushing@apollo.test',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
        ]);
        $doctor2 = Doctor::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'user_id' => $doctor2User->id,
            'department_id' => $this->department->id,
            'license_number' => 'DOC-SURG-552',
            'qualification' => 'MBBS, MD',
            'specialization' => 'Neurosurgery',
            'status' => DoctorStatus::Active,
        ]);

        $conflictPayload = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'primary_surgeon_id' => $doctor2->id,
            'operation_theatre_id' => $this->theatre1->id, // Same theatre!
            'procedure_name' => 'Conflicting Procedure',
            'anesthesia_type' => 'GENERAL',
            'scheduled_date' => date('Y-m-d'),
            'scheduled_start_time' => '10:00',
            'scheduled_end_time' => '12:00',
        ];

        $response = $this->actingAs($this->adminUser)->post('/operation-theatres/surgeries', $conflictPayload);

        $response->assertSessionHasErrors(['operation_theatre_id']);
        $this->assertDatabaseMissing('surgeries', [
            'procedure_name' => 'Conflicting Procedure',
        ]);
    }

    public function test_anti_conflict_engine_prevents_surgeon_double_booking(): void
    {
        // 1st surgery for Dr. Halsted in theatre1 between 09:00 and 11:00
        Surgery::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'surgery_number' => 'SUR-2026-000092',
            'patient_id' => $this->patient->id,
            'primary_surgeon_id' => $this->doctor->id,
            'operation_theatre_id' => $this->theatre1->id,
            'procedure_name' => 'Procedure in Theatre 1',
            'anesthesia_type' => AnesthesiaType::General,
            'scheduled_date' => date('Y-m-d'),
            'scheduled_start_time' => '09:00',
            'scheduled_end_time' => '11:00',
            'status' => SurgeryStatus::Scheduled,
        ]);

        // Attempt to book Dr. Halsted in theatre2 (different room!) during the exact same time window
        $conflictPayload = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'primary_surgeon_id' => $this->doctor->id, // Same surgeon!
            'operation_theatre_id' => $this->theatre2->id, // Different room
            'procedure_name' => 'Simultaneous Procedure',
            'anesthesia_type' => 'GENERAL',
            'scheduled_date' => date('Y-m-d'),
            'scheduled_start_time' => '09:30',
            'scheduled_end_time' => '10:30',
        ];

        $response = $this->actingAs($this->adminUser)->post('/operation-theatres/surgeries', $conflictPayload);

        $response->assertSessionHasErrors(['primary_surgeon_id']);
        $this->assertDatabaseMissing('surgeries', [
            'procedure_name' => 'Simultaneous Procedure',
        ]);
    }

    public function test_surgery_lifecycle_transitions_and_cycles_ot_room_status(): void
    {
        $surgery = Surgery::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'surgery_number' => 'SUR-2026-000093',
            'patient_id' => $this->patient->id,
            'primary_surgeon_id' => $this->doctor->id,
            'operation_theatre_id' => $this->theatre1->id,
            'procedure_name' => 'Inguinal Hernia Repair',
            'anesthesia_type' => AnesthesiaType::Spinal,
            'scheduled_date' => date('Y-m-d'),
            'scheduled_start_time' => '14:00',
            'scheduled_end_time' => '16:00',
            'status' => SurgeryStatus::Scheduled,
        ]);

        // 1. Advance to IN_PROGRESS
        $this->actingAs($this->adminUser)->patch("/operation-theatres/surgeries/{$surgery->id}/status", [
            'status' => 'IN_PROGRESS',
        ]);

        $this->assertEquals(SurgeryStatus::InProgress, $surgery->fresh()->status);
        $this->assertNotNull($surgery->fresh()->actual_start_at);
        $this->assertEquals(OtRoomStatus::Occupied, $this->theatre1->fresh()->status);

        // 2. Advance to COMPLETED
        $this->actingAs($this->adminUser)->patch("/operation-theatres/surgeries/{$surgery->id}/status", [
            'status' => 'COMPLETED',
            'post_op_diagnosis' => 'Direct inguinal hernia successfully repaired with Prolene mesh',
            'surgical_notes' => 'Hemostasis achieved. Estimated blood loss 50mL.',
        ]);

        $this->assertEquals(SurgeryStatus::Completed, $surgery->fresh()->status);
        $this->assertNotNull($surgery->fresh()->actual_end_at);
        $this->assertEquals('Direct inguinal hernia successfully repaired with Prolene mesh', $surgery->fresh()->post_op_diagnosis);

        // Room status automatically sent to CLEANING
        $this->assertEquals(OtRoomStatus::Cleaning, $this->theatre1->fresh()->status);
    }

    public function test_can_save_who_surgical_safety_checklist(): void
    {
        $surgery = Surgery::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'surgery_number' => 'SUR-2026-000094',
            'patient_id' => $this->patient->id,
            'primary_surgeon_id' => $this->doctor->id,
            'operation_theatre_id' => $this->theatre1->id,
            'procedure_name' => 'Cholecystectomy',
            'anesthesia_type' => AnesthesiaType::General,
            'scheduled_date' => date('Y-m-d'),
            'scheduled_start_time' => '08:00',
            'scheduled_end_time' => '10:00',
            'status' => SurgeryStatus::Scheduled,
        ]);

        $payload = [
            'safety_checklist' => [
                'sign_in' => [
                    'patient_identity_confirmed' => true,
                    'site_marked' => true,
                ],
                'time_out' => [
                    'all_team_members_introduced' => true,
                    'patient_name_and_procedure_verified' => true,
                ],
                'sign_out' => [
                    'instruments_sponges_needles_counted' => true,
                ],
            ],
        ];

        $response = $this->actingAs($this->adminUser)->post("/operation-theatres/surgeries/{$surgery->id}/checklist", $payload);

        $response->assertRedirect();

        $fresh = $surgery->fresh();
        $this->assertTrue($fresh->safety_checklist['sign_in']['patient_identity_confirmed']);
        $this->assertTrue($fresh->safety_checklist['time_out']['all_team_members_introduced']);
        $this->assertTrue($fresh->safety_checklist['sign_out']['instruments_sponges_needles_counted']);
    }
}
