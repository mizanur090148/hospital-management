<?php

namespace App\Core\Enums;

enum TriageLevel: string
{
    case Esi1Resuscitation = 'ESI_1';
    case Esi2Emergent = 'ESI_2';
    case Esi3Urgent = 'ESI_3';
    case Esi4LessUrgent = 'ESI_4';
    case Esi5NonUrgent = 'ESI_5';

    public function label(): string
    {
        return match ($this) {
            self::Esi1Resuscitation => 'ESI 1: Resuscitation (Immediate Life Threat)',
            self::Esi2Emergent => 'ESI 2: Emergent (High Risk / Severe Pain)',
            self::Esi3Urgent => 'ESI 3: Urgent (Moderate Risk, Needs Multiple Resources)',
            self::Esi4LessUrgent => 'ESI 4: Less Urgent (Stable, Needs 1 Resource)',
            self::Esi5NonUrgent => 'ESI 5: Non-Urgent (Routine Minor Complaint)',
        };
    }

    public function shortLabel(): string
    {
        return match ($this) {
            self::Esi1Resuscitation => 'ESI 1 - Resuscitation',
            self::Esi2Emergent => 'ESI 2 - Emergent',
            self::Esi3Urgent => 'ESI 3 - Urgent',
            self::Esi4LessUrgent => 'ESI 4 - Less Urgent',
            self::Esi5NonUrgent => 'ESI 5 - Non-Urgent',
        };
    }

    public function colorClass(): string
    {
        return match ($this) {
            self::Esi1Resuscitation => 'bg-red-600 text-white animate-pulse',
            self::Esi2Emergent => 'bg-orange-500 text-white',
            self::Esi3Urgent => 'bg-amber-400 text-slate-900',
            self::Esi4LessUrgent => 'bg-emerald-500 text-white',
            self::Esi5NonUrgent => 'bg-blue-500 text-white',
        };
    }
}
