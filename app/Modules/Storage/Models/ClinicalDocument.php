<?php

namespace App\Modules\Storage\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClinicalDocument extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'clinical_documents';

    protected $fillable = [
        'tenant_id',
        'patient_id',
        'uploaded_by_user_id',
        'document_number',
        'title',
        'category',
        'file_path',
        'file_name',
        'mime_type',
        'file_size_bytes',
        'storage_disk',
        'checksum_sha256',
        'is_confidential',
        'metadata',
    ];

    protected $casts = [
        'file_size_bytes' => 'integer',
        'is_confidential' => 'boolean',
        'metadata' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function uploadedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
