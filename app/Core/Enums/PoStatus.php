<?php

namespace App\Core\Enums;

enum PoStatus: string
{
    case Draft = 'DRAFT';
    case Issued = 'ISSUED';
    case PartiallyReceived = 'PARTIALLY_RECEIVED';
    case Received = 'RECEIVED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft Purchase Order',
            self::Issued => 'Issued to Vendor',
            self::PartiallyReceived => 'Partially Received (Pending Balance)',
            self::Received => 'Goods Fully Received',
            self::Cancelled => 'Order Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Draft => 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            self::Issued => 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
            self::PartiallyReceived => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::Received => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Cancelled => 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
        };
    }
}
