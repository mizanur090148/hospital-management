<?php

namespace App\Core\Enums;

enum NursingShift: string
{
    case Morning = 'MORNING';
    case Evening = 'EVENING';
    case Night = 'NIGHT';

    public function label(): string
    {
        return match ($this) {
            self::Morning => 'Morning Shift (07:00 - 15:00)',
            self::Evening => 'Evening Shift (15:00 - 23:00)',
            self::Night => 'Night Shift (23:00 - 07:00)',
        };
    }
}
