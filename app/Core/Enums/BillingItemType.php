<?php

namespace App\Core\Enums;

enum BillingItemType: string
{
    case OpdConsultation = 'OPD_CONSULTATION';
    case IpdBedCharges = 'IPD_BED_CHARGES';
    case EmergencyFee = 'EMERGENCY_FEE';
    case LabTest = 'LAB_TEST';
    case RadiologyScan = 'RADIOLOGY_SCAN';
    case OtSurgery = 'OT_SURGERY';
    case PharmacyDispense = 'PHARMACY_DISPENSE';
    case GeneralService = 'GENERAL_SERVICE';

    public function defaultAccountCode(): string
    {
        return match ($this) {
            self::OpdConsultation => '4001',
            self::IpdBedCharges => '4002',
            self::EmergencyFee => '4003',
            self::LabTest => '4004',
            self::RadiologyScan => '4005',
            self::OtSurgery => '4006',
            self::PharmacyDispense => '4007',
            self::GeneralService => '4008',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::OpdConsultation => 'OPD Doctor Consultation Fee',
            self::IpdBedCharges => 'Inpatient Bed & Room Charges',
            self::EmergencyFee => 'Emergency Trauma Triage Fee',
            self::LabTest => 'Laboratory Diagnostic Test',
            self::RadiologyScan => 'Radiology & Imaging Scan',
            self::OtSurgery => 'Operation Theatre & Surgical Procedure',
            self::PharmacyDispense => 'Pharmacy Medication Dispensing',
            self::GeneralService => 'General Hospital Service / Nursing',
        };
    }
}
