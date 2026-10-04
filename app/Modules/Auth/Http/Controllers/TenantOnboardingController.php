<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Auth\Models\User;
use App\Modules\RBAC\Models\Permission;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class TenantOnboardingController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/RegisterTenant');
    }

    public function store(Request $request, TenantContext $context): RedirectResponse
    {
        $validated = $request->validate([
            'legal_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'min:3', 'max:64', 'alpha_dash', 'unique:tenants,slug'],
            'domain' => ['nullable', 'string', 'max:255', 'unique:tenants,domain'],
            'branch_name' => ['required', 'string', 'max:255'],
            'branch_code' => ['required', 'string', 'max:16'],
            'branch_phone' => ['nullable', 'string', 'max:32'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = DB::transaction(function () use ($validated) {
            // 1. Create Tenant
            $tenant = Tenant::create([
                'slug' => Str::lower($validated['slug']),
                'legal_name' => $validated['legal_name'],
                'trade_name' => $validated['trade_name'],
                'domain' => $validated['domain'] ?? null,
                'status' => TenantStatus::Active,
                'plan' => 'enterprise',
                'settings' => [
                    'currency' => 'USD',
                    'timezone' => 'UTC',
                    'features' => ['opd', 'ipd', 'emergency', 'pharmacy', 'lab', 'radiology', 'billing'],
                ],
            ]);

            // 2. Create Main Branch
            $branch = Branch::create([
                'tenant_id' => $tenant->id,
                'code' => Str::upper($validated['branch_code']),
                'name' => $validated['branch_name'],
                'phone' => $validated['branch_phone'] ?? null,
                'email' => $validated['admin_email'],
                'is_main' => true,
                'is_active' => true,
            ]);

            // 3. Create Tenant Specific Roles
            $adminRole = Role::create([
                'tenant_id' => $tenant->id,
                'name' => 'Hospital Administrator',
                'slug' => 'hospital_admin',
                'description' => 'Full administrative access across all hospital branches and departments',
                'is_system' => true,
            ]);

            $doctorRole = Role::create([
                'tenant_id' => $tenant->id,
                'name' => 'Doctor / Physician',
                'slug' => 'doctor',
                'description' => 'Clinical access for patient consultations, diagnosis, and prescription management',
                'is_system' => true,
            ]);

            $nurseRole = Role::create([
                'tenant_id' => $tenant->id,
                'name' => 'Registered Nurse',
                'slug' => 'nurse',
                'description' => 'Inpatient nursing care, vitals charting, medication administration',
                'is_system' => true,
            ]);

            $pharmacistRole = Role::create([
                'tenant_id' => $tenant->id,
                'name' => 'Pharmacist',
                'slug' => 'pharmacist',
                'description' => 'Prescription dispensing, FEFO batch stock management, sales',
                'is_system' => true,
            ]);

            // Sync all existing permissions to admin role
            $allPermissions = Permission::all();
            if ($allPermissions->isNotEmpty()) {
                $adminRole->permissions()->sync($allPermissions->pluck('id'));
            }

            // 4. Create Hospital Admin User
            $adminUser = User::create([
                'tenant_id' => $tenant->id,
                'branch_id' => $branch->id,
                'user_type' => UserType::HospitalAdmin,
                'name' => $validated['admin_name'],
                'email' => Str::lower($validated['admin_email']),
                'password' => Hash::make($validated['password']),
                'status' => UserStatus::Active,
                'email_verified_at' => now(),
            ]);

            $adminUser->assignRole($adminRole);

            return $adminUser;
        });

        // Set context and session
        $context->setTenant($user->tenant);
        $context->setBranch($user->branch);
        session(['active_tenant_id' => $user->tenant_id]);
        session(['active_branch_id' => $user->branch_id]);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('dashboard')->with('success', 'Hospital organization onboarded successfully! Welcome to ApexCare HMS.');
    }
}
