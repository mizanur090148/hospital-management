<?php

namespace Tests\Feature;

use App\Core\Enums\DispenseStatus;
use App\Core\Enums\DosageForm;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\PoStatus;
use App\Core\Enums\StockMovementType;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Enums\WarehouseType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Department;
use App\Modules\Patient\Models\Patient;
use App\Modules\Pharmacy\Models\Medicine;
use App\Modules\Pharmacy\Models\MedicineBatch;
use App\Modules\Pharmacy\Models\Supplier;
use App\Modules\Pharmacy\Models\Warehouse;
use App\Modules\Pharmacy\Services\FefoDispensingService;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class PharmacyAndSupplyChainTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Department $department;

    protected User $adminUser;

    protected Warehouse $warehouse;

    protected Supplier $supplier;

    protected Medicine $medicine;

    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apollo-pharmacy-test',
            'legal_name' => 'Apollo Healthcare Pharmacy Corp',
            'trade_name' => 'Apollo Central Pharmacy',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN-PHARM',
            'name' => 'Apollo Main Campus',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Pharmaceutical Services',
            'code' => 'PHARM-SERVICES',
            'department_type' => 'support',
            'is_active' => true,
        ]);

        $adminRole = Role::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Hospital Admin',
            'slug' => 'hospital_admin',
            'guard_name' => 'web',
            'is_system' => true,
        ]);

        $this->adminUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'user_type' => UserType::HospitalAdmin,
            'name' => 'Dr. Robert Pharmacist',
            'email' => 'pharmadmin@apollo-test.com',
            'password' => Hash::make('password123'),
            'status' => UserStatus::Active,
            'email_verified_at' => now(),
        ]);
        $this->adminUser->assignRole($adminRole);

        $this->warehouse = Warehouse::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'OPD-DISP-01',
            'name' => 'OPD Ground Floor Pharmacy',
            'warehouse_type' => WarehouseType::Outpatient->value,
            'is_active' => true,
        ]);

        $this->supplier = Supplier::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Global Pharma Distribution Ltd',
            'contact_person' => 'Alice Mercer',
            'email' => 'orders@globalpharma.test',
            'phone' => '+1 (555) 773-0199',
            'tax_number' => 'TAX-GP-9912',
            'is_active' => true,
        ]);

        $this->medicine = Medicine::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MED-PARA-500',
            'generic_name' => 'Paracetamol',
            'brand_name' => 'Panadol 500mg',
            'dosage_form' => DosageForm::Tablet->value,
            'strength' => '500mg',
            'uom' => 'Strip',
            'manufacturer' => 'GSK Consumer',
            'reorder_level' => 50,
            'requires_prescription' => false,
            'is_active' => true,
        ]);

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'mrn' => 'MRN-2026-9901',
            'first_name' => 'George',
            'last_name' => 'Miller',
            'dob' => '1985-04-12',
            'gender' => 'MALE',
            'phone' => '+1 555 992 1100',
            'status' => PatientStatus::Active,
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
        app(TenantContext::class)->setBranch($this->branch);
    }

    public function test_can_catalog_new_medicine(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/pharmacy/medicines', [
            'code' => 'MED-AMOX-500',
            'generic_name' => 'Amoxicillin Trihydrate',
            'brand_name' => 'Amoxil 500mg',
            'dosage_form' => 'Capsule',
            'strength' => '500mg',
            'uom' => 'Box',
            'manufacturer' => 'Beecham Pharmaceuticals',
            'reorder_level' => 30,
            'requires_prescription' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('medicines', [
            'tenant_id' => $this->tenant->id,
            'code' => 'MED-AMOX-500',
            'brand_name' => 'Amoxil 500mg',
            'dosage_form' => DosageForm::Capsule->value,
        ]);
    }

    public function test_can_register_pharmaceutical_supplier(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/pharmacy/procurement/suppliers', [
            'name' => 'Novartis Clinical Supply',
            'contact_person' => 'Markus Schmidt',
            'email' => 'contact@novartis-test.com',
            'phone' => '+1 555 444 8888',
            'tax_number' => 'NOV-8821',
            'address' => '400 Technology Square, Cambridge, MA',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('suppliers', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Novartis Clinical Supply',
            'tax_number' => 'NOV-8821',
        ]);
    }

    public function test_can_issue_purchase_order_with_line_items(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/pharmacy/procurement/purchase-orders', [
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'supplier_id' => $this->supplier->id,
            'order_date' => now()->toDateString(),
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'notes' => 'Q4 Seasonal Procurement',
            'items' => [
                [
                    'medicine_id' => $this->medicine->id,
                    'quantity_ordered' => 200,
                    'unit_cost' => 1.50,
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('purchase_orders', [
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $this->supplier->id,
            'total_amount' => 300.00,
            'status' => PoStatus::Issued->value,
        ]);

        $this->assertDatabaseHas('purchase_order_items', [
            'tenant_id' => $this->tenant->id,
            'medicine_id' => $this->medicine->id,
            'quantity_ordered' => 200,
            'unit_cost' => 1.50,
            'total_cost' => 300.00,
        ]);
    }

    public function test_can_receive_goods_receipt_note_and_create_batches_and_stock_transactions(): void
    {
        $response = $this->actingAs($this->adminUser)->post('/pharmacy/procurement/goods-receipt-notes', [
            'branch_id' => $this->branch->id,
            'warehouse_id' => $this->warehouse->id,
            'supplier_id' => $this->supplier->id,
            'received_date' => now()->toDateString(),
            'invoice_number' => 'INV-GP-2026-001',
            'notes' => 'Direct batch delivery',
            'items' => [
                [
                    'medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-P-8891',
                    'expiry_date' => now()->addDays(180)->toDateString(),
                    'quantity_received' => 100,
                    'unit_cost' => 1.50,
                    'selling_price' => 3.00,
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('goods_receipt_notes', [
            'tenant_id' => $this->tenant->id,
            'invoice_number' => 'INV-GP-2026-001',
        ]);

        $this->assertDatabaseHas('medicine_batches', [
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'medicine_id' => $this->medicine->id,
            'batch_number' => 'BATCH-P-8891',
            'quantity_on_hand' => 100,
            'selling_price' => 3.00,
        ]);

        $this->assertDatabaseHas('stock_transactions', [
            'tenant_id' => $this->tenant->id,
            'movement_type' => StockMovementType::PurchaseReceipt->value,
            'quantity' => 100,
            'balance_after' => 100,
        ]);
    }

    public function test_strict_fefo_allocation_deducts_earliest_expiring_batch_first(): void
    {
        // Batch A: Expires in 30 days (quantity: 10)
        $batchNear = MedicineBatch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'medicine_id' => $this->medicine->id,
            'batch_number' => 'BATCH-FEFO-NEAR',
            'expiry_date' => now()->addDays(30)->toDateString(),
            'purchase_cost' => 1.00,
            'selling_price' => 2.50,
            'quantity_on_hand' => 10,
            'quantity_reserved' => 0,
        ]);

        // Batch B: Expires in 300 days (quantity: 50)
        $batchFar = MedicineBatch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'medicine_id' => $this->medicine->id,
            'batch_number' => 'BATCH-FEFO-FAR',
            'expiry_date' => now()->addDays(300)->toDateString(),
            'purchase_cost' => 1.20,
            'selling_price' => 2.50,
            'quantity_on_hand' => 50,
            'quantity_reserved' => 0,
        ]);

        $fefoService = app(FefoDispensingService::class);

        // Dispense 15 units. FEFO MUST take all 10 from Batch A, and 5 from Batch B!
        $dispensing = $fefoService->dispense(
            tenantId: $this->tenant->id,
            branchId: $this->branch->id,
            warehouseId: $this->warehouse->id,
            patientId: $this->patient->id,
            dispensedByUserId: $this->adminUser->id,
            items: [
                [
                    'medicine_id' => $this->medicine->id,
                    'quantity' => 15,
                ],
            ]
        );

        $this->assertNotNull($dispensing);
        $this->assertEquals(DispenseStatus::Dispensed, $dispensing->status);
        $this->assertEquals(37.50, (float) $dispensing->total_amount); // 15 * 2.50

        // Batch A must be completely depleted to 0
        $batchNear->refresh();
        $this->assertEquals(0, $batchNear->quantity_on_hand);

        // Batch B must be reduced from 50 to 45
        $batchFar->refresh();
        $this->assertEquals(45, $batchFar->quantity_on_hand);

        // Check Stock Transactions
        $this->assertDatabaseHas('stock_transactions', [
            'tenant_id' => $this->tenant->id,
            'medicine_batch_id' => $batchNear->id,
            'movement_type' => StockMovementType::Dispense->value,
            'quantity' => -10,
            'balance_after' => 0,
        ]);

        $this->assertDatabaseHas('stock_transactions', [
            'tenant_id' => $this->tenant->id,
            'medicine_batch_id' => $batchFar->id,
            'movement_type' => StockMovementType::Dispense->value,
            'quantity' => -5,
            'balance_after' => 45,
        ]);
    }

    public function test_fefo_dispense_fails_when_unexpired_stock_is_insufficient(): void
    {
        // Batch C: Only 5 units unexpired
        MedicineBatch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'medicine_id' => $this->medicine->id,
            'batch_number' => 'BATCH-LOW',
            'expiry_date' => now()->addDays(60)->toDateString(),
            'purchase_cost' => 1.00,
            'selling_price' => 2.00,
            'quantity_on_hand' => 5,
            'quantity_reserved' => 0,
        ]);

        $fefoService = app(FefoDispensingService::class);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/Insufficient unexpired stock/i');

        // Request 10 units when only 5 exist
        $fefoService->dispense(
            tenantId: $this->tenant->id,
            branchId: $this->branch->id,
            warehouseId: $this->warehouse->id,
            patientId: $this->patient->id,
            dispensedByUserId: $this->adminUser->id,
            items: [
                [
                    'medicine_id' => $this->medicine->id,
                    'quantity' => 10,
                ],
            ]
        );
    }

    public function test_can_preview_fefo_allocations_via_json_endpoint(): void
    {
        MedicineBatch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'medicine_id' => $this->medicine->id,
            'batch_number' => 'PREVIEW-BATCH-1',
            'expiry_date' => now()->addDays(50)->toDateString(),
            'purchase_cost' => 1.00,
            'selling_price' => 2.50,
            'quantity_on_hand' => 20,
            'quantity_reserved' => 0,
        ]);

        $response = $this->actingAs($this->adminUser)->postJson('/pharmacy/dispense/preview', [
            'warehouse_id' => $this->warehouse->id,
            'medicine_id' => $this->medicine->id,
            'quantity' => 10,
        ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('allocations.0.batch_number', 'PREVIEW-BATCH-1');
        $response->assertJsonPath('allocations.0.allocated_qty', 10);
    }

    public function test_can_manually_adjust_stock_count_and_log_audit_transaction(): void
    {
        $batch = MedicineBatch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'medicine_id' => $this->medicine->id,
            'batch_number' => 'ADJUST-BATCH-1',
            'expiry_date' => now()->addDays(120)->toDateString(),
            'purchase_cost' => 1.00,
            'selling_price' => 2.50,
            'quantity_on_hand' => 30,
            'quantity_reserved' => 0,
        ]);

        $response = $this->actingAs($this->adminUser)->post("/pharmacy/batches/{$batch->id}/adjust", [
            'new_quantity' => 25,
            'reason' => 'Cycle count damage write-off',
        ]);

        $response->assertSessionHasNoErrors();

        $batch->refresh();
        $this->assertEquals(25, $batch->quantity_on_hand);

        $this->assertDatabaseHas('stock_transactions', [
            'tenant_id' => $this->tenant->id,
            'medicine_batch_id' => $batch->id,
            'movement_type' => StockMovementType::Adjustment->value,
            'quantity' => -5,
            'balance_after' => 25,
        ]);
    }
}
