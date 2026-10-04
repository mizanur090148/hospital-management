<?php

namespace App\Core\Enums;

enum PrescriptionStatus: string
{
    case Draft = 'DRAFT';
    case Finalized = 'FINALIZED';
    case Dispensed = 'DISPENSED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Finalized => 'Finalized / Active',
            self::Dispensed => 'Dispensed (Pharmacy)',
            self::Cancelled => 'Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Draft => 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
            self::Finalized => 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Dispensed => 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
            self::Cancelled => 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
        };
    }
}
