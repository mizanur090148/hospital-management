<?php

namespace App\Modules\Dashboard\Http\Controllers;

use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\AuditLog;
use App\Modules\Auth\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request, TenantContext $context): Response
    {
        $tenant = $context->getTenant();
        $user = $request->user();

        $stats = [
            'totalStaff' => 0,
            'activeBranches' => 0,
            'recentAudits' => [],
            'systemHealth' => [
                'database' => 'PostgreSQL 18 (Connected)',
                'tenancy' => $tenant ? 'Active (Isolated)' : 'Platform Root Mode',
                'phpVersion' => PHP_VERSION,
                'framework' => 'Laravel '.app()->version(),
            ],
        ];

        if ($tenant) {
            $stats['totalStaff'] = User::where('tenant_id', $tenant->id)->count();
            $stats['activeBranches'] = $tenant->branches()->where('is_active', true)->count();
            $stats['recentAudits'] = AuditLog::with('user:id,name,email')
                ->where('tenant_id', $tenant->id)
                ->orderByDesc('created_at')
                ->limit(6)
                ->get()
                ->map(fn ($log) => [
                    'id' => $log->id,
                    'action' => $log->action->label(),
                    'entity' => class_basename($log->entity_type),
                    'user' => $log->user?->name ?? 'System',
                    'ip' => $log->ip_address,
                    'time' => $log->created_at->diffForHumans(),
                ]);
        } elseif ($user && $user->isSuperAdmin()) {
            $stats['totalTenants'] = DB::table('tenants')->count();
            $stats['totalUsers'] = DB::table('users')->count();
        }

        return Inertia::render('Dashboard', [
            'stats' => $stats,
        ]);
    }
}
