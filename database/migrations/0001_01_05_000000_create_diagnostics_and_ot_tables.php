<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 5: Diagnostics (Laboratory & Radiology) and Operation Theatre (OT).
     */
    public function up(): void
    {
        // 1. Laboratory Test Templates & Master Catalog
        Schema::create('lab_test_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 200);
            $table->string('category', 100); // Hematology, Biochemistry, Immunology, Urinalysis, Microbiology
            $table->string('sample_type', 100); // Whole Blood, Serum, Plasma, Urine, CSF
            $table->decimal('price', 10, 2)->default(0.00);
            $table->unsignedInteger('turnaround_time_hours')->default(24);
            $table->jsonb('reference_ranges')->nullable(); // [{"parameter":"Hemoglobin","range":"13.5-17.5","unit":"g/dL","gender":"MALE"}]
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'category']);
        });

        // 2. Laboratory Orders Requisition
        Schema::create('lab_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('order_number', 50);
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->foreignUuid('ordering_doctor_id')->constrained('doctors')->restrictOnDelete();
            $table->string('encounter_type', 50)->nullable(); // OPD, IPD, EMERGENCY, DIRECT
            $table->uuid('encounter_id')->nullable();
            $table->string('priority', 30)->default('ROUTINE'); // ROUTINE, URGENT, STAT
            $table->text('clinical_notes')->nullable();
            $table->string('status', 30)->default('ORDERED'); // ORDERED, SAMPLE_COLLECTED, IN_ANALYSIS, VERIFIED, CANCELLED
            $table->timestamp('ordered_at');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'order_number']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'patient_id']);
        });

        // 3. Lab Order Items (Individual tests ordered)
        Schema::create('lab_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('lab_order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->foreignUuid('template_id')->constrained('lab_test_templates')->restrictOnDelete();
            $table->string('test_name', 200);
            $table->decimal('price', 10, 2)->default(0.00);
            $table->string('status', 30)->default('ORDERED');
            $table->timestamps();

            $table->index(['tenant_id', 'lab_order_id']);
        });

        // 4. Laboratory Sample Collection & Barcodes
        Schema::create('lab_samples', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('lab_order_id')->constrained('lab_orders')->cascadeOnDelete();
            $table->string('sample_barcode', 60);
            $table->string('sample_type', 100);
            $table->foreignUuid('collected_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('collected_at')->nullable();
            $table->string('rejection_reason', 255)->nullable();
            $table->string('status', 30)->default('PENDING'); // PENDING, COLLECTED, REJECTED, ANALYZED
            $table->timestamps();

            $table->unique(['tenant_id', 'sample_barcode']);
            $table->index(['tenant_id', 'lab_order_id']);
        });

        // 5. Laboratory Test Results & Pathologist Sign-Off
        Schema::create('lab_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('lab_order_item_id')->constrained('lab_order_items')->cascadeOnDelete();
            $table->string('parameter_name', 150);
            $table->string('observed_value', 200);
            $table->string('reference_range', 100)->nullable();
            $table->string('unit', 50)->nullable();
            $table->boolean('is_abnormal')->default(false);
            $table->boolean('critical_flag')->default(false);
            $table->text('pathologist_notes')->nullable();
            $table->foreignUuid('verified_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->string('status', 30)->default('DRAFT'); // DRAFT, VERIFIED
            $table->timestamps();

            $table->index(['tenant_id', 'lab_order_item_id']);
        });

        // 6. Radiology Master Templates
        Schema::create('radiology_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 200);
            $table->string('modality', 50); // XRAY, CT_SCAN, MRI, ULTRASOUND, MAMMOGRAPHY, DEXA
            $table->string('body_part', 100);
            $table->decimal('price', 10, 2)->default(0.00);
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'modality']);
        });

        // 7. Radiology Orders & DICOM Imaging Reports
        Schema::create('radiology_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('order_number', 50);
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->foreignUuid('ordering_doctor_id')->constrained('doctors')->restrictOnDelete();
            $table->foreignUuid('template_id')->constrained('radiology_templates')->restrictOnDelete();
            $table->string('priority', 30)->default('ROUTINE');
            $table->text('clinical_indication');
            $table->text('findings')->nullable();
            $table->text('impression')->nullable();
            $table->text('radiologist_notes')->nullable();
            $table->string('dicom_study_uid', 100)->nullable();
            $table->string('dicom_preview_url', 500)->nullable();
            $table->foreignUuid('reporting_doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->string('status', 30)->default('ORDERED'); // ORDERED, SCHEDULED, CAPTURED, REPORTED, VERIFIED, CANCELLED
            $table->timestamp('ordered_at');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'order_number']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'patient_id']);
        });

        // 8. Operation Theatre (OT) Rooms
        Schema::create('operation_theatres', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->string('theatre_type', 100); // Major OT, Cardiac OT, Neuro OT, Ortho OT, Minor OT
            $table->string('floor', 50)->nullable();
            $table->string('status', 30)->default('AVAILABLE'); // AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'branch_id', 'code']);
            $table->index(['tenant_id', 'status']);
        });

        // 9. Surgical Procedures & WHO Safety Checklist
        Schema::create('surgeries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('surgery_number', 50);
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->foreignUuid('primary_surgeon_id')->constrained('doctors')->restrictOnDelete();
            $table->foreignUuid('anesthesiologist_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->foreignUuid('operation_theatre_id')->constrained('operation_theatres')->restrictOnDelete();
            $table->string('procedure_name', 255);
            $table->string('anesthesia_type', 50)->default('GENERAL');
            $table->date('scheduled_date');
            $table->string('scheduled_start_time', 10);
            $table->string('scheduled_end_time', 10);
            $table->timestamp('actual_start_at')->nullable();
            $table->timestamp('actual_end_at')->nullable();
            $table->text('pre_op_diagnosis')->nullable();
            $table->text('post_op_diagnosis')->nullable();
            $table->text('surgical_notes')->nullable();
            $table->jsonb('safety_checklist')->nullable(); // WHO Sign-In, Time-Out, Sign-Out
            $table->string('status', 30)->default('SCHEDULED'); // SCHEDULED, PRE_OP, IN_PROGRESS, POST_OP, COMPLETED, CANCELLED
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'surgery_number']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'operation_theatre_id', 'scheduled_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surgeries');
        Schema::dropIfExists('operation_theatres');
        Schema::dropIfExists('radiology_orders');
        Schema::dropIfExists('radiology_templates');
        Schema::dropIfExists('lab_results');
        Schema::dropIfExists('lab_samples');
        Schema::dropIfExists('lab_order_items');
        Schema::dropIfExists('lab_orders');
        Schema::dropIfExists('lab_test_templates');
    }
};
