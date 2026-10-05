<?php

namespace App\Modules\SaaS\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\SaaS\Enums\BillingCycle;
use App\Modules\SaaS\Models\Plan;
use App\Modules\SaaS\Models\SubscriptionInvoice;
use App\Modules\SaaS\Services\PlanCatalogService;
use App\Modules\SaaS\Services\SubscriptionBillingService;
use App\Modules\SaaS\Services\TenantQuotaEnforcementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantSubscriptionController extends Controller
{
    public function __construct(
        protected PlanCatalogService $planCatalogService,
        protected TenantQuotaEnforcementService $quotaService,
        protected SubscriptionBillingService $billingService
    ) {}

    /**
     * Display the Tenant Subscription & Resource Quota Portal.
     */
    public function portal(Request $request): Response
    {
        $tenant = $request->user()->tenant;
        $this->planCatalogService->seedDefaultPlans();

        $usageOverview = $this->quotaService->getTenantUsageOverview($tenant);
        $availablePlans = $this->planCatalogService->getActivePlans();

        $invoices = SubscriptionInvoice::where('tenant_id', $tenant->id)
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (SubscriptionInvoice $inv) => [
                'id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'billing_reason' => $inv->billing_reason,
                'subtotal' => (float) $inv->subtotal,
                'discount_amount' => (float) $inv->discount_amount,
                'total_amount' => (float) $inv->total_amount,
                'currency' => $inv->currency,
                'status' => $inv->status->value,
                'status_label' => $inv->status->label(),
                'badge_class' => $inv->status->badgeClass(),
                'due_date' => $inv->due_date?->toDateString(),
                'paid_at' => $inv->paid_at?->toDateTimeString(),
                'line_items' => $inv->line_items,
            ]);

        return Inertia::render('SaaS/SubscriptionPortal', [
            'usageOverview' => $usageOverview,
            'availablePlans' => $availablePlans,
            'invoices' => $invoices,
        ]);
    }

    /**
     * Upgrade, downgrade, or subscribe to a plan.
     */
    public function changePlan(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'plan_id' => 'required|uuid|exists:saas_plans,id',
            'billing_cycle' => 'nullable|string|in:MONTHLY,ANNUAL',
        ]);

        $tenant = $request->user()->tenant;
        $newPlan = Plan::findOrFail($validated['plan_id']);
        $cycle = isset($validated['billing_cycle'])
            ? BillingCycle::from($validated['billing_cycle'])
            : BillingCycle::Monthly;

        $activeSubscription = $this->quotaService->getActiveSubscription($tenant);

        if ($activeSubscription) {
            $result = $this->billingService->changePlan($activeSubscription, $newPlan, $cycle);
        } else {
            $subscription = $this->billingService->subscribe($tenant, $newPlan, $cycle);
            $result = [
                'subscription' => $subscription,
                'proration' => null,
            ];
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Successfully updated subscription to {$newPlan->name}.",
                'data' => $result,
            ]);
        }

        return back()->with('success', "Subscription successfully updated to {$newPlan->name}!");
    }

    /**
     * Pay an outstanding subscription invoice.
     */
    public function payInvoice(Request $request, SubscriptionInvoice $invoice): JsonResponse|RedirectResponse
    {
        $tenant = $request->user()->tenant;
        if ($invoice->tenant_id !== $tenant->id) {
            abort(403);
        }

        $paidInvoice = $this->billingService->processInvoicePayment($invoice);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Invoice {$invoice->invoice_number} paid successfully.",
                'invoice' => $paidInvoice,
            ]);
        }

        return back()->with('success', "Invoice {$invoice->invoice_number} paid successfully!");
    }

    /**
     * Cancel active subscription.
     */
    public function cancel(Request $request): JsonResponse|RedirectResponse
    {
        $tenant = $request->user()->tenant;
        $subscription = $this->quotaService->getActiveSubscription($tenant);

        if (! $subscription) {
            abort(404, 'No active subscription found.');
        }

        $reason = $request->input('reason', 'User requested cancellation via portal');
        $immediately = (bool) $request->input('immediately', false);

        $this->billingService->cancelSubscription($subscription, $reason, $immediately);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Subscription cancelled successfully.',
            ]);
        }

        return back()->with('success', 'Subscription cancelled successfully.');
    }
}
