<?php

namespace Database\Seeders;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AdmissionType;
use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\AppointmentType;
use App\Core\Enums\BedStatus;
use App\Core\Enums\BloodGroup;
use App\Core\Enums\DepartmentType;
use App\Core\Enums\DoctorStatus;
use App\Core\Enums\EmergencyStatus;
use App\Core\Enums\Gender;
use App\Core\Enums\MarStatus;
use App\Core\Enums\NursingShift;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\PrescriptionStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\TriageLevel;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Enums\VisitStatus;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Auth\Models\User;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Clinical\Models\DoctorSchedule;
use App\Modules\Emergency\Models\EmergencyAdmission;
use App\Modules\Facility\Models\Bed;
use App\Modules\Facility\Models\Department;
use App\Modules\Facility\Models\Room;
use App\Modules\Facility\Models\Ward;
use App\Modules\IPD\Models\Admission;
use App\Modules\IPD\Models\BedAssignment;
use App\Modules\Nursing\Models\MedicationAdministration;
use App\Modules\Nursing\Models\NursingNote;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Opd\Models\Prescription;
use App\Modules\Opd\Models\PrescriptionItem;
use App\Modules\Patient\Models\Patient;
use App\Modules\RBAC\Models\Permission;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Core Permissions
        $permissions = [
            // Tenancy & Admin
            ['module' => 'tenancy', 'name' => 'Manage Tenant Settings', 'slug' => 'tenancy.manage'],
            ['module' => 'facility', 'name' => 'Manage Hospital Branches', 'slug' => 'branch.manage'],
            ['module' => 'facility', 'name' => 'Manage Departments & Wards', 'slug' => 'facility.manage'],
            ['module' => 'rbac', 'name' => 'Manage Roles & Permissions', 'slug' => 'rbac.manage'],
            ['module' => 'users', 'name' => 'Manage Hospital Staff', 'slug' => 'users.manage'],

            // Clinical & Encounters
            ['module' => 'clinical', 'name' => 'View Patient Records', 'slug' => 'patient.view'],
            ['module' => 'clinical', 'name' => 'Register New Patient', 'slug' => 'patient.create'],
            ['module' => 'clinical', 'name' => 'Update Patient Profile', 'slug' => 'patient.update'],
            ['module' => 'clinical', 'name' => 'Delete / Archive Patient', 'slug' => 'patient.delete'],
            ['module' => 'clinical', 'name' => 'Manage Doctor Schedules', 'slug' => 'doctor.schedule'],
            ['module' => 'clinical', 'name' => 'Book Appointment Slot', 'slug' => 'appointment.book'],
            ['module' => 'clinical', 'name' => 'Cancel / Reschedule Appointment', 'slug' => 'appointment.cancel'],
            ['module' => 'clinical', 'name' => 'Conduct OPD Consultation', 'slug' => 'opd.consult'],
            ['module' => 'clinical', 'name' => 'Admit IPD Inpatient', 'slug' => 'ipd.admit'],
            ['module' => 'clinical', 'name' => 'Discharge Inpatient', 'slug' => 'ipd.discharge'],
            ['module' => 'clinical', 'name' => 'Record Nursing Care & Vitals', 'slug' => 'nursing.chart'],

            // Pharmacy & Inventory
            ['module' => 'pharmacy', 'name' => 'View Medicine Catalog & Stock', 'slug' => 'pharmacy.view'],
            ['module' => 'pharmacy', 'name' => 'Dispense Prescription (FEFO)', 'slug' => 'pharmacy.dispense'],
            ['module' => 'pharmacy', 'name' => 'Adjust Medicine Stock Batches', 'slug' => 'pharmacy.stock_adjust'],
            ['module' => 'inventory', 'name' => 'Manage Warehouses & Reorders', 'slug' => 'inventory.manage'],

            // Diagnostics
            ['module' => 'laboratory', 'name' => 'Order Laboratory Tests', 'slug' => 'lab.order'],
            ['module' => 'laboratory', 'name' => 'Enter Lab Test Results', 'slug' => 'lab.result_entry'],
            ['module' => 'laboratory', 'name' => 'Verify & Release Lab Reports', 'slug' => 'lab.verify'],
            ['module' => 'radiology', 'name' => 'Order Radiology Imaging', 'slug' => 'radiology.order'],
            ['module' => 'radiology', 'name' => 'Report & Verify Radiology', 'slug' => 'radiology.verify'],

            // Billing & Financials
            ['module' => 'billing', 'name' => 'Create Invoices & Packages', 'slug' => 'billing.create'],
            ['module' => 'billing', 'name' => 'Process Cashier Payments', 'slug' => 'billing.pay'],
            ['module' => 'billing', 'name' => 'Process Invoicing Refunds', 'slug' => 'billing.refund'],
            ['module' => 'insurance', 'name' => 'Submit Insurance Claims', 'slug' => 'insurance.claim'],
            ['module' => 'accounting', 'name' => 'View General Ledger & Accounts', 'slug' => 'accounting.view'],

            // Governance & Audit
            ['module' => 'audit', 'name' => 'View Patient Audit Trail', 'slug' => 'audit.view'],
            ['module' => 'audit', 'name' => 'Export Compliance Reports', 'slug' => 'audit.export'],
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['slug' => $perm['slug']], [
                'id' => (string) Str::uuid(),
                'module' => $perm['module'],
                'name' => $perm['name'],
                'description' => "Enables {$perm['name']} capabilities",
            ]);
        }

        // 2. Seed SaaS Super Admin
        $superAdmin = User::firstOrCreate(['email' => 'admin@apexcare.io'], [
            'id' => (string) Str::uuid(),
            'tenant_id' => null,
            'branch_id' => null,
            'user_type' => UserType::SuperAdmin,
            'name' => 'Apex Platform Master Admin',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        // 3. Seed Demo Hospital Tenant
        $tenant = Tenant::firstOrCreate(['slug' => 'demo'], [
            'id' => (string) Str::uuid(),
            'legal_name' => 'Apollo Metropolitan Healthcare Ltd.',
            'trade_name' => 'Apollo Metropolitan Hospital',
            'domain' => 'apollo.hospital-mgt.test',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
            'settings' => [
                'currency' => 'USD',
                'timezone' => 'UTC',
                'language' => 'en',
                'tax_number' => 'US-MED-998877',
                'emergency_phone' => '+1-800-911-0000',
                'features' => ['opd', 'ipd', 'emergency', 'pharmacy', 'lab', 'radiology', 'billing', 'insurance'],
            ],
        ]);

        // 4. Seed Branches
        $mainBranch = Branch::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'MAIN'], [
            'id' => (string) Str::uuid(),
            'name' => 'Main Hospital Campus - Downtown',
            'phone' => '+1-800-555-0100',
            'email' => 'downtown@apollo-hospital.test',
            'address' => [
                'line1' => '742 Evergreen Medical Parkway',
                'city' => 'Metropolis',
                'state' => 'NY',
                'postal_code' => '10001',
                'country' => 'USA',
            ],
            'is_main' => true,
            'is_active' => true,
        ]);

        $northBranch = Branch::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'NORTH'], [
            'id' => (string) Str::uuid(),
            'name' => 'Northside Diagnostic & Specialty Clinic',
            'phone' => '+1-800-555-0102',
            'email' => 'northside@apollo-hospital.test',
            'address' => [
                'line1' => '108 North Medical Blvd',
                'city' => 'Metropolis',
                'state' => 'NY',
                'postal_code' => '10025',
                'country' => 'USA',
            ],
            'is_main' => false,
            'is_active' => true,
        ]);

        // 5. Seed Departments
        $cardio = Department::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'CARDIO'], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'name' => 'Cardiology & Vascular Medicine',
            'department_type' => DepartmentType::Clinical,
            'description' => 'Comprehensive cardiac care, catheterization, and post-op rehabilitation',
            'is_active' => true,
        ]);

        $emergency = Department::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'EMERGENCY'], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'name' => 'Emergency & Acute Trauma Care',
            'department_type' => DepartmentType::Clinical,
            'description' => '24/7 Level 1 Emergency Resuscitation and Rapid Triage',
            'is_active' => true,
        ]);

        $icuDept = Department::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'ICU'], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'name' => 'Intensive Care & Critical Life Support',
            'department_type' => DepartmentType::Clinical,
            'description' => 'Multi-parameter patient surveillance, mechanical ventilation and telemetry',
            'is_active' => true,
        ]);

        $labDept = Department::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'LAB'], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'name' => 'Central Diagnostic Pathology & Laboratory',
            'department_type' => DepartmentType::Diagnostic,
            'description' => 'Hematology, Biochemistry, Microbiology, and Molecular Diagnostics',
            'is_active' => true,
        ]);

        $pharmDept = Department::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'PHARM'], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'name' => 'Inpatient & Clinical Pharmacy',
            'department_type' => DepartmentType::Support,
            'description' => 'Formulary dispensing, IV admixture, and FEFO medication stock management',
            'is_active' => true,
        ]);

        // 6. Seed Tenant Roles
        $adminRole = Role::firstOrCreate(['tenant_id' => $tenant->id, 'slug' => 'hospital_admin'], [
            'id' => (string) Str::uuid(),
            'name' => 'Hospital Administrator',
            'guard_name' => 'web',
            'description' => 'Full administrative access across all hospital branches and clinical departments',
            'is_system' => true,
        ]);

        $doctorRole = Role::firstOrCreate(['tenant_id' => $tenant->id, 'slug' => 'doctor'], [
            'id' => (string) Str::uuid(),
            'name' => 'Doctor / Physician',
            'guard_name' => 'web',
            'description' => 'Clinical consultation, prescribing, and diagnostic requisition',
            'is_system' => true,
        ]);

        $nurseRole = Role::firstOrCreate(['tenant_id' => $tenant->id, 'slug' => 'nurse'], [
            'id' => (string) Str::uuid(),
            'name' => 'Registered Nurse',
            'guard_name' => 'web',
            'description' => 'Inpatient nursing care, vitals charting, medication administration',
            'is_system' => true,
        ]);

        $pharmacistRole = Role::firstOrCreate(['tenant_id' => $tenant->id, 'slug' => 'pharmacist'], [
            'id' => (string) Str::uuid(),
            'name' => 'Lead Pharmacist',
            'guard_name' => 'web',
            'description' => 'Dispensing and batch stock ledger management',
            'is_system' => true,
        ]);

        $labRole = Role::firstOrCreate(['tenant_id' => $tenant->id, 'slug' => 'lab_technician'], [
            'id' => (string) Str::uuid(),
            'name' => 'Laboratory Technician',
            'guard_name' => 'web',
            'description' => 'Specimen collection, analysis, and diagnostic result entry',
            'is_system' => true,
        ]);

        // Role permissions
        $adminRole->permissions()->sync(Permission::pluck('id'));
        $doctorRole->permissions()->sync(
            Permission::whereIn('slug', [
                'patient.view', 'appointment.book', 'appointment.cancel',
                'opd.consult', 'ipd.admit', 'ipd.discharge',
                'lab.order', 'radiology.order', 'pharmacy.view',
            ])->pluck('id')
        );
        $nurseRole->permissions()->sync(
            Permission::whereIn('slug', ['patient.view', 'nursing.chart', 'ipd.admit', 'pharmacy.view'])->pluck('id')
        );
        $pharmacistRole->permissions()->sync(
            Permission::whereIn('slug', ['pharmacy.view', 'pharmacy.dispense', 'pharmacy.stock_adjust', 'inventory.manage'])->pluck('id')
        );
        $labRole->permissions()->sync(
            Permission::whereIn('slug', ['lab.order', 'lab.result_entry', 'lab.verify'])->pluck('id')
        );

        // 7. Seed Staff Users
        $adminUser = User::firstOrCreate(['email' => 'admin@apollo.test'], [
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'branch_id' => $mainBranch->id,
            'department_id' => $emergency->id,
            'user_type' => UserType::HospitalAdmin,
            'name' => 'Dr. Sarah Rahman (Admin)',
            'phone' => '+1-555-010-9901',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);
        $adminUser->assignRole($adminRole);

        $doctorUser = User::firstOrCreate(['email' => 'doctor@apollo.test'], [
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'branch_id' => $mainBranch->id,
            'department_id' => $cardio->id,
            'user_type' => UserType::Doctor,
            'name' => 'Dr. Alexander Vance, MD',
            'phone' => '+1-555-010-9902',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);
        $doctorUser->assignRole($doctorRole);

        $nurseUser = User::firstOrCreate(['email' => 'nurse@apollo.test'], [
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'branch_id' => $mainBranch->id,
            'department_id' => $icuDept->id,
            'user_type' => UserType::Nurse,
            'name' => 'Elena Rostova, RN',
            'phone' => '+1-555-010-9903',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);
        $nurseUser->assignRole($nurseRole);

        $pharmacistUser = User::firstOrCreate(['email' => 'pharmacy@apollo.test'], [
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'branch_id' => $mainBranch->id,
            'department_id' => $pharmDept->id,
            'user_type' => UserType::Pharmacist,
            'name' => 'Johnathan Hayes, PharmD',
            'phone' => '+1-555-010-9904',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);
        $pharmacistUser->assignRole($pharmacistRole);

        // 8. Seed Wards, Rooms and Beds
        // ICU Ward
        $icuWard = Ward::firstOrCreate(['tenant_id' => $tenant->id, 'branch_id' => $mainBranch->id, 'code' => 'ICU-W'], [
            'id' => (string) Str::uuid(),
            'department_id' => $icuDept->id,
            'name' => 'Intensive Care Unit (Ward A)',
            'ward_type' => 'icu',
            'gender_allowed' => 'any',
            'floor' => '3rd Floor - East Wing',
            'is_active' => true,
        ]);

        $icuRoom1 = Room::firstOrCreate(['tenant_id' => $tenant->id, 'ward_id' => $icuWard->id, 'room_number' => 'ICU-301'], [
            'id' => (string) Str::uuid(),
            'room_type' => 'icu',
            'is_active' => true,
        ]);

        Bed::firstOrCreate(['tenant_id' => $tenant->id, 'room_id' => $icuRoom1->id, 'bed_number' => 'ICU-01'], [
            'id' => (string) Str::uuid(),
            'bed_type' => 'icu_ventilated',
            'daily_rate' => 1200.00,
            'status' => BedStatus::Occupied,
            'is_active' => true,
        ]);

        Bed::firstOrCreate(['tenant_id' => $tenant->id, 'room_id' => $icuRoom1->id, 'bed_number' => 'ICU-02'], [
            'id' => (string) Str::uuid(),
            'bed_type' => 'icu_ventilated',
            'daily_rate' => 1200.00,
            'status' => BedStatus::Available,
            'is_active' => true,
        ]);

        Bed::firstOrCreate(['tenant_id' => $tenant->id, 'room_id' => $icuRoom1->id, 'bed_number' => 'ICU-03'], [
            'id' => (string) Str::uuid(),
            'bed_type' => 'electric',
            'daily_rate' => 950.00,
            'status' => BedStatus::Cleaning,
            'is_active' => true,
        ]);

        // General Male Ward
        $maleGenWard = Ward::firstOrCreate(['tenant_id' => $tenant->id, 'branch_id' => $mainBranch->id, 'code' => 'MGEN'], [
            'id' => (string) Str::uuid(),
            'department_id' => $cardio->id,
            'name' => 'Cardiovascular Inpatient Ward (Male)',
            'ward_type' => 'general',
            'gender_allowed' => 'male',
            'floor' => '2nd Floor - North Wing',
            'is_active' => true,
        ]);

        $genRoom201 = Room::firstOrCreate(['tenant_id' => $tenant->id, 'ward_id' => $maleGenWard->id, 'room_number' => 'RM-201'], [
            'id' => (string) Str::uuid(),
            'room_type' => 'standard',
            'is_active' => true,
        ]);

        Bed::firstOrCreate(['tenant_id' => $tenant->id, 'room_id' => $genRoom201->id, 'bed_number' => 'BED-201A'], [
            'id' => (string) Str::uuid(),
            'bed_type' => 'fowler',
            'daily_rate' => 350.00,
            'status' => BedStatus::Available,
            'is_active' => true,
        ]);

        $bed201B = Bed::firstOrCreate(['tenant_id' => $tenant->id, 'room_id' => $genRoom201->id, 'bed_number' => 'BED-201B'], [
            'id' => (string) Str::uuid(),
            'bed_type' => 'standard',
            'daily_rate' => 300.00,
            'status' => BedStatus::Occupied,
            'is_active' => true,
        ]);

        Bed::firstOrCreate(['tenant_id' => $tenant->id, 'room_id' => $genRoom201->id, 'bed_number' => 'BED-201C'], [
            'id' => (string) Str::uuid(),
            'bed_type' => 'standard',
            'daily_rate' => 300.00,
            'status' => BedStatus::Available,
            'is_active' => true,
        ]);

        // ==========================================
        // 9. PHASE 3 SEEDING: CLINICAL CORE & OPD
        // ==========================================

        // A. Doctor Profile 1: Dr. Alexander Vance (Cardiology)
        $doctorVance = Doctor::firstOrCreate(['tenant_id' => $tenant->id, 'user_id' => $doctorUser->id], [
            'id' => (string) Str::uuid(),
            'department_id' => $cardio->id,
            'license_number' => 'MED-CARDIO-88219',
            'qualification' => 'MBBS, MD (Cardiology), FACC',
            'specialization' => 'Interventional Cardiology & Electrophysiology',
            'consultation_fee' => 75.00,
            'follow_up_fee' => 50.00,
            'emergency_fee' => 120.00,
            'bio' => 'Senior Consultant Cardiologist with 16+ years experience specializing in coronary interventions, cardiac pacing, and preventive cardiology.',
            'is_available_for_teleconsult' => true,
            'status' => DoctorStatus::Active,
        ]);

        // Weekly Schedules for Dr. Vance (Mon, Tue, Wed, Thu, Fri 09:00 - 13:00)
        for ($day = 1; $day <= 5; $day++) {
            DoctorSchedule::firstOrCreate([
                'tenant_id' => $tenant->id,
                'doctor_id' => $doctorVance->id,
                'day_of_week' => $day,
            ], [
                'id' => (string) Str::uuid(),
                'branch_id' => $mainBranch->id,
                'start_time' => '09:00',
                'end_time' => '13:00',
                'slot_duration_minutes' => 15,
                'max_patients' => 16,
                'is_active' => true,
            ]);
        }

        // B. Seed Demo Patients
        $patient1 = Patient::firstOrCreate(['tenant_id' => $tenant->id, 'mrn' => 'MRN-2026-000001'], [
            'id' => (string) Str::uuid(),
            'first_name' => 'James',
            'last_name' => 'Wilson',
            'dob' => '1968-05-14',
            'gender' => Gender::Male,
            'blood_group' => BloodGroup::OPositive,
            'phone' => '+1 (555) 234-8891',
            'email' => 'james.wilson@example.test',
            'national_id' => 'US-SSN-4491',
            'emergency_contact' => [
                'name' => 'Martha Wilson',
                'relationship' => 'Spouse',
                'phone' => '+1 (555) 234-8892',
            ],
            'address' => [
                'street' => '742 Evergreen Terrace',
                'city' => 'Springfield',
                'state' => 'IL',
                'postal_code' => '62704',
                'country' => 'USA',
            ],
            'allergies' => [
                ['substance' => 'Penicillin', 'severity' => 'Severe / Anaphylactic', 'reaction' => 'Urticaria & Bronchospasm'],
                ['substance' => 'Shellfish', 'severity' => 'Moderate', 'reaction' => 'Facial flushing'],
            ],
            'chronic_conditions' => [
                ['condition' => 'Essential Hypertension', 'diagnosed_year' => 2018, 'notes' => 'Controlled on ACE inhibitors'],
                ['condition' => 'Dyslipidemia', 'diagnosed_year' => 2021, 'notes' => 'Elevated LDL cholesterol'],
            ],
            'status' => PatientStatus::Active,
        ]);

        $patient2 = Patient::firstOrCreate(['tenant_id' => $tenant->id, 'mrn' => 'MRN-2026-000002'], [
            'id' => (string) Str::uuid(),
            'first_name' => 'Maria',
            'last_name' => 'Rodriguez',
            'dob' => '1992-09-22',
            'gender' => Gender::Female,
            'blood_group' => BloodGroup::APositive,
            'phone' => '+1 (555) 345-7712',
            'email' => 'maria.rodriguez@example.test',
            'national_id' => 'US-SSN-7712',
            'emergency_contact' => [
                'name' => 'Carlos Rodriguez',
                'relationship' => 'Brother',
                'phone' => '+1 (555) 345-7713',
            ],
            'address' => [
                'street' => '120 Ocean Drive',
                'city' => 'Miami',
                'state' => 'FL',
                'postal_code' => '33139',
                'country' => 'USA',
            ],
            'allergies' => [
                ['substance' => 'Sulfa Drugs', 'severity' => 'Moderate', 'reaction' => 'Skin rash'],
            ],
            'chronic_conditions' => [
                ['condition' => 'Bronchial Asthma', 'diagnosed_year' => 2015, 'notes' => 'Uses Albuterol PRN'],
            ],
            'status' => PatientStatus::Active,
        ]);

        $patient3 = Patient::firstOrCreate(['tenant_id' => $tenant->id, 'mrn' => 'MRN-2026-000003'], [
            'id' => (string) Str::uuid(),
            'first_name' => 'David',
            'last_name' => 'Kim',
            'dob' => '1981-11-03',
            'gender' => Gender::Male,
            'blood_group' => BloodGroup::BPositive,
            'phone' => '+1 (555) 890-1123',
            'email' => 'david.kim@example.test',
            'national_id' => 'US-SSN-8901',
            'emergency_contact' => [
                'name' => 'Grace Kim',
                'relationship' => 'Spouse',
                'phone' => '+1 (555) 890-1124',
            ],
            'address' => [
                'street' => '450 Pine Avenue',
                'city' => 'Seattle',
                'state' => 'WA',
                'postal_code' => '98101',
                'country' => 'USA',
            ],
            'allergies' => [],
            'chronic_conditions' => [
                ['condition' => 'Type 2 Diabetes Mellitus', 'diagnosed_year' => 2020, 'notes' => 'HbA1c 6.8% on Metformin'],
            ],
            'status' => PatientStatus::Active,
        ]);

        // C. Seed Appointments for Today
        $today = date('Y-m-d');

        // Appointment 1: Checked In (In Queue)
        $appt1 = Appointment::firstOrCreate([
            'tenant_id' => $tenant->id,
            'appointment_number' => 'APT-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'doctor_id' => $doctorVance->id,
            'patient_id' => $patient1->id,
            'appointment_date' => $today,
            'start_time' => '09:00',
            'end_time' => '09:15',
            'type' => AppointmentType::OPD,
            'status' => AppointmentStatus::CheckedIn,
            'reason_for_visit' => 'Routine cardiology follow-up and intermittent palpitations',
            'consultation_fee' => 75.00,
        ]);

        // Appointment 2: Scheduled
        Appointment::firstOrCreate([
            'tenant_id' => $tenant->id,
            'appointment_number' => 'APT-2026-000002',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'doctor_id' => $doctorVance->id,
            'patient_id' => $patient2->id,
            'appointment_date' => $today,
            'start_time' => '09:15',
            'end_time' => '09:30',
            'type' => AppointmentType::OPD,
            'status' => AppointmentStatus::Scheduled,
            'reason_for_visit' => 'Shortness of breath on exertion and mild chest tightness',
            'consultation_fee' => 75.00,
        ]);

        // D. Seed a Completed OPD Visit with Prescription for Patient 1
        $visit1 = OpdVisit::firstOrCreate([
            'tenant_id' => $tenant->id,
            'visit_number' => 'OPD-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'patient_id' => $patient1->id,
            'doctor_id' => $doctorVance->id,
            'appointment_id' => $appt1->id,
            'chief_complaint' => 'Mild substernal chest discomfort following moderate exertion',
            'history_of_present_illness' => 'Patient reports episodes of non-radiating dull ache lasting 2-3 minutes, relieved by resting. Denies diaphoresis or syncope.',
            'physical_examination' => 'S1, S2 present, regular rhythm without murmurs or gallops. Lungs clear to bilateral auscultation.',
            'clinical_notes' => 'ECG shows normal sinus rhythm at 72 bpm without ST-T changes. Baseline troponin ordered. Continue current antihypertensive regimen.',
            'vitals' => [
                'systolic' => 134,
                'diastolic' => 84,
                'pulse_rate' => 74,
                'temperature' => 98.4,
                'respiratory_rate' => 16,
                'spo2' => 98,
                'weight_kg' => 82,
                'height_cm' => 178,
                'bmi' => 25.9,
            ],
            'diagnoses' => [
                ['code' => 'I10', 'description' => 'Essential (primary) hypertension', 'is_primary' => true],
                ['code' => 'R07.9', 'description' => 'Chest pain, unspecified', 'is_primary' => false],
            ],
            'status' => VisitStatus::Completed,
            'arrived_at' => now()->subHours(2),
            'completed_at' => now()->subHour(),
        ]);

        // Digital Prescription with Items
        $rx1 = Prescription::firstOrCreate([
            'tenant_id' => $tenant->id,
            'prescription_number' => 'RX-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'patient_id' => $patient1->id,
            'doctor_id' => $doctorVance->id,
            'opd_visit_id' => $visit1->id,
            'advice' => 'Maintain low-sodium dietary intake. Avoid strenuous weight lifting until exercise stress test is concluded. Keep daily blood pressure log.',
            'follow_up_date' => now()->addDays(14)->format('Y-m-d'),
            'status' => PrescriptionStatus::Finalized,
        ]);

        PrescriptionItem::firstOrCreate([
            'prescription_id' => $rx1->id,
            'medicine_name' => 'Amlodipine Besylate 5mg',
        ], [
            'id' => (string) Str::uuid(),
            'dosage' => '1 Tablet',
            'frequency' => '1-0-0',
            'route' => 'ORAL',
            'duration_days' => 30,
            'instructions' => 'Take in the morning with water',
            'total_quantity' => 30,
        ]);

        PrescriptionItem::firstOrCreate([
            'prescription_id' => $rx1->id,
            'medicine_name' => 'Atorvastatin Calcium 20mg',
        ], [
            'id' => (string) Str::uuid(),
            'dosage' => '1 Tablet',
            'frequency' => '0-0-1',
            'route' => 'ORAL',
            'duration_days' => 30,
            'instructions' => 'Take at bedtime',
            'total_quantity' => 30,
        ]);

        // ==========================================
        // 10. PHASE 4 SEEDING: IPD, EMERGENCY & NURSING
        // ==========================================

        // A. Inpatient Admission (Patient 3 admitted into BED-201B)
        $admission1 = Admission::firstOrCreate([
            'tenant_id' => $tenant->id,
            'ipd_number' => 'IPD-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'patient_id' => $patient3->id,
            'attending_doctor_id' => $doctorVance->id,
            'admitting_department_id' => $cardio->id,
            'admission_type' => AdmissionType::Emergency,
            'admitting_diagnosis' => 'Unstable Angina & Severe Coronary Artery Disease',
            'initial_deposit' => 1500.00,
            'admitted_at' => now()->subDays(2),
            'status' => AdmissionStatus::Admitted,
        ]);

        // Bed Assignment for Admission 1
        $bedAssign1 = BedAssignment::firstOrCreate([
            'tenant_id' => $tenant->id,
            'admission_id' => $admission1->id,
            'bed_id' => $bed201B->id,
        ], [
            'id' => (string) Str::uuid(),
            'assigned_at' => now()->subDays(2),
            'is_active' => true,
        ]);

        // B. Nursing Shift Handover Note for Admission 1
        NursingNote::firstOrCreate([
            'tenant_id' => $tenant->id,
            'admission_id' => $admission1->id,
            'shift' => NursingShift::Morning,
        ], [
            'id' => (string) Str::uuid(),
            'nurse_user_id' => $nurseUser->id,
            'vitals' => [
                'bp' => '128/82',
                'pulse' => '72',
                'temp' => '98.6',
                'spo2' => '99',
                'resp_rate' => '16',
            ],
            'notes' => 'Patient resting comfortably in semi-fowler position. Continuous ECG telemetry displays sinus rhythm. IV saline lock patent. Morning medications administered without adverse reaction.',
            'intake_output' => [
                'oral_fluid_ml' => 450,
                'iv_fluid_ml' => 500,
                'urine_output_ml' => 600,
            ],
        ]);

        // C. Medication Administration Record (MAR)
        MedicationAdministration::firstOrCreate([
            'tenant_id' => $tenant->id,
            'admission_id' => $admission1->id,
            'medicine_name' => 'Enoxaparin Sodium (Lovenox) 40mg',
        ], [
            'id' => (string) Str::uuid(),
            'prescription_item_id' => null,
            'dose_given' => '40 mg / 0.4 mL',
            'route' => 'Subcutaneous',
            'administered_by_user_id' => $nurseUser->id,
            'administered_at' => now()->subHours(4),
            'status' => MarStatus::Given,
            'notes' => 'Administered in right lower abdominal quadrant. No hematoma observed.',
        ]);

        // D. Emergency Department Case (ESI Level 2 - Emergent)
        EmergencyAdmission::firstOrCreate([
            'tenant_id' => $tenant->id,
            'er_number' => 'ER-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'patient_id' => null,
            'anonymous_patient_name' => 'Trauma Patient - John Doe 104',
            'triage_level' => TriageLevel::Esi2Emergent,
            'chief_complaint' => 'Acute motor vehicle trauma with severe left-sided thoracic pain and dyspnea',
            'arrival_mode' => 'Ambulance',
            'trauma_type' => 'Blunt Force Trauma',
            'vitals' => [
                'bp' => '95/60',
                'pulse' => '118',
                'temp' => '97.8',
                'spo2' => '92',
                'gcs' => '14',
            ],
            'triage_notes' => 'Immediate trauma bay allocation. High flow oxygen applied. 2x large-bore IV access established.',
            'assigned_doctor_id' => $doctorVance->id,
            'status' => EmergencyStatus::InTreatment,
            'admitted_at' => now()->subMinutes(45),
        ]);
    }
}
