<?php

namespace App\Core\Enums;

enum RadiologyModality: string
{
    case XRay = 'XRAY';
    case CtScan = 'CT_SCAN';
    case Mri = 'MRI';
    case Ultrasound = 'ULTRASOUND';
    case Mammography = 'MAMMOGRAPHY';
    case Dexa = 'DEXA';

    public function label(): string
    {
        return match ($this) {
            self::XRay => 'Digital Radiography (X-Ray)',
            self::CtScan => 'Computed Tomography (CT Scan)',
            self::Mri => 'Magnetic Resonance Imaging (MRI)',
            self::Ultrasound => 'Diagnostic Ultrasonography (USG)',
            self::Mammography => 'Digital Mammography',
            self::Dexa => 'Bone Densitometry (DEXA)',
        };
    }
}
