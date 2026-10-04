<?php

namespace App\Core\Enums;

enum AuditAction: string
{
    case Create = 'create';
    case Update = 'update';
    case Delete = 'delete';
    case View = 'view';
    case Login = 'login';
    case Logout = 'logout';
    case Export = 'export';
    case Override = 'override';

    public function label(): string
    {
        return match ($this) {
            self::Create => 'Created Record',
            self::Update => 'Updated Record',
            self::Delete => 'Deleted Record',
            self::View => 'Viewed Record',
            self::Login => 'Logged In',
            self::Logout => 'Logged Out',
            self::Export => 'Exported Data',
            self::Override => 'Emergency Override',
        };
    }
}
