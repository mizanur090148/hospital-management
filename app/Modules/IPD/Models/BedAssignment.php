<?php

namespace App\Modules\IPD\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Facility\Models\Bed;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BedAssignment extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'bed_assignments';

    protected $fillable = [
        'tenant_id',
        'admission_id',
        'bed_id',
        'assigned_at',
        'released_at',
        'transfer_reason',
        'is_active',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'released_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class, 'admission_id');
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class, 'bed_id');
    }
}
