<?php

namespace App\Core\Enums;

enum AccountType: string
{
    case Asset = 'ASSET';
    case Liability = 'LIABILITY';
    case Equity = 'EQUITY';
    case Revenue = 'REVENUE';
    case Expense = 'EXPENSE';

    public function normalBalance(): string
    {
        return match ($this) {
            self::Asset, self::Expense => 'DEBIT',
            self::Liability, self::Equity, self::Revenue => 'CREDIT',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Asset => 'Asset',
            self::Liability => 'Liability',
            self::Equity => 'Equity',
            self::Revenue => 'Operating Revenue',
            self::Expense => 'Operating Expense',
        };
    }
}
