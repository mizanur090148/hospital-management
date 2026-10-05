<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 11: AI & Clinical Scribe Readiness.
     */
    public function up(): void
    {
        // 1. Ambient Clinical Scribe Sessions
        if (! Schema::hasTable('ai_scribe_sessions')) {
            Schema::create('ai_scribe_sessions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignUuid('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
                $table->foreignUuid('patient_id')->nullable()->constrained('patients')->nullOnDelete();
                $table->foreignUuid('opd_visit_id')->nullable()->constrained('opd_visits')->nullOnDelete();
                $table->foreignUuid('admission_id')->nullable()->constrained('admissions')->nullOnDelete();
                $table->string('session_number', 50)->index();
                $table->string('status', 32)->default('RECORDING'); // RECORDING, PROCESSING, GENERATED, REVIEWED, COMMITTED
                $table->longText('raw_transcript')->nullable();
                $table->longText('sanitized_transcript')->nullable();
                $table->jsonb('structured_soap')->nullable(); // { subjective, objective, assessment, plan, icd10_codes, prescription_suggestions }
                $table->unsignedInteger('audio_duration_seconds')->default(0);
                $table->string('model_used', 64)->default('clinical-scribe-v1');
                $table->unsignedInteger('tokens_used')->default(0);
                $table->timestamp('committed_at')->nullable();
                $table->jsonb('metadata')->nullable();
                $table->timestamps();

                $table->unique(['tenant_id', 'session_number']);
                $table->index(['tenant_id', 'doctor_id', 'status']);
                $table->index(['tenant_id', 'patient_id']);
            });
        }

        // 2. Medical Knowledge Documents (Domain RAG Pipeline)
        if (! Schema::hasTable('medical_knowledge_documents')) {
            Schema::create('medical_knowledge_documents', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->string('title', 255);
                $table->string('category', 64); // CLINICAL_GUIDELINE, DRUG_CONTRAINDICATION, HOSPITAL_POLICY, TRIAGE_PROTOCOL, ANTIBIOTIC_STEWARDSHIP
                $table->text('summary')->nullable();
                $table->longText('content');
                $table->jsonb('tags')->nullable();
                $table->string('source_reference', 255)->nullable();
                $table->string('version', 32)->default('1.0');
                $table->boolean('is_active')->default(true);
                $table->jsonb('metadata')->nullable();
                $table->timestamps();

                $table->index(['tenant_id', 'category', 'is_active']);
            });
        }

        // 3. Automated Clinical & Discharge Summaries
        if (! Schema::hasTable('clinical_summaries')) {
            Schema::create('clinical_summaries', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
                $table->foreignUuid('admission_id')->nullable()->constrained('admissions')->nullOnDelete();
                $table->foreignUuid('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
                $table->string('summary_number', 50)->index();
                $table->string('summary_type', 64)->default('DISCHARGE_SUMMARY'); // DISCHARGE_SUMMARY, CONSULTATION_BRIEF, CLINICAL_HANDOVER, ENCOUNTER_RECAP
                $table->text('chief_complaint')->nullable();
                $table->text('hospital_course')->nullable();
                $table->text('diagnostic_summary')->nullable();
                $table->text('medication_plan')->nullable();
                $table->text('follow_up_instructions')->nullable();
                $table->jsonb('full_content')->nullable();
                $table->string('status', 32)->default('DRAFT'); // DRAFT, PHYSICIAN_APPROVED, COMMITTED_TO_RECORD
                $table->timestamp('approved_at')->nullable();
                $table->jsonb('metadata')->nullable();
                $table->timestamps();

                $table->unique(['tenant_id', 'summary_number']);
                $table->index(['tenant_id', 'patient_id', 'summary_type']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_summaries');
        Schema::dropIfExists('medical_knowledge_documents');
        Schema::dropIfExists('ai_scribe_sessions');
    }
};
