<?php

namespace App\Modules\Facility\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\DepartmentType;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Department extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'departments';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'code',
        'name',
        'department_type',
        'description',
        'head_user_id',
        'is_active',
    ];

    protected $casts = [
        'department_type' => DepartmentType::class,
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function headUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'head_user_id');
    }

    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class, 'department_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'department_id');
    }
}
