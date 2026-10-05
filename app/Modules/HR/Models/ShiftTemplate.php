<?php

namespace App\Modules\HR\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShiftTemplate extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'shift_templates';

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'start_time',
        'end_time',
        'break_minutes',
        'color',
        'is_active',
    ];

    protected $casts = [
        'break_minutes' => 'integer',
        'is_active' => 'boolean',
    ];

    public function rosters(): HasMany
    {
        return $this->hasMany(StaffRoster::class, 'shift_template_id');
    }
}
