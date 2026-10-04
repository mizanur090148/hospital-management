<?php

namespace Tests\Feature;

use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Auth\Models\User;
use App\Modules\RBAC\Models\Permission;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class MultiTenancyAndAuthTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected Branch $branchA;

    protected Branch $branchB;

    protected User $userA;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Tenant A
        $this->tenantA = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apollo-test',
            'legal_name' => 'Apollo Hospitals Ltd.',
            'trade_name' => 'Apollo Hospital',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branchA = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'code' => 'MAIN',
            'name' => 'Apollo Main Campus',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->userA = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'user_type' => UserType::HospitalAdmin,
            'name' => 'Dr. Tenant A Admin',
            'email' => 'admin@apollo-test.org',
            'password' => Hash::make('secret123'),
            'status' => UserStatus::Active,
        ]);

        // 2. Setup Tenant B
        $this->tenantB = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'memorial-test',
            'legal_name' => 'Memorial Health Group Ltd.',
            'trade_name' => 'Memorial Hospital',
            'status' => TenantStatus::Active,
            'plan' => 'pro',
        ]);

        $this->branchB = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantB->id,
            'code' => 'WEST',
            'name' => 'Memorial West Clinic',
            'is_main' => true,
            'is_active' => true,
        ]);
    }

    public function test_login_page_renders_successfully(): void
    {
        $response = $this->get('/login');
        $response->assertStatus(200);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $response = $this->post('/login', [
            'email' => 'admin@apollo-test.org',
            'password' => 'secret123',
            'tenant_slug' => 'apollo-test',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($this->userA);

        $this->assertDatabaseHas('login_histories', [
            'email' => 'admin@apollo-test.org',
            'status' => 'success',
            'tenant_id' => $this->tenantA->id,
        ]);
    }

    public function test_failed_login_records_in_login_histories(): void
    {
        $response = $this->post('/login', [
            'email' => 'admin@apollo-test.org',
            'password' => 'wrong-password',
            'tenant_slug' => 'apollo-test',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->assertDatabaseHas('login_histories', [
            'email' => 'admin@apollo-test.org',
            'status' => 'failed',
        ]);
    }

    public function test_authenticated_user_can_view_dashboard(): void
    {
        $response = $this->actingAs($this->userA)->get('/dashboard');
        $response->assertStatus(200);
    }

    public function test_tenant_isolation_prevents_cross_tenant_data_leakage(): void
    {
        $context = app(TenantContext::class);

        // Bind Context to Tenant A
        $context->setTenant($this->tenantA);

        $branchesSeenFromA = Branch::all();
        $this->assertCount(1, $branchesSeenFromA);
        $this->assertEquals($this->branchA->id, $branchesSeenFromA->first()->id);
        $this->assertFalse($branchesSeenFromA->contains('id', $this->branchB->id));

        // Bind Context to Tenant B
        $context->setTenant($this->tenantB);

        $branchesSeenFromB = Branch::all();
        $this->assertCount(1, $branchesSeenFromB);
        $this->assertEquals($this->branchB->id, $branchesSeenFromB->first()->id);
        $this->assertFalse($branchesSeenFromB->contains('id', $this->branchA->id));
    }

    public function test_hospital_onboarding_wizard_provisions_complete_tenant_stack(): void
    {
        $onboardingPayload = [
            'legal_name' => 'St. Jude Children Medical Institute',
            'trade_name' => 'St. Jude Clinic',
            'slug' => 'st-jude',
            'branch_name' => 'Central Children Wing',
            'branch_code' => 'KIDS',
            'branch_phone' => '+1-800-555-9999',
            'admin_name' => 'Dr. Sarah Connor',
            'admin_email' => 'sarah@st-jude.org',
            'password' => 'securePassword123',
            'password_confirmation' => 'securePassword123',
        ];

        $response = $this->post('/register-hospital', $onboardingPayload);

        $response->assertRedirect('/dashboard');

        $this->assertDatabaseHas('tenants', [
            'slug' => 'st-jude',
            'legal_name' => 'St. Jude Children Medical Institute',
        ]);

        $tenant = Tenant::where('slug', 'st-jude')->first();
        $this->assertNotNull($tenant);

        $this->assertDatabaseHas('branches', [
            'tenant_id' => $tenant->id,
            'code' => 'KIDS',
            'is_main' => true,
        ]);

        $this->assertDatabaseHas('users', [
            'tenant_id' => $tenant->id,
            'email' => 'sarah@st-jude.org',
            'user_type' => UserType::HospitalAdmin->value,
        ]);

        $this->assertDatabaseHas('roles', [
            'tenant_id' => $tenant->id,
            'slug' => 'hospital_admin',
        ]);
    }

    public function test_rbac_permissions_and_super_admin_bypass(): void
    {
        $permission = Permission::create([
            'id' => (string) Str::uuid(),
            'module' => 'clinical',
            'name' => 'Perform Surgery',
            'slug' => 'clinical.surgery.perform',
        ]);

        $surgeonRole = Role::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'name' => 'Chief Surgeon',
            'slug' => 'chief_surgeon',
        ]);
        $surgeonRole->permissions()->attach($permission->id);

        $doctor = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'user_type' => UserType::Doctor,
            'name' => 'Dr. House',
            'email' => 'house@apollo-test.org',
            'password' => Hash::make('secret123'),
            'status' => UserStatus::Active,
        ]);

        // Doctor doesn't have role yet
        $this->assertFalse($doctor->hasPermission('clinical.surgery.perform'));

        // Assign role
        $doctor->assignRole($surgeonRole);
        $doctor->refresh();

        $this->assertTrue($doctor->hasPermission('clinical.surgery.perform'));

        // SaaS Super Admin always bypasses all permission checks
        $superAdmin = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => null,
            'user_type' => UserType::SuperAdmin,
            'name' => 'SaaS Master',
            'email' => 'master@saas.io',
            'password' => Hash::make('secret123'),
            'status' => UserStatus::Active,
        ]);

        $this->assertTrue($superAdmin->hasPermission('any.arbitrary.permission'));
        $this->assertTrue($superAdmin->hasRole('any_role'));
    }
}
