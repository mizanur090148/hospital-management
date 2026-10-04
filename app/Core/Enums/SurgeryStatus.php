<?php

namespace App\Core\Enums;

enum SurgeryStatus: string
{
    case Scheduled = 'SCHEDULED';
    case PreOp = 'PRE_OP';
    case InProgress = 'IN_PROGRESS';
    case PostOp = 'POST_OP';
    case Completed = 'COMPLETED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => 'Scheduled in OT',
            self::PreOp => 'Pre-Operative Holding Bay',
            self::InProgress => 'In Intra-Operative Procedure',
            self::PostOp => 'PACU / Recovery Bay',
            self::Completed => 'Procedure Concluded',
            self::Cancelled => 'Surgery Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Scheduled => 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
            self::PreOp => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::InProgress => 'bg-rose-600 text-white font-bold animate-pulse',
            self::PostOp => 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
            self::Completed => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Cancelled => 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        };
    }
}
