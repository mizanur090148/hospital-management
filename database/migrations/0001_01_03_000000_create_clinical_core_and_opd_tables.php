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
        // 1. Patients Table
        Schema::create('patients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('mrn')->index();
            $table->string('first_name');
            $table->string('last_name');
            $table->date('dob');
            $table->string('gender'); // MALE, FEMALE, OTHER
            $table->string('blood_group')->default('UNKNOWN');
            $table->string('phone')->index();
            $table->string('email')->nullable();
            $table->string('national_id')->nullable();
            $table->jsonb('emergency_contact')->nullable();
            $table->jsonb('address')->nullable();
            $table->jsonb('allergies')->nullable();
            $table->jsonb('chronic_conditions')->nullable();
            $table->string('status')->default('ACTIVE')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'mrn']);
            $table->index(['tenant_id', 'last_name', 'first_name']);
        });

        // 2. Doctors Table
        Schema::create('doctors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('department_id')->constrained('departments')->onDelete('restrict');
            $table->string('license_number');
            $table->string('qualification');
            $table->string('specialization');
            $table->decimal('consultation_fee', 10, 2)->default(0.00);
            $table->decimal('follow_up_fee', 10, 2)->default(0.00);
            $table->decimal('emergency_fee', 10, 2)->default(0.00);
            $table->text('bio')->nullable();
            $table->boolean('is_available_for_teleconsult')->default(false);
            $table->string('status')->default('ACTIVE')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'user_id']);
            $table->unique(['tenant_id', 'license_number']);
        });

        // 3. Doctor Schedules Table
        Schema::create('doctor_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('doctor_id')->constrained('doctors')->onDelete('cascade');
            $table->foreignUuid('branch_id')->constrained('branches')->onDelete('cascade');
            $table->smallInteger('day_of_week'); // 1 = Monday ... 7 = Sunday
            $table->time('start_time');
            $table->time('end_time');
            $table->integer('slot_duration_minutes')->default(15);
            $table->integer('max_patients')->default(20);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'doctor_id', 'day_of_week']);
        });

        // 4. Appointments Table
        Schema::create('appointments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignUuid('doctor_id')->constrained('doctors')->onDelete('restrict');
            $table->foreignUuid('patient_id')->constrained('patients')->onDelete('restrict');
            $table->string('appointment_number')->index();
            $table->date('appointment_date')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->string('type')->default('OPD');
            $table->string('status')->default('SCHEDULED')->index();
            $table->text('reason_for_visit')->nullable();
            $table->decimal('consultation_fee', 10, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'appointment_number']);
            $table->index(['tenant_id', 'doctor_id', 'appointment_date', 'start_time']);
        });

        // 5. OPD Visits (Encounters) Table
        Schema::create('opd_visits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignUuid('patient_id')->constrained('patients')->onDelete('restrict');
            $table->foreignUuid('doctor_id')->constrained('doctors')->onDelete('restrict');
            $table->foreignUuid('appointment_id')->nullable()->constrained('appointments')->onDelete('set null');
            $table->string('visit_number')->index();
            $table->text('chief_complaint');
            $table->text('history_of_present_illness')->nullable();
            $table->text('physical_examination')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->jsonb('vitals')->nullable();
            $table->jsonb('diagnoses')->nullable();
            $table->string('status')->default('IN_PROGRESS')->index();
            $table->timestamp('arrived_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'visit_number']);
            $table->index(['tenant_id', 'patient_id', 'created_at']);
        });

        // 6. Prescriptions Table
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('patient_id')->constrained('patients')->onDelete('restrict');
            $table->foreignUuid('doctor_id')->constrained('doctors')->onDelete('restrict');
            $table->foreignUuid('opd_visit_id')->nullable()->constrained('opd_visits')->onDelete('set null');
            $table->string('prescription_number')->index();
            $table->text('advice')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->string('status')->default('FINALIZED')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'prescription_number']);
        });

        // 7. Prescription Items Table
        Schema::create('prescription_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('prescription_id')->constrained('prescriptions')->onDelete('cascade');
            $table->string('medicine_name');
            $table->string('dosage');
            $table->string('frequency');
            $table->string('route')->default('ORAL');
            $table->integer('duration_days')->default(5);
            $table->string('instructions')->nullable();
            $table->integer('total_quantity')->nullable();
            $table->timestamps();

            $table->index('prescription_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
        Schema::dropIfExists('prescriptions');
        Schema::dropIfExists('opd_visits');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('doctor_schedules');
        Schema::dropIfExists('doctors');
        Schema::dropIfExists('patients');
    }
};
