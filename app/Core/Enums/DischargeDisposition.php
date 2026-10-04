<?php

namespace App\Core\Enums;

enum DischargeDisposition: string
{
    case Home = 'HOME';
    case Transferred = 'TRANSFERRED';
    case AgainstMedicalAdvice = 'AGAINST_MEDICAL_ADVICE';
    case Expired = 'EXPIRED';

    public function label(): string
    {
        return match ($this) {
            self::Home => 'Discharged Home (Routine)',
            self::Transferred => 'Transferred to Tertiary Center',
            self::AgainstMedicalAdvice => 'Discharged Against Medical Advice (DAMA)',
            self::Expired => 'Deceased / Expired',
        };
    }
}
