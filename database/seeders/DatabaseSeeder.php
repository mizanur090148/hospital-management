<?php

namespace Database\Seeders;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AdmissionType;
use App\Core\Enums\AnesthesiaType;
use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\AppointmentType;
use App\Core\Enums\BedStatus;
use App\Core\Enums\BillingItemType;
use App\Core\Enums\BloodGroup;
use App\Core\Enums\ClaimStatus;
use App\Core\Enums\DepartmentType;
use App\Core\Enums\DiagnosticPriority;
use App\Core\Enums\DoctorStatus;
use App\Core\Enums\DosageForm;
use App\Core\Enums\EmergencyStatus;
use App\Core\Enums\Gender;
use App\Core\Enums\LabOrderStatus;
use App\Core\Enums\LabSampleStatus;
use App\Core\Enums\MarStatus;
use App\Core\Enums\NursingShift;
use App\Core\Enums\OtRoomStatus;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\PaymentMethod;
use App\Core\Enums\PoStatus;
use App\Core\Enums\PrescriptionStatus;
use App\Core\Enums\RadiologyModality;
use App\Core\Enums\RadiologyOrderStatus;
use App\Core\Enums\SurgeryStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\TriageLevel;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Enums\VisitStatus;
use App\Core\Enums\WarehouseType;
use App\Modules\Accounting\Services\DoubleEntryAccountingService;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Auth\Models\User;
use App\Modules\Billing\Models\InsuranceClaim;
use App\Modules\Billing\Models\InsurancePolicy;
use App\Modules\Billing\Models\InsuranceProvider;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Clinical\Models\DoctorSchedule;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\LabOrderItem;
use App\Modules\Diagnostics\Models\LabResult;
use App\Modules\Diagnostics\Models\LabSample;
use App\Modules\Diagnostics\Models\LabTestTemplate;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\Diagnostics\Models\RadiologyTemplate;
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
use App\Modules\OperationTheatre\Models\OperationTheatre;
use App\Modules\OperationTheatre\Models\Surgery;
use App\Modules\Patient\Models\Patient;
use App\Modules\Pharmacy\Models\GoodsReceiptNote;
use App\Modules\Pharmacy\Models\GoodsReceiptNoteItem;
use App\Modules\Pharmacy\Models\Medicine;
use App\Modules\Pharmacy\Models\MedicineBatch;
use App\Modules\Pharmacy\Models\PurchaseOrder;
use App\Modules\Pharmacy\Models\PurchaseOrderItem;
use App\Modules\Pharmacy\Models\Supplier;
use App\Modules\Pharmacy\Models\Warehouse;
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

        // ==========================================
        // 11. PHASE 5 SEEDING: DIAGNOSTICS & OT
        // ==========================================

        // A. Seed Laboratory Test Templates
        $cbcTemplate = LabTestTemplate::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'CBC-DIFF'], [
            'id' => (string) Str::uuid(),
            'name' => 'Complete Blood Count with 5-Part Differential (CBC)',
            'category' => 'Hematology',
            'sample_type' => 'Whole Blood (EDTA)',
            'price' => 45.00,
            'turnaround_time_hours' => 4,
            'reference_ranges' => [
                ['parameter' => 'Hemoglobin', 'range' => '13.5 - 17.5', 'unit' => 'g/dL', 'gender' => 'MALE'],
                ['parameter' => 'White Blood Cell (WBC)', 'range' => '4.5 - 11.0', 'unit' => 'x10^3/uL'],
                ['parameter' => 'Platelet Count', 'range' => '150 - 450', 'unit' => 'x10^3/uL'],
                ['parameter' => 'Hematocrit (Hct)', 'range' => '41.0 - 50.0', 'unit' => '%'],
            ],
            'is_active' => true,
        ]);

        $cmpTemplate = LabTestTemplate::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'CMP-METAB'], [
            'id' => (string) Str::uuid(),
            'name' => 'Comprehensive Metabolic Panel (CMP)',
            'category' => 'Biochemistry',
            'sample_type' => 'Serum (SST Gold)',
            'price' => 65.00,
            'turnaround_time_hours' => 6,
            'reference_ranges' => [
                ['parameter' => 'Fasting Blood Glucose', 'range' => '70 - 99', 'unit' => 'mg/dL'],
                ['parameter' => 'Serum Creatinine', 'range' => '0.7 - 1.3', 'unit' => 'mg/dL'],
                ['parameter' => 'Blood Urea Nitrogen (BUN)', 'range' => '7 - 20', 'unit' => 'mg/dL'],
                ['parameter' => 'Serum Potassium (K+)', 'range' => '3.5 - 5.0', 'unit' => 'mEq/L'],
            ],
            'is_active' => true,
        ]);

        $lipidTemplate = LabTestTemplate::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'LIPID-FULL'], [
            'id' => (string) Str::uuid(),
            'name' => 'Fasting Lipid Profile with Calculated LDL',
            'category' => 'Biochemistry',
            'sample_type' => 'Serum (SST Gold)',
            'price' => 50.00,
            'turnaround_time_hours' => 6,
            'reference_ranges' => [
                ['parameter' => 'Total Cholesterol', 'range' => '< 200', 'unit' => 'mg/dL'],
                ['parameter' => 'HDL Cholesterol', 'range' => '> 40', 'unit' => 'mg/dL'],
                ['parameter' => 'LDL Cholesterol', 'range' => '< 100', 'unit' => 'mg/dL'],
                ['parameter' => 'Serum Triglycerides', 'range' => '< 150', 'unit' => 'mg/dL'],
            ],
            'is_active' => true,
        ]);

        // Seed an Active Lab Order for Patient 1 with items and sample
        $labOrder1 = LabOrder::firstOrCreate([
            'tenant_id' => $tenant->id,
            'order_number' => 'LAB-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'patient_id' => $patient1->id,
            'ordering_doctor_id' => $doctorVance->id,
            'encounter_type' => 'OPD',
            'priority' => DiagnosticPriority::Urgent,
            'clinical_notes' => 'Evaluation of exertional dyspnea and hypertension surveillance',
            'status' => LabOrderStatus::InAnalysis,
            'ordered_at' => now()->subHours(3),
        ]);

        $labItem1 = LabOrderItem::firstOrCreate([
            'tenant_id' => $tenant->id,
            'lab_order_id' => $labOrder1->id,
            'template_id' => $cbcTemplate->id,
        ], [
            'id' => (string) Str::uuid(),
            'test_name' => $cbcTemplate->name,
            'price' => $cbcTemplate->price,
            'status' => 'IN_ANALYSIS',
        ]);

        $sample1 = LabSample::firstOrCreate([
            'tenant_id' => $tenant->id,
            'lab_order_id' => $labOrder1->id,
            'sample_barcode' => 'SMP-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'sample_type' => 'Whole Blood (EDTA)',
            'collected_by_user_id' => $nurseUser->id,
            'collected_at' => now()->subHours(2),
            'status' => LabSampleStatus::Collected,
        ]);

        // Results for Lab Item 1
        LabResult::firstOrCreate([
            'tenant_id' => $tenant->id,
            'lab_order_item_id' => $labItem1->id,
            'parameter_name' => 'Hemoglobin',
        ], [
            'id' => (string) Str::uuid(),
            'observed_value' => '14.8',
            'reference_range' => '13.5 - 17.5',
            'unit' => 'g/dL',
            'is_abnormal' => false,
            'critical_flag' => false,
            'status' => 'DRAFT',
        ]);

        LabResult::firstOrCreate([
            'tenant_id' => $tenant->id,
            'lab_order_item_id' => $labItem1->id,
            'parameter_name' => 'White Blood Cell (WBC)',
        ], [
            'id' => (string) Str::uuid(),
            'observed_value' => '11.8',
            'reference_range' => '4.5 - 11.0',
            'unit' => 'x10^3/uL',
            'is_abnormal' => true,
            'critical_flag' => false,
            'pathologist_notes' => 'Mild neutrophilic leukocytosis noted.',
            'status' => 'DRAFT',
        ]);

        // B. Seed Radiology Master Templates
        $cxrTemplate = RadiologyTemplate::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'RAD-CXR-PA'], [
            'id' => (string) Str::uuid(),
            'name' => 'Digital Chest Radiography (X-Ray) PA & Lateral Views',
            'modality' => RadiologyModality::XRay,
            'body_part' => 'Thorax / Chest',
            'price' => 120.00,
            'instructions' => 'Patient standing upright with deep inspiratory hold.',
            'is_active' => true,
        ]);

        $mriTemplate = RadiologyTemplate::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'RAD-MRI-BRAIN'], [
            'id' => (string) Str::uuid(),
            'name' => 'Magnetic Resonance Imaging (MRI) Brain with Diffusion/FLAIR',
            'modality' => RadiologyModality::Mri,
            'body_part' => 'Head & Brain',
            'price' => 680.00,
            'instructions' => 'Screen for metallic implants and pacemaker before entering magnet zone.',
            'is_active' => true,
        ]);

        $usgTemplate = RadiologyTemplate::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'RAD-USG-ABDO'], [
            'id' => (string) Str::uuid(),
            'name' => 'Complete Abdominal & Pelvic Ultrasonography (USG)',
            'modality' => RadiologyModality::Ultrasound,
            'body_part' => 'Abdomen & Pelvis',
            'price' => 190.00,
            'instructions' => '6 hours overnight fasting required. Full bladder for pelvic examination.',
            'is_active' => true,
        ]);

        // Seed a Verified Radiology Order for Patient 1
        RadiologyOrder::firstOrCreate([
            'tenant_id' => $tenant->id,
            'order_number' => 'RAD-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'patient_id' => $patient1->id,
            'ordering_doctor_id' => $doctorVance->id,
            'template_id' => $cxrTemplate->id,
            'priority' => DiagnosticPriority::Routine,
            'clinical_indication' => 'Chronic cough and exertional dyspnea. Rule out cardiomegaly and consolidation.',
            'findings' => 'Normal cardiac silhouette and mediastinal contours. Clear bilateral lung fields without focal infiltrates, effusion, or pneumothorax. Diaphragmatic domes sharp and smooth.',
            'impression' => 'No acute cardiopulmonary disease. Normal posteroanterior chest radiography.',
            'radiologist_notes' => 'Compared with historical baseline.',
            'dicom_study_uid' => '1.2.840.113619.2.55.992817263',
            'reporting_doctor_id' => $doctorVance->id,
            'status' => RadiologyOrderStatus::Verified,
            'ordered_at' => now()->subDay(),
            'verified_at' => now()->subHours(6),
        ]);

        // C. Seed Operation Theatres
        $otSuiteAlpha = OperationTheatre::firstOrCreate(['tenant_id' => $tenant->id, 'branch_id' => $mainBranch->id, 'code' => 'OT-1'], [
            'id' => (string) Str::uuid(),
            'name' => 'Main Surgical Suite Alpha',
            'theatre_type' => 'Major OT',
            'floor' => '4th Floor - Surgical Wing',
            'status' => OtRoomStatus::Available,
            'is_active' => true,
        ]);

        $otSuiteCardiac = OperationTheatre::firstOrCreate(['tenant_id' => $tenant->id, 'branch_id' => $mainBranch->id, 'code' => 'OT-CARD'], [
            'id' => (string) Str::uuid(),
            'name' => 'Cardiovascular Surgical Suite Beta',
            'theatre_type' => 'Cardiac OT',
            'floor' => '4th Floor - Surgical Wing',
            'status' => OtRoomStatus::Available,
            'is_active' => true,
        ]);

        // Seed a Surgery with WHO Surgical Safety Checklist for Patient 3
        Surgery::firstOrCreate([
            'tenant_id' => $tenant->id,
            'surgery_number' => 'SUR-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'patient_id' => $patient3->id,
            'primary_surgeon_id' => $doctorVance->id,
            'operation_theatre_id' => $otSuiteCardiac->id,
            'procedure_name' => 'Coronary Angiography and Drug-Eluting Stent Placement',
            'anesthesia_type' => AnesthesiaType::Local,
            'scheduled_date' => date('Y-m-d'),
            'scheduled_start_time' => '10:00',
            'scheduled_end_time' => '12:00',
            'pre_op_diagnosis' => 'Severe 3-vessel coronary artery disease with unstable angina',
            'safety_checklist' => [
                'sign_in' => [
                    'patient_identity_confirmed' => true,
                    'site_marked' => true,
                    'anesthesia_machine_checked' => true,
                    'pulse_oximeter_functioning' => true,
                    'allergy_assessed' => true,
                ],
                'time_out' => [
                    'all_team_members_introduced' => true,
                    'patient_name_and_procedure_verified' => true,
                    'antibiotic_prophylaxis_given_60min' => true,
                    'essential_imaging_displayed' => true,
                ],
                'sign_out' => [
                    'nurse_confirms_procedure_name' => true,
                    'instruments_sponges_needles_counted' => true,
                    'specimen_labeled_correctly' => true,
                ],
            ],
            'status' => SurgeryStatus::Scheduled,
        ]);

        // ==========================================
        // 12. PHASE 6 SEEDING: PHARMACY & SUPPLY CHAIN
        // ==========================================

        // A. Seed Warehouses
        $centralStore = Warehouse::firstOrCreate(['tenant_id' => $tenant->id, 'branch_id' => $mainBranch->id, 'code' => 'CENTRAL-STORE'], [
            'id' => (string) Str::uuid(),
            'name' => 'Central Pharmaceutical Depot & Warehouse',
            'warehouse_type' => WarehouseType::Central->value,
            'is_active' => true,
        ]);

        $opdPharmacy = Warehouse::firstOrCreate(['tenant_id' => $tenant->id, 'branch_id' => $mainBranch->id, 'code' => 'OPD-PHARM'], [
            'id' => (string) Str::uuid(),
            'name' => 'Main Outpatient Dispensing Counter',
            'warehouse_type' => WarehouseType::Outpatient->value,
            'is_active' => true,
        ]);

        $erPharmacy = Warehouse::firstOrCreate(['tenant_id' => $tenant->id, 'branch_id' => $mainBranch->id, 'code' => 'ER-STORE'], [
            'id' => (string) Str::uuid(),
            'name' => 'Emergency & Trauma Fast-Track Store',
            'warehouse_type' => WarehouseType::EmergencyStore->value,
            'is_active' => true,
        ]);

        // B. Seed Suppliers
        $gskSupplier = Supplier::firstOrCreate(['tenant_id' => $tenant->id, 'name' => 'GlaxoSmithKline Healthcare Distribution'], [
            'id' => (string) Str::uuid(),
            'contact_person' => 'Marcus Holloway',
            'email' => 'orders@gsk-pharma.test',
            'phone' => '+1 (555) 882-9901',
            'tax_number' => 'VAT-GSK-9901',
            'address' => ['street' => '100 GSK Parkway, Research Triangle, NC'],
            'is_active' => true,
        ]);

        $pfizerSupplier = Supplier::firstOrCreate(['tenant_id' => $tenant->id, 'name' => 'Pfizer Biopharmaceuticals Logistics'], [
            'id' => (string) Str::uuid(),
            'contact_person' => 'Deborah Vance',
            'email' => 'logistics@pfizer-supply.test',
            'phone' => '+1 (555) 882-9902',
            'tax_number' => 'VAT-PFIZER-4482',
            'address' => ['street' => '235 East 42nd St, New York, NY'],
            'is_active' => true,
        ]);

        // C. Seed Medicines Master Catalog
        $amoxicillin = Medicine::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'MED-AMOX-625'], [
            'id' => (string) Str::uuid(),
            'generic_name' => 'Amoxicillin + Clavulanic Acid',
            'brand_name' => 'Augmentin 625mg',
            'dosage_form' => DosageForm::Tablet->value,
            'strength' => '625mg (500mg/125mg)',
            'uom' => 'Strip',
            'manufacturer' => 'GlaxoSmithKline',
            'requires_prescription' => true,
            'reorder_level' => 30,
            'is_active' => true,
        ]);

        $paracetamol = Medicine::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'MED-PARA-500'], [
            'id' => (string) Str::uuid(),
            'generic_name' => 'Paracetamol (Acetaminophen)',
            'brand_name' => 'Panadol Extra 500mg',
            'dosage_form' => DosageForm::Tablet->value,
            'strength' => '500mg',
            'uom' => 'Strip',
            'manufacturer' => 'GSK Consumer',
            'requires_prescription' => false,
            'reorder_level' => 100,
            'is_active' => true,
        ]);

        $omeprazole = Medicine::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'MED-OMEP-20'], [
            'id' => (string) Str::uuid(),
            'generic_name' => 'Omeprazole Delayed-Release',
            'brand_name' => 'Prilosec 20mg',
            'dosage_form' => DosageForm::Capsule->value,
            'strength' => '20mg',
            'uom' => 'Strip',
            'manufacturer' => 'AstraZeneca',
            'requires_prescription' => false,
            'reorder_level' => 40,
            'is_active' => true,
        ]);

        $ceftriaxone = Medicine::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'MED-CEFT-1G'], [
            'id' => (string) Str::uuid(),
            'generic_name' => 'Ceftriaxone Sodium',
            'brand_name' => 'Rocephin 1g IV/IM',
            'dosage_form' => DosageForm::Injection->value,
            'strength' => '1000mg',
            'uom' => 'Vial',
            'manufacturer' => 'Roche Pharmaceuticals',
            'requires_prescription' => true,
            'reorder_level' => 20,
            'is_active' => true,
        ]);

        $salbutamol = Medicine::firstOrCreate(['tenant_id' => $tenant->id, 'code' => 'MED-SALB-100'], [
            'id' => (string) Str::uuid(),
            'generic_name' => 'Salbutamol Sulfate (Albuterol)',
            'brand_name' => 'Ventolin HFA Inhaler',
            'dosage_form' => DosageForm::Inhaler->value,
            'strength' => '100mcg/actuation',
            'uom' => 'Bottle',
            'manufacturer' => 'GlaxoSmithKline',
            'requires_prescription' => true,
            'reorder_level' => 15,
            'is_active' => true,
        ]);

        // D. Seed Batches with Staggered Expiry to showcase FEFO (First Expiring, First Out)
        // Paracetamol Batch 1 (Near expiry: 45 days)
        MedicineBatch::firstOrCreate([
            'tenant_id' => $tenant->id,
            'warehouse_id' => $opdPharmacy->id,
            'medicine_id' => $paracetamol->id,
            'batch_number' => 'B-PARA-2026A',
        ], [
            'id' => (string) Str::uuid(),
            'expiry_date' => now()->addDays(45)->toDateString(),
            'purchase_cost' => 1.20,
            'selling_price' => 2.50,
            'quantity_on_hand' => 50,
            'quantity_reserved' => 0,
        ]);

        // Paracetamol Batch 2 (Far expiry: 365 days)
        MedicineBatch::firstOrCreate([
            'tenant_id' => $tenant->id,
            'warehouse_id' => $opdPharmacy->id,
            'medicine_id' => $paracetamol->id,
            'batch_number' => 'B-PARA-2026B',
        ], [
            'id' => (string) Str::uuid(),
            'expiry_date' => now()->addDays(365)->toDateString(),
            'purchase_cost' => 1.30,
            'selling_price' => 2.50,
            'quantity_on_hand' => 200,
            'quantity_reserved' => 0,
        ]);

        // Amoxicillin Batches
        MedicineBatch::firstOrCreate([
            'tenant_id' => $tenant->id,
            'warehouse_id' => $opdPharmacy->id,
            'medicine_id' => $amoxicillin->id,
            'batch_number' => 'B-AMOX-8819',
        ], [
            'id' => (string) Str::uuid(),
            'expiry_date' => now()->addDays(90)->toDateString(),
            'purchase_cost' => 8.50,
            'selling_price' => 14.00,
            'quantity_on_hand' => 80,
            'quantity_reserved' => 0,
        ]);

        // Ceftriaxone Vials in Central Store
        MedicineBatch::firstOrCreate([
            'tenant_id' => $tenant->id,
            'warehouse_id' => $centralStore->id,
            'medicine_id' => $ceftriaxone->id,
            'batch_number' => 'B-CEFT-5510',
        ], [
            'id' => (string) Str::uuid(),
            'expiry_date' => now()->addDays(180)->toDateString(),
            'purchase_cost' => 15.00,
            'selling_price' => 28.00,
            'quantity_on_hand' => 120,
            'quantity_reserved' => 0,
        ]);

        // E. Seed a Purchase Order & Goods Receipt Note (GRN)
        $po1 = PurchaseOrder::firstOrCreate([
            'tenant_id' => $tenant->id,
            'po_number' => 'PO-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'warehouse_id' => $centralStore->id,
            'supplier_id' => $gskSupplier->id,
            'order_date' => now()->subDays(5)->toDateString(),
            'expected_delivery_date' => now()->addDays(2)->toDateString(),
            'total_amount' => 1150.00,
            'status' => PoStatus::Received,
            'notes' => 'Bulk seasonal antibiotic and antipyretic restocking',
        ]);

        PurchaseOrderItem::firstOrCreate([
            'tenant_id' => $tenant->id,
            'purchase_order_id' => $po1->id,
            'medicine_id' => $amoxicillin->id,
        ], [
            'id' => (string) Str::uuid(),
            'quantity_ordered' => 100,
            'quantity_received' => 100,
            'unit_cost' => 8.50,
            'total_cost' => 850.00,
        ]);

        PurchaseOrderItem::firstOrCreate([
            'tenant_id' => $tenant->id,
            'purchase_order_id' => $po1->id,
            'medicine_id' => $paracetamol->id,
        ], [
            'id' => (string) Str::uuid(),
            'quantity_ordered' => 250,
            'quantity_received' => 250,
            'unit_cost' => 1.20,
            'total_cost' => 300.00,
        ]);

        // Goods Receipt Note (GRN)
        $grn1 = GoodsReceiptNote::firstOrCreate([
            'tenant_id' => $tenant->id,
            'grn_number' => 'GRN-2026-000001',
        ], [
            'id' => (string) Str::uuid(),
            'branch_id' => $mainBranch->id,
            'warehouse_id' => $centralStore->id,
            'purchase_order_id' => $po1->id,
            'supplier_id' => $gskSupplier->id,
            'received_date' => now()->subDays(2)->toDateString(),
            'invoice_number' => 'GSK-INV-9921',
            'received_by_user_id' => $pharmacistUser->id,
            'notes' => 'Delivered in good condition with cold chain logs intact.',
        ]);

        GoodsReceiptNoteItem::firstOrCreate([
            'tenant_id' => $tenant->id,
            'goods_receipt_note_id' => $grn1->id,
            'batch_number' => 'B-AMOX-8819',
        ], [
            'id' => (string) Str::uuid(),
            'medicine_id' => $amoxicillin->id,
            'expiry_date' => now()->addDays(90)->toDateString(),
            'quantity_received' => 80,
            'unit_cost' => 8.50,
            'selling_price' => 14.00,
        ]);

        // =========================================================================
        // 13. Phase 7: Billing, Insurance & Double-Entry Accounting
        // =========================================================================
        $accountingService = app(DoubleEntryAccountingService::class);
        $billingService = app(BillingService::class);

        // A. Ensure Standard Chart of Accounts
        $accountingService->ensureStandardChartOfAccounts($tenant->id);

        // B. Seed Insurance Providers
        $bcbs = InsuranceProvider::firstOrCreate([
            'tenant_id' => $tenant->id,
            'code' => 'BCBS-US',
        ], [
            'id' => (string) Str::uuid(),
            'name' => 'Blue Cross Blue Shield National',
            'contact_person' => 'Rachel Miller',
            'phone' => '+1 (800) 555-2277',
            'email' => 'claims@bcbs-national.test',
            'tax_id' => 'PAYER-BCBS-991',
            'is_active' => true,
        ]);

        $aetna = InsuranceProvider::firstOrCreate([
            'tenant_id' => $tenant->id,
            'code' => 'AETNA-01',
        ], [
            'id' => (string) Str::uuid(),
            'name' => 'Aetna Global Healthcare Group',
            'contact_person' => 'Marcus Thorne',
            'phone' => '+1 (800) 555-3388',
            'email' => 'adjudication@aetna-health.test',
            'tax_id' => 'PAYER-AET-552',
            'is_active' => true,
        ]);

        // C. Seed Patient Insurance Policies
        $patient1Policy = InsurancePolicy::firstOrCreate([
            'tenant_id' => $tenant->id,
            'patient_id' => $patient1->id,
            'policy_number' => 'POL-BCBS-883921',
        ], [
            'id' => (string) Str::uuid(),
            'insurance_provider_id' => $bcbs->id,
            'group_number' => 'GRP-CORP-401',
            'coverage_percentage' => 80.00,
            'copay_amount' => 25.00,
            'annual_limit' => 50000.00,
            'start_date' => now()->subMonths(6)->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
            'is_active' => true,
        ]);

        $patient2Policy = InsurancePolicy::firstOrCreate([
            'tenant_id' => $tenant->id,
            'patient_id' => $patient2->id,
            'policy_number' => 'POL-AET-449102',
        ], [
            'id' => (string) Str::uuid(),
            'insurance_provider_id' => $aetna->id,
            'group_number' => 'GRP-EXEC-902',
            'coverage_percentage' => 90.00,
            'copay_amount' => 15.00,
            'annual_limit' => 100000.00,
            'start_date' => now()->subMonths(3)->toDateString(),
            'end_date' => now()->addMonths(9)->toDateString(),
            'is_active' => true,
        ]);

        // D. Create Invoices through BillingService
        // Invoice 1: Patient 1 Outpatient visit (Consultation + Diagnostics)
        if (! Invoice::where('tenant_id', $tenant->id)->where('patient_id', $patient1->id)->exists()) {
            $inv1 = $billingService->createInvoice(
                tenantId: $tenant->id,
                branchId: $mainBranch->id,
                patientId: $patient1->id,
                invoiceDate: now()->toDateString(),
                items: [
                    [
                        'item_type' => BillingItemType::OpdConsultation->value,
                        'description' => 'Specialist Cardiology Consultation - Dr. Vance',
                        'quantity' => 1,
                        'unit_price' => 75.00,
                    ],
                    [
                        'item_type' => BillingItemType::LabTest->value,
                        'description' => 'Complete Blood Count (CBC) with Differential',
                        'quantity' => 1,
                        'unit_price' => 35.00,
                    ],
                    [
                        'item_type' => BillingItemType::GeneralService->value,
                        'description' => 'Electrocardiogram (ECG) 12-Lead Diagnostic',
                        'quantity' => 1,
                        'unit_price' => 50.00,
                    ],
                ],
                insurancePolicyId: $patient1Policy->id,
                dueDate: now()->addDays(30)->toDateString(),
                notes: 'Cardiology clinic consultation and baseline diagnostic workup',
                createdByUserId: $adminUser->id
            );

            // Settle patient co-pay / share via Cash
            if ($inv1->patient_due > 0) {
                $billingService->recordPayment(
                    invoice: $inv1,
                    amount: (float) $inv1->patient_due,
                    method: PaymentMethod::Cash,
                    transactionReference: 'CASH-POS-001',
                    notes: 'Front desk cashier settlement of patient co-pay portion',
                    cashierUserId: $adminUser->id
                );
            }
        }

        // Invoice 2: Patient 2 Inpatient / Emergency Admission
        if (! Invoice::where('tenant_id', $tenant->id)->where('patient_id', $patient2->id)->exists()) {
            $inv2 = $billingService->createInvoice(
                tenantId: $tenant->id,
                branchId: $mainBranch->id,
                patientId: $patient2->id,
                invoiceDate: now()->toDateString(),
                items: [
                    [
                        'item_type' => BillingItemType::EmergencyFee->value,
                        'description' => 'Level 1 Trauma Triage & Acute Resuscitation',
                        'quantity' => 1,
                        'unit_price' => 350.00,
                    ],
                    [
                        'item_type' => BillingItemType::RadiologyScan->value,
                        'description' => 'High-Resolution Chest CT Scan with Contrast',
                        'quantity' => 1,
                        'unit_price' => 450.00,
                    ],
                    [
                        'item_type' => BillingItemType::PharmacyDispense->value,
                        'description' => 'IV Paracetamol Infusion & Saline Packs',
                        'quantity' => 1,
                        'unit_price' => 45.00,
                    ],
                    [
                        'item_type' => BillingItemType::IpdBedCharges->value,
                        'description' => 'ICU Critical Telemetry Bed - 1 Day',
                        'quantity' => 1,
                        'unit_price' => 600.00,
                    ],
                ],
                insurancePolicyId: $patient2Policy->id,
                dueDate: now()->addDays(30)->toDateString(),
                notes: 'Acute trauma resuscitation and inpatient observation care',
                createdByUserId: $adminUser->id
            );

            // Patient pays patient due via Credit Card
            if ($inv2->patient_due > 0) {
                $billingService->recordPayment(
                    invoice: $inv2,
                    amount: (float) $inv2->patient_due,
                    method: PaymentMethod::CreditCard,
                    transactionReference: 'AUTH-VISA-9941',
                    notes: 'Point of Sale Visa card swipe for patient deductible',
                    cashierUserId: $adminUser->id
                );
            }

            // Settle the claim for Patient 2 to demonstrate insurance claim adjudication
            $claim = InsuranceClaim::where('invoice_id', $inv2->id)->first();
            if ($claim) {
                $billingService->adjudicateClaim(
                    claim: $claim,
                    newStatus: ClaimStatus::PartiallyApproved,
                    approvedAmount: round((float) $claim->claimed_amount - 50.00, 2),
                    disallowedAmount: 50.00,
                    notes: 'Partial disallowance on high contrast agent; remainder approved and settled to hospital primary account.',
                    adjudicatorUserId: $adminUser->id
                );
            }
        }
    }
}
