<?php

namespace App\Modules\AI\Http\Controllers;

use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\AI\Models\MedicalKnowledgeDocument;
use App\Modules\AI\Services\MedicalRagRetrieverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MedicalRagController extends Controller
{
    public function __construct(
        protected MedicalRagRetrieverService $ragService
    ) {}

    /**
     * Display the Medical Domain RAG & Clinical Knowledge Base Workstation.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $query = MedicalKnowledgeDocument::where('tenant_id', $tenantId);

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%");
            });
        }

        $documents = $query->latest()->paginate(15)->withQueryString();

        $categories = [
            'CLINICAL_GUIDELINE',
            'DRUG_CONTRAINDICATION',
            'HOSPITAL_POLICY',
            'TRIAGE_PROTOCOL',
            'ANTIBIOTIC_STEWARDSHIP',
        ];

        $totalDocs = MedicalKnowledgeDocument::where('tenant_id', $tenantId)->count();
        $drugInteractionsCount = MedicalKnowledgeDocument::where('tenant_id', $tenantId)
            ->where('category', 'DRUG_CONTRAINDICATION')
            ->count();

        return Inertia::render('AI/KnowledgeBase', [
            'documents' => $documents,
            'categories' => $categories,
            'stats' => [
                'total_documents' => $totalDocs,
                'drug_contraindications' => $drugInteractionsCount,
                'active_retrieval_status' => 'ONLINE (RAG Index Ready)',
            ],
            'filters' => $request->only(['category', 'search']),
        ]);
    }

    /**
     * Index a new clinical guideline or medical policy document.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:64',
            'content' => 'required|string',
            'summary' => 'nullable|string',
            'tags' => 'nullable|array',
            'source_reference' => 'nullable|string|max:255',
        ]);

        $this->ragService->indexDocument($tenantId, $validated);

        return back()->with('success', 'Medical knowledge document indexed successfully.');
    }

    /**
     * API search endpoint for live RAG query testing.
     */
    public function search(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'query' => 'required|string|min:2',
            'category' => 'nullable|string',
        ]);

        $results = $this->ragService->search(
            tenantId: $tenantId,
            query: $validated['query'],
            category: $validated['category'] ?? null,
            limit: 5
        );

        return response()->json([
            'query' => $validated['query'],
            'results' => $results,
        ]);
    }

    /**
     * Live drug-drug interaction checker.
     */
    public function checkInteractions(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'medications' => 'required|array|min:1',
            'medications.*' => 'string',
        ]);

        $result = $this->ragService->checkDrugInteractions(
            tenantId: $tenantId,
            medicationNames: $validated['medications']
        );

        return response()->json($result);
    }
}
