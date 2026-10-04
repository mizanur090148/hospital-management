<?php

namespace App\Core\Enums;

enum LabSampleStatus: string
{
    case Pending = 'PENDING';
    case Collected = 'COLLECTED';
    case Rejected = 'REJECTED';
    case Analyzed = 'ANALYZED';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Collection Pending',
            self::Collected => 'Specimen Collected',
            self::Rejected => 'Specimen Rejected / Hemolyzed',
            self::Analyzed => 'Analysis Concluded',
        };
    }
}
