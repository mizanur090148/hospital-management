<?php

namespace App\Modules\AI\Http\Controllers;

use App\Core\Enums\AdmissionStatus;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\AI\Models\ClinicalSummary;
use App\Modules\AI\Services\ClinicalDischargeSynthesizerService;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\IPD\Models\Admission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicalSummaryController extends Controller
{
    public function __construct(
        protected ClinicalDischargeSynthesizerService $synthesizerService
    ) {}

    /**
     * Display the Automated Clinical & Discharge Summary Synthesizer Workstation.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $summaries = ClinicalSummary::where('tenant_id', $tenantId)
            ->with(['patient:id,first_name,last_name,mrn', 'admission:id,admission_number,admission_date', 'doctor.user:id,name'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $activeAdmissions = Admission::where('tenant_id', $tenantId)
            ->whereIn('status', [AdmissionStatus::Admitted, 'ADMITTED', 'OBSERVATION'])
            ->with(['patient:id,first_name,last_name,mrn', 'bed', 'ward'])
            ->limit(30)
            ->get();

        $totalSummaries = ClinicalSummary::where('tenant_id', $tenantId)->count();
        $approvedCount = ClinicalSummary::where('tenant_id', $tenantId)->where('status', 'PHYSICIAN_APPROVED')->count();

        return Inertia::render('AI/DischargeSynthesizer', [
            'summaries' => $summaries,
            'activeAdmissions' => $activeAdmissions,
            'stats' => [
                'total_summaries' => $totalSummaries,
                'approved_count' => $approvedCount,
                'draft_count' => $totalSummaries - $approvedCount,
                'synthesis_engine' => 'AI Clinical Course Aggregator v1',
            ],
        ]);
    }

    /**
     * Generate an automated discharge summary for an admitted inpatient.
     */
    public function synthesize(Request $request, Admission $admission): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        if ($admission->tenant_id !== $tenantId) {
            abort(403, 'Unauthorized admission access.');
        }

        $summary = $this->synthesizerService->synthesizeForAdmission($admission);

        return back()->with('success', "Discharge Summary {$summary->summary_number} synthesized successfully.");
    }

    /**
     * Physician approval and formal sign-off for a clinical summary.
     */
    public function approve(Request $request, ClinicalSummary $summary): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        if ($summary->tenant_id !== $tenantId) {
            abort(403, 'Unauthorized summary access.');
        }

        $doctor = $request->user()?->doctor ?? Doctor::where('tenant_id', $tenantId)->first();
        if (! $doctor) {
            abort(422, 'Doctor credentials required for clinical approval sign-off.');
        }

        $validated = $request->validate([
            'chief_complaint' => 'nullable|string',
            'hospital_course' => 'nullable|string',
            'diagnostic_summary' => 'nullable|string',
            'medication_plan' => 'nullable|string',
            'follow_up_instructions' => 'nullable|string',
        ]);

        $this->synthesizerService->approveSummary($summary, $doctor, array_filter($validated));

        return back()->with('success', "Discharge Summary {$summary->summary_number} approved and signed by physician.");
    }
}
