<?php

namespace App\Modules\Pharmacy\Models;

use App\Core\Enums\StockMovementType;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockTransaction extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'stock_transactions';

    protected $fillable = [
        'tenant_id',
        'warehouse_id',
        'medicine_batch_id',
        'movement_type',
        'quantity',
        'balance_after',
        'reference_type',
        'reference_id',
        'notes',
        'performed_by_user_id',
    ];

    protected $casts = [
        'movement_type' => StockMovementType::class,
        'quantity' => 'integer',
        'balance_after' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'warehouse_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MedicineBatch::class, 'medicine_batch_id');
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by_user_id');
    }
}
