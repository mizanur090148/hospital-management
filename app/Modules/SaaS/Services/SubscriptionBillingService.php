<?php

namespace App\Modules\SaaS\Services;

use App\Core\Enums\AuditAction;
use App\Core\Enums\TenantStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Modules\Audit\Services\AuditImmutabilityService;
use App\Modules\SaaS\Enums\BillingCycle;
use App\Modules\SaaS\Enums\SubscriptionInvoiceStatus;
use App\Modules\SaaS\Enums\SubscriptionStatus;
use App\Modules\SaaS\Models\Plan;
use App\Modules\SaaS\Models\Subscription;
use App\Modules\SaaS\Models\SubscriptionInvoice;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Support\Facades\Request;

class SubscriptionBillingService
{
    public const GRACE_PERIOD_DAYS = 7;

    public function __construct(
        protected SequenceGenerator $sequenceGenerator,
        protected AuditImmutabilityService $auditImmutabilityService
    ) {}

    /**
     * Subscribe a tenant to a plan.
     */
    public function subscribe(
        Tenant $tenant,
        Plan $plan,
        BillingCycle $cycle = BillingCycle::Monthly,
        string $paymentMethod = 'CREDIT_CARD'
    ): Subscription {
        $now = now();
        $months = $cycle->months();
        $periodEndsAt = (clone $now)->addMonths($months);

        $price = $plan->getPriceForCycle($cycle);
        $subscriptionNumber = $this->sequenceGenerator->generateSubscriptionNumber($tenant->id);

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'subscription_number' => $subscriptionNumber,
            'billing_cycle' => $cycle,
            'price' => $price,
            'currency' => $plan->currency,
            'status' => SubscriptionStatus::Active,
            'starts_at' => $now,
            'current_period_starts_at' => $now,
            'current_period_ends_at' => $periodEndsAt,
            'trial_ends_at' => $plan->trial_days > 0 ? (clone $now)->addDays($plan->trial_days) : null,
            'grace_period_ends_at' => null,
            'payment_method' => $paymentMethod,
        ]);

        // Generate primary subscription invoice
        $this->generateInvoiceForPeriod($subscription, $price, 'SUBSCRIPTION_CYCLE', "Initial subscription to {$plan->name} ({$cycle->label()})");

        // Sync tenant plan
        $tenant->update([
            'plan' => $plan->slug,
            'status' => TenantStatus::Active,
        ]);

        // Audit Trail
        $this->auditImmutabilityService->recordHashChainedLog([
            'tenant_id' => $tenant->id,
            'user_id' => null,
            'action' => AuditAction::Create,
            'entity_type' => Subscription::class,
            'entity_id' => $subscription->id,
            'old_values' => null,
            'new_values' => [
                'subscription_number' => $subscriptionNumber,
                'plan' => $plan->slug,
                'price' => $price,
                'cycle' => $cycle->value,
            ],
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);

        return $subscription;
    }

    /**
     * Change subscription plan (Upgrade or Downgrade) with financial proration.
     */
    public function changePlan(
        Subscription $subscription,
        Plan $newPlan,
        ?BillingCycle $newCycle = null
    ): array {
        $tenant = $subscription->tenant;
        $currentPlan = $subscription->plan;
        $cycle = $newCycle ?? $subscription->billing_cycle;

        $now = now();
        $periodStart = $subscription->current_period_starts_at;
        $periodEnd = $subscription->current_period_ends_at;

        // 1. Calculate Proration
        $totalDays = max(1, $periodStart->diffInDays($periodEnd));
        $daysRemaining = max(0, $now->diffInDays($periodEnd, false));

        $unusedRatio = min(1.0, max(0.0, $daysRemaining / $totalDays));
        $unusedCredit = round($unusedRatio * (float) $subscription->price, 2);

        $newPrice = $newPlan->getPriceForCycle($cycle);
        $netPayable = max(0.00, round($newPrice - $unusedCredit, 2));
        $unusedCreditSurplus = max(0.00, round($unusedCredit - $newPrice, 2));

        $isUpgrade = $newPlan->tier_level >= $currentPlan->tier_level;
        $billingReason = $isUpgrade ? 'PLAN_UPGRADE' : 'PLAN_DOWNGRADE';

        // 2. Generate Prorated Invoice
        $invoiceNumber = $this->sequenceGenerator->generateSubscriptionInvoiceNumber($tenant->id);

        $lineItems = [
            [
                'description' => "Plan Change to {$newPlan->name} ({$cycle->label()})",
                'quantity' => 1,
                'unit_price' => $newPrice,
                'amount' => $newPrice,
            ],
            [
                'description' => "Prorated unused credit from {$currentPlan->name} ({$daysRemaining} days remaining)",
                'quantity' => 1,
                'unit_price' => -$unusedCredit,
                'amount' => -$unusedCredit,
            ],
        ];

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => $invoiceNumber,
            'billing_reason' => $billingReason,
            'subtotal' => $newPrice,
            'discount_amount' => $unusedCredit,
            'tax_amount' => 0.00,
            'total_amount' => $netPayable,
            'currency' => $newPlan->currency,
            'status' => $netPayable == 0 ? SubscriptionInvoiceStatus::Paid : SubscriptionInvoiceStatus::Pending,
            'due_date' => $now->toDateString(),
            'paid_at' => $netPayable == 0 ? $now : null,
            'line_items' => $lineItems,
            'notes' => "Plan migration from {$currentPlan->name} to {$newPlan->name}.",
        ]);

        // 3. Update Subscription
        $subscription->update([
            'plan_id' => $newPlan->id,
            'billing_cycle' => $cycle,
            'price' => $newPrice,
            'current_period_starts_at' => $now,
            'current_period_ends_at' => (clone $now)->addMonths($cycle->months()),
            'status' => SubscriptionStatus::Active,
        ]);

        // 4. Update Tenant
        $tenant->update([
            'plan' => $newPlan->slug,
        ]);

        // 5. Audit Trail
        $this->auditImmutabilityService->recordHashChainedLog([
            'tenant_id' => $tenant->id,
            'user_id' => null,
            'action' => AuditAction::Update,
            'entity_type' => Subscription::class,
            'entity_id' => $subscription->id,
            'old_values' => ['plan' => $currentPlan->slug, 'price' => $subscription->price],
            'new_values' => [
                'plan' => $newPlan->slug,
                'price' => $newPrice,
                'unused_credit' => $unusedCredit,
                'net_payable' => $netPayable,
            ],
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);

        return [
            'subscription' => $subscription->fresh(['plan']),
            'invoice' => $invoice,
            'proration' => [
                'days_remaining' => $daysRemaining,
                'total_days' => $totalDays,
                'unused_credit' => $unusedCredit,
                'new_price' => $newPrice,
                'net_payable' => $netPayable,
                'surplus_credit' => $unusedCreditSurplus,
            ],
        ];
    }

    /**
     * Process settlement for a subscription invoice.
     */
    public function processInvoicePayment(
        SubscriptionInvoice $invoice,
        ?string $paymentReference = null
    ): SubscriptionInvoice {
        $now = now();

        $invoice->update([
            'status' => SubscriptionInvoiceStatus::Paid,
            'paid_at' => $now,
            'payment_reference' => $paymentReference ?? ('TXN-'.strtoupper(bin2hex(random_bytes(6)))),
        ]);

        // Ensure subscription is active and clear grace period
        $subscription = $invoice->subscription;
        if ($subscription) {
            $subscription->update([
                'status' => SubscriptionStatus::Active,
                'grace_period_ends_at' => null,
            ]);
        }

        // Ensure tenant is active
        $tenant = $invoice->tenant;
        if ($tenant && $tenant->status !== TenantStatus::Active) {
            $tenant->update(['status' => TenantStatus::Active]);
        }

        return $invoice;
    }

    /**
     * Cancel subscription.
     */
    public function cancelSubscription(
        Subscription $subscription,
        ?string $reason = null,
        bool $immediately = false
    ): Subscription {
        $now = now();

        if ($immediately) {
            $subscription->update([
                'status' => SubscriptionStatus::Cancelled,
                'cancelled_at' => $now,
                'cancellation_reason' => $reason,
            ]);

            $subscription->tenant->update([
                'status' => TenantStatus::Cancelled,
            ]);
        } else {
            // Cancel at period end
            $metadata = $subscription->metadata ?? [];
            $metadata['cancel_at_period_end'] = true;
            $metadata['scheduled_cancellation_reason'] = $reason;

            $subscription->update([
                'metadata' => $metadata,
            ]);
        }

        return $subscription;
    }

    /**
     * Evaluate past due subscriptions and enforce grace periods.
     */
    public function evaluateTenantGracePeriods(): array
    {
        $now = now();
        $pastDueTransitions = 0;
        $suspendedTransitions = 0;

        // 1. Move expired active subscriptions into PAST_DUE
        $expiredActive = Subscription::where('status', SubscriptionStatus::Active)
            ->where('current_period_ends_at', '<', $now)
            ->get();

        foreach ($expiredActive as $sub) {
            $sub->update([
                'status' => SubscriptionStatus::PastDue,
                'grace_period_ends_at' => (clone $now)->addDays(self::GRACE_PERIOD_DAYS),
            ]);
            $pastDueTransitions++;
        }

        // 2. Move past-due subscriptions past grace period into SUSPENDED
        $expiredGrace = Subscription::where('status', SubscriptionStatus::PastDue)
            ->whereNotNull('grace_period_ends_at')
            ->where('grace_period_ends_at', '<', $now)
            ->get();

        foreach ($expiredGrace as $sub) {
            $sub->update([
                'status' => SubscriptionStatus::Suspended,
            ]);

            $sub->tenant->update([
                'status' => TenantStatus::Suspended,
            ]);

            $suspendedTransitions++;
        }

        return [
            'past_due_count' => $pastDueTransitions,
            'suspended_count' => $suspendedTransitions,
        ];
    }

    /**
     * Helper to generate a subscription invoice.
     */
    protected function generateInvoiceForPeriod(
        Subscription $subscription,
        float $amount,
        string $billingReason,
        string $description
    ): SubscriptionInvoice {
        $invoiceNumber = $this->sequenceGenerator->generateSubscriptionInvoiceNumber($subscription->tenant_id);

        return SubscriptionInvoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'invoice_number' => $invoiceNumber,
            'billing_reason' => $billingReason,
            'subtotal' => $amount,
            'discount_amount' => 0.00,
            'tax_amount' => 0.00,
            'total_amount' => $amount,
            'currency' => $subscription->currency,
            'status' => SubscriptionInvoiceStatus::Paid, // Automatically marked paid for initial credit card charge
            'due_date' => now()->toDateString(),
            'paid_at' => now(),
            'payment_reference' => 'TXN-'.strtoupper(bin2hex(random_bytes(6))),
            'line_items' => [
                [
                    'description' => $description,
                    'quantity' => 1,
                    'unit_price' => $amount,
                    'amount' => $amount,
                ],
            ],
            'notes' => 'Generated automatically by SaaS Billing Engine.',
        ]);
    }
}
