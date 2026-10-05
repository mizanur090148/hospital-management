<?php

namespace Tests\Feature;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AdmissionType;
use App\Core\Enums\BloodGroup;
use App\Core\Enums\Gender;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Enums\VisitStatus;
use App\Core\Tenancy\TenantContext;
use App\Modules\AI\Models\AiScribeSession;
use App\Modules\AI\Models\ClinicalSummary;
use App\Modules\AI\Models\MedicalKnowledgeDocument;
use App\Modules\AI\Services\AmbientClinicalScribeService;
use App\Modules\AI\Services\ClinicalAiEngineService;
use App\Modules\AI\Services\ClinicalDischargeSynthesizerService;
use App\Modules\AI\Services\MedicalRagRetrieverService;
use App\Modules\AI\Services\PhiSanitizerService;
use App\Modules\Auth\Models\User;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Facility\Models\Department;
use App\Modules\Facility\Models\Ward;
use App\Modules\IPD\Models\Admission;
use App\Modules\Nursing\Models\NursingNote;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AiAndClinicalScribeTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Department $department;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apex-ai-hospital',
            'legal_name' => 'ApexCare AI Clinical Scribe System Inc.',
            'trade_name' => 'ApexCare AI Hospital',
            'status' => TenantStatus::Active,
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Main AI Medical Center',
            'code' => 'AI-MTC',
            'is_main' => true,
            'status' => 'ACTIVE',
        ]);

        $this->department = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Internal Medicine & AI Diagnostics',
            'code' => 'MED-AI',
            'is_clinical' => true,
            'status' => 'ACTIVE',
        ]);

        $this->doctorUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'name' => 'Dr. Robert Chase',
            'email' => 'dr.chase@apexcare.org',
            'user_type' => UserType::Doctor,
            'status' => UserStatus::Active,
            'password' => Hash::make('HospitalSecret2026!'),
        ]);

        $this->doctor = Doctor::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'department_id' => $this->department->id,
            'qualification' => 'MBBS, MD (Internal Medicine)',
            'specialization' => 'Internal Medicine & Critical Diagnostics',
            'license_number' => 'MD-AI-9021',
            'consultation_fee' => 120.00,
            'status' => 'ACTIVE',
        ]);

        $this->patient = Patient::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'first_name' => 'Alexander',
            'last_name' => 'Fleming',
            'mrn' => 'MRN-2026-7788',
            'gender' => Gender::Male,
            'dob' => '1980-04-15',
            'blood_group' => BloodGroup::APositive,
            'status' => PatientStatus::Active,
            'phone' => '+15559876543',
        ]);

        app(TenantContext::class)->setTenant($this->tenant);
    }

    /**
     * 1. PHI / PII sanitization and reversible de-identification.
     */
    public function test_phi_sanitizer_redacts_and_rehydrates_patient_information(): void
    {
        $sanitizer = app(PhiSanitizerService::class);

        $rawText = 'Patient Alexander Fleming (MRN: MRN-2026-7788) can be reached at +15559876543 or alexander@fleminglabs.com. SSN: 123-45-6789. Reported severe cephalalgia.';

        $result = $sanitizer->sanitize($rawText, $this->patient);

        $sanitized = $result['sanitized_text'];
        $this->assertStringNotContainsString('Alexander', $sanitized);
        $this->assertStringNotContainsString('Fleming', $sanitized);
        $this->assertStringNotContainsString('+15559876543', $sanitized);
        $this->assertStringNotContainsString('alexander@fleminglabs.com', $sanitized);
        $this->assertStringNotContainsString('123-45-6789', $sanitized);

        $this->assertStringContainsString('[PATIENT_FIRST_NAME]', $sanitized);
        $this->assertStringContainsString('[PATIENT_LAST_NAME]', $sanitized);
        $this->assertStringContainsString('[PATIENT_PHONE]', $sanitized);

        // Rehydration
        $restored = $sanitizer->rehydrate($sanitized, $result['redaction_map']);
        $this->assertEquals($rawText, $restored);
    }

    /**
     * 2. Clinical AI Engine SOAP note structuring and ICD-10 tagging.
     */
    public function test_clinical_ai_engine_structures_soap_note_and_tags_icd10(): void
    {
        $engine = app(ClinicalAiEngineService::class);

        $dictation = 'Patient presents for follow-up of elevated blood pressure and throbbing occipital headaches. Examination reveals blood pressure 168/104 mmHg, regular pulse 80 bpm. Impression is essential primary hypertension. Plan: start Lisinopril 10mg once daily.';

        $soap = $engine->generateSoapNote($dictation);

        $this->assertArrayHasKey('subjective', $soap);
        $this->assertArrayHasKey('objective', $soap);
        $this->assertArrayHasKey('assessment', $soap);
        $this->assertArrayHasKey('plan', $soap);

        // Assert tagged ICD-10 contains I10
        $codes = array_column($soap['icd10_codes'], 'code');
        $this->assertContains('I10', $codes);

        // Assert prescription extraction
        $meds = array_column($soap['prescription_suggestions'], 'medicine_name');
        $this->assertContains('Lisinopril', $meds);
    }

    /**
     * 3. Ambient Clinical Scribe session lifecycle and EHR chart commit.
     */
    public function test_ambient_clinical_scribe_session_lifecycle_and_chart_commit(): void
    {
        $scribeService = app(AmbientClinicalScribeService::class);

        // Create an active OPD Visit
        $visit = OpdVisit::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctor->id,
            'visit_number' => 'OPD-2026-9001',
            'chief_complaint' => 'Acute cough and fever',
            'status' => VisitStatus::InProgress,
            'arrived_at' => now(),
        ]);

        // Start session
        $session = $scribeService->startSession(
            tenantId: $this->tenant->id,
            doctorId: $this->doctor->id,
            patientId: $this->patient->id,
            opdVisitId: $visit->id
        );

        $this->assertInstanceOf(AiScribeSession::class, $session);
        $this->assertStringStartsWith('SCRIBE-', $session->session_number);
        $this->assertEquals('RECORDING', $session->status);

        // Process transcript
        $rawDictation = 'Patient Alexander Fleming presents with acute cough, wheezing and fever. Impression: acute bronchitis. Plan: Amoxicillin 500mg TDS for 7 days.';
        $updatedSession = $scribeService->processTranscript($session, $rawDictation, 65);

        $this->assertEquals('GENERATED', $updatedSession->status);
        $this->assertNotNull($updatedSession->structured_soap);
        $this->assertEquals(65, $updatedSession->audio_duration_seconds);

        // Commit to EHR clinical record
        $commitResult = $scribeService->commitToClinicalRecord($updatedSession);
        $this->assertEquals('COMMITTED', $commitResult['status']);

        // Assert OPD Visit updated
        $visit->refresh();
        $codes = array_column($visit->diagnoses ?? [], 'code');
        $this->assertContains('J20.9', $codes);
        $this->assertStringContainsString('AI SCRIBE STRUCTURED SOAP', $visit->clinical_notes);
        $this->assertNotNull($updatedSession->fresh()->committed_at);
    }

    /**
     * 4. Medical Domain RAG indexing and semantic retrieval.
     */
    public function test_medical_domain_rag_indexing_and_semantic_retrieval(): void
    {
        $ragService = app(MedicalRagRetrieverService::class);

        // Index guideline
        $doc = $ragService->indexDocument($this->tenant->id, [
            'title' => 'Community Acquired Pneumonia Empirical Antibiotic Protocol',
            'category' => 'CLINICAL_GUIDELINE',
            'content' => 'For outpatient community acquired pneumonia in adults without comorbidities: Amoxicillin 500mg TDS is first line therapy. For penicillin allergic patients, Azithromycin 500mg daily is recommended.',
            'tags' => ['pneumonia', 'antibiotics', 'amoxicillin'],
            'source_reference' => 'Infectious Diseases Society of America (IDSA) Guidelines',
        ]);

        $this->assertInstanceOf(MedicalKnowledgeDocument::class, $doc);

        // Query RAG search
        $results = $ragService->search($this->tenant->id, 'pneumonia antibiotic amoxicillin');
        $this->assertNotEmpty($results);
        $this->assertEquals($doc->id, $results[0]['document']->id);
        $this->assertGreaterThan(0, $results[0]['relevance_score']);

        // Context block retrieval for prompt
        $context = $ragService->retrieveContextForPrompt($this->tenant->id, 'pneumonia antibiotic');
        $this->assertStringContainsString('Community Acquired Pneumonia', $context);
        $this->assertStringContainsString('IDSA', $context);
    }

    /**
     * 5. Drug-drug interaction evaluator flags contraindications.
     */
    public function test_drug_drug_interaction_checker_flags_contraindications(): void
    {
        $ragService = app(MedicalRagRetrieverService::class);

        // Index drug contraindication
        $ragService->indexDocument($this->tenant->id, [
            'title' => 'High Bleeding Risk: Warfarin and Aspirin Co-administration',
            'category' => 'DRUG_CONTRAINDICATION',
            'content' => 'Co-administration of anticoagulant warfarin with antiplatelet aspirin significantly elevates major gastrointestinal bleeding and hemorrhagic stroke risk. Requires strict INR monitoring and gastroprotective PPI co-prescription.',
            'source_reference' => 'Clinical Pharmacology & Therapeutics 2026',
        ]);

        // Evaluate interaction
        $interaction = $ragService->checkDrugInteractions($this->tenant->id, ['Warfarin', 'Aspirin']);
        $this->assertTrue($interaction['has_interaction']);
        $this->assertNotEmpty($interaction['alerts']);
        $this->assertEquals('HIGH_RISK', $interaction['alerts'][0]['severity']);

        // Evaluate safe medications
        $safeCheck = $ragService->checkDrugInteractions($this->tenant->id, ['Paracetamol', 'Pantoprazole']);
        $this->assertFalse($safeCheck['has_interaction']);
    }

    /**
     * 6. Automated clinical discharge summary synthesis and physician sign-off.
     */
    public function test_clinical_discharge_summary_synthesis_and_physician_approval(): void
    {
        $synthesizer = app(ClinicalDischargeSynthesizerService::class);

        // Setup Admission
        $ward = Ward::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'code' => 'WARD-IM-01',
            'name' => 'Internal Medicine Ward',
            'gender' => 'MIXED',
            'total_beds' => 10,
        ]);

        $admission = Admission::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'patient_id' => $this->patient->id,
            'attending_doctor_id' => $this->doctor->id,
            'admitting_department_id' => $this->department->id,
            'ipd_number' => 'IPD-2026-8001',
            'admission_type' => AdmissionType::Elective,
            'admitted_at' => now()->subDays(4),
            'admitting_diagnosis' => 'Community acquired pneumonia with pleuritic chest discomfort',
            'initial_deposit' => 500.00,
            'status' => AdmissionStatus::Admitted,
        ]);

        // Add nursing notes with vitals
        NursingNote::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'admission_id' => $admission->id,
            'nurse_user_id' => $this->doctorUser->id,
            'notes' => 'Patient afebrile, respiratory status stable on room air.',
            'vitals' => [
                'blood_pressure' => '122/78 mmHg',
                'pulse_rate' => '72 bpm',
                'spo2' => '99%',
                'temperature' => '36.7 C',
            ],
        ]);

        // Synthesize discharge summary
        $summary = $synthesizer->synthesizeForAdmission($admission);

        $this->assertInstanceOf(ClinicalSummary::class, $summary);
        $this->assertStringStartsWith('SUMM-', $summary->summary_number);
        $this->assertEquals('DRAFT', $summary->status);
        $this->assertStringContainsString('Community acquired pneumonia', $summary->chief_complaint);
        $this->assertStringContainsString('122/78 mmHg', $summary->hospital_course);

        // Physician approval
        $approved = $synthesizer->approveSummary($summary, $this->doctor, [
            'follow_up_instructions' => 'Follow up in Pulmonary OPD in 2 weeks with repeat chest X-ray.',
        ]);

        $this->assertEquals('PHYSICIAN_APPROVED', $approved->status);
        $this->assertEquals($this->doctor->id, $approved->doctor_id);
        $this->assertNotNull($approved->approved_at);
        $this->assertStringContainsString('Pulmonary OPD', $approved->follow_up_instructions);
    }

    /**
     * 7. Web routes and controllers render AI workstations.
     */
    public function test_web_routes_render_ai_workstations(): void
    {
        // 1. Scribe Workstation
        $response = $this->actingAs($this->doctorUser)->get('/ai/scribe');
        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('AI/ScribeWorkstation')
            ->has('recentSessions')
            ->has('doctors')
            ->has('patients')
            ->has('stats')
        );

        // 2. Knowledge Base
        $kbResponse = $this->actingAs($this->doctorUser)->get('/ai/knowledge-base');
        $kbResponse->assertStatus(200);
        $kbResponse->assertInertia(fn (Assert $page) => $page
            ->component('AI/KnowledgeBase')
            ->has('documents')
            ->has('categories')
            ->has('stats')
        );

        // 3. Discharge Summaries
        $summResponse = $this->actingAs($this->doctorUser)->get('/ai/discharge-summaries');
        $summResponse->assertStatus(200);
        $summResponse->assertInertia(fn (Assert $page) => $page
            ->component('AI/DischargeSynthesizer')
            ->has('summaries')
            ->has('activeAdmissions')
            ->has('stats')
        );

        // 4. Start Scribe Session POST
        $postSess = $this->actingAs($this->doctorUser)->post('/ai/scribe/sessions', [
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
        ]);
        $postSess->assertRedirect();
        $this->assertDatabaseHas('ai_scribe_sessions', [
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'patient_id' => $this->patient->id,
        ]);

        // 5. Index Knowledge Base Document POST
        $postKb = $this->actingAs($this->doctorUser)->post('/ai/knowledge-base', [
            'title' => 'Sepsis Resuscitation Hour-1 Protocol',
            'category' => 'TRIAGE_PROTOCOL',
            'content' => 'Measure blood lactate, obtain blood cultures, administer broad-spectrum antibiotics and 30mL/kg crystalloid.',
        ]);
        $postKb->assertRedirect();
        $this->assertDatabaseHas('medical_knowledge_documents', [
            'tenant_id' => $this->tenant->id,
            'title' => 'Sepsis Resuscitation Hour-1 Protocol',
        ]);

        // 6. Search API POST
        $searchRes = $this->actingAs($this->doctorUser)->postJson('/ai/knowledge-base/search', [
            'query' => 'lactate crystalloid sepsis',
        ]);
        $searchRes->assertStatus(200);
        $searchRes->assertJsonStructure(['query', 'results']);

        // 7. Check Interactions API POST
        $interactRes = $this->actingAs($this->doctorUser)->postJson('/ai/knowledge-base/check-interactions', [
            'medications' => ['Warfarin', 'Aspirin'],
        ]);
        $interactRes->assertStatus(200);
        $interactRes->assertJsonStructure(['has_interaction', 'alerts']);
    }
}
