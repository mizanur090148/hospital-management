<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Analytics\Services\SystemHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemHealthController extends Controller
{
    public function __construct(
        protected SystemHealthService $healthService
    ) {}

    /**
     * Public JSON health check endpoint for container probes & load balancers.
     */
    public function apiHealth(): JsonResponse
    {
        $report = $this->healthService->checkHealth();
        $status = $report['status'] === 'healthy' ? 200 : 503;

        return response()->json($report, $status);
    }

    /**
     * Interactive Administrator Health & Infrastructure Dashboard.
     */
    public function dashboard(Request $request): Response
    {
        $report = $this->healthService->checkHealth();

        return Inertia::render('System/HealthDashboard', [
            'report' => $report,
        ]);
    }
}
