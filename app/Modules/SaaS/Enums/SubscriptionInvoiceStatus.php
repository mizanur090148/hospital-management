<?php

namespace App\Modules\SaaS\Enums;

enum SubscriptionInvoiceStatus: string
{
    case Pending = 'PENDING';
    case Paid = 'PAID';
    case Failed = 'FAILED';
    case Void = 'VOID';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending Payment',
            self::Paid => 'Paid',
            self::Failed => 'Payment Failed',
            self::Void => 'Void / Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Pending => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::Paid => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Failed => 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
            self::Void => 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        };
    }
}
