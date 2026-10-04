<?php

namespace App\Modules\Diagnostics\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class LabTestTemplate extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'lab_test_templates';

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'category',
        'sample_type',
        'price',
        'turnaround_time_hours',
        'reference_ranges',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'turnaround_time_hours' => 'integer',
        'reference_ranges' => 'array',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(LabOrderItem::class, 'template_id');
    }
}
