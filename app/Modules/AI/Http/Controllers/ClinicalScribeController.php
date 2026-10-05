<?php

namespace App\Modules\AI\Http\Controllers;

use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\AI\Models\AiScribeSession;
use App\Modules\AI\Services\AmbientClinicalScribeService;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Patient\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicalScribeController extends Controller
{
    public function __construct(
        protected AmbientClinicalScribeService $scribeService
    ) {}

    /**
     * Display the Ambient Clinical Scribe & Dictation Structuring Workstation.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $recentSessions = AiScribeSession::where('tenant_id', $tenantId)
            ->with(['doctor.user:id,name', 'patient:id,first_name,last_name,mrn', 'opdVisit:id,visit_number'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $doctors = Doctor::where('tenant_id', $tenantId)
            ->with('user:id,name')
            ->get();

        $patients = Patient::where('tenant_id', $tenantId)
            ->select('id', 'first_name', 'last_name', 'mrn')
            ->limit(50)
            ->get();

        $recentVisits = OpdVisit::where('tenant_id', $tenantId)
            ->where('status', 'IN_CONSULTATION')
            ->with('patient:id,first_name,last_name,mrn')
            ->limit(20)
            ->get();

        $totalSessions = AiScribeSession::where('tenant_id', $tenantId)->count();
        $committedCount = AiScribeSession::where('tenant_id', $tenantId)->where('status', 'COMMITTED')->count();
        $totalAudioSec = (int) AiScribeSession::where('tenant_id', $tenantId)->sum('audio_duration_seconds');

        return Inertia::render('AI/ScribeWorkstation', [
            'recentSessions' => $recentSessions,
            'doctors' => $doctors,
            'patients' => $patients,
            'recentVisits' => $recentVisits,
            'stats' => [
                'total_sessions' => $totalSessions,
                'committed_count' => $committedCount,
                'total_hours_scribed' => round($totalAudioSec / 3600, 1),
                'active_model' => 'clinical-scribe-v1 (HIPAA Sanitized)',
            ],
        ]);
    }

    /**
     * Start a new scribe session.
     */
    public function startSession(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'doctor_id' => 'nullable|uuid|exists:doctors,id',
            'patient_id' => 'nullable|uuid|exists:patients,id',
            'opd_visit_id' => 'nullable|uuid|exists:opd_visits,id',
            'admission_id' => 'nullable|uuid|exists:admissions,id',
        ]);

        $session = $this->scribeService->startSession(
            tenantId: $tenantId,
            doctorId: $validated['doctor_id'] ?? $request->user()?->doctor?->id,
            patientId: $validated['patient_id'] ?? null,
            opdVisitId: $validated['opd_visit_id'] ?? null,
            admissionId: $validated['admission_id'] ?? null
        );

        return back()->with('success', "Scribe session {$session->session_number} initialized.");
    }

    /**
     * Process raw transcript/dictation into structured SOAP note.
     */
    public function processTranscript(Request $request, AiScribeSession $session): JsonResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        if ($session->tenant_id !== $tenantId) {
            abort(403, 'Unauthorized session access.');
        }

        $validated = $request->validate([
            'raw_transcript' => 'required|string|min:5',
            'audio_duration_seconds' => 'nullable|integer',
        ]);

        $updatedSession = $this->scribeService->processTranscript(
            session: $session,
            rawTranscript: $validated['raw_transcript'],
            audioDurationSeconds: $validated['audio_duration_seconds'] ?? 0
        );

        return response()->json([
            'session' => $updatedSession,
            'structured_soap' => $updatedSession->structured_soap,
            'message' => 'Transcript sanitized and structured into clinical SOAP note.',
        ]);
    }

    /**
     * Commit the structured SOAP note to the patient chart.
     */
    public function commitSoap(Request $request, AiScribeSession $session): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        if ($session->tenant_id !== $tenantId) {
            abort(403, 'Unauthorized session access.');
        }

        $validated = $request->validate([
            'structured_soap' => 'nullable|array',
        ]);

        $this->scribeService->commitToClinicalRecord($session, $validated);

        return back()->with('success', "Scribe session {$session->session_number} committed to patient clinical record.");
    }
}
