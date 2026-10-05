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
use App\Modules\Pharmacy\Models\GoodsReceiptNote;
use App\Modules\Pharmacy\Models\PharmacyDispensing;
use App\Modules\Pharmacy\Models\PurchaseOrder;
use Illuminate\Support\Facades\DB;

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

    /**
     * Generate sequential Purchase Order Number: PO-YYYY-000001
     */
    public static function generatePoNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "PO-{$year}-";

        $latest = PurchaseOrder::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('po_number', 'like', "{$prefix}%")
            ->orderByDesc('po_number')
            ->value('po_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Goods Receipt Note Number: GRN-YYYY-000001
     */
    public static function generateGrnNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "GRN-{$year}-";

        $latest = GoodsReceiptNote::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('grn_number', 'like', "{$prefix}%")
            ->orderByDesc('grn_number')
            ->value('grn_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Pharmacy Dispense Receipt Number: DSP-YYYY-000001
     */
    public static function generateDispenseNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "DSP-{$year}-";

        $latest = PharmacyDispensing::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('dispense_number', 'like', "{$prefix}%")
            ->orderByDesc('dispense_number')
            ->value('dispense_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Invoice Number: INV-YYYY-000001
     */
    public static function generateInvoiceNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "INV-{$year}-";

        $latest = DB::table('invoices')
            ->where('tenant_id', $tenantId)
            ->where('invoice_number', 'like', "{$prefix}%")
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Receipt Number: RCP-YYYY-000001
     */
    public static function generateReceiptNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "RCP-{$year}-";

        $latest = DB::table('payments')
            ->where('tenant_id', $tenantId)
            ->where('receipt_number', 'like', "{$prefix}%")
            ->orderByDesc('receipt_number')
            ->value('receipt_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Journal Entry Number: JE-YYYY-000001
     */
    public static function generateJournalEntryNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "JE-{$year}-";

        $latest = DB::table('journal_entries')
            ->where('tenant_id', $tenantId)
            ->where('entry_number', 'like', "{$prefix}%")
            ->orderByDesc('entry_number')
            ->value('entry_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Insurance Claim Number: CLM-YYYY-000001
     */
    public static function generateClaimNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "CLM-{$year}-";

        $latest = DB::table('insurance_claims')
            ->where('tenant_id', $tenantId)
            ->where('claim_number', 'like', "{$prefix}%")
            ->orderByDesc('claim_number')
            ->value('claim_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Payslip Number: PAY-YYYY-000001
     */
    public static function generatePayslipNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "PAY-{$year}-";

        $latest = DB::table('payrolls')
            ->where('tenant_id', $tenantId)
            ->where('payslip_number', 'like', "{$prefix}%")
            ->orderByDesc('payslip_number')
            ->value('payslip_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Clinical Document Number: DOC-YYYY-000001
     */
    public static function generateDocumentNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "DOC-{$year}-";

        $latest = DB::table('clinical_documents')
            ->where('tenant_id', $tenantId)
            ->where('document_number', 'like', "{$prefix}%")
            ->orderByDesc('document_number')
            ->value('document_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential AI Ambient Scribe Session Number: SCRIBE-YYYY-000001
     */
    public static function generateScribeSessionNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "SCRIBE-{$year}-";

        $latest = DB::table('ai_scribe_sessions')
            ->where('tenant_id', $tenantId)
            ->where('session_number', 'like', "{$prefix}%")
            ->orderByDesc('session_number')
            ->value('session_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential Clinical Summary Number: SUMM-YYYY-000001
     */
    public static function generateSummaryNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "SUMM-{$year}-";

        $latest = DB::table('clinical_summaries')
            ->where('tenant_id', $tenantId)
            ->where('summary_number', 'like', "{$prefix}%")
            ->orderByDesc('summary_number')
            ->value('summary_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential SaaS Subscription Number: SUB-YYYY-000001
     */
    public static function generateSubscriptionNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "SUB-{$year}-";

        $latest = DB::table('saas_subscriptions')
            ->where('tenant_id', $tenantId)
            ->where('subscription_number', 'like', "{$prefix}%")
            ->orderByDesc('subscription_number')
            ->value('subscription_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }

    /**
     * Generate sequential SaaS Subscription Invoice Number: SINV-YYYY-000001
     */
    public static function generateSubscriptionInvoiceNumber(string $tenantId): string
    {
        $year = date('Y');
        $prefix = "SINV-{$year}-";

        $latest = DB::table('saas_subscription_invoices')
            ->where('tenant_id', $tenantId)
            ->where('invoice_number', 'like', "{$prefix}%")
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%06d', $prefix, $nextNumber);
    }
}
