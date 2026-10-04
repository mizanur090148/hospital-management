<?php

namespace App\Modules\Diagnostics\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LabOrderItem extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'lab_order_items';

    protected $fillable = [
        'tenant_id',
        'lab_order_id',
        'template_id',
        'test_name',
        'price',
        'status',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(LabOrder::class, 'lab_order_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(LabTestTemplate::class, 'template_id');
    }

    public function results(): HasMany
    {
        return $this->hasMany(LabResult::class, 'lab_order_item_id');
    }
}
