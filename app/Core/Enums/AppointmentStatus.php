<?php

namespace App\Core\Enums;

enum AppointmentStatus: string
{
    case Scheduled = 'SCHEDULED';
    case Confirmed = 'CONFIRMED';
    case CheckedIn = 'CHECKED_IN';
    case InConsultation = 'IN_CONSULTATION';
    case Completed = 'COMPLETED';
    case Cancelled = 'CANCELLED';
    case NoShow = 'NO_SHOW';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => 'Scheduled',
            self::Confirmed => 'Confirmed',
            self::CheckedIn => 'Checked-In / In Waiting Room',
            self::InConsultation => 'In Consultation',
            self::Completed => 'Completed',
            self::Cancelled => 'Cancelled',
            self::NoShow => 'No Show',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Scheduled => 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
            self::Confirmed => 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
            self::CheckedIn => 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
            self::InConsultation => 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
            self::Completed => 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Cancelled => 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
            self::NoShow => 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        };
    }
}
