<?php

namespace App\Modules\Pharmacy\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceiptNoteItem extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'goods_receipt_note_items';

    protected $fillable = [
        'tenant_id',
        'goods_receipt_note_id',
        'medicine_id',
        'batch_number',
        'expiry_date',
        'quantity_received',
        'unit_cost',
        'selling_price',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'quantity_received' => 'integer',
        'unit_cost' => 'decimal:2',
        'selling_price' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function goodsReceiptNote(): BelongsTo
    {
        return $this->belongsTo(GoodsReceiptNote::class, 'goods_receipt_note_id');
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class, 'medicine_id');
    }
}
