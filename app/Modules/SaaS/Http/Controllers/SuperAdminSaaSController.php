<?php

namespace App\Modules\SaaS\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\SaaS\Enums\BillingCycle;
use App\Modules\SaaS\Enums\SubscriptionInvoiceStatus;
use App\Modules\SaaS\Enums\SubscriptionStatus;
use App\Modules\SaaS\Models\Plan;
use App\Modules\SaaS\Models\Subscription;
use App\Modules\SaaS\Models\SubscriptionInvoice;
use App\Modules\SaaS\Services\PlanCatalogService;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SuperAdminSaaSController extends Controller
{
    public function __construct(
        protected PlanCatalogService $planCatalogService
    ) {}

    /**
     * Display the Global SuperAdmin SaaS Metrics & Subscription Cockpit.
     */
    public function cockpit(Request $request): Response
    {
        $this->planCatalogService->seedDefaultPlans();

        $plans = $this->planCatalogService->getActivePlans();
        $totalTenants = Tenant::count();

        $activeSubscriptions = Subscription::where('status', SubscriptionStatus::Active)
            ->with(['tenant', 'plan'])
            ->get();

        // Calculate MRR & ARR
        $mrr = 0.0;
        foreach ($activeSubscriptions as $sub) {
            if ($sub->billing_cycle === BillingCycle::Monthly) {
                $mrr += (float) $sub->price;
            } elseif ($sub->billing_cycle === BillingCycle::Annual) {
                $mrr += ((float) $sub->price) / 12;
            }
        }
        $arr = $mrr * 12;

        // Plan distribution
        $planBreakdown = [];
        foreach ($plans as $plan) {
            $count = Subscription::where('plan_id', $plan->id)
                ->where('status', SubscriptionStatus::Active)
                ->count();

            $planBreakdown[] = [
                'plan_id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'tier_level' => $plan->tier_level,
                'active_subscribers' => $count,
                'monthly_price' => (float) $plan->monthly_price,
                'annual_price' => (float) $plan->annual_price,
                'limits' => $plan->limits,
                'features' => $plan->features,
            ];
        }

        // Recent Invoices
        $recentInvoices = SubscriptionInvoice::with(['tenant', 'subscription.plan'])
            ->latest()
            ->limit(15)
            ->get()
            ->map(fn (SubscriptionInvoice $inv) => [
                'id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'tenant_name' => $inv->tenant?->legal_name ?? $inv->tenant?->trade_name ?? 'Tenant',
                'plan_name' => $inv->subscription?->plan?->name ?? 'Standard',
                'billing_reason' => $inv->billing_reason,
                'total_amount' => (float) $inv->total_amount,
                'status' => $inv->status->value,
                'status_label' => $inv->status->label(),
                'badge_class' => $inv->status->badgeClass(),
                'paid_at' => $inv->paid_at?->toDateTimeString(),
                'created_at' => $inv->created_at->toDateTimeString(),
            ]);

        $paidInvoicesSum = (float) SubscriptionInvoice::where('status', SubscriptionInvoiceStatus::Paid)
            ->sum('total_amount');

        return Inertia::render('SaaS/SuperAdminSaaSCockpit', [
            'metrics' => [
                'mrr' => round($mrr, 2),
                'arr' => round($arr, 2),
                'total_revenue' => round($paidInvoicesSum, 2),
                'total_tenants' => $totalTenants,
                'active_subscribers_count' => $activeSubscriptions->count(),
                'trialing_count' => Subscription::where('status', SubscriptionStatus::Trialing)->count(),
                'past_due_count' => Subscription::where('status', SubscriptionStatus::PastDue)->count(),
                'churned_count' => Subscription::where('status', SubscriptionStatus::Cancelled)->count(),
            ],
            'plans' => $planBreakdown,
            'recentInvoices' => $recentInvoices,
        ]);
    }

    /**
     * Update plan pricing, limits or features.
     */
    public function updatePlan(Request $request, Plan $plan): JsonResponse
    {
        $validated = $request->validate([
            'monthly_price' => 'nullable|numeric|min:0',
            'annual_price' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'is_popular' => 'nullable|boolean',
            'limits' => 'nullable|array',
            'features' => 'nullable|array',
        ]);

        $plan->update($validated);

        return response()->json([
            'success' => true,
            'message' => "Plan {$plan->name} updated successfully.",
            'plan' => $plan->fresh(),
        ]);
    }
}
