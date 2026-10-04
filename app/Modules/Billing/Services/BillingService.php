<?php

namespace App\Modules\Billing\Services;

use App\Core\Enums\ClaimStatus;
use App\Core\Enums\InvoiceStatus;
use App\Core\Enums\PaymentMethod;
use App\Core\Sequences\SequenceGenerator;
use App\Modules\Accounting\Services\DoubleEntryAccountingService;
use App\Modules\Billing\Models\InsuranceClaim;
use App\Modules\Billing\Models\InsurancePolicy;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\InvoiceItem;
use App\Modules\Billing\Models\Payment;
use Illuminate\Support\Facades\DB;

class BillingService
{
    public function __construct(
        protected DoubleEntryAccountingService $accountingService
    ) {}

    /**
     * Create a complete hospital Invoice with line items, insurance split, and automatic GL posting.
     *
     * @param  array<int, array{department_id?: string|null, item_type: string, item_reference_id?: string|null, description: string, quantity: int, unit_price: float}>  $items
     */
    public function createInvoice(
        string $tenantId,
        string $branchId,
        string $patientId,
        string $invoiceDate,
        array $items,
        ?string $insurancePolicyId = null,
        ?string $dueDate = null,
        ?string $notes = null,
        ?string $createdByUserId = null
    ): Invoice {
        return DB::transaction(function () use ($tenantId, $branchId, $patientId, $invoiceDate, $items, $insurancePolicyId, $dueDate, $notes, $createdByUserId) {
            $invoiceNumber = SequenceGenerator::generateInvoiceNumber($tenantId);

            // Compute Subtotal
            $subtotal = 0.00;
            foreach ($items as $item) {
                $subtotal += round($item['quantity'] * (float) $item['unit_price'], 2);
            }

            $insuranceCovered = 0.00;
            $patientPayable = $subtotal;
            $policy = null;

            // Check Insurance Coverage
            if ($insurancePolicyId) {
                $policy = InsurancePolicy::where('tenant_id', $tenantId)
                    ->where('id', $insurancePolicyId)
                    ->first();

                if ($policy && $policy->isValidNow()) {
                    $covPct = (float) $policy->coverage_percentage;
                    $insuranceCovered = round($subtotal * ($covPct / 100), 2);

                    // Ensure does not exceed annual limit
                    $insuranceCovered = min($insuranceCovered, (float) $policy->annual_limit);
                    $patientPayable = round($subtotal - $insuranceCovered, 2);
                }
            }

            $invoice = Invoice::create([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'patient_id' => $patientId,
                'invoice_number' => $invoiceNumber,
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'subtotal' => $subtotal,
                'discount_amount' => 0.00,
                'tax_amount' => 0.00,
                'insurance_covered_amount' => $insuranceCovered,
                'patient_payable_amount' => $patientPayable,
                'total_amount' => $subtotal,
                'paid_amount' => 0.00,
                'status' => InvoiceStatus::Issued,
                'insurance_policy_id' => $policy ? $policy->id : null,
                'notes' => $notes,
                'created_by_user_id' => $createdByUserId,
            ]);

            foreach ($items as $itemData) {
                $itemSubtotal = round($itemData['quantity'] * (float) $itemData['unit_price'], 2);

                InvoiceItem::create([
                    'tenant_id' => $tenantId,
                    'invoice_id' => $invoice->id,
                    'department_id' => $itemData['department_id'] ?? null,
                    'item_type' => $itemData['item_type'],
                    'item_reference_id' => $itemData['item_reference_id'] ?? null,
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'subtotal' => $itemSubtotal,
                ]);
            }

            // Automatically post balanced Double-Entry General Ledger journal entry
            $this->accountingService->postInvoiceIssued($invoice, $createdByUserId);

            // If insurance portion exists, create Claim
            if ($policy && $insuranceCovered > 0) {
                $claimNumber = SequenceGenerator::generateClaimNumber($tenantId);

                InsuranceClaim::create([
                    'tenant_id' => $tenantId,
                    'branch_id' => $branchId,
                    'claim_number' => $claimNumber,
                    'invoice_id' => $invoice->id,
                    'insurance_provider_id' => $policy->insurance_provider_id,
                    'insurance_policy_id' => $policy->id,
                    'patient_id' => $patientId,
                    'pre_auth_code' => $policy->group_number,
                    'claimed_amount' => $insuranceCovered,
                    'approved_amount' => 0.00,
                    'disallowed_amount' => 0.00,
                    'status' => ClaimStatus::Submitted,
                    'submitted_at' => now(),
                ]);
            }

            return $invoice->load(['items', 'patient', 'policy.provider']);
        });
    }

    /**
     * Record Cashier payment against an invoice and post balanced General Ledger entry.
     */
    public function recordPayment(
        Invoice $invoice,
        float $amount,
        PaymentMethod $method,
        ?string $transactionReference,
        ?string $notes,
        string $cashierUserId
    ): Payment {
        return DB::transaction(function () use ($invoice, $amount, $method, $transactionReference, $notes, $cashierUserId) {
            $invoice = Invoice::where('id', $invoice->id)->lockForUpdate()->firstOrFail();

            $receiptNumber = SequenceGenerator::generateReceiptNumber($invoice->tenant_id);

            $payment = Payment::create([
                'tenant_id' => $invoice->tenant_id,
                'branch_id' => $invoice->branch_id,
                'invoice_id' => $invoice->id,
                'receipt_number' => $receiptNumber,
                'payment_method' => $method,
                'amount' => $amount,
                'transaction_reference' => $transactionReference,
                'payment_date' => now(),
                'received_by_user_id' => $cashierUserId,
                'notes' => $notes,
            ]);

            $newPaid = round((float) $invoice->paid_amount + $amount, 2);
            $invoice->paid_amount = $newPaid;

            if ($newPaid >= (float) $invoice->total_amount) {
                $invoice->status = InvoiceStatus::Paid;
            } elseif ($newPaid > 0) {
                $invoice->status = InvoiceStatus::PartiallyPaid;
            }
            $invoice->save();

            // Post double-entry cash receipt
            $this->accountingService->postPaymentReceived($payment, $cashierUserId);

            return $payment;
        });
    }

    /**
     * Adjudicate and settle an Insurance Claim.
     */
    public function adjudicateClaim(
        InsuranceClaim $claim,
        ClaimStatus $newStatus,
        float $approvedAmount,
        float $disallowedAmount,
        ?string $notes,
        string $adjudicatorUserId
    ): InsuranceClaim {
        return DB::transaction(function () use ($claim, $newStatus, $approvedAmount, $disallowedAmount, $notes, $adjudicatorUserId) {
            $claim->status = $newStatus;
            $claim->approved_amount = $approvedAmount;
            $claim->disallowed_amount = $disallowedAmount;
            $claim->adjudication_notes = $notes;
            $claim->adjudicated_at = now();
            $claim->adjudicated_by_user_id = $adjudicatorUserId;
            $claim->save();

            if (in_array($newStatus, [ClaimStatus::Approved, ClaimStatus::PartiallyApproved, ClaimStatus::Settled], true)) {
                // Post GL Claim Settlement
                $this->accountingService->postInsuranceClaimSettlement(
                    claim: $claim,
                    approvedAmount: $approvedAmount,
                    disallowedAmount: $disallowedAmount,
                    userId: $adjudicatorUserId
                );

                // If approved amount settles invoice insurance portion, update paid amount
                $invoice = Invoice::where('id', $claim->invoice_id)->lockForUpdate()->first();
                if ($invoice && $approvedAmount > 0) {
                    $invoice->paid_amount = round((float) $invoice->paid_amount + $approvedAmount, 2);
                    if ($invoice->paid_amount >= (float) $invoice->total_amount) {
                        $invoice->status = InvoiceStatus::Paid;
                    } elseif ($invoice->paid_amount > 0) {
                        $invoice->status = InvoiceStatus::PartiallyPaid;
                    }
                    $invoice->save();
                }
            }

            return $claim->fresh();
        });
    }
}
