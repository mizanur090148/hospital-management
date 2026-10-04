<?php

namespace App\Modules\Billing\Http\Controllers;

use App\Core\Enums\BillingItemType;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\PaymentMethod;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Billing\Models\InsurancePolicy;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Facility\Models\Department;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(
        protected BillingService $billingService
    ) {}

    /**
     * Display Unified Hospital Billing Workstation, invoices, and cashier status.
     */
    public function index(Request $request): Response
    {
        $status = $request->input('status');
        $search = $request->input('search');

        $query = Invoice::with([
            'patient',
            'branch',
            'policy.provider',
            'items.department',
            'payments.receivedByUser',
            'claim',
        ])->latest('invoice_date');

        if ($status && $status !== 'ALL') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'ilike', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('mrn', 'ilike', "%{$search}%");
                    });
            });
        }

        $invoices = $query->paginate(15)->withQueryString();

        // Financial KPIs
        $totalInvoiced = Invoice::sum('total_amount');
        $totalPaid = Invoice::sum('paid_amount');
        $totalAr = max(0, $totalInvoiced - $totalPaid);
        $totalInsurancePortion = Invoice::sum('insurance_covered_amount');

        $patients = Patient::where('status', PatientStatus::Active)->limit(50)->get(['id', 'mrn', 'first_name', 'last_name']);
        $branches = Branch::where('is_active', true)->get(['id', 'name', 'code']);
        $departments = Department::where('is_active', true)->get(['id', 'name', 'code']);
        $policies = InsurancePolicy::with(['provider', 'patient'])->where('is_active', true)->get();

        return Inertia::render('Billing/InvoicesIndex', [
            'invoices' => $invoices,
            'patients' => $patients,
            'branches' => $branches,
            'departments' => $departments,
            'policies' => $policies,
            'itemTypes' => array_column(BillingItemType::cases(), 'value'),
            'paymentMethods' => array_column(PaymentMethod::cases(), 'value'),
            'filters' => [
                'status' => $status,
                'search' => $search,
            ],
            'stats' => [
                'total_invoiced' => (float) $totalInvoiced,
                'total_paid' => (float) $totalPaid,
                'total_ar' => (float) $totalAr,
                'total_insurance' => (float) $totalInsurancePortion,
            ],
        ]);
    }

    /**
     * Store a newly created hospital invoice with line items.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'branch_id' => ['required', 'uuid'],
            'patient_id' => ['required', 'uuid'],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'insurance_policy_id' => ['nullable', 'uuid'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.department_id' => ['nullable', 'uuid'],
            'items.*.item_type' => ['required', 'string'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        try {
            $invoice = $this->billingService->createInvoice(
                tenantId: $tenantId,
                branchId: $validated['branch_id'],
                patientId: $validated['patient_id'],
                invoiceDate: $validated['invoice_date'],
                items: $validated['items'],
                insurancePolicyId: $validated['insurance_policy_id'] ?? null,
                dueDate: $validated['due_date'] ?? null,
                notes: $validated['notes'] ?? null,
                createdByUserId: $request->user()->id
            );

            return back()->with('success', "Invoice #{$invoice->invoice_number} created and posted to General Ledger successfully.");
        } catch (Exception $e) {
            return back()->withErrors(['invoice' => $e->getMessage()]);
        }
    }

    /**
     * Record cashier payment settlement against an invoice.
     */
    public function storePayment(Request $request, Invoice $invoice): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'string'],
            'transaction_reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $method = PaymentMethod::from($validated['payment_method']);

            $payment = $this->billingService->recordPayment(
                invoice: $invoice,
                amount: (float) $validated['amount'],
                method: $method,
                transactionReference: $validated['transaction_reference'] ?? null,
                notes: $validated['notes'] ?? null,
                cashierUserId: $request->user()->id
            );

            return back()->with('success', "Receipt #{$payment->receipt_number} issued for \${$payment->amount}.");
        } catch (Exception $e) {
            return back()->withErrors(['payment' => $e->getMessage()]);
        }
    }
}
