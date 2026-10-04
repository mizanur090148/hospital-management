<?php

namespace App\Modules\Pharmacy\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\WarehouseType;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Warehouse extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'warehouses';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'code',
        'name',
        'warehouse_type',
        'is_active',
    ];

    protected $casts = [
        'warehouse_type' => WarehouseType::class,
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(MedicineBatch::class, 'warehouse_id');
    }
}
