<?php

namespace Tests\Feature;

use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\AppointmentType;
use App\Core\Enums\BloodGroup;
use App\Core\Enums\DoctorStatus;
use App\Core\Enums\Gender;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Enums\VisitStatus;
use App\Core\Tenancy\TenantContext;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Auth\Models\User;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Clinical\Models\DoctorSchedule;
use App\Modules\Facility\Models\Department;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Opd\Models\Prescription;
use App\Modules\Patient\Models\Patient;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class ClinicalCoreAndOpdTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Department $department;

    protected User $adminUser;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apollo-clinical-test',
            'legal_name' => 'Apollo Clinical Corp',
            'trade_name' => 'Apollo Clinic',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN-CLN',
            'name' => 'Apollo Main Branch',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Cardiology',
            'code' => 'CARDIO',
            'department_type' => 'clinical',
            'is_active' => true,
        ]);

        $adminRole = Role::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin Role',
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
            'name' => 'Admin User',
            'email' => 'admin.clinical@apollo.test',
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
            'name' => 'Dr. Alexander Vance',
            'email' => 'dr.vance@apollo.test',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'department_id' => $this->department->id,
            'license_number' => 'DOC-CARDIO-991',
            'qualification' => 'MBBS, MD',
            'specialization' => 'Cardiology',
            'consultation_fee' => 80.00,
            'follow_up_fee' => 50.00,
            'emergency_fee' => 120.00,
            'status' => DoctorStatus::Active,
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
        app(TenantContext::class)->setBranch($this->branch);
    }

    public function test_can_register_patient_with_auto_generated_mrn_sequence(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/patients', [
            'first_name' => 'Robert',
            'last_name' => 'Taylor',
            'dob' => '1985-04-12',
            'gender' => 'MALE',
            'blood_group' => 'O+',
            'phone' => '+1 (555) 789-0123',
            'email' => 'robert.taylor@test.io',
            'emergency_contact' => [
                'name' => 'Alice Taylor',
                'relationship' => 'Spouse',
                'phone' => '+1 (555) 789-0124',
            ],
            'allergies' => [
                ['substance' => 'Penicillin', 'severity' => 'Severe', 'reaction' => 'Rash'],
            ],
            'chronic_conditions' => [
                ['condition' => 'Hypertension', 'diagnosed_year' => 2020, 'notes' => 'Controlled'],
            ],
        ]);

        $response->assertRedirect('/patients');

        $this->assertDatabaseHas('patients', [
            'tenant_id' => $this->tenant->id,
            'first_name' => 'Robert',
            'last_name' => 'Taylor',
            'gender' => 'MALE',
            'blood_group' => 'O+',
        ]);

        $patient = Patient::where('email', 'robert.taylor@test.io')->first();
        $this->assertNotNull($patient);
        $this->assertStringStartsWith('MRN-', $patient->mrn);
        $this->assertEquals(1, count($patient->allergies));
        $this->assertEquals('Penicillin', $patient->allergies[0]['substance']);
    }

    public function test_patient_records_are_tenant_isolated(): void
    {
        // Tenant A creates patient
        $patientA = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-999001',
            'first_name' => 'Alice',
            'last_name' => 'Walker',
            'dob' => '1990-01-01',
            'gender' => Gender::Female,
            'blood_group' => BloodGroup::APositive,
            'phone' => '+1 (555) 111-2222',
            'status' => PatientStatus::Active,
        ]);

        // Tenant B setup
        $tenantB = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'tenant-b-hospital',
            'legal_name' => 'Hospital B Corp',
            'trade_name' => 'Hospital B',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $branchB = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantB->id,
            'code' => 'B-MAIN',
            'name' => 'Branch B',
            'is_main' => true,
            'is_active' => true,
        ]);

        $userB = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenantB->id,
            'branch_id' => $branchB->id,
            'user_type' => UserType::HospitalAdmin,
            'name' => 'User B',
            'email' => 'userb@hospitalb.test',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        // Switch to Tenant B context
        app(TenantContext::class)->setTenant($tenantB);
        app(TenantContext::class)->setBranch($branchB);

        $response = $this->actingAs($userB)->get('/patients');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Patients/Index')
            ->where('patients.total', 0)
        );
    }

    public function test_can_configure_doctor_weekly_schedules(): void
    {
        $response = $this->actingAs($this->adminUser)->post("/doctors/{$this->doctor->id}/schedules", [
            'schedules' => [
                [
                    'branch_id' => $this->branch->id,
                    'day_of_week' => 1, // Monday
                    'start_time' => '09:00',
                    'end_time' => '13:00',
                    'slot_duration_minutes' => 15,
                    'max_patients' => 16,
                    'is_active' => true,
                ],
                [
                    'branch_id' => $this->branch->id,
                    'day_of_week' => 3, // Wednesday
                    'start_time' => '14:00',
                    'end_time' => '18:00',
                    'slot_duration_minutes' => 20,
                    'max_patients' => 12,
                    'is_active' => true,
                ],
            ],
        ]);

        $response->assertSessionHas('success');

        $this->assertDatabaseHas('doctor_schedules', [
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'day_of_week' => 1,
            'slot_duration_minutes' => 15,
        ]);

        $this->assertDatabaseHas('doctor_schedules', [
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'day_of_week' => 3,
            'slot_duration_minutes' => 20,
        ]);
    }

    public function test_doctor_available_slots_calculation(): void
    {
        // Setup schedule for Monday
        DoctorSchedule::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'branch_id' => $this->branch->id,
            'day_of_week' => 1, // Monday
            'start_time' => '09:00',
            'end_time' => '10:00',
            'slot_duration_minutes' => 15,
            'max_patients' => 4,
            'is_active' => true,
        ]);

        // A known Monday: 2026-10-05 is a Monday
        $date = '2026-10-05';

        $response = $this->actingAs($this->adminUser)->getJson("/doctors/{$this->doctor->id}/available-slots?date={$date}");

        $response->assertOk();
        $response->assertJsonStructure([
            'date',
            'doctor_id',
            'slots' => [
                '*' => ['start_time', 'end_time', 'is_available'],
            ],
        ]);

        $slots = $response->json('slots');
        $this->assertCount(4, $slots); // 09:00, 09:15, 09:30, 09:45
        $this->assertTrue($slots[0]['is_available']);
    }

    public function test_appointment_booking_and_concurrency_double_booking_lock(): void
    {
        $patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-888001',
            'first_name' => 'Clara',
            'last_name' => 'Oswald',
            'dob' => '1995-02-15',
            'gender' => Gender::Female,
            'blood_group' => BloodGroup::BPositive,
            'phone' => '+1 (555) 333-4444',
            'status' => PatientStatus::Active,
        ]);

        // First booking attempt succeeds
        $response1 = $this->actingAs($this->adminUser)->post('/appointments', [
            'branch_id' => $this->branch->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $patient->id,
            'appointment_date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '10:15',
            'type' => 'OPD',
            'reason_for_visit' => 'Chest evaluation',
        ]);

        $response1->assertRedirect('/appointments');
        $this->assertDatabaseHas('appointments', [
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'start_time' => '10:00:00',
        ]);

        // Second duplicate booking attempt fails with validation error
        $response2 = $this->actingAs($this->adminUser)->post('/appointments', [
            'branch_id' => $this->branch->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $patient->id,
            'appointment_date' => now()->addDay()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '10:15',
            'type' => 'OPD',
            'reason_for_visit' => 'Duplicate attempt',
        ]);

        $response2->assertSessionHasErrors(['start_time']);
    }

    public function test_can_update_appointment_status(): void
    {
        $patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-777001',
            'first_name' => 'Bruce',
            'last_name' => 'Wayne',
            'dob' => '1980-03-30',
            'gender' => Gender::Male,
            'blood_group' => BloodGroup::ANegative,
            'phone' => '+1 (555) 777-8888',
            'status' => PatientStatus::Active,
        ]);

        $appointment = Appointment::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $patient->id,
            'appointment_number' => 'APT-2026-777001',
            'appointment_date' => now()->format('Y-m-d'),
            'start_time' => '11:00',
            'end_time' => '11:15',
            'type' => AppointmentType::OPD,
            'status' => AppointmentStatus::Scheduled,
        ]);

        $response = $this->actingAs($this->adminUser)->patch("/appointments/{$appointment->id}/status", [
            'status' => 'CHECKED_IN',
        ]);

        $response->assertSessionHas('success');
        $this->assertEquals(AppointmentStatus::CheckedIn, $appointment->fresh()->status);
    }

    public function test_doctor_can_conduct_opd_consultation_with_vitals_and_icd10(): void
    {
        $patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-666001',
            'first_name' => 'Diana',
            'last_name' => 'Prince',
            'dob' => '1992-06-24',
            'gender' => Gender::Female,
            'blood_group' => BloodGroup::ABPositive,
            'phone' => '+1 (555) 666-5555',
            'status' => PatientStatus::Active,
        ]);

        $response = $this->actingAs($this->adminUser)->post('/opd/encounters', [
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'branch_id' => $this->branch->id,
            'chief_complaint' => 'Acute migraine and visual aura',
            'history_of_present_illness' => 'Severe throbbing left temporal pain for 6 hours.',
            'vitals' => [
                'systolic' => 120,
                'diastolic' => 80,
                'pulse_rate' => 68,
                'temperature' => 98.6,
                'spo2' => 99,
                'weight_kg' => 62,
                'height_cm' => 170,
                'bmi' => 21.5,
            ],
            'diagnoses' => [
                ['code' => 'R51.9', 'description' => 'Headache, unspecified', 'is_primary' => true],
            ],
        ]);

        $response->assertSessionHas('success');

        $this->assertDatabaseHas('opd_visits', [
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'chief_complaint' => 'Acute migraine and visual aura',
            'status' => 'IN_PROGRESS',
        ]);

        $visit = OpdVisit::where('patient_id', $patient->id)->first();
        $this->assertNotNull($visit);
        $this->assertStringStartsWith('OPD-', $visit->visit_number);
        $this->assertEquals(120, $visit->vitals['systolic']);
        $this->assertEquals('R51.9', $visit->diagnoses[0]['code']);
    }

    public function test_doctor_can_complete_encounter_and_issue_digital_prescription(): void
    {
        $patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-555001',
            'first_name' => 'Barry',
            'last_name' => 'Allen',
            'dob' => '1990-09-18',
            'gender' => Gender::Male,
            'blood_group' => BloodGroup::OPositive,
            'phone' => '+1 (555) 444-3333',
            'status' => PatientStatus::Active,
        ]);

        $visit = OpdVisit::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_number' => 'OPD-2026-555001',
            'chief_complaint' => 'Mild hypertension checkup',
            'status' => VisitStatus::InProgress,
            'arrived_at' => now(),
        ]);

        $response = $this->actingAs($this->adminUser)->post("/opd/encounters/{$visit->id}/complete", [
            'clinical_notes' => 'Patient responds well to lifestyle modifications. Continue medication.',
            'advice' => 'Reduce dietary sodium. Exercise 30 minutes daily.',
            'follow_up_date' => now()->addDays(30)->format('Y-m-d'),
            'prescription_items' => [
                [
                    'medicine_name' => 'Lisinopril 10mg',
                    'dosage' => '1 Tab',
                    'frequency' => '1-0-0',
                    'route' => 'ORAL',
                    'duration_days' => 30,
                    'instructions' => 'Morning with water',
                ],
                [
                    'medicine_name' => 'Aspirin 81mg',
                    'dosage' => '1 Tab',
                    'frequency' => '0-0-1',
                    'route' => 'ORAL',
                    'duration_days' => 30,
                    'instructions' => 'Night after food',
                ],
            ],
        ]);

        $response->assertSessionHas('success');

        $this->assertEquals(VisitStatus::Completed, $visit->fresh()->status);
        $this->assertNotNull($visit->fresh()->completed_at);

        $this->assertDatabaseHas('prescriptions', [
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'opd_visit_id' => $visit->id,
        ]);

        $rx = Prescription::where('opd_visit_id', $visit->id)->first();
        $this->assertNotNull($rx);
        $this->assertStringStartsWith('RX-', $rx->prescription_number);
        $this->assertCount(2, $rx->items);
    }
}
