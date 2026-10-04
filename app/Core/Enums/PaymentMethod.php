<?php

namespace App\Core\Enums;

enum PaymentMethod: string
{
    case Cash = 'CASH';
    case CreditCard = 'CREDIT_CARD';
    case DebitCard = 'DEBIT_CARD';
    case BankTransfer = 'BANK_TRANSFER';
    case MobileMoney = 'MOBILE_MONEY';
    case InsuranceDirect = 'INSURANCE_DIRECT';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Cash in Hand',
            self::CreditCard => 'Credit Card',
            self::DebitCard => 'Debit Card',
            self::BankTransfer => 'Bank Transfer / Wire',
            self::MobileMoney => 'Mobile Money (M-Pesa/Apple Pay)',
            self::InsuranceDirect => 'Direct Insurance Settlement',
        };
    }
}
