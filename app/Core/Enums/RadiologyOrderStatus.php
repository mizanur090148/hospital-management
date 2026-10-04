<?php

namespace App\Core\Enums;

enum RadiologyOrderStatus: string
{
    case Ordered = 'ORDERED';
    case Scheduled = 'SCHEDULED';
    case Captured = 'CAPTURED';
    case Reported = 'REPORTED';
    case Verified = 'VERIFIED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Ordered => 'Order Requisitioned',
            self::Scheduled => 'Scan Scheduled',
            self::Captured => 'Imaging Acquired',
            self::Reported => 'Diagnostic Report Drafted',
            self::Verified => 'Report Verified & Signed',
            self::Cancelled => 'Order Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Ordered => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::Scheduled => 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
            self::Captured => 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
            self::Reported => 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
            self::Verified => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Cancelled => 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        };
    }
}
