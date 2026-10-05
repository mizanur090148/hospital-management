<?php

namespace App\Modules\HR\Http\Controllers;

use App\Core\Enums\PayrollStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Accounting\Services\DoubleEntryAccountingService;
use App\Modules\Auth\Models\User;
use App\Modules\HR\Models\Payroll;
use App\Modules\HR\Models\SalaryStructure;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PayrollController extends Controller
{
    public function __construct(
        protected DoubleEntryAccountingService $accountingService
    ) {}

    /**
     * Display the hospital payroll management & payslips workstation.
     */
    public function index(Request $request): Response
    {
        $salaryMonth = $request->input('month', now()->format('Y-m'));
        $status = $request->input('status');

        $query = Payroll::with(['user', 'branch', 'journalEntry'])
            ->where('salary_month', $salaryMonth)
            ->latest('created_at');

        if ($status) {
            $query->where('status', $status);
        }

        $payrolls = $query->paginate(20)->withQueryString();

        // Salary Structures
        $salaryStructures = SalaryStructure::with('user')
            ->where('is_active', true)
            ->orderBy('base_salary', 'desc')
            ->get();

        // Metrics for the current month
        $allMonthPayrolls = Payroll::where('salary_month', $salaryMonth)->get();
        $totalGross = (float) $allMonthPayrolls->sum('gross_salary');
        $totalDeductions = (float) $allMonthPayrolls->sum('total_deductions');
        $totalNet = (float) $allMonthPayrolls->sum('net_salary');
        $paidCount = $allMonthPayrolls->where('status', PayrollStatus::Paid)->count();
        $pendingCount = $allMonthPayrolls->where('status', PayrollStatus::Draft)->count();

        $branches = Branch::where('is_active', true)->orderBy('name')->get();
        $staffMembers = User::whereIn('user_type', ['doctor', 'nurse', 'pharmacist', 'laboratorian', 'radiologist', 'staff', 'hospital_admin'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'user_type', 'branch_id']);

        return Inertia::render('HR/PayrollIndex', [
            'payrolls' => $payrolls,
            'salaryStructures' => $salaryStructures,
            'branches' => $branches,
            'staffMembers' => $staffMembers,
            'metrics' => [
                'total_gross' => $totalGross,
                'total_deductions' => $totalDeductions,
                'total_net' => $totalNet,
                'paid_count' => $paidCount,
                'pending_count' => $pendingCount,
                'total_records' => $allMonthPayrolls->count(),
            ],
            'filters' => [
                'month' => $salaryMonth,
                'status' => $status,
            ],
            'payrollStatuses' => array_column(PayrollStatus::cases(), 'value'),
        ]);
    }

    /**
     * Create or update a staff member's salary compensation structure.
     */
    public function storeStructure(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'housing_allowance' => ['nullable', 'numeric', 'min:0'],
            'transport_allowance' => ['nullable', 'numeric', 'min:0'],
            'medical_allowance' => ['nullable', 'numeric', 'min:0'],
            'special_allowance' => ['nullable', 'numeric', 'min:0'],
            'hazard_allowance' => ['nullable', 'numeric', 'min:0'],
            'tax_deduction_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_deduction' => ['nullable', 'numeric', 'min:0'],
            'provident_fund_deduction' => ['nullable', 'numeric', 'min:0'],
            'provident_fund' => ['nullable', 'numeric', 'min:0'],
            'insurance_deduction' => ['nullable', 'numeric', 'min:0'],
            'health_insurance_deduction' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'in:BANK_TRANSFER,CHEQUE,CASH'],
            'bank_name' => ['nullable', 'string', 'max:100'],
            'bank_account_number' => ['nullable', 'string', 'max:100'],
            'effective_from' => ['nullable', 'date'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId();
        $special = (float) ($validated['special_allowance'] ?? $validated['hazard_allowance'] ?? 0.00);
        $pf = (float) ($validated['provident_fund_deduction'] ?? $validated['provident_fund'] ?? 0.00);
        $ins = (float) ($validated['insurance_deduction'] ?? $validated['health_insurance_deduction'] ?? 0.00);

        $base = (float) $validated['base_salary'];
        $grossEst = $base + (float) ($validated['housing_allowance'] ?? 0) + (float) ($validated['transport_allowance'] ?? 0) + (float) ($validated['medical_allowance'] ?? 0) + $special;
        $taxPercent = (float) ($validated['tax_deduction_percent'] ?? 0.00);
        if ($taxPercent <= 0 && isset($validated['tax_deduction']) && $grossEst > 0) {
            $taxPercent = ((float) $validated['tax_deduction'] / $grossEst) * 100;
        }

        SalaryStructure::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'user_id' => $validated['user_id'],
            ],
            [
                'currency' => 'USD',
                'base_salary' => $validated['base_salary'],
                'housing_allowance' => $validated['housing_allowance'] ?? 0.00,
                'transport_allowance' => $validated['transport_allowance'] ?? 0.00,
                'medical_allowance' => $validated['medical_allowance'] ?? 0.00,
                'special_allowance' => $special,
                'tax_deduction_percent' => $taxPercent,
                'provident_fund_deduction' => $pf,
                'insurance_deduction' => $ins,
                'payment_method' => $validated['payment_method'] ?? 'BANK_TRANSFER',
                'bank_name' => $validated['bank_name'] ?? null,
                'bank_account_number' => $validated['bank_account_number'] ?? null,
                'effective_from' => $validated['effective_from'] ?? now()->startOfMonth()->toDateString(),
                'is_active' => true,
            ]
        );

        return back()->with('success', 'Staff salary structure configured successfully.');
    }

    /**
     * Batch generate monthly payroll payslips for all active staff.
     */
    public function generateMonthlyPayroll(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'salary_month' => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId();
        $targetBranchId = $validated['branch_id'] ?? app(TenantContext::class)->getBranchId();

        $structures = SalaryStructure::with('user')
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        if ($structures->isEmpty()) {
            return back()->withErrors(['salary_month' => 'No active salary structures found. Please define staff salaries first.']);
        }

        $generatedCount = 0;

        DB::transaction(function () use ($structures, $validated, $tenantId, $targetBranchId, &$generatedCount) {
            foreach ($structures as $struct) {
                // Check if payroll already exists for this staff and month
                $exists = Payroll::where('tenant_id', $tenantId)
                    ->where('user_id', $struct->user_id)
                    ->where('salary_month', $validated['salary_month'])
                    ->exists();

                if ($exists) {
                    continue;
                }

                $branchId = $targetBranchId ?? $struct->user?->branch_id ?? Branch::where('tenant_id', $tenantId)->first()?->id;

                $base = (float) $struct->base_salary;
                $allowances = (float) ($struct->housing_allowance + $struct->transport_allowance + $struct->medical_allowance + $struct->special_allowance);
                $gross = $base + $allowances;
                $tax = round(($gross * (float) $struct->tax_deduction_percent) / 100, 2);
                $deductions = $tax + (float) $struct->provident_fund_deduction + (float) $struct->insurance_deduction;
                $net = max(0.00, $gross - $deductions);

                $payslipNumber = SequenceGenerator::generatePayslipNumber($tenantId);

                Payroll::create([
                    'tenant_id' => $tenantId,
                    'branch_id' => $branchId,
                    'user_id' => $struct->user_id,
                    'payslip_number' => $payslipNumber,
                    'salary_month' => $validated['salary_month'],
                    'base_salary' => $base,
                    'total_allowances' => $allowances,
                    'overtime_pay' => 0.00,
                    'gross_salary' => $gross,
                    'total_deductions' => $deductions,
                    'tax_deduction' => $tax,
                    'net_salary' => $net,
                    'status' => PayrollStatus::Draft,
                    'payment_method' => $struct->payment_method ?? 'BANK_TRANSFER',
                ]);

                $generatedCount++;
            }
        });

        return back()->with('success', "Payroll generated: {$generatedCount} staff payslips created for {$validated['salary_month']}.");
    }

    /**
     * Approve a drafted payroll run.
     */
    public function approve(string $id): RedirectResponse
    {
        $payroll = Payroll::findOrFail($id);

        if ($payroll->status !== PayrollStatus::Draft) {
            return back()->withErrors(['error' => 'Only draft payslips can be approved.']);
        }

        $payroll->update([
            'status' => PayrollStatus::Approved,
        ]);

        return back()->with('success', "Payslip #{$payroll->payslip_number} approved for disbursement.");
    }

    /**
     * Disburse payroll and post balanced double-entry General Ledger journal entry.
     */
    public function disburse(Request $request, string $id): RedirectResponse
    {
        $payroll = Payroll::with('user')->findOrFail($id);

        if ($payroll->status === PayrollStatus::Paid) {
            return back()->withErrors(['error' => 'This payroll has already been disbursed.']);
        }

        DB::transaction(function () use ($payroll, $request) {
            $payroll->update([
                'status' => PayrollStatus::Paid,
                'paid_at' => now(),
            ]);

            // Post balanced journal entry into General Ledger:
            // Dr. Salaries Expense (Gross Salary)
            // Cr. Payroll Deductions Payable (Deductions)
            // Cr. Operating Bank (Net Salary)
            $currentUser = $request->user();
            $journalEntry = $this->accountingService->postPayrollDisbursement($payroll, $currentUser?->id);

            $payroll->update([
                'journal_entry_id' => $journalEntry->id,
            ]);
        });

        return back()->with('success', "Salary #{$payroll->payslip_number} disbursed and posted to General Ledger successfully.");
    }
}
