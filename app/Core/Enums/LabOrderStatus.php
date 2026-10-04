<?php

namespace App\Core\Enums;

enum LabOrderStatus: string
{
    case Ordered = 'ORDERED';
    case SampleCollected = 'SAMPLE_COLLECTED';
    case InAnalysis = 'IN_ANALYSIS';
    case Verified = 'VERIFIED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Ordered => 'Requisition Placed',
            self::SampleCollected => 'Specimen Collected',
            self::InAnalysis => 'In Laboratory Analysis',
            self::Verified => 'Verified by Pathologist',
            self::Cancelled => 'Order Cancelled',
        };
    }

    public function badgeClass(): string
    {
        return match ($this) {
            self::Ordered => 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
            self::SampleCollected => 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
            self::InAnalysis => 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
            self::Verified => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
            self::Cancelled => 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        };
    }
}
