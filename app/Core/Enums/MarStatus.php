<?php

namespace App\Core\Enums;

enum MarStatus: string
{
    case Given = 'GIVEN';
    case Refused = 'REFUSED';
    case Held = 'HELD';
    case Missed = 'MISSED';

    public function label(): string
    {
        return match ($this) {
            self::Given => 'Administered / Given',
            self::Refused => 'Patient Refused',
            self::Held => 'Held on Clinical Judgment',
            self::Missed => 'Missed Dose',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Given => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Refused => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::Held => 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
            self::Missed => 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
        };
    }
}
