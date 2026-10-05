<?php

namespace Tests\Feature;

use App\Core\Enums\AuditAction;
use App\Core\Enums\BloodGroup;
use App\Core\Enums\Gender;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Audit\Services\AuditImmutabilityService;
use App\Modules\Auth\Models\User;
use App\Modules\Notification\Models\NotificationLog;
use App\Modules\Notification\Services\NotificationDispatchService;
use App\Modules\Patient\Models\Patient;
use App\Modules\Storage\Models\ClinicalDocument;
use App\Modules\Storage\Services\DocumentStorageService;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NotificationsAuditAndStorageTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $staffUser;

    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apex-care-hospital-p10',
            'legal_name' => 'ApexCare Hospital System Phase 10 Inc.',
            'trade_name' => 'ApexCare General Hospital',
            'status' => TenantStatus::Active,
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Trauma Center',
            'code' => 'MTC-P10',
            'is_main' => true,
            'status' => 'ACTIVE',
        ]);

        $this->staffUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Dr. Gregory House',
            'email' => 'dr.house@apexcare.org',
            'user_type' => UserType::Doctor,
            'status' => UserStatus::Active,
            'password' => Hash::make('HospitalSecret2026!'),
        ]);

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'first_name' => 'Sarah',
            'last_name' => 'Connor',
            'mrn' => 'MRN-2026-9901',
            'gender' => Gender::Female,
            'dob' => '1985-05-12',
            'blood_group' => BloodGroup::OPositive,
            'status' => PatientStatus::Active,
            'phone' => '+15551234567',
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
    }

    /**
     * 1. Multi-channel notification delivery engine & in-app notifications.
     */
    public function test_multi_channel_notification_dispatch_and_in_app_inbox(): void
    {
        $service = app(NotificationDispatchService::class);

        // Dispatch In-App Alert
        $log = $service->dispatch(
            tenantId: $this->tenant->id,
            recipient: $this->staffUser->id,
            channel: 'IN_APP',
            title: 'Critical Patient Assignment',
            message: 'Patient Sarah Connor assigned to Exam Room 4.',
            severity: 'WARNING',
            userId: $this->staffUser->id,
            meta: ['patient_id' => $this->patient->id]
        );

        $this->assertInstanceOf(NotificationLog::class, $log);
        $this->assertEquals('DELIVERED', $log->status);
        $this->assertEquals('IN_APP', $log->channel);
        $this->assertStringStartsWith('APP-NOTIF-', $log->external_id);

        // Verify standard notifications table has unread item for user
        $unreadCount = DB::table('notifications')
            ->where('notifiable_id', $this->staffUser->id)
            ->whereNull('read_at')
            ->count();
        $this->assertEquals(1, $unreadCount);

        // Mark single notification as read
        $notif = DB::table('notifications')->where('notifiable_id', $this->staffUser->id)->first();
        $readResult = $service->markAsRead($notif->id, $this->staffUser->id);
        $this->assertTrue($readResult);

        // Dispatch a second notification and mark all as read
        $service->dispatch(
            tenantId: $this->tenant->id,
            recipient: $this->staffUser->id,
            channel: 'IN_APP',
            title: 'Second Alert',
            message: 'Shift handover update.',
            severity: 'INFO',
            userId: $this->staffUser->id
        );

        $updatedCount = $service->markAllAsRead($this->tenant->id, $this->staffUser->id);
        $this->assertEquals(1, $updatedCount);
    }

    /**
     * 2. Emergency triage alert dispatch (ESI-1 immediate resuscitation).
     */
    public function test_emergency_triage_alert_dispatch(): void
    {
        $service = app(NotificationDispatchService::class);

        $log = $service->dispatchEmergencyTriageAlert($this->tenant->id, [
            'patient_mrn' => $this->patient->mrn,
            'patient_name' => 'Sarah Connor',
            'esi_level' => 'ESI-1',
            'chief_complaint' => 'Acute cardiac arrest / massive hemorrhage',
            'assigned_bed' => 'Resuscitation Bay 1',
            'recipient_phone' => '+15559110000',
            'physician_user_id' => $this->staffUser->id,
        ]);

        $this->assertEquals('EMERGENCY', $log->severity);
        $this->assertEquals('SMS', $log->channel);
        $this->assertStringContainsString('ESI-1', $log->title);
        $this->assertEquals('Resuscitation Bay 1', $log->metadata['bed']);
    }

    /**
     * 3. Panic laboratory value alert dispatch.
     */
    public function test_panic_laboratory_value_alert_dispatch(): void
    {
        $service = app(NotificationDispatchService::class);

        $log = $service->dispatchPanicLabAlert($this->tenant->id, [
            'test_name' => 'Serum Potassium (K+)',
            'result_value' => '7.4',
            'unit' => 'mmol/L',
            'reference_range' => '3.5 - 5.0',
            'patient_name' => 'Sarah Connor',
            'mrn' => $this->patient->mrn,
            'physician_user_id' => $this->staffUser->id,
            'ordering_physician_contact' => 'dr.house@apexcare.org',
        ]);

        $this->assertEquals('CRITICAL', $log->severity);
        $this->assertEquals('IN_APP', $log->channel);
        $this->assertStringContainsString('CRITICAL PANIC LAB VALUE', $log->title);
        $this->assertEquals('7.4', $log->metadata['result_value']);
    }

    /**
     * 4. Cryptographic hash-chained audit trail & immutability verification.
     */
    public function test_cryptographic_audit_trail_hash_chain_and_verification(): void
    {
        $service = app(AuditImmutabilityService::class);

        // Entry 1 (Genesis previous hash)
        $log1 = $service->recordHashChainedLog([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->staffUser->id,
            'action' => AuditAction::Create,
            'entity_type' => 'App\\Modules\\Patient\\Models\\Patient',
            'entity_id' => $this->patient->id,
            'old_values' => null,
            'new_values' => ['first_name' => 'Sarah', 'last_name' => 'Connor'],
        ]);

        $this->assertNotNull($log1->current_hash);
        $this->assertEquals(AuditImmutabilityService::GENESIS_HASH, $log1->previous_hash);

        // Entry 2 (Chained to Entry 1)
        $log2 = $service->recordHashChainedLog([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->staffUser->id,
            'action' => AuditAction::Update,
            'entity_type' => 'App\\Modules\\Patient\\Models\\Patient',
            'entity_id' => $this->patient->id,
            'old_values' => ['blood_group' => 'Unknown'],
            'new_values' => ['blood_group' => 'O+'],
        ]);

        $this->assertEquals($log1->current_hash, $log2->previous_hash);
        $this->assertNotEquals($log1->current_hash, $log2->current_hash);

        // Entry 3 (Chained to Entry 2)
        $log3 = $service->recordHashChainedLog([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->staffUser->id,
            'action' => AuditAction::View,
            'entity_type' => 'App\\Modules\\Patient\\Models\\Patient',
            'entity_id' => $this->patient->id,
            'old_values' => null,
            'new_values' => ['action' => 'CHART_INSPECTED'],
        ]);

        $this->assertEquals($log2->current_hash, $log3->previous_hash);

        // Verify entire chain integrity
        $verification = $service->verifyChainIntegrity($this->tenant->id);
        $this->assertTrue($verification['is_valid']);
        $this->assertEquals('VERIFIED_SECURE', $verification['status']);
        $this->assertEquals(3, $verification['total_checked']);
        $this->assertNull($verification['broken_at_id']);
    }

    /**
     * 5. Tamper detection: modifying stored content flags cryptographic breach.
     */
    public function test_audit_chain_tamper_detection_identifies_modified_record(): void
    {
        $service = app(AuditImmutabilityService::class);

        $log1 = $service->recordHashChainedLog([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->staffUser->id,
            'action' => AuditAction::Create,
            'entity_type' => 'Prescription',
            'entity_id' => (string) Str::uuid(),
            'old_values' => null,
            'new_values' => ['dosage' => '500mg Amoxicillin'],
        ]);

        $log2 = $service->recordHashChainedLog([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->staffUser->id,
            'action' => AuditAction::Update,
            'entity_type' => 'Prescription',
            'entity_id' => (string) Str::uuid(),
            'old_values' => ['dosage' => '500mg Amoxicillin'],
            'new_values' => ['dosage' => '1000mg Amoxicillin'],
        ]);

        // Maliciously tamper with log1 in the database directly (bypassing service)
        DB::table('audit_logs')->where('id', $log1->id)->update([
            'new_values' => json_encode(['dosage' => 'TAMPERED_DOSAGE_2000mg']),
        ]);

        $verification = $service->verifyChainIntegrity($this->tenant->id);
        $this->assertFalse($verification['is_valid']);
        $this->assertEquals('TAMPERED_CONTENT', $verification['status']);
        $this->assertEquals($log1->id, $verification['broken_at_id']);
    }

    /**
     * 6. Break-Glass emergency override protocol with mandatory audit reason.
     */
    public function test_break_glass_emergency_override_protocol(): void
    {
        $service = app(AuditImmutabilityService::class);

        $overrideLog = $service->recordBreakGlassEvent(
            tenantId: $this->tenant->id,
            userId: $this->staffUser->id,
            entityType: 'RestrictedPatientRecord',
            entityId: $this->patient->id,
            justification: 'Emergency Department unconscious victim trauma resuscitation without consent available.'
        );

        $this->assertTrue($overrideLog->is_break_glass);
        $this->assertEquals(AuditAction::Override, $overrideLog->action);
        $this->assertStringContainsString('unconscious victim', $overrideLog->justification);
        $this->assertNotNull($overrideLog->current_hash);

        // Verify alert was logged to hospital admin group
        $this->assertDatabaseHas('notification_logs', [
            'tenant_id' => $this->tenant->id,
            'recipient' => 'ADMIN_ALERT_GROUP',
            'severity' => 'EMERGENCY',
        ]);
    }

    /**
     * 7. Secure document storage with SHA-256 checksum and presigned temporary URL.
     */
    public function test_secure_document_storage_and_checksum_verification(): void
    {
        $storageService = app(DocumentStorageService::class);

        $fileContent = 'Clinical Laboratory Report: CBC, Platelets Normal. Analyzed at 2026-10-05.';
        $uploadedFile = UploadedFile::fake()->createWithContent('cbc_report_2026.pdf', $fileContent);

        $doc = $storageService->storeDocument([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'uploaded_by_user_id' => $this->staffUser->id,
            'title' => 'Routine Hematology CBC Report',
            'category' => 'LAB_REPORT',
            'is_confidential' => true,
        ], $uploadedFile);

        $this->assertInstanceOf(ClinicalDocument::class, $doc);
        $this->assertStringStartsWith('DOC-', $doc->document_number);
        $this->assertEquals(hash('sha256', $fileContent), $doc->checksum_sha256);
        $this->assertTrue(Storage::disk('local')->exists($doc->file_path));

        // Checksum verification
        $this->assertTrue($storageService->verifyChecksum($doc));

        // Presigned temporary URL generation
        $tempUrl = $storageService->generateTemporaryUrl($doc, 15);
        $this->assertStringContainsString('signature=', $tempUrl);
        $this->assertStringContainsString($doc->id, $tempUrl);
    }

    /**
     * 8. HIPAA compliant document download records audit log.
     */
    public function test_document_download_logs_hipaa_audit_trail(): void
    {
        $storageService = app(DocumentStorageService::class);

        $uploadedFile = UploadedFile::fake()->createWithContent('chest_xray.png', 'BINARY_IMAGE_DATA_SIMULATION');
        $doc = $storageService->storeDocument([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $this->patient->id,
            'uploaded_by_user_id' => $this->staffUser->id,
            'title' => 'Chest X-Ray AP View',
            'category' => 'RADIOLOGY_SCAN',
        ], $uploadedFile);

        // Download document via controller
        $response = $this->actingAs($this->staffUser)
            ->get("/documents/{$doc->id}/download");

        $response->assertStatus(200);
        $response->assertHeader('X-Document-Checksum', $doc->checksum_sha256);
        $response->assertHeader('X-Document-Number', $doc->document_number);

        // Assert audit log was recorded for document view
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenant->id,
            'entity_type' => ClinicalDocument::class,
            'entity_id' => $doc->id,
            'action' => AuditAction::View->value,
        ]);
    }

    /**
     * 9. Web controllers and workstations render properly.
     */
    public function test_web_routes_render_workstations_and_handle_actions(): void
    {
        // Notifications Index
        $response = $this->actingAs($this->staffUser)->get('/notifications');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Notifications/Index')
            ->has('inAppNotifications')
            ->has('deliveryLogs')
            ->has('stats')
        );

        // Audit Compliance Index
        $response = $this->actingAs($this->staffUser)->get('/audit/compliance');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Audit/Index')
            ->has('auditLogs')
            ->has('chainIntegrity')
            ->has('stats')
        );

        // Document Vault Index
        $response = $this->actingAs($this->staffUser)->get('/documents');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Documents/Index')
            ->has('documents')
            ->has('stats')
            ->has('patients')
        );

        // Break-Glass HTTP trigger
        $bgResponse = $this->actingAs($this->staffUser)->post('/audit/compliance/break-glass', [
            'entity_type' => 'SensitiveClinicalNote',
            'entity_id' => (string) Str::uuid(),
            'justification' => 'Immediate threat to patient life requires emergency override.',
        ]);
        $bgResponse->assertRedirect();
        $bgResponse->assertSessionHas('success');

        // Notification Dispatch HTTP trigger
        $dispResponse = $this->actingAs($this->staffUser)->post('/notifications/dispatch', [
            'type' => 'EMERGENCY_TRIAGE',
            'patient_mrn' => 'MRN-ER-991',
            'patient_name' => 'Trauma Inflow',
            'esi_level' => 'ESI-1',
            'chief_complaint' => 'Subdural hematoma',
            'assigned_bed' => 'Bay 2',
        ]);
        $dispResponse->assertRedirect();
        $dispResponse->assertSessionHas('success');

        // Document Upload HTTP trigger
        $fakeDoc = UploadedFile::fake()->create('consent_form.pdf', 500, 'application/pdf');
        $docUploadResponse = $this->actingAs($this->staffUser)->post('/documents', [
            'title' => 'Surgical Informed Consent',
            'category' => 'PATIENT_CONSENT',
            'patient_id' => $this->patient->id,
            'file' => $fakeDoc,
            'is_confidential' => '1',
        ]);
        $docUploadResponse->assertRedirect();
        $docUploadResponse->assertSessionHas('success');
        $this->assertDatabaseHas('clinical_documents', [
            'tenant_id' => $this->tenant->id,
            'title' => 'Surgical Informed Consent',
            'category' => 'PATIENT_CONSENT',
        ]);
    }
}
