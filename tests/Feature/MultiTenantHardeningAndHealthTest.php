<?php

namespace Tests\Feature;

use App\Core\Enums\Gender;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Auth\Models\User;
use App\Modules\Patient\Models\Patient;
use App\Modules\Storage\Jobs\ProcessDocumentChecksumJob;
use App\Modules\Storage\Models\ClinicalDocument;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class MultiTenantHardeningAndHealthTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected Branch $branchA;

    protected Branch $branchB;

    protected User $userA;

    protected User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        // Tenant A Setup
        $this->tenantA = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'st-jude-hospital',
            'legal_name' => 'St. Jude Healthcare Corp',
            'trade_name' => 'St. Jude Hospital',
            'status' => TenantStatus::Active,
            'plan' => 'professional',
        ]);

        $this->branchA = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'code' => 'SJH-MAIN',
            'name' => 'St. Jude Central Campus',
            'is_main' => true,
        ]);

        $this->userA = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'Dr. Gregory House',
            'email' => 'house@stjude.org',
            'password' => bcrypt('password123'),
            'user_type' => UserType::Doctor,
            'status' => UserStatus::Active,
            'is_active' => true,
        ]);

        // Tenant B Setup (Separate Healthcare Institution)
        $this->tenantB = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'mayo-specialty-clinic',
            'legal_name' => 'Mayo Health Network LLC',
            'trade_name' => 'Mayo Specialty Clinic',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branchB = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantB->id,
            'code' => 'MAYO-WEST',
            'name' => 'Mayo West Wing',
            'is_main' => true,
        ]);

        $this->userB = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantB->id,
            'branch_id' => $this->branchB->id,
            'name' => 'Dr. James Wilson',
            'email' => 'wilson@mayo.org',
            'password' => bcrypt('password123'),
            'user_type' => UserType::Doctor,
            'status' => UserStatus::Active,
            'is_active' => true,
        ]);
    }

    /**
     * 1. Strict cross-tenant data isolation test (Zero cross-tenant leakage).
     */
    public function test_cross_tenant_data_isolation_blocks_unauthorized_records(): void
    {
        // Create Patient for Tenant A
        $patientA = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'mrn' => 'MRN-2026-000001',
            'first_name' => 'Alice',
            'last_name' => 'Anderson',
            'gender' => Gender::Female,
            'dob' => '1988-04-12',
            'phone' => '+15551112222',
        ]);

        // Create Patient for Tenant B
        $patientB = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantB->id,
            'mrn' => 'MRN-2026-000002',
            'first_name' => 'Bob',
            'last_name' => 'Builder',
            'gender' => Gender::Male,
            'dob' => '1975-09-20',
            'phone' => '+15553334444',
        ]);

        // Set context to Tenant A
        app(TenantContext::class)->setTenant($this->tenantA);

        // When Tenant A executes query, only Tenant A's patients are visible
        $visiblePatients = Patient::all();
        $this->assertCount(1, $visiblePatients);
        $this->assertEquals($patientA->id, $visiblePatients->first()->id);

        // Querying Tenant B's patient returns null due to BelongsToTenant global scope
        $attemptCrossTenantFind = Patient::find($patientB->id);
        $this->assertNull($attemptCrossTenantFind);

        // Switching context to Tenant B
        app(TenantContext::class)->setTenant($this->tenantB);
        $visiblePatientsB = Patient::all();
        $this->assertCount(1, $visiblePatientsB);
        $this->assertEquals($patientB->id, $visiblePatientsB->first()->id);
        $this->assertNull(Patient::find($patientA->id));
    }

    /**
     * 2. Cross-tenant billing & clinical document isolation.
     */
    public function test_cross_tenant_billing_and_documents_isolation(): void
    {
        $patientB = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantB->id,
            'mrn' => 'MRN-2026-000099',
            'first_name' => 'Charles',
            'last_name' => 'Xavier',
            'gender' => Gender::Male,
            'dob' => '1962-01-01',
            'phone' => '+15559998888',
        ]);

        // Create Document for Tenant B
        $documentB = ClinicalDocument::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantB->id,
            'patient_id' => $patientB->id,
            'uploaded_by_user_id' => $this->userB->id,
            'document_number' => 'DOC-2026-000001',
            'title' => 'Cranial MRI Scan DICOM',
            'category' => 'RADIOLOGY',
            'file_path' => 'documents/mri_cranial.dcm',
            'file_name' => 'mri_cranial.dcm',
            'mime_type' => 'application/dicom',
            'file_size_bytes' => 5242880,
            'storage_disk' => 'local',
            'checksum_sha256' => hash('sha256', 'mri_cranial_sample_data'),
        ]);

        // Authenticate as User A (Tenant A)
        app(TenantContext::class)->setTenant($this->tenantA);

        $this->assertNull(ClinicalDocument::find($documentB->id));
        $this->assertEquals(0, ClinicalDocument::count());
    }

    /**
     * 3. Public health check probe endpoint (/api/health).
     */
    public function test_public_health_check_api_endpoint(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'timestamp',
            'app' => ['name', 'environment', 'php_version', 'laravel_version'],
            'checks' => [
                'database' => ['status', 'latency_ms'],
                'cache' => ['status', 'latency_ms', 'driver'],
                'storage' => ['status', 'latency_ms', 'default_disk'],
                'queue' => ['status', 'driver', 'pending_jobs', 'failed_jobs'],
                'multi_tenant_isolation' => ['status', 'belongs_to_tenant_scope_active', 'total_isolated_tenants'],
                'cryptographic_audit_trail' => ['status', 'hash_algorithm'],
            ],
        ]);

        $this->assertEquals('healthy', $response->json('status'));
        $this->assertEquals('healthy', $response->json('checks.database.status'));
        $this->assertEquals('healthy', $response->json('checks.cache.status'));
        $this->assertEquals('healthy', $response->json('checks.storage.status'));
    }

    /**
     * 4. System health console command (php artisan system:health).
     */
    public function test_system_health_console_command(): void
    {
        $this->artisan('system:health', ['--json' => true])
            ->assertSuccessful()
            ->expectsOutputToContain('"status": "healthy"');
    }

    /**
     * 5. Security headers middleware enforces enterprise browser defense headers.
     */
    public function test_security_headers_middleware_enforces_headers(): void
    {
        $response = $this->get('/login');

        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('X-XSS-Protection', '1; mode=block');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'geolocation=(), camera=(self), microphone=(self)');
    }

    /**
     * 6. Asynchronous background queue job computes cryptographic checksum.
     */
    public function test_background_document_checksum_queue_job(): void
    {
        Storage::fake('local');

        $content = 'Patient ECG telemetry diagnostic trace recording stream #7789';
        $filePath = 'clinical_docs/ecg_trace.pdf';
        Storage::disk('local')->put($filePath, $content);

        $patientA = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'mrn' => 'MRN-2026-000005',
            'first_name' => 'Diana',
            'last_name' => 'Prince',
            'gender' => Gender::Female,
            'dob' => '1990-05-15',
            'phone' => '+15555556666',
        ]);

        $document = ClinicalDocument::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA->id,
            'patient_id' => $patientA->id,
            'uploaded_by_user_id' => $this->userA->id,
            'document_number' => 'DOC-2026-000005',
            'title' => 'Cardiac ECG Report',
            'category' => 'CARDIOLOGY',
            'file_path' => $filePath,
            'file_name' => 'ecg_trace.pdf',
            'mime_type' => 'application/pdf',
            'file_size_bytes' => strlen($content),
            'storage_disk' => 'local',
            'checksum_sha256' => str_repeat('0', 64),
        ]);

        $this->assertEquals(str_repeat('0', 64), $document->checksum_sha256);

        // Execute background queue job synchronously
        ProcessDocumentChecksumJob::dispatchSync($document);

        $document->refresh();
        $this->assertNotNull($document->checksum_sha256);
        $this->assertEquals(hash('sha256', $content), $document->checksum_sha256);
        $this->assertEquals('queue_worker', $document->metadata['checksum_worker'] ?? null);
    }

    /**
     * 7. System health interactive dashboard web route.
     */
    public function test_system_health_dashboard_web_view(): void
    {
        $response = $this->actingAs($this->userA)
            ->get('/system/health');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('System/HealthDashboard')
            ->has('report')
            ->where('report.status', 'healthy')
        );
    }
}
