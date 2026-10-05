<?php

namespace App\Modules\AI\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalKnowledgeDocument extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids;

    protected $table = 'medical_knowledge_documents';

    protected $fillable = [
        'tenant_id',
        'title',
        'category',
        'summary',
        'content',
        'tags',
        'source_reference',
        'version',
        'is_active',
        'metadata',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_active' => 'boolean',
        'metadata' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
