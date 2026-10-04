<?php

namespace App\Modules\Facility\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ward extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'wards';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'department_id',
        'code',
        'name',
        'ward_type',
        'gender_allowed',
        'floor',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class, 'ward_id');
    }

    public function beds(): HasManyThrough
    {
        return $this->hasManyThrough(Bed::class, Room::class, 'ward_id', 'room_id');
    }
}
