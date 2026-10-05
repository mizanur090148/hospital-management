<?php

namespace App\Modules\SaaS\Services;

use App\Modules\Clinical\Models\Doctor;
use App\Modules\Facility\Models\Bed;
use App\Modules\Notification\Models\NotificationLog;
use App\Modules\SaaS\Enums\SubscriptionStatus;
use App\Modules\SaaS\Exceptions\FeatureNotIncludedException;
use App\Modules\SaaS\Exceptions\SubscriptionLimitExceededException;
use App\Modules\SaaS\Models\Plan;
use App\Modules\SaaS\Models\Subscription;
use App\Modules\SaaS\Models\TenantUsageRecord;
use App\Modules\Storage\Models\ClinicalDocument;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;

class TenantQuotaEnforcementService
{
    public function __construct(
        protected PlanCatalogService $planCatalogService
    ) {}

    /**
     * Get active subscription for a tenant.
     */
    public function getActiveSubscription(Tenant $tenant): ?Subscription
    {
        return Subscription::where('tenant_id', $tenant->id)
            ->whereIn('status', [SubscriptionStatus::Trialing, SubscriptionStatus::Active, SubscriptionStatus::PastDue])
            ->latest('starts_at')
            ->first();
    }

    /**
     * Get the active plan for a tenant. Falls back to Starter if unassigned.
     */
    public function getCurrentPlan(Tenant $tenant): Plan
    {
        $subscription = $this->getActiveSubscription($tenant);

        if ($subscription && $subscription->plan) {
            return $subscription->plan;
        }

        // Fallback by tenant plan slug or default Starter
        if (! empty($tenant->plan)) {
            $plan = $this->planCatalogService->getPlanBySlug($tenant->plan);
            if ($plan) {
                return $plan;
            }
        }

        // Return default starter plan
        $starter = $this->planCatalogService->getPlanBySlug('starter');
        if (! $starter) {
            $this->planCatalogService->seedDefaultPlans();
            $starter = $this->planCatalogService->getPlanBySlug('starter');
        }

        return $starter;
    }

    /**
     * Get current realtime resource usage for a metric.
     */
    public function getCurrentUsage(Tenant $tenant, string $metric): int
    {
        return match ($metric) {
            'max_beds', 'beds' => Bed::where('tenant_id', $tenant->id)->count(),
            'max_doctors', 'doctors' => Doctor::where('tenant_id', $tenant->id)->count(),
            'max_branches', 'branches' => Branch::where('tenant_id', $tenant->id)->count(),
            'monthly_sms_quota', 'sms_notifications' => NotificationLog::where('tenant_id', $tenant->id)
                ->where('channel', 'SMS')
                ->where('created_at', '>=', now()->startOfMonth())
                ->count(),
            'max_storage_gb', 'storage_gb' => (int) ceil(
                (float) (ClinicalDocument::where('tenant_id', $tenant->id)->sum('file_size_bytes') ?: 0) / (1024 * 1024 * 1024)
            ),
            default => 0,
        };
    }

    /**
     * Assert that tenant has capacity to create an additional resource.
     *
     * @throws SubscriptionLimitExceededException
     */
    public function assertCanCreateResource(Tenant $tenant, string $resourceType, int $increment = 1): void
    {
        $plan = $this->getCurrentPlan($tenant);
        $metricKey = match ($resourceType) {
            'beds', 'bed' => 'max_beds',
            'doctors', 'doctor' => 'max_doctors',
            'branches', 'branch' => 'max_branches',
            'sms', 'sms_notifications' => 'monthly_sms_quota',
            'storage', 'storage_gb' => 'max_storage_gb',
            default => $resourceType,
        };

        $limit = $plan->getLimit($metricKey);

        // If limit is not set or null, resource is unlimited
        if ($limit === null) {
            return;
        }

        $currentUsage = $this->getCurrentUsage($tenant, $metricKey);

        if (($currentUsage + $increment) > $limit) {
            throw new SubscriptionLimitExceededException(
                resourceType: $resourceType,
                currentUsage: $currentUsage,
                quotaLimit: $limit,
                planName: $plan->name
            );
        }
    }

    /**
     * Check if a feature is enabled on the tenant's current plan.
     */
    public function hasFeature(Tenant $tenant, string $featureKey): bool
    {
        $plan = $this->getCurrentPlan($tenant);

        return $plan->hasFeature($featureKey);
    }

    /**
     * Assert that a feature is enabled.
     *
     * @throws FeatureNotIncludedException
     */
    public function assertFeatureEnabled(Tenant $tenant, string $featureKey): void
    {
        if (! $this->hasFeature($tenant, $featureKey)) {
            $plan = $this->getCurrentPlan($tenant);

            throw new FeatureNotIncludedException($featureKey, $plan->name);
        }
    }

    /**
     * Get a comprehensive usage overview with percentages and thresholds for UI meters.
     */
    public function getTenantUsageOverview(Tenant $tenant): array
    {
        $plan = $this->getCurrentPlan($tenant);
        $subscription = $this->getActiveSubscription($tenant);

        $metrics = [
            'beds' => [
                'name' => 'Inpatient Bed Capacity',
                'limit_key' => 'max_beds',
                'unit' => 'Beds',
            ],
            'doctors' => [
                'name' => 'Active Doctor Seats',
                'limit_key' => 'max_doctors',
                'unit' => 'Doctors',
            ],
            'branches' => [
                'name' => 'Operational Branches',
                'limit_key' => 'max_branches',
                'unit' => 'Branches',
            ],
            'sms_notifications' => [
                'name' => 'Monthly SMS Dispatches',
                'limit_key' => 'monthly_sms_quota',
                'unit' => 'SMS',
            ],
            'storage_gb' => [
                'name' => 'Clinical Document Storage',
                'limit_key' => 'max_storage_gb',
                'unit' => 'GB',
            ],
        ];

        $currentPeriodMonth = now()->format('Y-m');
        $overview = [];

        foreach ($metrics as $metricCode => $meta) {
            $limitKey = $meta['limit_key'];
            $limit = $plan->getLimit($limitKey);
            $usage = $this->getCurrentUsage($tenant, $limitKey);

            $percentage = ($limit && $limit > 0) ? min(100, round(($usage / $limit) * 100, 1)) : 0;

            $status = match (true) {
                $limit !== null && $usage >= $limit => 'exceeded',
                $percentage >= 90 => 'critical',
                $percentage >= 75 => 'warning',
                default => 'safe',
            };

            // Sync with saas_tenant_usages table
            TenantUsageRecord::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'metric' => $metricCode,
                    'period_month' => $currentPeriodMonth,
                ],
                [
                    'current_usage' => $usage,
                    'quota_limit' => $limit,
                    'last_calculated_at' => now(),
                ]
            );

            $overview[$metricCode] = [
                'metric' => $metricCode,
                'name' => $meta['name'],
                'unit' => $meta['unit'],
                'usage' => $usage,
                'limit' => $limit,
                'percentage' => $percentage,
                'is_unlimited' => $limit === null,
                'status' => $status,
            ];
        }

        return [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->legal_name ?? $tenant->trade_name,
                'slug' => $tenant->slug,
            ],
            'plan' => [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'tier_level' => $plan->tier_level,
                'monthly_price' => (float) $plan->monthly_price,
                'annual_price' => (float) $plan->annual_price,
                'features' => $plan->features,
            ],
            'subscription' => $subscription ? [
                'id' => $subscription->id,
                'number' => $subscription->subscription_number,
                'status' => $subscription->status->value,
                'status_label' => $subscription->status->label(),
                'badge_class' => $subscription->status->badgeClass(),
                'billing_cycle' => $subscription->billing_cycle->value,
                'price' => (float) $subscription->price,
                'current_period_ends_at' => $subscription->current_period_ends_at?->toDateString(),
                'on_trial' => $subscription->onTrial(),
            ] : null,
            'metrics' => $overview,
        ];
    }
}
