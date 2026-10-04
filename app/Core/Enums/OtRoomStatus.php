<?php

namespace App\Core\Enums;

enum OtRoomStatus: string
{
    case Available = 'AVAILABLE';
    case Occupied = 'OCCUPIED';
    case Cleaning = 'CLEANING';
    case Maintenance = 'MAINTENANCE';

    public function label(): string
    {
        return match ($this) {
            self::Available => 'Available / Sterilized',
            self::Occupied => 'In Surgical Procedure',
            self::Cleaning => 'Post-Op Terminal Cleaning',
            self::Maintenance => 'Biomedical Maintenance',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Available => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Occupied => 'bg-rose-600 text-white font-bold animate-pulse',
            self::Cleaning => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::Maintenance => 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        };
    }
}
