<?php

namespace App\Modules\Opd\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\VisitStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class OpdVisit extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'opd_visits';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'patient_id',
        'doctor_id',
        'appointment_id',
        'visit_number',
        'chief_complaint',
        'history_of_present_illness',
        'physical_examination',
        'clinical_notes',
        'vitals',
        'diagnoses',
        'status',
        'arrived_at',
        'completed_at',
    ];

    protected $casts = [
        'vitals' => 'array',
        'diagnoses' => 'array',
        'status' => VisitStatus::class,
        'arrived_at' => 'datetime',
        'completed_at' => 'datetime',
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

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class, 'opd_visit_id');
    }
}
