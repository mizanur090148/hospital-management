<?php

namespace App\Modules\SaaS\Enums;

enum BillingCycle: string
{
    case Monthly = 'MONTHLY';
    case Annual = 'ANNUAL';

    public function label(): string
    {
        return match ($this) {
            self::Monthly => 'Monthly Billing',
            self::Annual => 'Annual Billing (Save 20%)',
        };
    }

    public function months(): int
    {
        return match ($this) {
            self::Monthly => 1,
            self::Annual => 12,
        };
    }
}
