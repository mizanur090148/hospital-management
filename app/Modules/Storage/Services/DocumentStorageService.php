<?php

namespace App\Modules\Storage\Services;

use App\Core\Enums\AuditAction;
use App\Core\Sequences\SequenceGenerator;
use App\Modules\Audit\Services\AuditImmutabilityService;
use App\Modules\Storage\Models\ClinicalDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentStorageService
{
    public function __construct(
        protected SequenceGenerator $sequenceGenerator,
        protected AuditImmutabilityService $auditImmutabilityService
    ) {}

    /**
     * Securely store a clinical document with SHA-256 checksum and audit record.
     */
    public function storeDocument(array $data, UploadedFile|string $file): ClinicalDocument
    {
        $tenantId = $data['tenant_id'];
        $disk = $data['storage_disk'] ?? config('filesystems.default', 'local');

        if ($file instanceof UploadedFile) {
            $fileName = $data['file_name'] ?? $file->getClientOriginalName();
            $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
            $fileContent = $file->get();
            $fileSizeBytes = $file->getSize();
        } else {
            $fileName = $data['file_name'] ?? 'document.bin';
            $mimeType = $data['mime_type'] ?? 'application/octet-stream';
            $fileContent = $file;
            $fileSizeBytes = strlen($fileContent);
        }

        $checksum = hash('sha256', $fileContent);
        $documentNumber = $this->sequenceGenerator->generateDocumentNumber($tenantId);

        $safeExtension = pathinfo($fileName, PATHINFO_EXTENSION);
        $storedFileName = (string) Str::uuid().($safeExtension ? '.'.$safeExtension : '');
        $storagePath = "clinical_documents/{$tenantId}/".date('Y/m')."/{$storedFileName}";

        Storage::disk($disk)->put($storagePath, $fileContent);

        $document = ClinicalDocument::create([
            'tenant_id' => $tenantId,
            'patient_id' => $data['patient_id'] ?? null,
            'uploaded_by_user_id' => $data['uploaded_by_user_id'] ?? null,
            'document_number' => $documentNumber,
            'title' => $data['title'],
            'category' => $data['category'],
            'file_path' => $storagePath,
            'file_name' => $fileName,
            'mime_type' => $mimeType,
            'file_size_bytes' => $fileSizeBytes,
            'storage_disk' => $disk,
            'checksum_sha256' => $checksum,
            'is_confidential' => $data['is_confidential'] ?? true,
            'metadata' => $data['metadata'] ?? [],
        ]);

        // Record immutable audit trail
        $this->auditImmutabilityService->recordHashChainedLog([
            'tenant_id' => $tenantId,
            'user_id' => $data['uploaded_by_user_id'] ?? null,
            'action' => AuditAction::Create,
            'entity_type' => ClinicalDocument::class,
            'entity_id' => $document->id,
            'old_values' => null,
            'new_values' => [
                'document_number' => $documentNumber,
                'title' => $data['title'],
                'category' => $data['category'],
                'file_name' => $fileName,
                'checksum_sha256' => $checksum,
                'file_size_bytes' => $fileSizeBytes,
            ],
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);

        return $document;
    }

    /**
     * Generate a cryptographically signed temporary URL for secure document access.
     */
    public function generateTemporaryUrl(ClinicalDocument $document, int $expirationMinutes = 15): string
    {
        return URL::temporarySignedRoute(
            'documents.secure-download',
            now()->addMinutes($expirationMinutes),
            [
                'document' => $document->id,
                'tenant_id' => $document->tenant_id,
            ]
        );
    }

    /**
     * Download or stream a clinical document and log compliance access.
     */
    public function downloadDocument(
        ClinicalDocument $document,
        ?string $userId = null,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): StreamedResponse {
        $disk = $document->storage_disk;

        if (! Storage::disk($disk)->exists($document->file_path)) {
            abort(404, 'Clinical document file not found on storage disk.');
        }

        // Log HIPAA / GDPR compliant document view audit entry
        $this->auditImmutabilityService->recordHashChainedLog([
            'tenant_id' => $document->tenant_id,
            'user_id' => $userId,
            'action' => AuditAction::View,
            'entity_type' => ClinicalDocument::class,
            'entity_id' => $document->id,
            'old_values' => null,
            'new_values' => [
                'access_type' => 'SECURE_DOWNLOAD',
                'document_number' => $document->document_number,
                'checksum_sha256' => $document->checksum_sha256,
            ],
            'ip_address' => $ipAddress ?? Request::ip(),
            'user_agent' => $userAgent ?? Request::userAgent(),
        ]);

        return Storage::disk($disk)->download(
            $document->file_path,
            $document->file_name,
            [
                'Content-Type' => $document->mime_type,
                'X-Document-Checksum' => $document->checksum_sha256,
                'X-Document-Number' => $document->document_number,
            ]
        );
    }

    /**
     * Verify the cryptographic checksum of the stored file to detect disk tampering or corruption.
     */
    public function verifyChecksum(ClinicalDocument $document): bool
    {
        $disk = $document->storage_disk;

        if (! Storage::disk($disk)->exists($document->file_path)) {
            return false;
        }

        $content = Storage::disk($disk)->get($document->file_path);
        $actualChecksum = hash('sha256', $content);

        return hash_equals($document->checksum_sha256, $actualChecksum);
    }
}
