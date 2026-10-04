<?php

namespace App\Modules\Diagnostics\Models;

use App\Core\Enums\LabSampleStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabSample extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'lab_samples';

    protected $fillable = [
        'tenant_id',
        'lab_order_id',
        'sample_barcode',
        'sample_type',
        'collected_by_user_id',
        'collected_at',
        'rejection_reason',
        'status',
    ];

    protected $casts = [
        'status' => LabSampleStatus::class,
        'collected_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(LabOrder::class, 'lab_order_id');
    }

    public function collectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by_user_id');
    }
}
