<?php

namespace App\Modules\Pharmacy\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\OPD\Models\PrescriptionItem;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyDispensingItem extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'pharmacy_dispensing_items';

    protected $fillable = [
        'tenant_id',
        'dispensing_id',
        'prescription_item_id',
        'medicine_id',
        'medicine_batch_id',
        'quantity',
        'unit_price',
        'subtotal',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function dispensing(): BelongsTo
    {
        return $this->belongsTo(PharmacyDispensing::class, 'dispensing_id');
    }

    public function prescriptionItem(): BelongsTo
    {
        return $this->belongsTo(PrescriptionItem::class, 'prescription_item_id');
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class, 'medicine_id');
    }

    public function medicineBatch(): BelongsTo
    {
        return $this->belongsTo(MedicineBatch::class, 'medicine_batch_id');
    }
}
