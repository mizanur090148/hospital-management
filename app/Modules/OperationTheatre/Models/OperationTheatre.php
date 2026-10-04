<?php

namespace App\Modules\OperationTheatre\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\OtRoomStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OperationTheatre extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'operation_theatres';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'code',
        'name',
        'theatre_type',
        'floor',
        'status',
        'is_active',
    ];

    protected $casts = [
        'status' => OtRoomStatus::class,
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

    public function surgeries(): HasMany
    {
        return $this->hasMany(Surgery::class, 'operation_theatre_id');
    }
}
