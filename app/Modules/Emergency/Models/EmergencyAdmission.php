<?php

namespace App\Modules\Emergency\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\EmergencyStatus;
use App\Core\Enums\TriageLevel;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmergencyAdmission extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'emergency_admissions';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'patient_id',
        'anonymous_patient_name',
        'er_number',
        'triage_level',
        'chief_complaint',
        'arrival_mode',
        'trauma_type',
        'vitals',
        'triage_notes',
        'assigned_doctor_id',
        'status',
        'admitted_at',
        'discharged_at',
    ];

    protected $casts = [
        'triage_level' => TriageLevel::class,
        'status' => EmergencyStatus::class,
        'vitals' => 'array',
        'admitted_at' => 'datetime',
        'discharged_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function assignedDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'assigned_doctor_id');
    }

    public function getDisplayNameAttribute(): string
    {
        if ($this->patient) {
            return $this->patient->full_name;
        }

        return $this->anonymous_patient_name ?: 'Unknown Emergency Patient';
    }
}
