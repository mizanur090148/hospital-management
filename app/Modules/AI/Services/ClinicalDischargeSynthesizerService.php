<?php

namespace App\Modules\AI\Services;

use App\Core\Enums\AuditAction;
use App\Core\Sequences\SequenceGenerator;
use App\Modules\AI\Models\ClinicalSummary;
use App\Modules\Audit\Services\AuditImmutabilityService;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\IPD\Models\Admission;
use App\Modules\Nursing\Models\NursingNote;
use App\Modules\Opd\Models\Prescription;
use Illuminate\Support\Facades\Request;

class ClinicalDischargeSynthesizerService
{
    public function __construct(
        protected SequenceGenerator $sequenceGenerator,
        protected ClinicalAiEngineService $aiEngine,
        protected AuditImmutabilityService $auditImmutabilityService
    ) {}

    /**
     * Synthesize a formal Discharge Summary for an admitted patient by aggregating clinical data.
     */
    public function synthesizeForAdmission(Admission $admission): ClinicalSummary
    {
        $tenantId = $admission->tenant_id;
        $patient = $admission->patient;

        // 1. Gather recent nursing vitals
        $latestNote = NursingNote::where('admission_id', $admission->id)
            ->latest('created_at')
            ->first();

        $vitals = $latestNote?->vitals ?? [
            'blood_pressure' => '120/80 mmHg',
            'pulse_rate' => '74 bpm',
            'spo2' => '98%',
            'temperature' => '36.8 C',
        ];

        // 2. Gather lab orders
        $labOrders = LabOrder::where('patient_id', $admission->patient_id)
            ->with('items.results')
            ->limit(10)
            ->get();

        $labResults = [];
        foreach ($labOrders as $lo) {
            foreach ($lo->items as $item) {
                if ($item->results) {
                    foreach ($item->results as $res) {
                        $labResults[] = [
                            'parameter' => $res->parameter_name ?? $item->test_name,
                            'value' => $res->observed_value,
                            'is_panic' => (bool) $res->critical_flag,
                        ];
                    }
                }
            }
        }

        // 3. Gather radiology orders
        $radOrders = RadiologyOrder::where('patient_id', $admission->patient_id)
            ->where(function ($q) {
                $q->whereNotNull('findings')->orWhereNotNull('impression');
            })
            ->with('template')
            ->limit(5)
            ->get();

        $radReports = [];
        foreach ($radOrders as $ro) {
            $findingsText = $ro->findings ?? $ro->impression ?? '';
            $radReports[] = [
                'modality' => $ro->template?->modality ?? 'Radiology',
                'findings' => substr($findingsText, 0, 150),
            ];
        }

        // 4. Gather active prescriptions
        $prescription = Prescription::where('patient_id', $admission->patient_id)
            ->with('items.medicine')
            ->latest()
            ->first();

        $activeMeds = [];
        if ($prescription && $prescription->items) {
            foreach ($prescription->items as $item) {
                $activeMeds[] = [
                    'medicine_name' => $item->medicine?->brand_name ?? 'Medication',
                    'dosage' => $item->dosage,
                    'frequency' => $item->frequency,
                ];
            }
        }

        // 5. Run AI synthesis
        $synthesis = $this->aiEngine->synthesizeDischargeSummary([
            'patient' => [
                'first_name' => $patient?->first_name ?? 'Patient',
                'last_name' => $patient?->last_name ?? '',
                'mrn' => $patient?->mrn ?? 'UNKNOWN',
            ],
            'admission' => [
                'reason_for_admission' => $admission->admitting_diagnosis ?? 'Inpatient Admission',
                'admission_date' => $admission->admitted_at ? $admission->admitted_at->toDateString() : date('Y-m-d'),
            ],
            'latest_vitals' => $vitals,
            'lab_results' => $labResults,
            'radiology_reports' => $radReports,
            'active_medications' => $activeMeds,
        ]);

        $summaryNumber = $this->sequenceGenerator->generateSummaryNumber($tenantId);

        $summary = ClinicalSummary::create([
            'tenant_id' => $tenantId,
            'patient_id' => $admission->patient_id,
            'admission_id' => $admission->id,
            'doctor_id' => $admission->attending_doctor_id ?? $admission->doctor_id,
            'summary_number' => $summaryNumber,
            'summary_type' => 'DISCHARGE_SUMMARY',
            'chief_complaint' => $synthesis['chief_complaint'],
            'hospital_course' => $synthesis['hospital_course'],
            'diagnostic_summary' => $synthesis['diagnostic_summary'],
            'medication_plan' => $synthesis['medication_plan'],
            'follow_up_instructions' => $synthesis['follow_up_instructions'],
            'full_content' => $synthesis,
            'status' => 'DRAFT',
        ]);

        // Record immutable audit trail
        $this->auditImmutabilityService->recordHashChainedLog([
            'tenant_id' => $tenantId,
            'user_id' => $admission->attendingDoctor?->user_id ?? $admission->doctor?->user_id,
            'action' => AuditAction::Create,
            'entity_type' => ClinicalSummary::class,
            'entity_id' => $summary->id,
            'old_values' => null,
            'new_values' => [
                'summary_number' => $summaryNumber,
                'patient_id' => $admission->patient_id,
                'admission_id' => $admission->id,
                'status' => 'DRAFT',
            ],
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);

        return $summary;
    }

    /**
     * Physician review, edit, and formal approval of the clinical summary.
     */
    public function approveSummary(ClinicalSummary $summary, Doctor $doctor, array $updates = []): ClinicalSummary
    {
        $updatePayload = array_merge($updates, [
            'status' => 'PHYSICIAN_APPROVED',
            'doctor_id' => $doctor->id,
            'approved_at' => now(),
        ]);

        $summary->update($updatePayload);

        // Record immutable audit trail
        $this->auditImmutabilityService->recordHashChainedLog([
            'tenant_id' => $summary->tenant_id,
            'user_id' => $doctor->user_id,
            'action' => AuditAction::Update,
            'entity_type' => ClinicalSummary::class,
            'entity_id' => $summary->id,
            'old_values' => ['status' => 'DRAFT'],
            'new_values' => [
                'status' => 'PHYSICIAN_APPROVED',
                'doctor_id' => $doctor->id,
                'approved_at' => now()->toIso8601String(),
            ],
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);

        return $summary;
    }
}
