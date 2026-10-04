<?php

namespace App\Modules\Billing\Models;

use App\Core\Enums\BillingItemType;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Facility\Models\Department;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'invoice_items';

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'department_id',
        'item_type',
        'item_reference_id',
        'description',
        'quantity',
        'unit_price',
        'subtotal',
    ];

    protected $casts = [
        'item_type' => BillingItemType::class,
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }
}
