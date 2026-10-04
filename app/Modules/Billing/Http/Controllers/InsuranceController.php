<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Core\Enums\ClaimStatus;
use App\Core\Enums\PatientStatus;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Billing\Models\InsuranceClaim;
use App\Modules\Billing\Models\InsurancePolicy;
use App\Modules\Billing\Models\InsuranceProvider;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Patient\Models\Patient;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InsuranceController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    /**
     * Display Insurance Management Workstation: Claims Adjudication, Providers, and Policies.
     */
    public function index(Request $request): Response
    {
        $tab = $request->input('tab', 'claims');
        $claimStatus = $request->input('claim_status');

        $claimsQuery = InsuranceClaim::with([
            'provider',
            'patient',
            'invoice',
            'policy',
            'adjudicatedByUser',
        ])->latest('submitted_at');

        if ($claimStatus && $claimStatus !== 'ALL') {
            $claimsQuery->where('status', $claimStatus);
        }

        $claims = $claimsQuery->paginate(15, ['*'], 'claims_page');

        $providers = InsuranceProvider::withCount(['policies', 'claims'])->latest()->get();
        $policies = InsurancePolicy::with(['provider', 'patient'])->latest()->paginate(15, ['*'], 'policies_page');
        $patients = Patient::where('status', PatientStatus::Active)->limit(50)->get(['id', 'mrn', 'first_name', 'last_name']);

        return Inertia::render('Billing/InsuranceIndex', [
            'claims' => $claims,
            'providers' => $providers,
            'policies' => $policies,
            'patients' => $patients,
            'activeTab' => $tab,
            'claimStatuses' => array_column(ClaimStatus::cases(), 'value'),
            'filters' => [
                'claim_status' => $claimStatus,
            ],
        ]);
    }

    /**
     * Store a new Insurance Provider / Payer.
     */
    public function storeProvider(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'code' => ['required', 'string', 'max:50'],
            'contact_person' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'tax_id' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['tenant_id'] = $tenantId;
        $validated['address'] = $validated['address'] ? ['street' => $validated['address']] : null;

        InsuranceProvider::create($validated);

        return back()->with('success', "Insurance Provider {$validated['name']} registered successfully.");
    }

    /**
     * Store a new Patient Insurance Policy.
     */
    public function storePolicy(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'patient_id' => ['required', 'uuid'],
            'insurance_provider_id' => ['required', 'uuid'],
            'policy_number' => ['required', 'string', 'max:100'],
            'group_number' => ['nullable', 'string', 'max:100'],
            'coverage_percentage' => ['required', 'numeric', 'min:1', 'max:100'],
            'copay_amount' => ['required', 'numeric', 'min:0'],
            'annual_limit' => ['required', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
        ]);

        $validated['tenant_id'] = $tenantId;

        InsurancePolicy::create($validated);

        return back()->with('success', "Insurance policy #{$validated['policy_number']} assigned to patient.");
    }

    /**
     * Adjudicate claim (Approve, Partially Approve, Reject, or Settle).
     */
    public function adjudicateClaim(Request $request, InsuranceClaim $claim): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string'],
            'approved_amount' => ['required', 'numeric', 'min:0'],
            'disallowed_amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $status = ClaimStatus::from($validated['status']);

            $this->billingService->adjudicateClaim(
                claim: $claim,
                newStatus: $status,
                approvedAmount: (float) $validated['approved_amount'],
                disallowedAmount: (float) $validated['disallowed_amount'],
                notes: $validated['notes'] ?? null,
                adjudicatorUserId: $request->user()->id
            );

            return back()->with('success', "Claim #{$claim->claim_number} adjudicated with status {$status->label()}.");
        } catch (Exception $e) {
            return back()->withErrors(['claim' => $e->getMessage()]);
        }
    }
}
