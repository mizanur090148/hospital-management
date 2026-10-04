<?php

namespace App\Core\Enums;

enum BedStatus: string
{
    case Available = 'available';
    case Occupied = 'occupied';
    case Reserved = 'reserved';
    case Cleaning = 'cleaning';
    case Maintenance = 'maintenance';

    public function label(): string
    {
        return match ($this) {
            self::Available => 'Available',
            self::Occupied => 'Occupied',
            self::Reserved => 'Reserved',
            self::Cleaning => 'Under Cleaning',
            self::Maintenance => 'Under Maintenance',
        };
    }

    public function badgeVariant(): string
    {
        return match ($this) {
            self::Available => 'success',
            self::Occupied => 'destructive',
            self::Reserved => 'warning',
            self::Cleaning => 'cyan',
            self::Maintenance => 'default',
        };
    }

    public function isAvailable(): bool
    {
        return $this === self::Available;
    }
}
