<?php

namespace App\Modules\Diagnostics\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabResult extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'lab_results';

    protected $fillable = [
        'tenant_id',
        'lab_order_item_id',
        'parameter_name',
        'observed_value',
        'reference_range',
        'unit',
        'is_abnormal',
        'critical_flag',
        'pathologist_notes',
        'verified_by_user_id',
        'verified_at',
        'status',
    ];

    protected $casts = [
        'is_abnormal' => 'boolean',
        'critical_flag' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(LabOrderItem::class, 'lab_order_item_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_user_id');
    }
}
