<?php

namespace App\Core\Enums;

enum AppointmentType: string
{
    case OPD = 'OPD';
    case FollowUp = 'FOLLOW_UP';
    case Emergency = 'EMERGENCY';
    case Teleconsultation = 'TELECONSULTATION';

    public function label(): string
    {
        return match ($this) {
            self::OPD => 'OPD General Consultation',
            self::FollowUp => 'Follow-up Consultation',
            self::Emergency => 'Emergency Assessment',
            self::Teleconsultation => 'Teleconsultation / Video',
        };
    }
}
