<?php

namespace App\Core\Enums;

enum WarehouseType: string
{
    case Central = 'CENTRAL';
    case Outpatient = 'OUTPATIENT';
    case InpatientSatellite = 'INPATIENT_SATELLITE';
    case EmergencyStore = 'EMERGENCY_STORE';

    public function label(): string
    {
        return match ($this) {
            self::Central => 'Central Main Medical Warehouse',
            self::Outpatient => 'Outpatient (OPD) Pharmacy Counter',
            self::InpatientSatellite => 'Inpatient (IPD) Satellite Dispensing',
            self::EmergencyStore => 'Emergency Crash Cart & ER Store',
        };
    }
}
