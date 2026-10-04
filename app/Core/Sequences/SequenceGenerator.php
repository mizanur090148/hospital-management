<?php

namespace App\Core\Sequences;

use App\Modules\Appointment\Models\Appointment;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\LabSample;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\Emergency\Models\EmergencyAdmission;
use App\Modules\IPD\Models\Admission;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Opd\Models\Prescription;
use App\Modules\OperationTheatre\Models\Surgery;
use App\Modules\Patient\Models\Patient;

class SequenceGenerator
{
    /**
     * Generate sequential MRN: MRN-YYYY-000001
     */
    public static function generateMrn(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "MRN-{$year}-";

        $latest = Patient::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('mrn', 'like', "{$prefix}%")
            ->orderByDesc('mrn')
            ->value('mrn');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Appointment Number: APT-YYYY-000001
     */
    public static function generateAppointmentNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "APT-{$year}-";

        $latest = Appointment::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('appointment_number', 'like', "{$prefix}%")
            ->orderByDesc('appointment_number')
            ->value('appointment_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential OPD Visit Number: OPD-YYYY-000001
     */
    public static function generateVisitNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "OPD-{$year}-";

        $latest = OpdVisit::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('visit_number', 'like', "{$prefix}%")
            ->orderByDesc('visit_number')
            ->value('visit_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Prescription Number: RX-YYYY-000001
     */
    public static function generatePrescriptionNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "RX-{$year}-";

        $latest = Prescription::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('prescription_number', 'like', "{$prefix}%")
            ->orderByDesc('prescription_number')
            ->value('prescription_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential IPD Admission Number: IPD-YYYY-000001
     */
    public static function generateIpdNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "IPD-{$year}-";

        $latest = Admission::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('ipd_number', 'like', "{$prefix}%")
            ->orderByDesc('ipd_number')
            ->value('ipd_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Emergency Record Number: ER-YYYY-000001
     */
    public static function generateErNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "ER-{$year}-";

        $latest = EmergencyAdmission::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('er_number', 'like', "{$prefix}%")
            ->orderByDesc('er_number')
            ->value('er_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Lab Order Number: LAB-YYYY-000001
     */
    public static function generateLabOrderNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "LAB-{$year}-";

        $latest = LabOrder::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('order_number', 'like', "{$prefix}%")
            ->orderByDesc('order_number')
            ->value('order_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Sample Barcode: SMP-YYYY-000001
     */
    public static function generateSampleBarcode(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "SMP-{$year}-";

        $latest = LabSample::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('sample_barcode', 'like', "{$prefix}%")
            ->orderByDesc('sample_barcode')
            ->value('sample_barcode');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Radiology Order Number: RAD-YYYY-000001
     */
    public static function generateRadiologyOrderNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "RAD-{$year}-";

        $latest = RadiologyOrder::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('order_number', 'like', "{$prefix}%")
            ->orderByDesc('order_number')
            ->value('order_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Surgery Number: SUR-YYYY-000001
     */
    public static function generateSurgeryNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "SUR-{$year}-";

        $latest = Surgery::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('surgery_number', 'like', "{$prefix}%")
            ->orderByDesc('surgery_number')
            ->value('surgery_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }
}
