<?php

namespace App\Modules\SaaS\Enums;

enum SubscriptionStatus: string
{
    case Trialing = 'TRIALING';
    case Active = 'ACTIVE';
    case PastDue = 'PAST_DUE';
    case Suspended = 'SUSPENDED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Trialing => 'Free Trial',
            self::Active => 'Active',
            self::PastDue => 'Past Due (Grace Period)',
            self::Suspended => 'Suspended',
            self::Cancelled => 'Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Trialing => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::Active => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::PastDue => 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
            self::Suspended => 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
            self::Cancelled => 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        };
    }

    public function canAccessService(): bool
    {
        return in_array($this, [self::Trialing, self::Active, self::PastDue]);
    }
}
