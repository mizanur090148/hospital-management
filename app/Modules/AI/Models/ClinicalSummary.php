<?php

namespace App\Modules\AI\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\IPD\Models\Admission;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalSummary extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids;

    protected $table = 'clinical_summaries';

    protected $fillable = [
        'tenant_id',
        'patient_id',
        'admission_id',
        'doctor_id',
        'summary_number',
        'summary_type',
        'chief_complaint',
        'hospital_course',
        'diagnostic_summary',
        'medication_plan',
        'follow_up_instructions',
        'full_content',
        'status',
        'approved_at',
        'metadata',
    ];

    protected $casts = [
        'full_content' => 'array',
        'metadata' => 'array',
        'approved_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class, 'admission_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }
}
