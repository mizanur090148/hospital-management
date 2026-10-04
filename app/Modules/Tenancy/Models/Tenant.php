<?php

namespace App\Modules\Tenancy\Models;

use App\Core\Enums\TenantStatus;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Bed;
use App\Modules\Facility\Models\Department;
use App\Modules\Facility\Models\Ward;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'tenants';

    protected $fillable = [
        'slug',
        'legal_name',
        'trade_name',
        'domain',
        'status',
        'plan',
        'settings',
    ];

    protected $casts = [
        'status' => TenantStatus::class,
        'settings' => 'array',
    ];

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class, 'tenant_id');
    }

    public function mainBranch(): ?Branch
    {
        return $this->branches()->where('is_main', true)->first();
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'tenant_id');
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class, 'tenant_id');
    }

    public function wards(): HasMany
    {
        return $this->hasMany(Ward::class, 'tenant_id');
    }

    public function beds(): HasMany
    {
        return $this->hasMany(Bed::class, 'tenant_id');
    }

    public function isActive(): bool
    {
        return $this->status === TenantStatus::Active;
    }
}
