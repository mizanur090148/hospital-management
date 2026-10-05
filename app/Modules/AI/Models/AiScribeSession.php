<?php

namespace App\Modules\AI\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\IPD\Models\Admission;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiScribeSession extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids;

    protected $table = 'ai_scribe_sessions';

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'patient_id',
        'opd_visit_id',
        'admission_id',
        'session_number',
        'status',
        'raw_transcript',
        'sanitized_transcript',
        'structured_soap',
        'audio_duration_seconds',
        'model_used',
        'tokens_used',
        'committed_at',
        'metadata',
    ];

    protected $casts = [
        'structured_soap' => 'array',
        'metadata' => 'array',
        'audio_duration_seconds' => 'integer',
        'tokens_used' => 'integer',
        'committed_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function opdVisit(): BelongsTo
    {
        return $this->belongsTo(OpdVisit::class, 'opd_visit_id');
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class, 'admission_id');
    }
}
