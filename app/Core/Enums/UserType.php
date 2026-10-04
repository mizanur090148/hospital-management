<?php

namespace App\Core\Enums;

enum UserType: string
{
    case SuperAdmin = 'super_admin';
    case HospitalAdmin = 'hospital_admin';
    case BranchAdmin = 'branch_admin';
    case Doctor = 'doctor';
    case Nurse = 'nurse';
    case Pharmacist = 'pharmacist';
    case LabTechnician = 'lab_technician';
    case Radiologist = 'radiologist';
    case Accountant = 'accountant';
    case Staff = 'staff';
    case Patient = 'patient';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'SaaS Super Admin',
            self::HospitalAdmin => 'Hospital Admin',
            self::BranchAdmin => 'Branch Admin',
            self::Doctor => 'Doctor / Physician',
            self::Nurse => 'Nurse',
            self::Pharmacist => 'Pharmacist',
            self::LabTechnician => 'Lab Technician',
            self::Radiologist => 'Radiologist',
            self::Accountant => 'Accountant',
            self::Staff => 'Hospital Staff',
            self::Patient => 'Patient',
        };
    }

    public function isStaff(): bool
    {
        return $this !== self::Patient;
    }
}
