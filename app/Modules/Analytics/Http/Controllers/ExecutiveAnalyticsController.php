<?php

namespace App\Modules\Analytics\Http\Controllers;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\BedStatus;
use App\Core\Enums\PayrollStatus;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Accounting\Services\DoubleEntryAccountingService;
use App\Modules\Billing\Models\InsuranceClaim;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\Emergency\Models\EmergencyAdmission;
use App\Modules\Facility\Models\Bed;
use App\Modules\HR\Models\Payroll;
use App\Modules\IPD\Models\Admission;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\OperationTheatre\Models\Surgery;
use App\Modules\Pharmacy\Models\Medicine;
use App\Modules\Pharmacy\Models\MedicineBatch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ExecutiveAnalyticsController extends Controller
{
    public function __construct(
        protected DoubleEntryAccountingService $accountingService
    ) {}

    /**
     * Display the Executive C-Suite Hospital Analytics & KPI Dashboard.
     */
    public function index(Request $request): Response
    {
        $timeframe = $request->input('timeframe', '30_days');
        $tenantId = app(TenantContext::class)->getTenantId();

        $startDate = match ($timeframe) {
            'today' => now()->startOfDay(),
            '7_days' => now()->subDays(7)->startOfDay(),
            'this_year' => now()->startOfYear(),
            default => now()->subDays(30)->startOfDay(), // 30_days
        };

        // 1. Bed Occupancy & Inpatient Census
        $totalBeds = Bed::where('is_active', true)->count();
        $occupiedBeds = Bed::where('status', BedStatus::Occupied)->count();
        $cleaningBeds = Bed::where('status', BedStatus::Cleaning)->count();
        $availableBeds = Bed::where('status', BedStatus::Available)->count();
        $bedOccupancyRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 1) : 0.0;

        $activeInpatients = Admission::where('status', AdmissionStatus::Admitted)->count();

        // Average Length of Stay (ALOS) across discharged inpatients
        $dischargedAdmissions = Admission::where('status', AdmissionStatus::Discharged)
            ->whereNotNull('admitted_at')
            ->whereNotNull('discharged_at')
            ->where('discharged_at', '>=', $startDate)
            ->get(['admitted_at', 'discharged_at']);

        $totalStayDays = 0;
        foreach ($dischargedAdmissions as $adm) {
            $days = Carbon::parse($adm->admitted_at)->diffInDays(Carbon::parse($adm->discharged_at));
            $totalStayDays += max(1, $days);
        }
        $alos = $dischargedAdmissions->count() > 0 ? round($totalStayDays / $dischargedAdmissions->count(), 1) : 0.0;

        // 2. Clinical Throughput
        $opdVisitsCount = OpdVisit::where('created_at', '>=', $startDate)->count();
        $emergencyVisitsCount = EmergencyAdmission::where('admitted_at', '>=', $startDate)->count();

        // Emergency Triage by ESI level
        $emergencyTriageBreakdown = EmergencyAdmission::where('admitted_at', '>=', $startDate)
            ->select('triage_level', DB::raw('count(*) as count'))
            ->groupBy('triage_level')
            ->pluck('count', 'triage_level')
            ->toArray();

        // OT Surgeries
        $surgeriesTotal = Surgery::where('scheduled_date', '>=', $startDate->toDateString())->count();
        $surgeriesCompleted = Surgery::where('scheduled_date', '>=', $startDate->toDateString())
            ->where('status', 'COMPLETED')
            ->count();

        // 3. Diagnostics
        $labOrdersTotal = LabOrder::where('created_at', '>=', $startDate)->count();
        $labOrdersCompleted = LabOrder::where('created_at', '>=', $startDate)
            ->where('status', 'COMPLETED')
            ->count();

        $radiologyScansTotal = RadiologyOrder::where('created_at', '>=', $startDate)->count();
        $radiologyCompleted = RadiologyOrder::where('created_at', '>=', $startDate)
            ->where('status', 'COMPLETED')
            ->count();

        // 4. Pharmacy & Supply Chain Health
        $activeBatchesCount = MedicineBatch::where('quantity_on_hand', '>', 0)->count();
        $expiringBatchesCount = MedicineBatch::where('quantity_on_hand', '>', 0)
            ->where('expiry_date', '<=', now()->addDays(30))
            ->count();

        $outOfStockCount = Medicine::where('is_active', true)
            ->whereDoesntHave('batches', function ($q) {
                $q->where('quantity_on_hand', '>', 0);
            })
            ->count();

        // 5. Financial Overview
        $totalInvoiced = (float) Invoice::where('invoice_date', '>=', $startDate)->sum('total_amount');
        $totalCollected = (float) Payment::where('payment_date', '>=', $startDate)->sum('amount');
        $payrollDisbursed = (float) Payroll::where('status', PayrollStatus::Paid)
            ->where('created_at', '>=', $startDate)
            ->sum('net_salary');

        $pendingClaimsAmount = (float) InsuranceClaim::whereIn('status', ['SUBMITTED', 'IN_REVIEW'])->sum('claimed_amount');

        // Net Operating Margin estimate
        $operatingSurplus = round($totalCollected - $payrollDisbursed, 2);

        // General Ledger P&L from Accounting Service
        $incomeStatement = $tenantId ? $this->accountingService->generateIncomeStatement($tenantId) : [
            'total_revenue' => 0.0,
            'total_expense' => 0.0,
            'net_income' => 0.0,
        ];

        return Inertia::render('Analytics/ExecutiveDashboard', [
            'timeframe' => $timeframe,
            'kpis' => [
                'bed_occupancy_rate' => $bedOccupancyRate,
                'total_beds' => $totalBeds,
                'occupied_beds' => $occupiedBeds,
                'available_beds' => $availableBeds,
                'cleaning_beds' => $cleaningBeds,
                'active_inpatients' => $activeInpatients,
                'alos_days' => $alos,
                'opd_visits_count' => $opdVisitsCount,
                'emergency_visits_count' => $emergencyVisitsCount,
                'emergency_triage_breakdown' => $emergencyTriageBreakdown,
                'surgeries_total' => $surgeriesTotal,
                'surgeries_completed' => $surgeriesCompleted,
                'lab_orders_total' => $labOrdersTotal,
                'lab_orders_completed' => $labOrdersCompleted,
                'radiology_scans_total' => $radiologyScansTotal,
                'radiology_completed' => $radiologyCompleted,
                'active_batches_count' => $activeBatchesCount,
                'expiring_batches_count' => $expiringBatchesCount,
                'out_of_stock_count' => $outOfStockCount,
                'total_invoiced' => $totalInvoiced,
                'total_collected' => $totalCollected,
                'payroll_disbursed' => $payrollDisbursed,
                'pending_claims_amount' => $pendingClaimsAmount,
                'operating_surplus' => $operatingSurplus,
                'income_statement' => $incomeStatement,
            ],
        ]);
    }
}
