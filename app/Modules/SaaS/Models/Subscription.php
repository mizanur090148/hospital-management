<?php

namespace App\Modules\SaaS\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\SaaS\Enums\BillingCycle;
use App\Modules\SaaS\Enums\SubscriptionStatus;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Subscription extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'saas_subscriptions';

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'subscription_number',
        'billing_cycle',
        'price',
        'currency',
        'status',
        'starts_at',
        'current_period_starts_at',
        'current_period_ends_at',
        'trial_ends_at',
        'grace_period_ends_at',
        'cancelled_at',
        'cancellation_reason',
        'payment_method',
        'metadata',
    ];

    protected $casts = [
        'billing_cycle' => BillingCycle::class,
        'status' => SubscriptionStatus::class,
        'price' => 'decimal:2',
        'starts_at' => 'datetime',
        'current_period_starts_at' => 'datetime',
        'current_period_ends_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'grace_period_ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(SubscriptionInvoice::class, 'subscription_id');
    }

    /**
     * Determine if subscription is in good standing to access services.
     */
    public function isValid(): bool
    {
        if (! $this->status->canAccessService()) {
            return false;
        }

        // If in past-due, verify within grace period
        if ($this->status === SubscriptionStatus::PastDue && $this->grace_period_ends_at) {
            return now()->lte($this->grace_period_ends_at);
        }

        return true;
    }

    /**
     * Determine if subscription is currently in free trial.
     */
    public function onTrial(): bool
    {
        return $this->status === SubscriptionStatus::Trialing && $this->trial_ends_at && now()->lte($this->trial_ends_at);
    }
}
