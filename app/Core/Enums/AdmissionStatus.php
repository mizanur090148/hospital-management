<?php

namespace App\Core\Enums;

enum AdmissionStatus: string
{
    case Admitted = 'ADMITTED';
    case Discharged = 'DISCHARGED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Admitted => 'Admitted (Inpatient)',
            self::Discharged => 'Discharged',
            self::Cancelled => 'Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Admitted => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Discharged => 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
            self::Cancelled => 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
        };
    }
}
