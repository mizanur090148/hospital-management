<?php

namespace App\Modules\Tenancy\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Department;
use App\Modules\Facility\Models\Ward;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'branches';

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'phone',
        'email',
        'address',
        'is_main',
        'is_active',
    ];

    protected $casts = [
        'address' => 'array',
        'is_main' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'branch_id');
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class, 'branch_id');
    }

    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class, 'branch_id');
    }
}
