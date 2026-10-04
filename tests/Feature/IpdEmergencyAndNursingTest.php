<?php

namespace Tests\Feature;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AdmissionType;
use App\Core\Enums\BedStatus;
use App\Core\Enums\DischargeDisposition;
use App\Core\Enums\DoctorStatus;
use App\Core\Enums\EmergencyStatus;
use App\Core\Enums\Gender;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\TriageLevel;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Auth\Models\User;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Emergency\Models\EmergencyAdmission;
use App\Modules\Facility\Models\Bed;
use App\Modules\Facility\Models\Department;
use App\Modules\Facility\Models\Room;
use App\Modules\Facility\Models\Ward;
use App\Modules\IPD\Models\Admission;
use App\Modules\IPD\Models\BedAssignment;
use App\Modules\Patient\Models\Patient;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class IpdEmergencyAndNursingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Department $department;

    protected Ward $ward;

    protected Room $room;

    protected Bed $bed1;

    protected Bed $bed2;

    protected User $adminUser;

    protected User $doctorUser;

    protected User $nurseUser;

    protected Doctor $doctor;

    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apollo-ipd-test',
            'legal_name' => 'Apollo Inpatient Healthcare Ltd',
            'trade_name' => 'Apollo IPD Hospital',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN-IPD',
            'name' => 'Apollo Main IPD Branch',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Cardiology & Acute Care',
            'code' => 'CARDIO-IPD',
            'department_type' => 'clinical',
            'is_active' => true,
        ]);

        $this->ward = Ward::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'name' => 'Cardiovascular Inpatient Ward A',
            'code' => 'CARD-W1',
            'ward_type' => 'general',
            'gender_allowed' => 'any',
            'is_active' => true,
        ]);

        $this->room = Room::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'ward_id' => $this->ward->id,
            'room_number' => 'RM-401',
            'room_type' => 'standard',
            'is_active' => true,
        ]);

        $this->bed1 = Bed::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'room_id' => $this->room->id,
            'bed_number' => 'BED-401A',
            'bed_type' => 'electric',
            'daily_rate' => 450.00,
            'status' => BedStatus::Available,
            'is_active' => true,
        ]);

        $this->bed2 = Bed::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'room_id' => $this->room->id,
            'bed_number' => 'BED-401B',
            'bed_type' => 'electric',
            'daily_rate' => 450.00,
            'status' => BedStatus::Available,
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
            'name' => 'Admin Inpatient',
            'email' => 'admin.ipd@apollo.test',
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
            'name' => 'Dr. Robert Langdon',
            'email' => 'dr.langdon@apollo.test',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'department_id' => $this->department->id,
            'license_number' => 'DOC-IPD-7721',
            'qualification' => 'MBBS, MD (Cardiology)',
            'specialization' => 'Cardiology',
            'consultation_fee' => 90.00,
            'status' => DoctorStatus::Active,
        ]);

        $this->nurseUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'user_type' => UserType::Nurse,
            'name' => 'Nurse Clara Barton',
            'email' => 'nurse.clara@apollo.test',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-999901',
            'first_name' => 'Arthur',
            'last_name' => 'Dent',
            'dob' => '1979-03-11',
            'gender' => Gender::Male,
            'phone' => '+1 (555) 777-1122',
            'status' => 'ACTIVE',
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
        app(TenantContext::class)->setBranch($this->branch);
    }

    public function test_can_render_ipd_admissions_index_page(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/ipd');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('IPD/Index')
                ->has('admissions')
                ->has('availableBeds')
                ->has('doctors')
            );
    }

    public function test_can_admit_patient_to_ipd_and_occupy_bed(): void
    {
        $payload = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_department_id' => $this->department->id,
            'bed_id' => $this->bed1->id,
            'admission_type' => 'ELECTIVE',
            'admitting_diagnosis' => 'Coronary artery disease requiring cardiac monitoring',
            'initial_deposit' => 2000.00,
        ];

        $response = $this->actingAs($this->adminUser)->post('/ipd/admissions', $payload);

        $this->assertDatabaseHas('admissions', [
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admission_type' => 'ELECTIVE',
            'status' => 'ADMITTED',
        ]);

        $admission = Admission::where('patient_id', $this->patient->id)->first();
        $this->assertNotNull($admission);
        $this->assertMatchesRegularExpression('/^IPD-\d{4}-\d{6}$/', $admission->ipd_number);

        $this->assertDatabaseHas('bed_assignments', [
            'tenant_id' => $this->tenant->id,
            'admission_id' => $admission->id,
            'bed_id' => $this->bed1->id,
            'is_active' => true,
        ]);

        // Bed status must be updated to OCCUPIED
        $this->assertEquals(BedStatus::Occupied, $this->bed1->fresh()->status);

        $response->assertRedirect(route('admissions.show', $admission->id));
    }

    public function test_cannot_admit_patient_to_already_occupied_bed(): void
    {
        $this->bed1->update(['status' => BedStatus::Occupied]);

        $payload = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_department_id' => $this->department->id,
            'bed_id' => $this->bed1->id,
            'admission_type' => 'EMERGENCY',
            'admitting_diagnosis' => 'Acute chest pain',
        ];

        $response = $this->actingAs($this->adminUser)->post('/ipd/admissions', $payload);

        $response->assertSessionHasErrors(['bed_id']);
        $this->assertDatabaseMissing('admissions', [
            'patient_id' => $this->patient->id,
        ]);
    }

    public function test_can_view_ipd_patient_dossier(): void
    {
        $admission = Admission::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_department_id' => $this->department->id,
            'ipd_number' => 'IPD-2026-000099',
            'admission_type' => AdmissionType::Elective,
            'admitting_diagnosis' => 'Hypertensive crisis stabilization',
            'admitted_at' => now(),
            'status' => AdmissionStatus::Admitted,
        ]);

        BedAssignment::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'admission_id' => $admission->id,
            'bed_id' => $this->bed1->id,
            'assigned_at' => now(),
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser)->get("/ipd/admissions/{$admission->id}");

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('IPD/Show')
                ->where('admission.id', $admission->id)
                ->where('admission.ipd_number', 'IPD-2026-000099')
                ->has('availableBeds')
                ->has('dispositionOptions')
            );
    }

    public function test_can_transfer_patient_to_different_bed_and_cycle_cleaning_status(): void
    {
        $admission = Admission::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_department_id' => $this->department->id,
            'ipd_number' => 'IPD-2026-000100',
            'admission_type' => AdmissionType::Elective,
            'admitting_diagnosis' => 'Post-op observation',
            'admitted_at' => now()->subDay(),
            'status' => AdmissionStatus::Admitted,
        ]);

        $initialAssignment = BedAssignment::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'admission_id' => $admission->id,
            'bed_id' => $this->bed1->id,
            'assigned_at' => now()->subDay(),
            'is_active' => true,
        ]);
        $this->bed1->update(['status' => BedStatus::Occupied]);

        $response = $this->actingAs($this->adminUser)->post("/ipd/admissions/{$admission->id}/transfer-bed", [
            'new_bed_id' => $this->bed2->id,
            'transfer_reason' => 'Patient requested window bed for recovery',
        ]);

        $response->assertRedirect();

        // Old bed must enter CLEANING status
        $this->assertEquals(BedStatus::Cleaning, $this->bed1->fresh()->status);
        $this->assertFalse($initialAssignment->fresh()->is_active);
        $this->assertNotNull($initialAssignment->fresh()->released_at);

        // New bed must enter OCCUPIED status
        $this->assertEquals(BedStatus::Occupied, $this->bed2->fresh()->status);

        // New active bed assignment created
        $this->assertDatabaseHas('bed_assignments', [
            'tenant_id' => $this->tenant->id,
            'admission_id' => $admission->id,
            'bed_id' => $this->bed2->id,
            'transfer_reason' => 'Patient requested window bed for recovery',
            'is_active' => true,
        ]);
    }

    public function test_can_discharge_inpatient_and_release_bed(): void
    {
        $admission = Admission::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_department_id' => $this->department->id,
            'ipd_number' => 'IPD-2026-000101',
            'admission_type' => AdmissionType::Elective,
            'admitting_diagnosis' => 'Pneumonia treated',
            'admitted_at' => now()->subDays(3),
            'status' => AdmissionStatus::Admitted,
        ]);

        $bedAssignment = BedAssignment::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'admission_id' => $admission->id,
            'bed_id' => $this->bed1->id,
            'assigned_at' => now()->subDays(3),
            'is_active' => true,
        ]);
        $this->bed1->update(['status' => BedStatus::Occupied]);

        $response = $this->actingAs($this->adminUser)->post("/ipd/admissions/{$admission->id}/discharge", [
            'discharge_disposition' => 'HOME',
            'discharge_summary' => 'Patient fully recovered. Vitals stable. Follow up in OPD after 14 days.',
        ]);

        $response->assertRedirect();

        $freshAdmission = $admission->fresh();
        $this->assertEquals(AdmissionStatus::Discharged, $freshAdmission->status);
        $this->assertEquals(DischargeDisposition::Home, $freshAdmission->discharge_disposition);
        $this->assertNotNull($freshAdmission->discharged_at);

        // Old bed must be sent to CLEANING
        $this->assertEquals(BedStatus::Cleaning, $this->bed1->fresh()->status);
        $this->assertFalse($bedAssignment->fresh()->is_active);
    }

    public function test_can_render_emergency_triage_board(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/emergency');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('Emergency/Index')
                ->has('emergencyCases')
                ->has('metrics')
                ->has('availableBeds')
                ->has('triageLevels')
            );
    }

    public function test_can_register_emergency_triage_patient_with_auto_generated_er_number(): void
    {
        $payload = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'triage_level' => 'ESI_2',
            'chief_complaint' => 'Acute severe dyspnea and crushing substernal chest pressure',
            'arrival_mode' => 'AMBULANCE',
            'trauma_type' => 'MEDICAL',
            'vitals' => [
                'bp' => '85/55',
                'pulse' => '124',
                'temp' => '98.2',
                'spo2' => '88',
            ],
            'triage_notes' => 'Requires immediate resuscitation bay allocation and 100% NRB mask.',
            'assigned_doctor_id' => $this->doctor->id,
        ];

        $response = $this->actingAs($this->adminUser)->post('/emergency/triage', $payload);

        $response->assertRedirect(route('emergency.index'));

        $this->assertDatabaseHas('emergency_admissions', [
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'triage_level' => 'ESI_2',
            'arrival_mode' => 'AMBULANCE',
            'status' => 'TRIAGED',
        ]);

        $case = EmergencyAdmission::where('patient_id', $this->patient->id)->first();
        $this->assertNotNull($case);
        $this->assertMatchesRegularExpression('/^ER-\d{4}-\d{6}$/', $case->er_number);
    }

    public function test_can_update_emergency_status(): void
    {
        $erCase = EmergencyAdmission::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'er_number' => 'ER-2026-000099',
            'triage_level' => TriageLevel::Esi2Emergent,
            'chief_complaint' => 'Trauma laceration',
            'arrival_mode' => 'WALK_IN',
            'trauma_type' => 'BLUNT',
            'status' => EmergencyStatus::Triaged,
            'admitted_at' => now(),
        ]);

        $response = $this->actingAs($this->adminUser)->patch("/emergency/{$erCase->id}/status", [
            'status' => 'IN_TREATMENT',
            'assigned_doctor_id' => $this->doctor->id,
        ]);

        $response->assertRedirect();
        $this->assertEquals(EmergencyStatus::InTreatment, $erCase->fresh()->status);
    }

    public function test_can_fast_track_transfer_from_emergency_to_ipd_bed(): void
    {
        $erCase = EmergencyAdmission::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'er_number' => 'ER-2026-000105',
            'triage_level' => TriageLevel::Esi1Resuscitation,
            'chief_complaint' => 'Cardiogenic shock post myocardial infarction',
            'arrival_mode' => 'AMBULANCE',
            'trauma_type' => 'MEDICAL',
            'status' => EmergencyStatus::InTreatment,
            'admitted_at' => now(),
        ]);

        $response = $this->actingAs($this->adminUser)->post("/emergency/{$erCase->id}/admit-to-ipd", [
            'patient_id' => $this->patient->id,
            'bed_id' => $this->bed1->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_diagnosis' => 'Direct transfer from ER: Cardiogenic shock requiring ICU telemetry',
        ]);

        $response->assertRedirect();

        // ER case status updated to ADMITTED_TO_IPD
        $this->assertEquals(EmergencyStatus::AdmittedToIpd, $erCase->fresh()->status);

        // IPD Admission created
        $this->assertDatabaseHas('admissions', [
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'admission_type' => 'EMERGENCY',
            'status' => 'ADMITTED',
        ]);

        // Bed marked as OCCUPIED
        $this->assertEquals(BedStatus::Occupied, $this->bed1->fresh()->status);
    }

    public function test_can_render_nursing_station_page(): void
    {
        $response = $this->actingAs($this->nurseUser)->get('/nursing');

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('Nursing/Index')
                ->has('activeInpatients')
                ->has('wards')
                ->has('shifts')
                ->has('marStatuses')
            );
    }

    public function test_can_record_nursing_shift_handover_note_with_vitals_and_intake_output(): void
    {
        $admission = Admission::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_department_id' => $this->department->id,
            'ipd_number' => 'IPD-2026-000102',
            'admission_type' => AdmissionType::Elective,
            'admitting_diagnosis' => 'Congestive Heart Failure',
            'admitted_at' => now()->subDays(2),
            'status' => AdmissionStatus::Admitted,
        ]);

        $payload = [
            'shift' => 'MORNING',
            'notes' => 'Patient slept well. No nocturnal paroxysmal dyspnea noted. Tolerating regular breakfast.',
            'vitals' => [
                'systolic' => 126,
                'diastolic' => 78,
                'pulse_rate' => 68,
                'temperature' => 98.4,
                'spo2' => 98,
            ],
            'intake_output' => [
                'oral_intake_ml' => 350,
                'iv_fluid_ml' => 500,
                'urine_output_ml' => 700,
            ],
        ];

        $response = $this->actingAs($this->nurseUser)->post("/nursing/{$admission->id}/notes", $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('nursing_notes', [
            'tenant_id' => $this->tenant->id,
            'admission_id' => $admission->id,
            'nurse_user_id' => $this->nurseUser->id,
            'shift' => 'MORNING',
            'notes' => 'Patient slept well. No nocturnal paroxysmal dyspnea noted. Tolerating regular breakfast.',
        ]);
    }

    public function test_can_record_medication_administration_in_mar(): void
    {
        $admission = Admission::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_department_id' => $this->department->id,
            'ipd_number' => 'IPD-2026-000103',
            'admission_type' => AdmissionType::Elective,
            'admitting_diagnosis' => 'Post-PCI surveillance',
            'admitted_at' => now()->subDay(),
            'status' => AdmissionStatus::Admitted,
        ]);

        $payload = [
            'medicine_name' => 'Furosemide 40mg IV',
            'dose_given' => '40 mg / 4 mL',
            'route' => 'IV PUSH',
            'status' => 'GIVEN',
            'notes' => 'Pushed over 2 minutes via peripheral cannula. Diuresis commenced within 30 minutes.',
        ];

        $response = $this->actingAs($this->nurseUser)->post("/nursing/{$admission->id}/mar", $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('medication_administrations', [
            'tenant_id' => $this->tenant->id,
            'admission_id' => $admission->id,
            'medicine_name' => 'Furosemide 40mg IV',
            'dose_given' => '40 mg / 4 mL',
            'route' => 'IV PUSH',
            'status' => 'GIVEN',
            'administered_by_user_id' => $this->nurseUser->id,
        ]);
    }
}
