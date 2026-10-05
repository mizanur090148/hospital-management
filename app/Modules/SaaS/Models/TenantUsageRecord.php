<?php

namespace App\Modules\SaaS\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantUsageRecord extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    protected $table = 'saas_tenant_usages';

    protected $fillable = [
        'tenant_id',
        'metric',
        'current_usage',
        'quota_limit',
        'period_month',
        'last_calculated_at',
    ];

    protected $casts = [
        'current_usage' => 'integer',
        'quota_limit' => 'integer',
        'last_calculated_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
