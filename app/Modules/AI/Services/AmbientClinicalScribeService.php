<?php

namespace App\Modules\AI\Services;

use App\Core\Enums\AuditAction;
use App\Core\Sequences\SequenceGenerator;
use App\Modules\AI\Models\AiScribeSession;
use App\Modules\Audit\Services\AuditImmutabilityService;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Patient\Models\Patient;
use Illuminate\Support\Facades\Request;

class AmbientClinicalScribeService
{
    public function __construct(
        protected SequenceGenerator $sequenceGenerator,
        protected PhiSanitizerService $phiSanitizer,
        protected ClinicalAiEngineService $aiEngine,
        protected MedicalRagRetrieverService $ragRetriever,
        protected AuditImmutabilityService $auditImmutabilityService
    ) {}

    /**
     * Start a new ambient clinical scribe session.
     */
    public function startSession(
        string $tenantId,
        ?string $doctorId = null,
        ?string $patientId = null,
        ?string $opdVisitId = null,
        ?string $admissionId = null
    ): AiScribeSession {
        $sessionNumber = $this->sequenceGenerator->generateScribeSessionNumber($tenantId);

        return AiScribeSession::create([
            'tenant_id' => $tenantId,
            'doctor_id' => $doctorId,
            'patient_id' => $patientId,
            'opd_visit_id' => $opdVisitId,
            'admission_id' => $admissionId,
            'session_number' => $sessionNumber,
            'status' => 'RECORDING',
            'model_used' => 'clinical-scribe-v1',
            'audio_duration_seconds' => 0,
            'tokens_used' => 0,
        ]);
    }

    /**
     * Process clinical transcript, sanitize PHI, query RAG context, and generate structured SOAP note.
     */
    public function processTranscript(
        AiScribeSession $session,
        string $rawTranscript,
        int $audioDurationSeconds = 0
    ): AiScribeSession {
        $patient = $session->patient_id ? Patient::find($session->patient_id) : null;

        // 1. Sanitize PHI
        $sanitized = $this->phiSanitizer->sanitize($rawTranscript, $patient);

        // 2. Query RAG knowledge for matching hospital clinical guidelines
        $ragContext = $this->ragRetriever->retrieveContextForPrompt($session->tenant_id, $rawTranscript);

        // 3. Generate structured SOAP note
        $soapNote = $this->aiEngine->generateSoapNote($sanitized['sanitized_text'], $ragContext);

        // 4. Update session
        $session->update([
            'raw_transcript' => $rawTranscript,
            'sanitized_transcript' => $sanitized['sanitized_text'],
            'structured_soap' => $soapNote,
            'audio_duration_seconds' => $audioDurationSeconds,
            'tokens_used' => $soapNote['estimated_tokens'] ?? 0,
            'status' => 'GENERATED',
            'metadata' => [
                'redactions_count' => count($sanitized['redaction_map'] ?? []),
                'rag_context_used' => ! empty($ragContext),
            ],
        ]);

        return $session;
    }

    /**
     * Commit the approved structured SOAP note directly into the patient's EHR (OPD Visit / IPD Admission).
     */
    public function commitToClinicalRecord(AiScribeSession $session, array $overrideData = []): array
    {
        $soap = $overrideData['structured_soap'] ?? $session->structured_soap ?? [];

        // Update linked OPD Encounter if present
        if ($session->opd_visit_id) {
            $visit = OpdVisit::find($session->opd_visit_id);
            if ($visit) {
                $primaryIcd10 = $soap['icd10_codes'][0]['code'] ?? 'Z00.00';
                $primaryDesc = $soap['icd10_codes'][0]['description'] ?? 'Encounter examined';

                $clinicalNotes = "--- AI SCRIBE STRUCTURED SOAP ({$session->session_number}) ---\n".
                    '[SUBJECTIVE]: '.($soap['subjective'] ?? '')."\n".
                    '[OBJECTIVE]: '.($soap['objective'] ?? '')."\n".
                    '[ASSESSMENT]: '.($soap['assessment'] ?? '')."\n".
                    '[PLAN]: '.($soap['plan'] ?? '');

                $existingDiagnoses = is_array($visit->diagnoses) ? $visit->diagnoses : [];
                $existingDiagnoses[] = [
                    'code' => $primaryIcd10,
                    'description' => $primaryDesc,
                    'type' => 'PRIMARY',
                ];

                $visit->update([
                    'diagnoses' => $existingDiagnoses,
                    'clinical_notes' => $visit->clinical_notes ? $visit->clinical_notes."\n\n".$clinicalNotes : $clinicalNotes,
                ]);
            }
        }

        // Set session status to COMMITTED
        $session->update([
            'status' => 'COMMITTED',
            'committed_at' => now(),
        ]);

        // Record immutable audit trail
        $this->auditImmutabilityService->recordHashChainedLog([
            'tenant_id' => $session->tenant_id,
            'user_id' => $session->doctor?->user_id,
            'action' => AuditAction::Update,
            'entity_type' => AiScribeSession::class,
            'entity_id' => $session->id,
            'old_values' => ['status' => 'GENERATED'],
            'new_values' => [
                'status' => 'COMMITTED',
                'session_number' => $session->session_number,
                'opd_visit_id' => $session->opd_visit_id,
            ],
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);

        return [
            'status' => 'COMMITTED',
            'session' => $session,
            'visit_id' => $session->opd_visit_id,
        ];
    }
}
