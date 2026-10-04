<?php

namespace App\Core\Enums;

enum AdmissionType: string
{
    case Elective = 'ELECTIVE';
    case Emergency = 'EMERGENCY';
    case Transfer = 'TRANSFER';
    case Newborn = 'NEWBORN';

    public function label(): string
    {
        return match ($this) {
            self::Elective => 'Elective Planned Admission',
            self::Emergency => 'Emergency Admission',
            self::Transfer => 'Hospital / Facility Transfer',
            self::Newborn => 'Newborn / Neonatal Admission',
        };
    }
}
