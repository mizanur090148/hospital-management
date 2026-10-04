<?php

namespace Tests\Feature;

use App\Core\Enums\BedStatus;
use App\Core\Enums\DepartmentType;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Bed;
use App\Modules\Facility\Models\Department;
use App\Modules\Facility\Models\Room;
use App\Modules\Facility\Models\Ward;
use App\Modules\RBAC\Models\Permission;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class FacilityAndDepartmentTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apollo-facility-test',
            'legal_name' => 'Apollo Medical Corp',
            'trade_name' => 'Apollo Health',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN',
            'name' => 'Downtown Central',
            'is_main' => true,
            'is_active' => true,
        ]);

        $adminRole = Role::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Hospital Administrator',
            'slug' => 'hospital_admin',
            'is_system' => true,
        ]);

        $this->adminUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'user_type' => UserType::HospitalAdmin,
            'name' => 'Dr. Facility Admin',
            'email' => 'admin@apollo-facility.test',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
        ]);
        $this->adminUser->assignRole($adminRole);
    }

    public function test_authenticated_user_can_view_facility_index(): void
    {
        $response = $this->actingAs($this->adminUser)->get('/facility');
        $response->assertStatus(200);
    }

    public function test_can_provision_new_branch(): void
    {
        $payload = [
            'name' => 'Southside Rehabilitation Clinic',
            'code' => 'SOUTH',
            'phone' => '+1-555-010-8800',
            'email' => 'south@apollo-facility.test',
            'is_main' => false,
        ];

        $response = $this->actingAs($this->adminUser)->post('/facility/branches', $payload);
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('branches', [
            'tenant_id' => $this->tenant->id,
            'code' => 'SOUTH',
            'name' => 'Southside Rehabilitation Clinic',
        ]);
    }

    public function test_can_create_department_with_branch_scoping(): void
    {
        $payload = [
            'branch_id' => $this->branch->id,
            'name' => 'Pediatrics & Neonatal Intensive Care',
            'code' => 'PED-NICU',
            'department_type' => 'clinical',
            'description' => 'Comprehensive child medical care',
        ];

        $response = $this->actingAs($this->adminUser)->post('/facility/departments', $payload);
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('departments', [
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'PED-NICU',
        ]);
    }

    public function test_can_create_ward_room_and_bed_with_initial_availability(): void
    {
        $ward = Ward::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'NICU-W',
            'name' => 'Neonatal ICU Ward',
            'ward_type' => 'icu',
            'gender_allowed' => 'any',
            'is_active' => true,
        ]);

        $room = Room::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'ward_id' => $ward->id,
            'room_number' => 'NICU-101',
            'room_type' => 'icu',
            'is_active' => true,
        ]);

        $bedPayload = [
            'room_id' => $room->id,
            'bed_number' => 'CRIB-01',
            'bed_type' => 'crib',
            'daily_rate' => 850.00,
        ];

        $response = $this->actingAs($this->adminUser)->post('/facility/beds', $bedPayload);
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('beds', [
            'tenant_id' => $this->tenant->id,
            'room_id' => $room->id,
            'bed_number' => 'CRIB-01',
            'status' => 'available',
        ]);
    }

    public function test_can_update_bed_status_transitions(): void
    {
        $ward = Ward::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'SURG-W',
            'name' => 'Surgical Ward',
            'ward_type' => 'general',
            'gender_allowed' => 'any',
            'is_active' => true,
        ]);

        $room = Room::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'ward_id' => $ward->id,
            'room_number' => 'SR-201',
            'room_type' => 'standard',
            'is_active' => true,
        ]);

        $bed = Bed::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'room_id' => $room->id,
            'bed_number' => 'BED-SR-01',
            'bed_type' => 'standard',
            'daily_rate' => 400.00,
            'status' => BedStatus::Available,
            'is_active' => true,
        ]);

        // Transition: Available -> Cleaning
        $response = $this->actingAs($this->adminUser)->patch("/facility/beds/{$bed->id}/status", [
            'status' => 'cleaning',
        ]);
        $response->assertSessionHas('success');

        $bed->refresh();
        $this->assertEquals(BedStatus::Cleaning, $bed->status);

        // Transition: Cleaning -> Available
        $response = $this->actingAs($this->adminUser)->patch("/facility/beds/{$bed->id}/status", [
            'status' => 'available',
        ]);
        $response->assertSessionHas('success');

        $bed->refresh();
        $this->assertEquals(BedStatus::Available, $bed->status);
    }

    public function test_staff_creation_and_role_assignment(): void
    {
        $nurseRole = Role::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Staff Nurse',
            'slug' => 'staff_nurse',
            'is_system' => true,
        ]);

        $payload = [
            'name' => 'Nurse Joy',
            'email' => 'joy.nurse@apollo-facility.test',
            'phone' => '+1-555-010-3333',
            'user_type' => 'nurse',
            'branch_id' => $this->branch->id,
            'password' => 'password123',
            'roles' => [$nurseRole->id],
        ];

        $response = $this->actingAs($this->adminUser)->post('/users', $payload);
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('users', [
            'tenant_id' => $this->tenant->id,
            'email' => 'joy.nurse@apollo-facility.test',
            'user_type' => 'nurse',
        ]);

        $createdUser = User::where('email', 'joy.nurse@apollo-facility.test')->first();
        $this->assertTrue($createdUser->hasRole('staff_nurse'));
    }

    public function test_custom_role_creation_and_permission_sync(): void
    {
        $perm1 = Permission::create([
            'id' => (string) Str::uuid(),
            'module' => 'pharmacy',
            'name' => 'Dispense Chemotherapy',
            'slug' => 'pharmacy.dispense.chemo',
        ]);

        $perm2 = Permission::create([
            'id' => (string) Str::uuid(),
            'module' => 'clinical',
            'name' => 'Administer Chemotherapy',
            'slug' => 'clinical.chemo.administer',
        ]);

        $rolePayload = [
            'name' => 'Oncology Specialist Nurse',
            'description' => 'Certified for intravenous chemotherapy administration',
            'permissions' => [$perm1->id, $perm2->id],
        ];

        $response = $this->actingAs($this->adminUser)->post('/roles', $rolePayload);
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('roles', [
            'tenant_id' => $this->tenant->id,
            'slug' => 'oncology_specialist_nurse',
            'is_system' => false,
        ]);

        $role = Role::where('slug', 'oncology_specialist_nurse')->first();
        $this->assertCount(2, $role->permissions);
    }

    public function test_cross_tenant_facility_isolation_is_strictly_enforced(): void
    {
        // Create second tenant
        $tenant2 = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'second-tenant-hospital',
            'legal_name' => 'Second Health Org',
            'trade_name' => 'Second Hospital',
            'status' => TenantStatus::Active,
            'plan' => 'starter',
        ]);

        $branch2 = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant2->id,
            'code' => 'T2-MAIN',
            'name' => 'Second Hospital Center',
            'is_main' => true,
            'is_active' => true,
        ]);

        $dept2 = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $tenant2->id,
            'branch_id' => $branch2->id,
            'code' => 'T2-DERM',
            'name' => 'Dermatology Clinic',
            'department_type' => DepartmentType::Clinical,
            'is_active' => true,
        ]);

        // When Tenant 1 Context is active:
        $context = app(TenantContext::class);
        $context->setTenant($this->tenant);

        // Departments query must NOT contain Tenant 2's department
        $departmentsSeen = Department::all();
        $this->assertFalse($departmentsSeen->contains('id', $dept2->id));

        // When Tenant 2 Context is active:
        $context->setTenant($tenant2);
        $departmentsSeenT2 = Department::all();
        $this->assertTrue($departmentsSeenT2->contains('id', $dept2->id));
    }
}
