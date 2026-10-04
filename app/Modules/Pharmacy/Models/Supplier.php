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

class Supplier extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'suppliers';

    protected $fillable = [
        'tenant_id',
        'name',
        'contact_person',
        'email',
        'phone',
        'address',
        'tax_number',
        'is_active',
    ];

    protected $casts = [
        'address' => 'array',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class, 'supplier_id');
    }
}
