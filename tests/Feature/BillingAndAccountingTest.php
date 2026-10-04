<?php

namespace Tests\Feature;

use App\Core\Enums\BillingItemType;
use App\Core\Enums\ClaimStatus;
use App\Core\Enums\DepartmentType;
use App\Core\Enums\Gender;
use App\Core\Enums\InvoiceStatus;
use App\Core\Enums\JournalEntryType;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\PaymentMethod;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Accounting\Models\ChartOfAccount;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Accounting\Models\JournalEntryItem;
use App\Modules\Accounting\Services\DoubleEntryAccountingService;
use App\Modules\Auth\Models\User;
use App\Modules\Billing\Models\InsuranceClaim;
use App\Modules\Billing\Models\InsurancePolicy;
use App\Modules\Billing\Models\InsuranceProvider;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Facility\Models\Department;
use App\Modules\Patient\Models\Patient;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class BillingAndAccountingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Department $department;

    protected User $adminUser;

    protected Patient $patient;

    protected DoubleEntryAccountingService $accountingService;

    protected BillingService $billingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apollo-billing-test',
            'legal_name' => 'Apollo Healthcare Corp',
            'trade_name' => 'Apollo Medical Center',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN-HQ',
            'name' => 'Apollo Main Hospital',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'BILLING-FIN',
            'name' => 'Finance & Cashier Services',
            'department_type' => DepartmentType::Support,
            'is_active' => true,
        ]);

        $this->adminUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'user_type' => UserType::HospitalAdmin,
            'name' => 'Finance Controller Admin',
            'email' => 'finance.admin@apollo-hospital.test',
            'phone' => '+15559998888',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
        ]);

        $adminRole = Role::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Finance Admin Role',
            'slug' => 'hospital_admin',
            'guard_name' => 'web',
            'is_system' => true,
        ]);
        $this->adminUser->assignRole($adminRole);

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-FIN-0001',
            'first_name' => 'Robert',
            'last_name' => 'Langdon',
            'dob' => '1975-06-22',
            'gender' => Gender::Male,
            'phone' => '+1-555-891-2345',
            'email' => 'robert.langdon@example.test',
            'status' => PatientStatus::Active,
        ]);

        app(TenantContext::class)->setTenant($this->tenant);

        $this->accountingService = app(DoubleEntryAccountingService::class);
        $this->billingService = app(BillingService::class);

        // Ensure Chart of accounts is set up
        $this->accountingService->ensureStandardChartOfAccounts($this->tenant->id);
    }

    public function test_standard_chart_of_accounts_initialization(): void
    {
        $accounts = ChartOfAccount::where('tenant_id', $this->tenant->id)->get();

        $this->assertGreaterThanOrEqual(18, $accounts->count());

        $this->assertTrue($accounts->contains('code', '1001')); // Cash on Hand
        $this->assertTrue($accounts->contains('code', '1002')); // Operating Bank Account
        $this->assertTrue($accounts->contains('code', '1100')); // Accounts Receivable - Patients
        $this->assertTrue($accounts->contains('code', '1150')); // Accounts Receivable - Insurance
        $this->assertTrue($accounts->contains('code', '4001')); // OPD Consultation Revenue
        $this->assertTrue($accounts->contains('code', '4002')); // IPD Bed & Nursing Revenue
        $this->assertTrue($accounts->contains('code', '4004')); // Diagnostic Lab Revenue
    }

    public function test_creates_invoice_without_insurance_and_posts_balanced_journal_entry(): void
    {
        $invoice = $this->billingService->createInvoice(
            tenantId: $this->tenant->id,
            branchId: $this->branch->id,
            patientId: $this->patient->id,
            invoiceDate: '2026-10-04',
            items: [
                [
                    'item_type' => BillingItemType::OpdConsultation->value,
                    'description' => 'Cardiology Consultation',
                    'quantity' => 1,
                    'unit_price' => 100.00,
                ],
                [
                    'item_type' => BillingItemType::LabTest->value,
                    'description' => 'Complete Metabolic Panel',
                    'quantity' => 1,
                    'unit_price' => 150.00,
                ],
            ],
            insurancePolicyId: null,
            dueDate: '2026-11-04',
            notes: 'Self-pay full consultation',
            createdByUserId: $this->adminUser->id
        );

        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'total_amount' => 250.00,
            'patient_payable_amount' => 250.00,
            'insurance_covered_amount' => 0.00,
            'status' => InvoiceStatus::Issued->value,
        ]);

        $this->assertCount(2, $invoice->items);

        // Verify Journal Entry was created and strictly balanced
        $journalEntry = JournalEntry::where('reference_id', $invoice->id)
            ->where('reference_type', 'Invoice')
            ->first();

        $this->assertNotNull($journalEntry);

        $debits = JournalEntryItem::where('journal_entry_id', $journalEntry->id)
            ->where('entry_type', JournalEntryType::Debit->value)
            ->sum('amount');

        $credits = JournalEntryItem::where('journal_entry_id', $journalEntry->id)
            ->where('entry_type', JournalEntryType::Credit->value)
            ->sum('amount');

        $this->assertEquals(250.00, (float) $debits);
        $this->assertEquals(250.00, (float) $credits);
        $this->assertEquals($debits, $credits, 'Double-entry invariant violated: Total Debits != Total Credits');
    }

    public function test_creates_invoice_with_insurance_calculates_copay_and_submits_claim(): void
    {
        // 1. Create Insurance Provider & Policy
        $provider = InsuranceProvider::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Cigna Global Health',
            'code' => 'CIGNA-01',
            'tax_id' => 'PAYER-CIG-999',
            'is_active' => true,
        ]);

        $policy = InsurancePolicy::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'CIG-998877',
            'coverage_percentage' => 80.00,
            'copay_amount' => 20.00,
            'annual_limit' => 50000.00,
            'start_date' => now()->subMonths(1)->toDateString(),
            'end_date' => now()->addMonths(11)->toDateString(),
            'is_active' => true,
        ]);

        // Invoice total = $500.00
        // Co-pay = $20.00
        // Remainder after copay = $480.00
        // Insurance 80% of $480 = $384.00
        // Patient pays co-pay ($20) + remaining 20% ($96.00) = $116.00
        $invoice = $this->billingService->createInvoice(
            tenantId: $this->tenant->id,
            branchId: $this->branch->id,
            patientId: $this->patient->id,
            invoiceDate: '2026-10-04',
            items: [
                [
                    'item_type' => BillingItemType::RadiologyScan->value,
                    'description' => 'Brain MRI with Contrast',
                    'quantity' => 1,
                    'unit_price' => 500.00,
                ],
            ],
            insurancePolicyId: $policy->id,
            dueDate: '2026-11-04',
            notes: 'Neuro imaging with insurance coverage',
            createdByUserId: $this->adminUser->id
        );

        $this->assertEquals(500.00, (float) $invoice->total_amount);
        $this->assertEquals(400.00, (float) $invoice->insurance_due);
        $this->assertEquals(100.00, (float) $invoice->patient_due);

        // Verify Insurance Claim was automatically created
        $claim = InsuranceClaim::where('invoice_id', $invoice->id)->first();
        $this->assertNotNull($claim);
        $this->assertEquals(400.00, (float) $claim->claimed_amount);
        $this->assertEquals(ClaimStatus::Submitted, $claim->status);

        // Verify Journal Entry splits AR Patient vs AR Insurance and Debits == Credits
        $journalEntry = JournalEntry::where('reference_id', $invoice->id)->first();
        $this->assertNotNull($journalEntry);

        $debits = JournalEntryItem::where('journal_entry_id', $journalEntry->id)
            ->where('entry_type', JournalEntryType::Debit->value)
            ->sum('amount');
        $credits = JournalEntryItem::where('journal_entry_id', $journalEntry->id)
            ->where('entry_type', JournalEntryType::Credit->value)
            ->sum('amount');

        $this->assertEquals(500.00, (float) $debits);
        $this->assertEquals(500.00, (float) $credits);
    }

    public function test_cashier_payment_pos_updates_invoice_status_and_posts_cash_debit(): void
    {
        $invoice = $this->billingService->createInvoice(
            tenantId: $this->tenant->id,
            branchId: $this->branch->id,
            patientId: $this->patient->id,
            invoiceDate: '2026-10-04',
            items: [
                [
                    'item_type' => BillingItemType::GeneralService->value,
                    'description' => 'General Medical Checkup',
                    'quantity' => 1,
                    'unit_price' => 200.00,
                ],
            ],
            createdByUserId: $this->adminUser->id
        );

        $this->assertEquals(InvoiceStatus::Issued, $invoice->status);

        // Partial payment: $100.00
        $payment1 = $this->billingService->recordPayment(
            invoice: $invoice,
            amount: 100.00,
            method: PaymentMethod::Cash,
            transactionReference: 'RCP-PART-1',
            notes: 'First installment cash',
            cashierUserId: $this->adminUser->id
        );

        $invoice->refresh();
        $this->assertEquals(InvoiceStatus::PartiallyPaid, $invoice->status);
        $this->assertEquals(100.00, (float) $invoice->paid_amount);

        // Check journal entry for Cash payment: Debit Cash 1010 ($100), Credit AR Patient 1110 ($100)
        $paymentJE = JournalEntry::where('reference_id', $payment1->id)->first();
        $this->assertNotNull($paymentJE);
        $this->assertTrue($this->accountingService->verifyLedgerEquilibrium($paymentJE->id));

        // Final payment: $100.00
        $payment2 = $this->billingService->recordPayment(
            invoice: $invoice,
            amount: 100.00,
            method: PaymentMethod::CreditCard,
            transactionReference: 'CC-AUTH-8821',
            notes: 'Final card settlement',
            cashierUserId: $this->adminUser->id
        );

        $invoice->refresh();
        $this->assertEquals(InvoiceStatus::Paid, $invoice->status);
        $this->assertEquals(200.00, (float) $invoice->paid_amount);
    }

    public function test_double_entry_gl_rejects_unbalanced_manual_journal_entries(): void
    {
        $cashAccount = ChartOfAccount::where('tenant_id', $this->tenant->id)->where('code', '1001')->firstOrFail();
        $revenueAccount = ChartOfAccount::where('tenant_id', $this->tenant->id)->where('code', '4001')->firstOrFail();

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/Unbalanced Journal Entry/i');

        // Attempt to create unbalanced entry: Debit $500 vs Credit $450
        $this->accountingService->createJournalEntry(
            tenantId: $this->tenant->id,
            postingDate: '2026-10-04',
            description: 'Unbalanced Fraudulent Journal Entry Attempt',
            lines: [
                [
                    'account_id' => $cashAccount->id,
                    'entry_type' => 'DEBIT',
                    'amount' => 500.00,
                    'narration' => 'Cash received',
                ],
                [
                    'account_id' => $revenueAccount->id,
                    'entry_type' => 'CREDIT',
                    'amount' => 450.00, // $50 discrepancy!
                    'narration' => 'Under-reported revenue',
                ],
            ],
            referenceType: 'ManualVoucher',
            referenceId: null,
            userId: $this->adminUser->id
        );
    }

    public function test_trial_balance_equilibrium(): void
    {
        // Generate diverse transactions: Invoices + Payments + Expense Voucher
        $invoice = $this->billingService->createInvoice(
            tenantId: $this->tenant->id,
            branchId: $this->branch->id,
            patientId: $this->patient->id,
            invoiceDate: '2026-10-04',
            items: [
                ['item_type' => BillingItemType::PharmacyDispense->value, 'description' => 'Antibiotics & Fluids', 'quantity' => 2, 'unit_price' => 75.00],
            ],
            createdByUserId: $this->adminUser->id
        );

        $this->billingService->recordPayment(
            invoice: $invoice,
            amount: 150.00,
            method: PaymentMethod::Cash,
            transactionReference: 'RCP-TB-1',
            notes: 'Settled in full',
            cashierUserId: $this->adminUser->id
        );

        // Record a manual balanced expense voucher: Medical Supplies Expense (Debit $50) vs Operating Bank (Credit $50)
        $bankAccount = ChartOfAccount::where('tenant_id', $this->tenant->id)->where('code', '1002')->firstOrFail();
        $expenseAccount = ChartOfAccount::where('tenant_id', $this->tenant->id)->where('code', '5100')->firstOrFail();

        $this->accountingService->createJournalEntry(
            tenantId: $this->tenant->id,
            postingDate: '2026-10-04',
            description: 'Pharmacy Restocking petty cash payment',
            lines: [
                ['account_id' => $expenseAccount->id, 'entry_type' => 'DEBIT', 'amount' => 50.00],
                ['account_id' => $bankAccount->id, 'entry_type' => 'CREDIT', 'amount' => 50.00],
            ],
            referenceType: 'ExpenseVoucher',
            userId: $this->adminUser->id
        );

        // Fetch Trial Balance
        $trialBalance = $this->accountingService->getTrialBalance($this->tenant->id);

        $this->assertTrue($trialBalance['is_balanced'], 'Trial balance must be mathematically balanced!');
        $this->assertGreaterThan(0, $trialBalance['total_debit']);
        $this->assertEquals($trialBalance['total_debit'], $trialBalance['total_credit']);
    }

    public function test_insurance_claim_adjudication_with_disallowance_posts_bad_debt(): void
    {
        $provider = InsuranceProvider::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'UnitedHealthcare',
            'code' => 'UHC-01',
            'tax_id' => 'PAYER-UHC-881',
            'is_active' => true,
        ]);

        $policy = InsurancePolicy::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'UHC-POL-441',
            'coverage_percentage' => 100.00,
            'copay_amount' => 0.00,
            'annual_limit' => 20000.00,
            'start_date' => now()->subMonths(1)->toDateString(),
            'end_date' => now()->addMonths(11)->toDateString(),
            'is_active' => true,
        ]);

        $invoice = $this->billingService->createInvoice(
            tenantId: $this->tenant->id,
            branchId: $this->branch->id,
            patientId: $this->patient->id,
            invoiceDate: '2026-10-04',
            items: [
                ['item_type' => BillingItemType::EmergencyFee->value, 'description' => 'Trauma Stabilization', 'quantity' => 1, 'unit_price' => 1000.00],
            ],
            insurancePolicyId: $policy->id,
            createdByUserId: $this->adminUser->id
        );

        $claim = InsuranceClaim::where('invoice_id', $invoice->id)->firstOrFail();
        $this->assertEquals(1000.00, (float) $claim->claimed_amount);

        // Adjudicate: Insurer approves $900.00, disallows $100.00
        $adjudicatedClaim = $this->billingService->adjudicateClaim(
            claim: $claim,
            newStatus: ClaimStatus::PartiallyApproved,
            approvedAmount: 900.00,
            disallowedAmount: 100.00,
            notes: 'Disallowed unauthorized administrative surcharge',
            adjudicatorUserId: $this->adminUser->id
        );

        $this->assertEquals(ClaimStatus::PartiallyApproved, $adjudicatedClaim->status);
        $this->assertEquals(900.00, (float) $adjudicatedClaim->approved_amount);
        $this->assertEquals(100.00, (float) $adjudicatedClaim->disallowed_amount);

        // Check GL posting for Claim Settlement:
        // Debit Bank 1002 ($900.00)
        // Debit Disallowed / Bad Debt 5200 ($100.00)
        // Credit AR Insurance 1150 ($1000.00)
        $settleJE = JournalEntry::where('reference_id', $claim->id)
            ->where('reference_type', 'InsuranceClaim')
            ->first();

        $this->assertNotNull($settleJE);
        $this->assertTrue($this->accountingService->verifyLedgerEquilibrium($settleJE->id));

        $totalDebits = JournalEntryItem::where('journal_entry_id', $settleJE->id)->where('entry_type', 'DEBIT')->sum('amount');
        $totalCredits = JournalEntryItem::where('journal_entry_id', $settleJE->id)->where('entry_type', 'CREDIT')->sum('amount');
        $this->assertEquals(1000.00, (float) $totalDebits);
        $this->assertEquals(1000.00, (float) $totalCredits);
    }

    public function test_http_workstation_endpoints(): void
    {
        $this->actingAs($this->adminUser);

        // 1. Invoices Index
        $response = $this->get(route('billing.invoices.index'));
        $response->assertOk();

        // 2. Create Invoice via HTTP
        $invoiceData = [
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'invoice_date' => '2026-10-04',
            'due_date' => '2026-11-04',
            'notes' => 'HTTP created invoice test',
            'items' => [
                [
                    'item_type' => BillingItemType::OpdConsultation->value,
                    'description' => 'Dr. Consultation Fee',
                    'quantity' => 1,
                    'unit_price' => 80.00,
                ],
            ],
        ];

        $postInvoiceResponse = $this->post(route('billing.invoices.store'), $invoiceData);
        $postInvoiceResponse->assertRedirect();

        $createdInvoice = Invoice::where('patient_id', $this->patient->id)->latest()->first();
        $this->assertNotNull($createdInvoice);
        $this->assertEquals(80.00, (float) $createdInvoice->total_amount);

        // 3. Pay Invoice via HTTP
        $paymentData = [
            'amount' => 80.00,
            'payment_method' => PaymentMethod::Cash->value,
            'transaction_reference' => 'POS-HTTP-01',
            'notes' => 'Cash received at desk',
        ];

        $payResponse = $this->post(route('billing.invoices.pay', $createdInvoice->id), $paymentData);
        $payResponse->assertRedirect();

        $createdInvoice->refresh();
        $this->assertEquals(InvoiceStatus::Paid, $createdInvoice->status);

        // 4. Insurance Index
        $insuranceResponse = $this->get(route('billing.insurance.index'));
        $insuranceResponse->assertOk();

        // 5. Accounting General Ledger Index
        $ledgerResponse = $this->get(route('accounting.ledger.index'));
        $ledgerResponse->assertOk();
    }
}
