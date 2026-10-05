<?php

namespace App\Modules\SaaS\Services;

use App\Modules\SaaS\Models\Plan;
use Illuminate\Database\Eloquent\Collection;

class PlanCatalogService
{
    /**
     * Pre-defined enterprise SaaS plan templates.
     */
    public const DEFAULT_PLANS = [
        [
            'name' => 'Starter Clinic',
            'slug' => 'starter',
            'tier_level' => 1,
            'description' => 'Ideal for specialized outpatient clinics, single practitioners, and small urgent care centers.',
            'monthly_price' => 199.00,
            'annual_price' => 1990.00, // 2 months free (~17% discount)
            'currency' => 'USD',
            'trial_days' => 14,
            'is_active' => true,
            'is_popular' => false,
            'limits' => [
                'max_beds' => 20,
                'max_doctors' => 5,
                'max_branches' => 1,
                'monthly_sms_quota' => 1000,
                'max_storage_gb' => 10,
            ],
            'features' => [
                'opd_emr' => true,
                'pharmacy_fefo' => true,
                'lab_diagnostics' => true,
                'patient_portal' => true,
                'ai_scribe_enabled' => false,
                'rag_knowledge_base' => false,
                'telemedicine_portal' => false,
                'break_glass_audit' => false,
                'merkle_audit_proof' => false,
            ],
        ],
        [
            'name' => 'Professional Hospital',
            'slug' => 'professional',
            'tier_level' => 2,
            'description' => 'Comprehensive enterprise workflow for community hospitals, surgical centers, and multi-specialty clinics.',
            'monthly_price' => 599.00,
            'annual_price' => 5990.00,
            'currency' => 'USD',
            'trial_days' => 14,
            'is_active' => true,
            'is_popular' => true,
            'limits' => [
                'max_beds' => 100,
                'max_doctors' => 25,
                'max_branches' => 3,
                'monthly_sms_quota' => 10000,
                'max_storage_gb' => 100,
            ],
            'features' => [
                'opd_emr' => true,
                'pharmacy_fefo' => true,
                'lab_diagnostics' => true,
                'patient_portal' => true,
                'ai_scribe_enabled' => true,
                'rag_knowledge_base' => true,
                'telemedicine_portal' => true,
                'break_glass_audit' => true,
                'merkle_audit_proof' => true,
            ],
        ],
        [
            'name' => 'Enterprise Health Network',
            'slug' => 'enterprise',
            'tier_level' => 3,
            'description' => 'Mission-critical scalability for nationwide hospital networks, academic medical centers, and enterprise healthcare groups.',
            'monthly_price' => 1499.00,
            'annual_price' => 14990.00,
            'currency' => 'USD',
            'trial_days' => 30,
            'is_active' => true,
            'is_popular' => false,
            'limits' => [
                'max_beds' => 1000,
                'max_doctors' => 250,
                'max_branches' => 20,
                'monthly_sms_quota' => 100000,
                'max_storage_gb' => 1000,
            ],
            'features' => [
                'opd_emr' => true,
                'pharmacy_fefo' => true,
                'lab_diagnostics' => true,
                'patient_portal' => true,
                'ai_scribe_enabled' => true,
                'rag_knowledge_base' => true,
                'telemedicine_portal' => true,
                'break_glass_audit' => true,
                'merkle_audit_proof' => true,
                'custom_branding' => true,
                'dedicated_support' => true,
                'api_webhook_access' => true,
            ],
        ],
    ];

    /**
     * Seed or update default plans in database.
     */
    public function seedDefaultPlans(): array
    {
        $createdPlans = [];
        foreach (self::DEFAULT_PLANS as $planData) {
            $plan = Plan::updateOrCreate(
                ['slug' => $planData['slug']],
                $planData
            );
            $createdPlans[] = $plan;
        }

        return $createdPlans;
    }

    /**
     * Get all active public plans sorted by tier.
     */
    public function getActivePlans(): Collection
    {
        return Plan::where('is_active', true)
            ->orderBy('tier_level')
            ->get();
    }

    /**
     * Find plan by slug.
     */
    public function getPlanBySlug(string $slug): ?Plan
    {
        return Plan::where('slug', $slug)->first();
    }
}
