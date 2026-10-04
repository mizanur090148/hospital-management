<?php

namespace App\Core\Enums;

enum TenantStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';
    case Trial = 'trial';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Suspended => 'Suspended',
            self::Trial => 'Trial',
            self::Cancelled => 'Cancelled',
        };
    }
}
