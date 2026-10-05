<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 10: Notifications, Audit Trail & Document Storage.
     */
    public function up(): void
    {
        // 1. Standard Notifications Table
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->string('notifiable_type');
                $table->uuid('notifiable_id');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['notifiable_type', 'notifiable_id']);
            });
        }

        // 2. Notification Delivery Logs (Multi-Channel: In-App, SMS, WhatsApp, Email)
        if (! Schema::hasTable('notification_logs')) {
            Schema::create('notification_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('channel', 32); // IN_APP, SMS, WHATSAPP, EMAIL, WEBSOCKET
                $table->string('recipient', 128);
                $table->string('title', 255);
                $table->text('message');
                $table->string('severity', 32)->default('INFO'); // INFO, WARNING, CRITICAL, EMERGENCY
                $table->string('status', 32)->default('SENT'); // QUEUED, SENT, DELIVERED, FAILED
                $table->string('external_id', 128)->nullable();
                $table->jsonb('metadata')->nullable();
                $table->timestamp('sent_at')->useCurrent();
                $table->timestamps();

                $table->index(['tenant_id', 'channel', 'status']);
                $table->index(['tenant_id', 'sent_at']);
            });
        }

        // 3. Enhance Audit Logs with Cryptographic Hash-Chaining & Break-Glass Protocol
        Schema::table('audit_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('audit_logs', 'previous_hash')) {
                $table->string('previous_hash', 64)->nullable()->after('user_agent');
            }
            if (! Schema::hasColumn('audit_logs', 'current_hash')) {
                $table->string('current_hash', 64)->nullable()->after('previous_hash');
            }
            if (! Schema::hasColumn('audit_logs', 'is_break_glass')) {
                $table->boolean('is_break_glass')->default(false)->after('current_hash');
            }
            if (! Schema::hasColumn('audit_logs', 'justification')) {
                $table->text('justification')->nullable()->after('is_break_glass');
            }
        });

        // 4. Clinical Documents & Secure Medical Attachments Table
        if (! Schema::hasTable('clinical_documents')) {
            Schema::create('clinical_documents', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->foreignUuid('patient_id')->nullable()->constrained('patients')->nullOnDelete();
                $table->foreignUuid('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('document_number', 50)->index();
                $table->string('title', 255);
                $table->string('category', 64); // LAB_REPORT, RADIOLOGY_SCAN, PATIENT_CONSENT, DISCHARGE_SUMMARY, CLINICAL_NOTE, INSURANCE_CARD, OTHER
                $table->string('file_path', 500);
                $table->string('file_name', 255);
                $table->string('mime_type', 100);
                $table->unsignedBigInteger('file_size_bytes');
                $table->string('storage_disk', 32)->default('local');
                $table->string('checksum_sha256', 64);
                $table->boolean('is_confidential')->default(true);
                $table->jsonb('metadata')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['tenant_id', 'document_number']);
                $table->index(['tenant_id', 'patient_id', 'category']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinical_documents');

        Schema::table('audit_logs', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('audit_logs', 'justification')) {
                $cols[] = 'justification';
            }
            if (Schema::hasColumn('audit_logs', 'is_break_glass')) {
                $cols[] = 'is_break_glass';
            }
            if (Schema::hasColumn('audit_logs', 'current_hash')) {
                $cols[] = 'current_hash';
            }
            if (Schema::hasColumn('audit_logs', 'previous_hash')) {
                $cols[] = 'previous_hash';
            }
            if (! empty($cols)) {
                $table->dropColumn($cols);
            }
        });

        Schema::dropIfExists('notification_logs');
        Schema::dropIfExists('notifications');
    }
};
