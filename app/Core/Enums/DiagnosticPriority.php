<?php

namespace App\Core\Enums;

enum DiagnosticPriority: string
{
    case Routine = 'ROUTINE';
    case Urgent = 'URGENT';
    case Stat = 'STAT';

    public function label(): string
    {
        return match ($this) {
            self::Routine => 'Routine Standard',
            self::Urgent => 'Urgent Priority',
            self::Stat => 'STAT (Immediate Emergency)',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Routine => 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            self::Urgent => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::Stat => 'bg-rose-600 text-white font-bold animate-pulse',
        };
    }
}
