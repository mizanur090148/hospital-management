<?php

namespace App\Core\Enums;

enum DispenseStatus: string
{
    case Pending = 'PENDING';
    case Dispensed = 'DISPENSED';
    case PartiallyDispensed = 'PARTIALLY_DISPENSED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending Dispensation',
            self::Dispensed => 'Dispensed (FEFO Stock Deducted)',
            self::PartiallyDispensed => 'Partially Dispensed',
            self::Cancelled => 'Dispensing Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Pending => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::Dispensed => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::PartiallyDispensed => 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
            self::Cancelled => 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        };
    }
}
