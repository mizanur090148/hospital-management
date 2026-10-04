<?php

namespace App\Core\Enums;

enum DepartmentType: string
{
    case Clinical = 'clinical';
    case Diagnostic = 'diagnostic';
    case Support = 'support';
    case Administrative = 'administrative';

    public function label(): string
    {
        return match ($this) {
            self::Clinical => 'Clinical / Medical',
            self::Diagnostic => 'Diagnostic / Lab & Imaging',
            self::Support => 'Clinical Support & Nursing',
            self::Administrative => 'Administrative & Finance',
        };
    }
}
