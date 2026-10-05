<?php

namespace App\Core\Enums;

enum AttendanceStatus: string
{
    case Present = 'PRESENT';
    case Late = 'LATE';
    case HalfDay = 'HALF_DAY';
    case Absent = 'ABSENT';
    case OnLeave = 'ON_LEAVE';

    public function label(): string
    {
        return match ($this) {
            self::Present => 'Present On Duty',
            self::Late => 'Late Arrival',
            self::HalfDay => 'Half Day',
            self::Absent => 'Absent Without Notice',
            self::OnLeave => 'On Approved Leave',
        };
    }
}
