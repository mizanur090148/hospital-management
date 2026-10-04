<?php

namespace App\Core\Enums;

enum DoctorStatus: string
{
    case Active = 'ACTIVE';
    case OnLeave = 'ON_LEAVE';
    case Inactive = 'INACTIVE';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active Duty',
            self::OnLeave => 'On Leave',
            self::Inactive => 'Inactive / Resigned',
        };
    }
}
