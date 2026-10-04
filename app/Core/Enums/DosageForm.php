<?php

namespace App\Core\Enums;

enum DosageForm: string
{
    case Tablet = 'TABLET';
    case Capsule = 'CAPSULE';
    case Syrup = 'SYRUP';
    case Injection = 'INJECTION';
    case Ointment = 'OINTMENT';
    case Drops = 'DROPS';
    case Inhaler = 'INHALER';
    case Suspension = 'SUSPENSION';

    public function label(): string
    {
        return match ($this) {
            self::Tablet => 'Tablet',
            self::Capsule => 'Capsule',
            self::Syrup => 'Syrup / Oral Liquid',
            self::Injection => 'Injection (IV/IM/SC)',
            self::Ointment => 'Topical Ointment / Cream',
            self::Drops => 'Drops (Eye/Ear/Nasal)',
            self::Inhaler => 'Aerosol Inhaler',
            self::Suspension => 'Oral Suspension',
        };
    }
}
