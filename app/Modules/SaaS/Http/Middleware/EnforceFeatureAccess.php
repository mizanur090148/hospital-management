<?php

namespace App\Modules\SaaS\Http\Middleware;

use App\Modules\SaaS\Exceptions\FeatureNotIncludedException;
use App\Modules\SaaS\Services\TenantQuotaEnforcementService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceFeatureAccess
{
    public function __construct(
        protected TenantQuotaEnforcementService $quotaService
    ) {}

    /**
     * Handle an incoming request and ensure tenant's plan includes the requested feature.
     *
     * Usage: middleware('feature:ai_scribe_enabled')
     */
    public function handle(Request $request, Closure $next, string $featureKey): Response
    {
        $tenant = $request->user()?->tenant;

        if ($tenant) {
            try {
                $this->quotaService->assertFeatureEnabled($tenant, $featureKey);
            } catch (FeatureNotIncludedException $e) {
                if ($request->wantsJson() || $request->is('api/*')) {
                    return response()->json([
                        'message' => $e->getMessage(),
                        'feature' => $e->featureKey,
                        'plan' => $e->planName,
                        'upgrade_required' => true,
                    ], 403);
                }

                return back()->with('error', $e->getMessage());
            }
        }

        return $next($request);
    }
}
