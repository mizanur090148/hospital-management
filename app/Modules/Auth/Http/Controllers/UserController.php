<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Department;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request, TenantContext $context): Response
    {
        $tenant = $context->getTenant();
        $query = User::with(['branch:id,name,code', 'department:id,name,code', 'roles:id,name,slug']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($branchId = $request->input('branch_id')) {
            $query->where('branch_id', $branchId);
        }

        if ($departmentId = $request->input('department_id')) {
            $query->where('department_id', $departmentId);
        }

        if ($userType = $request->input('user_type')) {
            $query->where('user_type', $userType);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $users = $query->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'user_type' => $u->user_type->value,
                'user_type_label' => $u->user_type->label(),
                'status' => $u->status->value,
                'status_label' => $u->status->label(),
                'branch' => $u->branch ? ['id' => $u->branch->id, 'name' => $u->branch->name, 'code' => $u->branch->code] : null,
                'department' => $u->department ? ['id' => $u->department->id, 'name' => $u->department->name, 'code' => $u->department->code] : null,
                'roles' => $u->roles->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'slug' => $r->slug]),
                'last_login_at' => $u->last_login_at?->diffForHumans(),
            ]);

        $branches = $tenant ? $tenant->branches()->select('id', 'name', 'code')->get() : Branch::select('id', 'name', 'code')->get();
        $departments = Department::select('id', 'name', 'code')->get();
        $roles = Role::select('id', 'name', 'slug')->get();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'branch_id', 'department_id', 'user_type', 'status']),
            'branches' => $branches,
            'departments' => $departments,
            'roles' => $roles,
            'userTypes' => array_map(fn ($t) => [
                'value' => $t->value,
                'label' => $t->label(),
            ], UserType::cases()),
            'userStatuses' => array_map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], UserStatus::cases()),
        ]);
    }

    public function store(Request $request, TenantContext $context): RedirectResponse
    {
        $tenantId = $context->getTenantId();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users')->where('tenant_id', $tenantId),
            ],
            'phone' => ['nullable', 'string', 'max:32'],
            'user_type' => ['required', 'string'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'password' => ['required', 'string', 'min:8'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['uuid', 'exists:roles,id'],
        ]);

        $user = User::create([
            'tenant_id' => $tenantId,
            'branch_id' => $validated['branch_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'user_type' => $validated['user_type'],
            'name' => $validated['name'],
            'email' => Str::lower($validated['email']),
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);

        if (! empty($validated['roles'])) {
            $user->roles()->sync($validated['roles']);
        }

        return back()->with('success', "Staff account [{$user->name}] provisioned successfully.");
    }

    public function update(Request $request, User $user, TenantContext $context): RedirectResponse
    {
        $tenantId = $context->getTenantId();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users')->where('tenant_id', $tenantId)->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:32'],
            'user_type' => ['required', 'string'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'status' => ['required', 'string'],
            'password' => ['nullable', 'string', 'min:8'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['uuid', 'exists:roles,id'],
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => Str::lower($validated['email']),
            'phone' => $validated['phone'] ?? null,
            'user_type' => $validated['user_type'],
            'branch_id' => $validated['branch_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'status' => $validated['status'],
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        if (isset($validated['roles'])) {
            $user->roles()->sync($validated['roles']);
        }

        return back()->with('success', "Staff account [{$user->name}] updated.");
    }

    public function toggleStatus(User $user): RedirectResponse
    {
        $newStatus = $user->status === UserStatus::Active ? UserStatus::Suspended : UserStatus::Active;
        $user->update(['status' => $newStatus]);

        return back()->with('success', "Account [{$user->name}] is now {$newStatus->label()}.");
    }
}
