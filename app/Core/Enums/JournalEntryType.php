<?php

namespace App\Core\Enums;

enum JournalEntryType: string
{
    case Debit = 'DEBIT';
    case Credit = 'CREDIT';

    public function label(): string
    {
        return match ($this) {
            self::Debit => 'Debit (DR)',
            self::Credit => 'Credit (CR)',
        };
    }
}
