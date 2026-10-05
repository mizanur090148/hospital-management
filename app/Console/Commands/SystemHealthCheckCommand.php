<?php

namespace App\Console\Commands;

use App\Modules\Analytics\Services\SystemHealthService;
use Illuminate\Console\Command;

class SystemHealthCheckCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'system:health {--json : Output report in JSON format}';

    /**
     * The console command description.
     */
    protected $description = 'Run comprehensive enterprise HMS health and multi-tenant isolation diagnostics';

    /**
     * Execute the console command.
     */
    public function handle(SystemHealthService $healthService): int
    {
        $report = $healthService->checkHealth();

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT));

            return $report['status'] === 'healthy' ? Command::SUCCESS : Command::FAILURE;
        }

        $this->info('====================================================');
        $this->info('   ApexCare HMS — System Infrastructure Health Check');
        $this->info('====================================================');
        $this->line('Status:      '.($report['status'] === 'healthy' ? '<fg=green;options=bold>HEALTHY</>' : '<fg=red;options=bold>DEGRADED</>'));
        $this->line("Environment: <fg=cyan>{$report['app']['environment']}</>");
        $this->line("PHP Engine:  <fg=yellow>{$report['app']['php_version']}</>");
        $this->line("Framework:   <fg=magenta>Laravel {$report['app']['laravel_version']}</>");
        $this->newLine();

        $rows = [];
        foreach ($report['checks'] as $checkName => $details) {
            $statusLabel = ($details['status'] ?? 'unknown') === 'healthy'
                ? '<fg=green>PASS</>'
                : '<fg=red>FAIL</>';

            $latency = isset($details['latency_ms']) ? "{$details['latency_ms']} ms" : 'N/A';
            $meta = isset($details['error']) ? $details['error'] : ($details['connection'] ?? $details['driver'] ?? 'Active');

            $rows[] = [
                ucwords(str_replace('_', ' ', $checkName)),
                $statusLabel,
                $latency,
                $meta,
            ];
        }

        $this->table(['Subsystem Probe', 'Status', 'Latency', 'Details'], $rows);

        return $report['status'] === 'healthy' ? Command::SUCCESS : Command::FAILURE;
    }
}
