<?php

namespace App\Modules\RBAC\Http\Controllers;

use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\RBAC\Models\Permission;
use App\Modules\RBAC\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function index(Request $request, TenantContext $context): Response
    {
        $tenantId = $context->getTenantId();

        $roles = Role::withCount(['users', 'permissions'])
            ->with('permissions:id,name,slug,module')
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get();

        $allPermissions = Permission::orderBy('module')
            ->orderBy('name')
            ->get()
            ->groupBy('module')
            ->map(fn ($group, $module) => [
                'module' => $module,
                'module_label' => ucfirst($module),
                'permissions' => $group->map(fn ($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'slug' => $p->slug,
                    'description' => $p->description,
                ]),
            ])
            ->values();

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'groupedPermissions' => $allPermissions,
        ]);
    }

    public function store(Request $request, TenantContext $context): RedirectResponse
    {
        $tenantId = $context->getTenantId();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:128'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['uuid', 'exists:permissions,id'],
        ]);

        $slug = Str::slug($validated['name'], '_');

        if (Role::where('tenant_id', $tenantId)->where('slug', $slug)->exists()) {
            return back()->with('error', "A role with identifier [{$slug}] already exists.");
        }

        $role = Role::create([
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'is_system' => false,
        ]);

        if (! empty($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return back()->with('success', "Custom Role [{$role->name}] created successfully.");
    }

    public function update(Request $request, Role $role, TenantContext $context): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:128'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['uuid', 'exists:permissions,id'],
        ]);

        $role->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return back()->with('success', "Role [{$role->name}] updated.");
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->is_system) {
            return back()->with('error', 'Default system roles cannot be deleted.');
        }

        if ($role->users()->count() > 0) {
            return back()->with('error', 'Cannot delete role because users are currently assigned to it.');
        }

        $role->delete();

        return back()->with('success', "Role [{$role->name}] deleted.");
    }
}
