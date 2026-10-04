<?php

namespace App\Modules\Pharmacy\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MedicineBatch extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'medicine_batches';

    protected $fillable = [
        'tenant_id',
        'warehouse_id',
        'medicine_id',
        'batch_number',
        'expiry_date',
        'purchase_cost',
        'selling_price',
        'quantity_on_hand',
        'quantity_reserved',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'purchase_cost' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'quantity_on_hand' => 'integer',
        'quantity_reserved' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class, 'medicine_id');
    }

    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class, 'medicine_batch_id');
    }

    public function isExpired(): bool
    {
        return $this->expiry_date->isPast();
    }
}
