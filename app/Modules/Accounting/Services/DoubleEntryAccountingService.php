<?php

namespace App\Modules\Accounting\Services;

use App\Core\Enums\AccountType;
use App\Core\Enums\BillingItemType;
use App\Core\Enums\PaymentMethod;
use App\Core\Sequences\SequenceGenerator;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Accounting\Models\JournalEntryItem;
use App\Modules\Billing\Models\InsuranceClaim;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DoubleEntryAccountingService
{
    /**
     * Standard hospital Chart of Accounts template.
     */
    public const STANDARD_COA = [
        // 1000s: ASSETS
        ['code' => '1001', 'name' => 'Cash in Hand (Registers & Vaults)', 'type' => AccountType::Asset, 'is_system' => true],
        ['code' => '1002', 'name' => 'Operating Bank Account (Primary Treasury)', 'type' => AccountType::Asset, 'is_system' => true],
        ['code' => '1100', 'name' => 'Accounts Receivable - Patients', 'type' => AccountType::Asset, 'is_system' => true],
        ['code' => '1150', 'name' => 'Accounts Receivable - Insurance / TPA', 'type' => AccountType::Asset, 'is_system' => true],
        ['code' => '1300', 'name' => 'Pharmacy & Medical Consumables Inventory', 'type' => AccountType::Asset, 'is_system' => true],

        // 2000s: LIABILITIES
        ['code' => '2001', 'name' => 'Patient Advance Deposits & Prepayments', 'type' => AccountType::Liability, 'is_system' => true],
        ['code' => '2100', 'name' => 'Accounts Payable - Medical Vendors', 'type' => AccountType::Liability, 'is_system' => true],
        ['code' => '2200', 'name' => 'Unearned Clinical Service Revenues', 'type' => AccountType::Liability, 'is_system' => true],

        // 3000s: EQUITY
        ['code' => '3001', 'name' => 'Hospital Retained Earnings', 'type' => AccountType::Equity, 'is_system' => true],
        ['code' => '3002', 'name' => 'Owner / Healthcare Entity Capital', 'type' => AccountType::Equity, 'is_system' => true],

        // 4000s: OPERATING REVENUES
        ['code' => '4001', 'name' => 'OPD Doctor Consultation Revenue', 'type' => AccountType::Revenue, 'is_system' => true],
        ['code' => '4002', 'name' => 'Inpatient Bed & Room Charges Revenue', 'type' => AccountType::Revenue, 'is_system' => true],
        ['code' => '4003', 'name' => 'Emergency Trauma & Triage Revenue', 'type' => AccountType::Revenue, 'is_system' => true],
        ['code' => '4004', 'name' => 'Laboratory Diagnostic Pathology Revenue', 'type' => AccountType::Revenue, 'is_system' => true],
        ['code' => '4005', 'name' => 'Radiology & Medical Imaging Revenue', 'type' => AccountType::Revenue, 'is_system' => true],
        ['code' => '4006', 'name' => 'Operation Theatre & Surgical Procedure Revenue', 'type' => AccountType::Revenue, 'is_system' => true],
        ['code' => '4007', 'name' => 'Pharmacy Medication Dispensing Revenue', 'type' => AccountType::Revenue, 'is_system' => true],
        ['code' => '4008', 'name' => 'General Hospital & Nursing Care Revenue', 'type' => AccountType::Revenue, 'is_system' => true],

        // 5000s: OPERATING EXPENSES
        ['code' => '5001', 'name' => 'Cost of Goods Sold - Pharmaceutical Drugs', 'type' => AccountType::Expense, 'is_system' => true],
        ['code' => '5100', 'name' => 'Medical & Surgical Supplies Expense', 'type' => AccountType::Expense, 'is_system' => true],
        ['code' => '5200', 'name' => 'Insurance Claim Disallowances & Bad Debts', 'type' => AccountType::Expense, 'is_system' => true],
        ['code' => '5300', 'name' => 'Diagnostic Laboratory Reagents Expense', 'type' => AccountType::Expense, 'is_system' => true],
    ];

    /**
     * Ensure the tenant has all required standard Chart of Accounts initialized.
     */
    public function ensureStandardChartOfAccounts(string $tenantId): void
    {
        foreach (self::STANDARD_COA as $accountDef) {
            ChartOfAccount::firstOrCreate([
                'tenant_id' => $tenantId,
                'code' => $accountDef['code'],
            ], [
                'name' => $accountDef['name'],
                'account_type' => $accountDef['type']->value,
                'is_system' => $accountDef['is_system'],
                'is_active' => true,
            ]);
        }
    }

    /**
     * Create an atomic, verified Double-Entry Journal Entry.
     * Enforces the fundamental accounting equation: SUM(Debits) === SUM(Credits).
     *
     * @param  array<int, array{account_id?: string, account_code?: string, entry_type: string, amount: float|int|string, narration?: string}>  $lines
     */
    public function createJournalEntry(
        string $tenantId,
        string $postingDate,
        string $description,
        array $lines,
        ?string $referenceType = null,
        ?string $referenceId = null,
        ?string $userId = null
    ): JournalEntry {
        return DB::transaction(function () use ($tenantId, $postingDate, $description, $lines, $referenceType, $referenceId, $userId) {
            $totalDebit = 0.00;
            $totalCredit = 0.00;
            $resolvedLines = [];

            foreach ($lines as $line) {
                $amount = round((float) $line['amount'], 2);
                if ($amount <= 0) {
                    continue; // Skip zero balance lines
                }

                $entryType = strtoupper($line['entry_type']);
                if (! in_array($entryType, ['DEBIT', 'CREDIT'], true)) {
                    throw new RuntimeException("Invalid journal entry type: {$entryType}. Must be DEBIT or CREDIT.");
                }

                // Resolve account
                $accountId = $line['account_id'] ?? null;
                if (! $accountId && isset($line['account_code'])) {
                    $account = ChartOfAccount::where('tenant_id', $tenantId)
                        ->where('code', $line['account_code'])
                        ->first();

                    if (! $account) {
                        $this->ensureStandardChartOfAccounts($tenantId);
                        $account = ChartOfAccount::where('tenant_id', $tenantId)
                            ->where('code', $line['account_code'])
                            ->firstOrFail();
                    }
                    $accountId = $account->id;
                }

                if (! $accountId) {
                    throw new RuntimeException('Journal entry line missing account reference.');
                }

                if ($entryType === 'DEBIT') {
                    $totalDebit += $amount;
                } else {
                    $totalCredit += $amount;
                }

                $resolvedLines[] = [
                    'account_id' => $accountId,
                    'entry_type' => $entryType,
                    'amount' => $amount,
                    'narration' => $line['narration'] ?? null,
                ];
            }

            $totalDebit = round($totalDebit, 2);
            $totalCredit = round($totalCredit, 2);

            // STRICT ACCOUNTING CHECK: Sum of Debits MUST equal Sum of Credits
            if (abs($totalDebit - $totalCredit) >= 0.005 || $totalDebit <= 0) {
                throw new RuntimeException("Unbalanced Journal Entry! Total Debits (\${$totalDebit}) must exactly equal Total Credits (\${$totalCredit}).");
            }

            $entryNumber = SequenceGenerator::generateJournalEntryNumber($tenantId);

            $journalEntry = JournalEntry::create([
                'tenant_id' => $tenantId,
                'entry_number' => $entryNumber,
                'posting_date' => $postingDate,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'posted_by_user_id' => $userId,
                'is_posted' => true,
            ]);

            foreach ($resolvedLines as $resLine) {
                JournalEntryItem::create([
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $resLine['account_id'],
                    'entry_type' => $resLine['entry_type'],
                    'amount' => $resLine['amount'],
                    'narration' => $resLine['narration'],
                ]);
            }

            return $journalEntry->load(['items.account']);
        });
    }

    /**
     * Post balanced journal entry when an Invoice is issued.
     * Dr. Accounts Receivable (Patients & Insurance)
     * Cr. Operating Revenue Accounts (by department breakdown)
     */
    public function postInvoiceIssued(Invoice $invoice, ?string $userId = null): JournalEntry
    {
        $this->ensureStandardChartOfAccounts($invoice->tenant_id);

        $lines = [];

        // 1. Debit Accounts Receivable
        if ((float) $invoice->insurance_covered_amount > 0) {
            $lines[] = [
                'account_code' => '1150', // AR - Insurance
                'entry_type' => 'DEBIT',
                'amount' => (float) $invoice->insurance_covered_amount,
                'narration' => "Insurance claim portion for {$invoice->invoice_number}",
            ];

            if ((float) $invoice->patient_payable_amount > 0) {
                $lines[] = [
                    'account_code' => '1100', // AR - Patient Co-pay
                    'entry_type' => 'DEBIT',
                    'amount' => (float) $invoice->patient_payable_amount,
                    'narration' => "Patient co-pay for {$invoice->invoice_number}",
                ];
            }
        } else {
            $lines[] = [
                'account_code' => '1100', // AR - Patient
                'entry_type' => 'DEBIT',
                'amount' => (float) $invoice->total_amount,
                'narration' => "Patient receivable for {$invoice->invoice_number}",
            ];
        }

        // 2. Credit Revenues by item category
        $invoice->loadMissing('items');
        foreach ($invoice->items as $item) {
            $accountCode = match ($item->item_type) {
                BillingItemType::OpdConsultation => '4001',
                BillingItemType::IpdBedCharges => '4002',
                BillingItemType::EmergencyFee => '4003',
                BillingItemType::LabTest => '4004',
                BillingItemType::RadiologyScan => '4005',
                BillingItemType::OtSurgery => '4006',
                BillingItemType::PharmacyDispense => '4007',
                default => '4008',
            };

            $lines[] = [
                'account_code' => $accountCode,
                'entry_type' => 'CREDIT',
                'amount' => (float) $item->subtotal,
                'narration' => "Revenue: {$item->description}",
            ];
        }

        return $this->createJournalEntry(
            tenantId: $invoice->tenant_id,
            postingDate: $invoice->invoice_date->toDateString(),
            description: "Invoice Issued #{$invoice->invoice_number} - Patient #{$invoice->patient_id}",
            lines: $lines,
            referenceType: 'Invoice',
            referenceId: $invoice->id,
            userId: $userId
        );
    }

    /**
     * Post balanced journal entry when a Cashier Payment is collected.
     * Dr. Cash / Bank
     * Cr. Accounts Receivable - Patients
     */
    public function postPaymentReceived(Payment $payment, ?string $userId = null): JournalEntry
    {
        $this->ensureStandardChartOfAccounts($payment->tenant_id);

        $debitAccountCode = match ($payment->payment_method) {
            PaymentMethod::Cash => '1001', // Cash in Hand
            default => '1002',             // Operating Bank
        };

        $lines = [
            [
                'account_code' => $debitAccountCode,
                'entry_type' => 'DEBIT',
                'amount' => (float) $payment->amount,
                'narration' => "Receipt #{$payment->receipt_number} via {$payment->payment_method->value}",
            ],
            [
                'account_code' => '1100', // AR - Patients
                'entry_type' => 'CREDIT',
                'amount' => (float) $payment->amount,
                'narration' => "Payment applied to invoice #{$payment->invoice_id}",
            ],
        ];

        return $this->createJournalEntry(
            tenantId: $payment->tenant_id,
            postingDate: $payment->payment_date->toDateString(),
            description: "Payment Collected #{$payment->receipt_number} (Ref: {$payment->transaction_reference})",
            lines: $lines,
            referenceType: 'Payment',
            referenceId: $payment->id,
            userId: $userId
        );
    }

    /**
     * Post balanced journal entry when an Insurance Claim is settled.
     * Dr. Operating Bank (Approved Settlement)
     * Dr. Insurance Disallowance & Bad Debts (Deductions / Disallowed Portion)
     * Cr. Accounts Receivable - Insurance / TPA (Total Claimed)
     */
    public function postInsuranceClaimSettlement(
        InsuranceClaim $claim,
        float $approvedAmount,
        float $disallowedAmount,
        ?string $userId = null
    ): JournalEntry {
        $this->ensureStandardChartOfAccounts($claim->tenant_id);

        $lines = [];

        if ($approvedAmount > 0) {
            $lines[] = [
                'account_code' => '1002', // Bank
                'entry_type' => 'DEBIT',
                'amount' => $approvedAmount,
                'narration' => "TPA settled payment for claim #{$claim->claim_number}",
            ];
        }

        if ($disallowedAmount > 0) {
            $lines[] = [
                'account_code' => '5200', // Disallowance & Bad Debt Expense
                'entry_type' => 'DEBIT',
                'amount' => $disallowedAmount,
                'narration' => "Insurer deduction / disallowance on claim #{$claim->claim_number}",
            ];
        }

        $totalClaimed = round($approvedAmount + $disallowedAmount, 2);
        $lines[] = [
            'account_code' => '1150', // AR - Insurance
            'entry_type' => 'CREDIT',
            'amount' => $totalClaimed,
            'narration' => "Clear AR Insurance on settled claim #{$claim->claim_number}",
        ];

        return $this->createJournalEntry(
            tenantId: $claim->tenant_id,
            postingDate: now()->toDateString(),
            description: "Insurance Claim Settled #{$claim->claim_number} ({$claim->insurance_provider_id})",
            lines: $lines,
            referenceType: 'InsuranceClaim',
            referenceId: $claim->id,
            userId: $userId
        );
    }

    /**
     * Generate Live Trial Balance report.
     * Debits must equal Credits across the general ledger.
     *
     * @return array{accounts: array<int, array{code: string, name: string, type: string, debit: float, credit: float, balance: float}>, total_debit: float, total_credit: float, is_balanced: bool}
     */
    public function generateTrialBalance(string $tenantId, ?string $asOfDate = null): array
    {
        $accounts = ChartOfAccount::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('code', 'asc')
            ->get();

        $rows = [];
        $totalDebit = 0.00;
        $totalCredit = 0.00;

        foreach ($accounts as $acc) {
            $itemsQuery = JournalEntryItem::where('account_id', $acc->id);
            if ($asOfDate) {
                $itemsQuery->whereHas('journalEntry', function ($q) use ($asOfDate) {
                    $q->where('posting_date', '<=', $asOfDate);
                });
            }

            $debSum = (float) (clone $itemsQuery)->where('entry_type', 'DEBIT')->sum('amount');
            $credSum = (float) (clone $itemsQuery)->where('entry_type', 'CREDIT')->sum('amount');

            $totalDebit += $debSum;
            $totalCredit += $credSum;

            $rows[] = [
                'code' => $acc->code,
                'name' => $acc->name,
                'type' => $acc->account_type->value,
                'debit' => round($debSum, 2),
                'credit' => round($credSum, 2),
                'balance' => $acc->calculateBalance(),
            ];
        }

        $totalDebit = round($totalDebit, 2);
        $totalCredit = round($totalCredit, 2);

        return [
            'accounts' => $rows,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'is_balanced' => abs($totalDebit - $totalCredit) < 0.01,
        ];
    }

    /**
     * Generate Profit and Loss (Income Statement) Summary.
     * Total Operating Revenue minus Total Operating Expense.
     *
     * @return array{revenue_accounts: array, expense_accounts: array, total_revenue: float, total_expense: float, net_income: float}
     */
    public function generateIncomeStatement(string $tenantId): array
    {
        $accounts = ChartOfAccount::where('tenant_id', $tenantId)
            ->whereIn('account_type', [AccountType::Revenue->value, AccountType::Expense->value])
            ->where('is_active', true)
            ->orderBy('code')
            ->get();

        $revenues = [];
        $expenses = [];
        $totalRev = 0.00;
        $totalExp = 0.00;

        foreach ($accounts as $acc) {
            $bal = $acc->calculateBalance();
            if ($acc->account_type === AccountType::Revenue) {
                $revenues[] = ['code' => $acc->code, 'name' => $acc->name, 'amount' => $bal];
                $totalRev += $bal;
            } else {
                $expenses[] = ['code' => $acc->code, 'name' => $acc->name, 'amount' => $bal];
                $totalExp += $bal;
            }
        }

        return [
            'revenue_accounts' => $revenues,
            'expense_accounts' => $expenses,
            'total_revenue' => round($totalRev, 2),
            'total_expense' => round($totalExp, 2),
            'net_income' => round($totalRev - $totalExp, 2),
        ];
    }

    /**
     * Verify whether a specific Journal Entry preserves ledger equilibrium (Debits == Credits).
     */
    public function verifyLedgerEquilibrium(string $journalEntryId): bool
    {
        $debit = (float) JournalEntryItem::where('journal_entry_id', $journalEntryId)
            ->where('entry_type', 'DEBIT')
            ->sum('amount');

        $credit = (float) JournalEntryItem::where('journal_entry_id', $journalEntryId)
            ->where('entry_type', 'CREDIT')
            ->sum('amount');

        return abs($debit - $credit) < 0.005;
    }

    /**
     * Alias for generateTrialBalance.
     */
    public function getTrialBalance(string $tenantId, ?string $asOfDate = null): array
    {
        return $this->generateTrialBalance($tenantId, $asOfDate);
    }
}
