<?php

namespace App\Core\Enums;

enum PatientStatus: string
{
    case Active = 'ACTIVE';
    case Inactive = 'INACTIVE';
    case Deceased = 'DECEASED';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Inactive => 'Inactive',
            self::Deceased => 'Deceased',
        };
    }
}
