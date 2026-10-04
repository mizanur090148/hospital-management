<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 6: Pharmacy, FEFO Batches, Warehouses & Supply Chain.
     */
    public function up(): void
    {
        // 1. Warehouses & Pharmacy Store Locations
        Schema::create('warehouses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->string('warehouse_type', 50)->default('CENTRAL'); // CENTRAL, OUTPATIENT, INPATIENT_SATELLITE, EMERGENCY_STORE
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'branch_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
        });

        // 2. Master Medicine Catalog
        Schema::create('medicines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('generic_name', 200);
            $table->string('brand_name', 200);
            $table->string('dosage_form', 50)->default('TABLET');
            $table->string('strength', 100);
            $table->string('uom', 50)->default('Unit'); // Box, Strip, Vial, Bottle
            $table->string('manufacturer', 150)->nullable();
            $table->boolean('requires_prescription')->default(true);
            $table->unsignedInteger('reorder_level')->default(50);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'generic_name']);
            $table->index(['tenant_id', 'brand_name']);
        });

        // 3. Medicine Batches & FEFO Stock Quantities
        Schema::create('medicine_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignUuid('medicine_id')->constrained('medicines')->cascadeOnDelete();
            $table->string('batch_number', 80);
            $table->date('expiry_date');
            $table->decimal('purchase_cost', 10, 2)->default(0.00);
            $table->decimal('selling_price', 10, 2)->default(0.00);
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('quantity_reserved')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'warehouse_id', 'medicine_id', 'batch_number']);
            // Crucial Index for ultra-fast FEFO (First Expiring, First Out) batch queries:
            $table->index(['tenant_id', 'medicine_id', 'expiry_date']);
        });

        // 4. Stock Movement Audit Trail Ledger
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignUuid('medicine_batch_id')->constrained('medicine_batches')->cascadeOnDelete();
            $table->string('movement_type', 50); // PURCHASE_RECEIPT, DISPENSE, RETURN_TO_SUPPLIER, PATIENT_RETURN, ADJUSTMENT, TRANSFER
            $table->integer('quantity'); // Positive for inward, negative for outward
            $table->integer('balance_after');
            $table->string('reference_type', 100)->nullable(); // PurchaseOrder, GoodsReceiptNote, PharmacyDispensing
            $table->uuid('reference_id')->nullable();
            $table->string('notes', 255)->nullable();
            $table->foreignUuid('performed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'medicine_batch_id']);
            $table->index(['tenant_id', 'created_at']);
        });

        // 5. Pharmaceutical Vendors & Suppliers
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name', 200);
            $table->string('contact_person', 150)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('phone', 50)->nullable();
            $table->jsonb('address')->nullable();
            $table->string('tax_number', 80)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'name']);
        });

        // 6. Procurement Purchase Orders (PO)
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->string('po_number', 50);
            $table->date('order_date');
            $table->date('expected_delivery_date')->nullable();
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->string('status', 50)->default('DRAFT'); // DRAFT, ISSUED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'po_number']);
            $table->index(['tenant_id', 'status']);
        });

        // 7. Purchase Order Line Items
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->foreignUuid('medicine_id')->constrained('medicines')->restrictOnDelete();
            $table->integer('quantity_ordered');
            $table->integer('quantity_received')->default(0);
            $table->decimal('unit_cost', 10, 2);
            $table->decimal('total_cost', 12, 2);
            $table->timestamps();

            $table->index(['tenant_id', 'purchase_order_id']);
        });

        // 8. Goods Receipt Notes (GRN) Inward Receiving
        Schema::create('goods_receipt_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->foreignUuid('purchase_order_id')->nullable()->constrained('purchase_orders')->nullOnDelete();
            $table->foreignUuid('supplier_id')->constrained('suppliers')->restrictOnDelete();
            $table->string('grn_number', 50);
            $table->date('received_date');
            $table->string('invoice_number', 100)->nullable();
            $table->foreignUuid('received_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'grn_number']);
            $table->index(['tenant_id', 'received_date']);
        });

        // 9. Goods Receipt Note Line Items (Batch & Expiry capture)
        Schema::create('goods_receipt_note_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('goods_receipt_note_id')->constrained('goods_receipt_notes')->cascadeOnDelete();
            $table->foreignUuid('medicine_id')->constrained('medicines')->restrictOnDelete();
            $table->string('batch_number', 80);
            $table->date('expiry_date');
            $table->integer('quantity_received');
            $table->decimal('unit_cost', 10, 2);
            $table->decimal('selling_price', 10, 2);
            $table->timestamps();

            $table->index(['tenant_id', 'goods_receipt_note_id']);
        });

        // 10. Prescription Dispensing Header
        Schema::create('pharmacy_dispensings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->string('dispense_number', 50);
            $table->foreignUuid('prescription_id')->nullable()->constrained('prescriptions')->nullOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->foreignUuid('dispensed_by_user_id')->constrained('users')->restrictOnDelete();
            $table->decimal('total_amount', 10, 2)->default(0.00);
            $table->string('status', 50)->default('DISPENSED'); // PENDING, DISPENSED, PARTIALLY_DISPENSED, CANCELLED
            $table->timestamp('dispensed_at');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'dispense_number']);
            $table->index(['tenant_id', 'patient_id']);
            $table->index(['tenant_id', 'dispensed_at']);
        });

        // 11. Dispensing Items with Specific FEFO Batch Allocations
        Schema::create('pharmacy_dispensing_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('dispensing_id')->constrained('pharmacy_dispensings')->cascadeOnDelete();
            $table->foreignUuid('prescription_item_id')->nullable()->constrained('prescription_items')->nullOnDelete();
            $table->foreignUuid('medicine_id')->constrained('medicines')->restrictOnDelete();
            $table->foreignUuid('medicine_batch_id')->constrained('medicine_batches')->restrictOnDelete();
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->timestamps();

            $table->index(['tenant_id', 'dispensing_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pharmacy_dispensing_items');
        Schema::dropIfExists('pharmacy_dispensings');
        Schema::dropIfExists('goods_receipt_note_items');
        Schema::dropIfExists('goods_receipt_notes');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('stock_transactions');
        Schema::dropIfExists('medicine_batches');
        Schema::dropIfExists('medicines');
        Schema::dropIfExists('warehouses');
    }
};
