<?php

namespace App\Modules\SaaS\Models;

use App\Modules\SaaS\Enums\BillingCycle;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Plan extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'saas_plans';

    protected $fillable = [
        'name',
        'slug',
        'tier_level',
        'description',
        'monthly_price',
        'annual_price',
        'currency',
        'trial_days',
        'is_active',
        'is_popular',
        'limits',
        'features',
    ];

    protected $casts = [
        'tier_level' => 'integer',
        'monthly_price' => 'decimal:2',
        'annual_price' => 'decimal:2',
        'trial_days' => 'integer',
        'is_active' => 'boolean',
        'is_popular' => 'boolean',
        'limits' => 'array',
        'features' => 'array',
    ];

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'plan_id');
    }

    /**
     * Get price for given billing cycle.
     */
    public function getPriceForCycle(BillingCycle $cycle): float
    {
        return match ($cycle) {
            BillingCycle::Monthly => (float) $this->monthly_price,
            BillingCycle::Annual => (float) $this->annual_price,
        };
    }

    /**
     * Get limit for a given metric.
     */
    public function getLimit(string $metric): ?int
    {
        $limits = $this->limits ?? [];

        return isset($limits[$metric]) ? (int) $limits[$metric] : null;
    }

    /**
     * Check if a feature is included in this plan.
     */
    public function hasFeature(string $featureKey): bool
    {
        $features = $this->features ?? [];

        if (is_array($features)) {
            // Check if associative key is true or value is present in flat list
            if (isset($features[$featureKey])) {
                return (bool) $features[$featureKey];
            }

            return in_array($featureKey, $features, true);
        }

        return false;
    }
}
