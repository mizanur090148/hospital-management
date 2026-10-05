<?php

namespace App\Core\Enums;

enum PayrollStatus: string
{
    case Draft = 'DRAFT';
    case Approved = 'APPROVED';
    case Paid = 'PAID';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft Run',
            self::Approved => 'Approved by Finance',
            self::Paid => 'Disbursed / Paid',
            self::Cancelled => 'Cancelled',
        };
    }
}
