<?php

namespace App\Core\Enums;

enum EmergencyStatus: string
{
    case Triaged = 'TRIAGED';
    case InTreatment = 'IN_TREATMENT';
    case AdmittedToIpd = 'ADMITTED_TO_IPD';
    case Discharged = 'DISCHARGED';
    case Deceased = 'DECEASED';

    public function label(): string
    {
        return match ($this) {
            self::Triaged => 'Triaged / Waiting',
            self::InTreatment => 'In Active Treatment / Trauma Bay',
            self::AdmittedToIpd => 'Admitted to Inpatient Ward',
            self::Discharged => 'Discharged from ER',
            self::Deceased => 'Deceased / Resuscitation Terminated',
        };
    }
}
