<?php

namespace App\Modules\SaaS\Http\Middleware;

use App\Modules\SaaS\Exceptions\SubscriptionLimitExceededException;
use App\Modules\SaaS\Services\TenantQuotaEnforcementService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceSubscriptionQuota
{
    public function __construct(
        protected TenantQuotaEnforcementService $quotaService
    ) {}

    /**
     * Handle an incoming request and ensure tenant has capacity for the requested resource.
     *
     * Usage: middleware('quota:beds') or middleware('quota:doctors')
     */
    public function handle(Request $request, Closure $next, string $resourceType): Response
    {
        $tenant = $request->user()?->tenant;

        if ($tenant) {
            try {
                $this->quotaService->assertCanCreateResource($tenant, $resourceType);
            } catch (SubscriptionLimitExceededException $e) {
                if ($request->wantsJson() || $request->is('api/*')) {
                    return response()->json([
                        'message' => $e->getMessage(),
                        'resource' => $e->resourceType,
                        'current_usage' => $e->currentUsage,
                        'quota_limit' => $e->quotaLimit,
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
