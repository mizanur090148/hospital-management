<?php

namespace App\Modules\SaaS\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\SaaS\Enums\SubscriptionInvoiceStatus;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SubscriptionInvoice extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'saas_subscription_invoices';

    protected $fillable = [
        'tenant_id',
        'subscription_id',
        'invoice_number',
        'billing_reason',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'total_amount',
        'currency',
        'status',
        'due_date',
        'paid_at',
        'payment_reference',
        'line_items',
        'notes',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'status' => SubscriptionInvoiceStatus::class,
        'due_date' => 'date',
        'paid_at' => 'datetime',
        'line_items' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class, 'subscription_id');
    }

    public function isPaid(): bool
    {
        return $this->status === SubscriptionInvoiceStatus::Paid;
    }
}
