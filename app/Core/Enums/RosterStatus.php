<?php

namespace App\Core\Enums;

enum RosterStatus: string
{
    case Scheduled = 'SCHEDULED';
    case Completed = 'COMPLETED';
    case Absent = 'ABSENT';
    case Swapped = 'SWAPPED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => 'Scheduled',
            self::Completed => 'Completed Shift',
            self::Absent => 'Absent',
            self::Swapped => 'Shift Swapped',
            self::Cancelled => 'Cancelled',
        };
    }
}
