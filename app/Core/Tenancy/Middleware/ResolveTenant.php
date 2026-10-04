<?php

namespace App\Core\Tenancy\Middleware;

use App\Core\Enums\TenantStatus;
use App\Core\Tenancy\TenantContext;
use App\Modules\Tenancy\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->resolveTenant($request);

        if ($tenant) {
            if ($tenant->status === TenantStatus::Suspended) {
                abort(403, 'This hospital organization has been temporarily suspended. Please contact platform administration.');
            }

            $this->tenantContext->setTenant($tenant);

            // Resolve branch: check session or fallback to main branch
            $branchId = $request->header('X-Branch-ID') ?? session('active_branch_id');
            $branch = $branchId ? $tenant->branches()->find($branchId) : $tenant->mainBranch();

            if ($branch) {
                $this->tenantContext->setBranch($branch);
            }
        } elseif ($request->user() && $request->user()->isSuperAdmin()) {
            $this->tenantContext->setPlatformMode(true);
        }

        return $next($request);
    }

    protected function resolveTenant(Request $request): ?Tenant
    {
        // 1. Resolve by Header (API / Mobile)
        if ($headerId = $request->header('X-Tenant-ID')) {
            return Tenant::find($headerId);
        }

        if ($headerSlug = $request->header('X-Tenant-Slug')) {
            return Tenant::where('slug', $headerSlug)->first();
        }

        // 2. Resolve by Query Param (Dev / Testing convenience)
        if ($querySlug = $request->query('tenant')) {
            $tenant = Tenant::where('slug', $querySlug)->first();
            if ($tenant) {
                session(['active_tenant_id' => $tenant->id]);

                return $tenant;
            }
        }

        // 3. Resolve by Session
        if ($sessionTenantId = session('active_tenant_id')) {
            $tenant = Tenant::find($sessionTenantId);
            if ($tenant) {
                return $tenant;
            }
        }

        // 4. Resolve by Authenticated User
        if ($user = $request->user()) {
            if ($user->tenant_id) {
                return $user->tenant;
            }
        }

        // 5. Resolve by Subdomain / Host
        $host = $request->getHost();
        $parts = explode('.', $host);

        // e.g. apollo.hospital-mgt.test -> slug is 'apollo'
        if (count($parts) >= 3 && ! in_array($parts[0], ['www', 'app', 'api', 'admin', 'localhost'])) {
            $slug = $parts[0];

            return Tenant::where('slug', $slug)->first();
        }

        // 6. Resolve by Custom Domain
        $customDomainTenant = Tenant::where('domain', $host)->first();
        if ($customDomainTenant) {
            return $customDomainTenant;
        }

        // Fallback: If only one active tenant exists in local development, use it
        if (app()->environment('local')) {
            return Tenant::where('status', TenantStatus::Active)->first();
        }

        return null;
    }
}
