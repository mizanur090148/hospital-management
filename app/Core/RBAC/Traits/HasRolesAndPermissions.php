<?php

namespace App\Core\RBAC\Traits;

use App\Core\Enums\UserType;
use App\Modules\RBAC\Models\Role;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

trait HasRolesAndPermissions
{
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id');
    }

    public function assignRole(Role|string $role): void
    {
        $roleModel = is_string($role)
            ? Role::where('slug', $role)->firstOrFail()
            : $role;

        $this->roles()->syncWithoutDetaching([$roleModel->id]);
    }

    public function removeRole(Role|string $role): void
    {
        $roleModel = is_string($role)
            ? Role::where('slug', $role)->first()
            : $role;

        if ($roleModel) {
            $this->roles()->detach($roleModel->id);
        }
    }

    public function hasRole(string|array $roles): bool
    {
        // Super admin bypasses all role checks
        if ($this->user_type === UserType::SuperAdmin) {
            return true;
        }

        $roles = is_array($roles) ? $roles : func_get_args();

        return $this->roles->pluck('slug')->intersect($roles)->isNotEmpty();
    }

    public function hasPermission(string $permission): bool
    {
        // Super admin or Hospital admin bypass
        if ($this->user_type === UserType::SuperAdmin || $this->user_type === UserType::HospitalAdmin) {
            return true;
        }

        return $this->getAllPermissions()->contains('slug', $permission);
    }

    public function getAllPermissions(): Collection
    {
        return $this->roles->loadMissing('permissions')->flatMap(function (Role $role) {
            return $role->permissions;
        })->unique('id');
    }
}
