<?php

namespace App\Modules\Storage\Http\Controllers;

use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Patient\Models\Patient;
use App\Modules\Storage\Models\ClinicalDocument;
use App\Modules\Storage\Services\DocumentStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentStorageController extends Controller
{
    public function __construct(
        protected DocumentStorageService $storageService
    ) {}

    /**
     * Display the Secure Document & Medical Attachment Management Workstation.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $query = ClinicalDocument::where('tenant_id', $tenantId)
            ->with(['patient:id,first_name,last_name,mrn', 'uploadedByUser:id,name,email']);

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('document_number', 'like', "%{$search}%")
                    ->orWhere('file_name', 'like', "%{$search}%");
            });
        }

        $documents = $query->latest()->paginate(15)->withQueryString();

        // Calculate statistics
        $totalDocs = ClinicalDocument::where('tenant_id', $tenantId)->count();
        $totalBytes = (int) ClinicalDocument::where('tenant_id', $tenantId)->sum('file_size_bytes');

        $categories = [
            'LAB_REPORT',
            'RADIOLOGY_SCAN',
            'PATIENT_CONSENT',
            'DISCHARGE_SUMMARY',
            'CLINICAL_NOTE',
            'INSURANCE_CARD',
            'OTHER',
        ];

        $categoryStats = [];
        foreach ($categories as $cat) {
            $categoryStats[$cat] = ClinicalDocument::where('tenant_id', $tenantId)->where('category', $cat)->count();
        }

        $recentPatients = Patient::where('tenant_id', $tenantId)
            ->select('id', 'first_name', 'last_name', 'mrn')
            ->orderBy('first_name')
            ->limit(50)
            ->get();

        return Inertia::render('Documents/Index', [
            'documents' => $documents,
            'stats' => [
                'total_documents' => $totalDocs,
                'total_storage_mb' => round($totalBytes / (1024 * 1024), 2),
                'category_breakdown' => $categoryStats,
            ],
            'patients' => $recentPatients,
            'categories' => $categories,
            'filters' => $request->only(['category', 'search']),
        ]);
    }

    /**
     * Upload and securely store a new clinical document.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'patient_id' => 'nullable|uuid|exists:patients,id',
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:64',
            'file' => 'required|file|max:20480', // Max 20MB
            'is_confidential' => 'boolean',
        ]);

        $uploadedFile = $request->file('file');

        $document = $this->storageService->storeDocument([
            'tenant_id' => $tenantId,
            'patient_id' => $validated['patient_id'] ?? null,
            'uploaded_by_user_id' => $request->user()?->id,
            'title' => $validated['title'],
            'category' => $validated['category'],
            'is_confidential' => $request->boolean('is_confidential', true),
        ], $uploadedFile);

        return back()->with('success', "Document {$document->document_number} stored securely with SHA-256 checksum.");
    }

    /**
     * Audit-logged secure document download.
     */
    public function download(Request $request, ClinicalDocument $document): StreamedResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        if ($document->tenant_id !== $tenantId) {
            abort(403, 'Unauthorized access to document outside tenant boundary.');
        }

        return $this->storageService->downloadDocument(
            document: $document,
            userId: $request->user()?->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent()
        );
    }

    /**
     * Generate temporary signed presigned URL for document access.
     */
    public function temporaryUrl(Request $request, ClinicalDocument $document): JsonResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        if ($document->tenant_id !== $tenantId) {
            abort(403, 'Unauthorized access to document outside tenant boundary.');
        }

        $url = $this->storageService->generateTemporaryUrl($document, 15);

        return response()->json([
            'document_id' => $document->id,
            'document_number' => $document->document_number,
            'temporary_url' => $url,
            'expires_in_minutes' => 15,
        ]);
    }

    /**
     * Cryptographically verify checksum of stored file.
     */
    public function verifyChecksum(Request $request, ClinicalDocument $document): JsonResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        if ($document->tenant_id !== $tenantId) {
            abort(403, 'Unauthorized access to document outside tenant boundary.');
        }

        $isValid = $this->storageService->verifyChecksum($document);

        return response()->json([
            'document_number' => $document->document_number,
            'stored_checksum' => $document->checksum_sha256,
            'is_valid' => $isValid,
            'message' => $isValid
                ? 'SHA-256 Checksum verified. Document file is authentic and unaltered.'
                : 'CRITICAL: File checksum mismatch! Possible file corruption or tampering.',
        ]);
    }
}
