<?php

namespace App\Modules\AI\Services;

use App\Modules\AI\Models\MedicalKnowledgeDocument;

class MedicalRagRetrieverService
{
    /**
     * Index a new clinical guideline or medical policy document into the domain knowledge base.
     */
    public function indexDocument(string $tenantId, array $data): MedicalKnowledgeDocument
    {
        return MedicalKnowledgeDocument::create([
            'tenant_id' => $tenantId,
            'title' => $data['title'],
            'category' => $data['category'] ?? 'CLINICAL_GUIDELINE',
            'summary' => $data['summary'] ?? substr(strip_tags($data['content']), 0, 250),
            'content' => $data['content'],
            'tags' => $data['tags'] ?? [],
            'source_reference' => $data['source_reference'] ?? 'Hospital Clinical Committee',
            'version' => $data['version'] ?? '1.0',
            'is_active' => $data['is_active'] ?? true,
            'metadata' => $data['metadata'] ?? [],
        ]);
    }

    /**
     * Search relevant medical knowledge documents using domain keyword matching and relevance scoring.
     */
    public function search(string $tenantId, string $query, ?string $category = null, int $limit = 5): array
    {
        $words = array_filter(explode(' ', strtolower(trim($query))), fn ($w) => strlen($w) > 2);

        $dbQuery = MedicalKnowledgeDocument::where('tenant_id', $tenantId)
            ->where('is_active', true);

        if ($category) {
            $dbQuery->where('category', $category);
        }

        $docs = $dbQuery->get();
        if ($docs->isEmpty()) {
            return [];
        }

        $scored = [];
        foreach ($docs as $doc) {
            $score = 0;
            $haystack = strtolower($doc->title.' '.$doc->content.' '.implode(' ', $doc->tags ?? []));

            foreach ($words as $word) {
                if (str_contains(strtolower($doc->title), $word)) {
                    $score += 15; // Higher weight for title match
                }
                if (! empty($doc->tags)) {
                    foreach ($doc->tags as $tag) {
                        if (str_contains(strtolower($tag), $word)) {
                            $score += 10;
                        }
                    }
                }
                $matches = substr_count($haystack, $word);
                $score += min($matches * 2, 20);
            }

            if ($score > 0) {
                $scored[] = [
                    'document' => $doc,
                    'relevance_score' => $score,
                    'snippet' => substr(strip_tags($doc->content), 0, 300).'...',
                ];
            }
        }

        usort($scored, fn ($a, $b) => $b['relevance_score'] <=> $a['relevance_score']);

        return array_slice($scored, 0, $limit);
    }

    /**
     * Check for dangerous drug-drug interactions between prescribed medications.
     */
    public function checkDrugInteractions(string $tenantId, array $medicationNames): array
    {
        if (count($medicationNames) < 2) {
            return [
                'has_interaction' => false,
                'alerts' => [],
            ];
        }

        $alerts = [];
        $interactionDocs = MedicalKnowledgeDocument::where('tenant_id', $tenantId)
            ->where('category', 'DRUG_CONTRAINDICATION')
            ->where('is_active', true)
            ->get();

        $medLower = array_map('strtolower', $medicationNames);

        foreach ($interactionDocs as $doc) {
            $contentLower = strtolower($doc->content);
            $matchedMeds = [];

            foreach ($medLower as $m) {
                if (str_contains($contentLower, $m)) {
                    $matchedMeds[] = ucfirst($m);
                }
            }

            if (count($matchedMeds) >= 2) {
                $alerts[] = [
                    'severity' => 'HIGH_RISK',
                    'medications' => $matchedMeds,
                    'title' => $doc->title,
                    'guideline_snippet' => substr($doc->content, 0, 250).'...',
                    'source' => $doc->source_reference,
                ];
            }
        }

        return [
            'has_interaction' => ! empty($alerts),
            'alerts' => $alerts,
        ];
    }

    /**
     * Retrieve high-density clinical guideline context to augment LLM clinical prompt generation.
     */
    public function retrieveContextForPrompt(string $tenantId, string $query): string
    {
        $results = $this->search($tenantId, $query, null, 2);
        if (empty($results)) {
            return '';
        }

        $contextBlocks = [];
        foreach ($results as $res) {
            $doc = $res['document'];
            $contextBlocks[] = "[GUIDELINE: {$doc->title} (Ref: {$doc->source_reference})]: {$res['snippet']}";
        }

        return implode("\n\n", $contextBlocks);
    }
}
