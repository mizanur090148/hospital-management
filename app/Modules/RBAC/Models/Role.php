<?php

namespace App\Modules\RBAC\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    protected $table = 'roles';

    protected $fillable = [
        'tenant_id',
        'name',
        'slug',
        'guard_name',
        'description',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions', 'role_id', 'permission_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles', 'role_id', 'user_id');
    }

    public function givePermissionTo(Permission|string $permission): void
    {
        $perm = is_string($permission)
            ? Permission::where('slug', $permission)->firstOrFail()
            : $permission;

        $this->permissions()->syncWithoutDetaching([$perm->id]);
    }

    public function revokePermissionTo(Permission|string $permission): void
    {
        $perm = is_string($permission)
            ? Permission::where('slug', $permission)->first()
            : $permission;

        if ($perm) {
            $this->permissions()->detach($perm->id);
        }
    }
}
