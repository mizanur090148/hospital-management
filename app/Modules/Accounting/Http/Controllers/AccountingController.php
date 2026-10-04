<?php

namespace App\Modules\Accounting\Http\Controllers;

use App\Core\Enums\AccountType;
use App\Core\Enums\JournalEntryType;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Accounting\Services\DoubleEntryAccountingService;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountingController extends Controller
{
    public function __construct(
        protected DoubleEntryAccountingService $accountingService
    ) {}

    /**
     * Display Double-Entry General Ledger, Chart of Accounts, Trial Balance & Income Statement.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $this->accountingService->ensureStandardChartOfAccounts($tenantId);

        $tab = $request->input('tab', 'ledger');

        // 1. Chart of Accounts with live computed balances
        $accounts = ChartOfAccount::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('code')
            ->get()
            ->map(function ($acc) {
                return [
                    'id' => $acc->id,
                    'code' => $acc->code,
                    'name' => $acc->name,
                    'account_type' => $acc->account_type->value,
                    'type_label' => $acc->account_type->label(),
                    'normal_balance' => $acc->account_type->normalBalance(),
                    'balance' => $acc->calculateBalance(),
                    'is_system' => $acc->is_system,
                ];
            });

        // 2. Journal Entries Ledger
        $journalEntries = JournalEntry::with(['items.account', 'postedByUser'])
            ->latest('posting_date')
            ->paginate(15, ['*'], 'je_page');

        // 3. Live Trial Balance
        $trialBalance = $this->accountingService->generateTrialBalance($tenantId);

        // 4. Income Statement (P&L)
        $incomeStatement = $this->accountingService->generateIncomeStatement($tenantId);

        return Inertia::render('Accounting/GeneralLedgerIndex', [
            'accounts' => $accounts,
            'journalEntries' => $journalEntries,
            'trialBalance' => $trialBalance,
            'incomeStatement' => $incomeStatement,
            'accountTypes' => array_column(AccountType::cases(), 'value'),
            'entryTypes' => array_column(JournalEntryType::cases(), 'value'),
            'activeTab' => $tab,
        ]);
    }

    /**
     * Store a new account in the Chart of Accounts.
     */
    public function storeAccount(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:150'],
            'account_type' => ['required', 'string'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['tenant_id'] = $tenantId;

        ChartOfAccount::create($validated);

        return back()->with('success', "Account {$validated['code']} - {$validated['name']} registered.");
    }

    /**
     * Post a balanced manual Journal Entry.
     */
    public function storeJournalEntry(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'posting_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'uuid'],
            'lines.*.entry_type' => ['required', 'string', 'in:DEBIT,CREDIT'],
            'lines.*.amount' => ['required', 'numeric', 'min:0.01'],
            'lines.*.narration' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $je = $this->accountingService->createJournalEntry(
                tenantId: $tenantId,
                postingDate: $validated['posting_date'],
                description: $validated['description'],
                lines: $validated['lines'],
                referenceType: 'ManualJournal',
                userId: $request->user()->id
            );

            return back()->with('success', "Journal Entry #{$je->entry_number} posted and verified.");
        } catch (Exception $e) {
            return back()->withErrors(['journal_entry' => $e->getMessage()]);
        }
    }
}
