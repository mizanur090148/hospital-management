<?php

namespace App\Modules\Storage\Jobs;

use App\Modules\Storage\Models\ClinicalDocument;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ProcessDocumentChecksumJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public ClinicalDocument $document
    ) {}

    /**
     * Execute the job: compute SHA-256 hash of stored file and record in clinical document.
     */
    public function handle(): void
    {
        $disk = $this->document->storage_disk ?? config('filesystems.default', 'local');

        if (Storage::disk($disk)->exists($this->document->file_path)) {
            $content = Storage::disk($disk)->get($this->document->file_path);
            $checksum = hash('sha256', $content);

            $this->document->update([
                'checksum_sha256' => $checksum,
                'metadata' => array_merge($this->document->metadata ?? [], [
                    'checksum_verified_at' => now()->toIso8601String(),
                    'checksum_worker' => 'queue_worker',
                ]),
            ]);
        }
    }
}
