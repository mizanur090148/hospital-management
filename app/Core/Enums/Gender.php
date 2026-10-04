<?php

namespace App\Core\Enums;

enum Gender: string
{
    case Male = 'MALE';
    case Female = 'FEMALE';
    case Other = 'OTHER';

    public function label(): string
    {
        return match ($this) {
            self::Male => 'Male',
            self::Female => 'Female',
            self::Other => 'Other / Non-Binary',
        };
    }
}
