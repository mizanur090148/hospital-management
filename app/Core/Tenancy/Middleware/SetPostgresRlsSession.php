<?php

namespace App\Core\Tenancy\Middleware;

use App\Core\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SetPostgresRlsSession
{
    public function __construct(
        protected TenantContext $tenantContext
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $this->tenantContext->getTenantId();

        if ($tenantId && config('database.default') === 'pgsql') {
            try {
                DB::select("SELECT set_config('app.current_tenant_id', ?, false)", [$tenantId]);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $next($request);
    }
}
