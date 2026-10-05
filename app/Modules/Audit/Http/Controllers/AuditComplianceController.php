<?php

namespace App\Modules\Audit\Http\Controllers;

use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\AuditLog;
use App\Modules\Audit\Services\AuditImmutabilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditComplianceController extends Controller
{
    public function __construct(
        protected AuditImmutabilityService $immutabilityService
    ) {}

    /**
     * Display the Cryptographic Audit Trail & Compliance Workstation.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        // 1. Verify Cryptographic Hash Chain Integrity
        $chainIntegrity = $this->immutabilityService->verifyChainIntegrity($tenantId);

        // 2. Paginated Audit Logs
        $query = AuditLog::where('tenant_id', $tenantId)->with('user:id,name,email');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        if ($request->filled('entity_type')) {
            $query->where('entity_type', 'like', '%'.$request->input('entity_type').'%');
        }

        if ($request->boolean('break_glass_only')) {
            $query->where('is_break_glass', true);
        }

        $auditLogs = $query->latest('created_at')->paginate(25)->withQueryString();

        // 3. Compliance Statistics
        $totalLogs = AuditLog::where('tenant_id', $tenantId)->count();
        $breakGlassCount = AuditLog::where('tenant_id', $tenantId)->where('is_break_glass', true)->count();
        $chainedCount = AuditLog::where('tenant_id', $tenantId)->whereNotNull('current_hash')->count();

        $stats = [
            'total_logs' => $totalLogs,
            'chained_logs' => $chainedCount,
            'break_glass_count' => $breakGlassCount,
            'chain_status' => $chainIntegrity['status'],
            'is_valid' => $chainIntegrity['is_valid'],
            'message' => $chainIntegrity['message'],
        ];

        return Inertia::render('Audit/Index', [
            'auditLogs' => $auditLogs,
            'chainIntegrity' => $chainIntegrity,
            'stats' => $stats,
            'filters' => $request->only(['action', 'entity_type', 'break_glass_only']),
        ]);
    }

    /**
     * Trigger explicit re-verification of the cryptographic hash chain.
     */
    public function verifyChain(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $result = $this->immutabilityService->verifyChainIntegrity($tenantId);

        if ($result['is_valid']) {
            return back()->with('success', "Audit Chain Verified: {$result['message']}");
        }

        return back()->with('error', "CRITICAL INTEGRITY BREACH: {$result['message']}");
    }

    /**
     * Trigger a Break-Glass emergency override protocol with mandatory audit reason.
     */
    public function breakGlass(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'entity_type' => 'required|string',
            'entity_id' => 'required|string',
            'justification' => 'required|string|min:10',
        ]);

        $log = $this->immutabilityService->recordBreakGlassEvent(
            tenantId: $tenantId,
            userId: $request->user()?->id,
            entityType: $validated['entity_type'],
            entityId: $validated['entity_id'],
            justification: $validated['justification']
        );

        return back()->with('success', "🚨 Break-Glass Override logged with hash {$log->current_hash}. Admin alert dispatched.");
    }
}
