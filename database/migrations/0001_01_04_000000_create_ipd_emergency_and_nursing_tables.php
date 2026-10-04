<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. IPD Admissions Table
        Schema::create('admissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignUuid('patient_id')->constrained('patients')->onDelete('restrict');
            $table->foreignUuid('attending_doctor_id')->constrained('doctors')->onDelete('restrict');
            $table->foreignUuid('admitting_department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->string('ipd_number')->index();
            $table->string('admission_type')->default('ELECTIVE'); // ELECTIVE, EMERGENCY, TRANSFER, NEWBORN
            $table->text('admitting_diagnosis');
            $table->decimal('initial_deposit', 10, 2)->default(0.00);
            $table->timestamp('admitted_at')->index();
            $table->timestamp('discharged_at')->nullable()->index();
            $table->string('discharge_disposition')->nullable(); // HOME, TRANSFERRED, AGAINST_MEDICAL_ADVICE, EXPIRED
            $table->text('discharge_summary')->nullable();
            $table->string('status')->default('ADMITTED')->index(); // ADMITTED, DISCHARGED, CANCELLED
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'ipd_number']);
            $table->index(['tenant_id', 'patient_id', 'status']);
        });

        // 2. Bed Assignments & Transfers History Table
        Schema::create('bed_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('admission_id')->constrained('admissions')->onDelete('cascade');
            $table->foreignUuid('bed_id')->constrained('beds')->onDelete('restrict');
            $table->timestamp('assigned_at')->index();
            $table->timestamp('released_at')->nullable()->index();
            $table->string('transfer_reason')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->index(['tenant_id', 'bed_id', 'is_active']);
        });

        // 3. Emergency Admissions & Triage Table
        Schema::create('emergency_admissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignUuid('patient_id')->nullable()->constrained('patients')->onDelete('set null');
            $table->string('anonymous_patient_name')->nullable();
            $table->string('er_number')->index();
            $table->string('triage_level')->default('ESI_3'); // ESI_1, ESI_2, ESI_3, ESI_4, ESI_5
            $table->text('chief_complaint');
            $table->string('arrival_mode')->default('WALK_IN'); // AMBULANCE, WALK_IN, POLICE, HELICOPTER
            $table->string('trauma_type')->default('NONE'); // BLUNT, PENETRATING, BURN, MEDICAL, PSYCHIATRIC, NONE
            $table->jsonb('vitals')->nullable();
            $table->text('triage_notes')->nullable();
            $table->foreignUuid('assigned_doctor_id')->nullable()->constrained('doctors')->onDelete('set null');
            $table->string('status')->default('TRIAGED')->index(); // TRIAGED, IN_TREATMENT, ADMITTED_TO_IPD, DISCHARGED, DECEASED
            $table->timestamp('admitted_at')->index();
            $table->timestamp('discharged_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'er_number']);
        });

        // 4. Nursing Shift Handover & Care Notes Table
        Schema::create('nursing_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('admission_id')->constrained('admissions')->onDelete('cascade');
            $table->foreignUuid('nurse_user_id')->constrained('users')->onDelete('restrict');
            $table->string('shift')->default('MORNING'); // MORNING, EVENING, NIGHT
            $table->jsonb('vitals')->nullable();
            $table->text('notes');
            $table->jsonb('intake_output')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'admission_id', 'created_at']);
        });

        // 5. Medication Administration Records (MAR) Table
        Schema::create('medication_administrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('admission_id')->constrained('admissions')->onDelete('cascade');
            $table->foreignUuid('prescription_item_id')->nullable()->constrained('prescription_items')->onDelete('set null');
            $table->string('medicine_name');
            $table->string('dose_given');
            $table->string('route')->default('ORAL');
            $table->foreignUuid('administered_by_user_id')->constrained('users')->onDelete('restrict');
            $table->timestamp('administered_at')->index();
            $table->string('status')->default('GIVEN'); // GIVEN, REFUSED, HELD, MISSED
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'admission_id', 'administered_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medication_administrations');
        Schema::dropIfExists('nursing_notes');
        Schema::dropIfExists('emergency_admissions');
        Schema::dropIfExists('bed_assignments');
        Schema::dropIfExists('admissions');
    }
};
