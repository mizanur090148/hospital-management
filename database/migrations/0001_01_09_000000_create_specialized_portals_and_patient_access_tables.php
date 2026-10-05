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
        // 1. Add user_id and portal_activated_at to patients table if not present
        Schema::table('patients', function (Blueprint $table) {
            if (! Schema::hasColumn('patients', 'user_id')) {
                $table->foreignUuid('user_id')->nullable()->after('tenant_id')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('patients', 'portal_activated_at')) {
                $table->timestamp('portal_activated_at')->nullable()->after('status');
            }
        });

        // 2. Teleconsultation Sessions Table
        Schema::create('teleconsultation_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('appointment_id')->constrained('appointments')->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->string('room_name')->unique();
            $table->string('join_token')->nullable();
            $table->string('session_status')->default('SCHEDULED')->index(); // SCHEDULED, ACTIVE, COMPLETED, CANCELLED
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'session_status']);
        });

        // 3. Doctor Order Templates (Quick Charting Favorites)
        Schema::create('doctor_order_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->string('template_type')->index(); // PRESCRIPTION_FAVORITE, LAB_PANEL, CLINICAL_SNIPPET
            $table->string('title');
            $table->jsonb('content');
            $table->timestamps();

            $table->index(['tenant_id', 'doctor_id', 'template_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('doctor_order_templates');
        Schema::dropIfExists('teleconsultation_sessions');

        Schema::table('patients', function (Blueprint $table) {
            if (Schema::hasColumn('patients', 'portal_activated_at')) {
                $table->dropColumn('portal_activated_at');
            }
            if (Schema::hasColumn('patients', 'user_id')) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            }
        });
    }
};
