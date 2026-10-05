<?php

namespace App\Core\Enums;

enum LeaveType: string
{
    case Annual = 'ANNUAL';
    case Sick = 'SICK';
    case Casual = 'CASUAL';
    case Maternity = 'MATERNITY';
    case Paternity = 'PATERNITY';
    case Unpaid = 'UNPAID';

    public function label(): string
    {
        return match ($this) {
            self::Annual => 'Annual Paid Leave',
            self::Sick => 'Medical / Sick Leave',
            self::Casual => 'Casual / Emergency Leave',
            self::Maternity => 'Maternity Leave',
            self::Paternity => 'Paternity Leave',
            self::Unpaid => 'Unpaid Leave of Absence',
        };
    }
}
