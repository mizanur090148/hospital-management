<?php

namespace App\Modules\Diagnostics\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\RadiologyModality;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RadiologyTemplate extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'radiology_templates';

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'modality',
        'body_part',
        'price',
        'instructions',
        'is_active',
    ];

    protected $casts = [
        'modality' => RadiologyModality::class,
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(RadiologyOrder::class, 'template_id');
    }
}
