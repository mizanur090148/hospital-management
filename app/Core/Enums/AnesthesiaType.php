<?php

namespace App\Core\Enums;

enum AnesthesiaType: string
{
    case General = 'GENERAL';
    case Spinal = 'SPINAL';
    case Epidural = 'EPIDURAL';
    case Local = 'LOCAL';
    case Sedation = 'SEDATION';
    case None = 'NONE';

    public function label(): string
    {
        return match ($this) {
            self::General => 'General Anesthesia (GA)',
            self::Spinal => 'Spinal Subarachnoid Block',
            self::Epidural => 'Epidural Anesthesia',
            self::Local => 'Local Infiltration',
            self::Sedation => 'Monitored Anesthesia Care (MAC) / Sedation',
            self::None => 'No Anesthesia Required',
        };
    }
}
