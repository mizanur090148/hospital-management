<?php

namespace App\Core\Enums;

enum BloodGroup: string
{
    case APositive = 'A+';
    case ANegative = 'A-';
    case BPositive = 'B+';
    case BNegative = 'B-';
    case ABPositive = 'AB+';
    case ABNegative = 'AB-';
    case OPositive = 'O+';
    case ONegative = 'O-';
    case Unknown = 'UNKNOWN';

    public function label(): string
    {
        return match ($this) {
            self::APositive => 'A+',
            self::ANegative => 'A-',
            self::BPositive => 'B+',
            self::BNegative => 'B-',
            self::ABPositive => 'AB+',
            self::ABNegative => 'AB-',
            self::OPositive => 'O+',
            self::ONegative => 'O-',
            self::Unknown => 'Unknown',
        };
    }
}
