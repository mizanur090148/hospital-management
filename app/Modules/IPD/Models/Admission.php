<?php

namespace App\Modules\IPD\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AdmissionType;
use App\Core\Enums\DischargeDisposition;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Facility\Models\Department;
use App\Modules\Nursing\Models\MedicationAdministration;
use App\Modules\Nursing\Models\NursingNote;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Admission extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'admissions';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'patient_id',
        'attending_doctor_id',
        'admitting_department_id',
        'ipd_number',
        'admission_type',
        'admitting_diagnosis',
        'initial_deposit',
        'admitted_at',
        'discharged_at',
        'discharge_disposition',
        'discharge_summary',
        'status',
    ];

    protected $casts = [
        'admitted_at' => 'datetime',
        'discharged_at' => 'datetime',
        'admission_type' => AdmissionType::class,
        'status' => AdmissionStatus::class,
        'discharge_disposition' => DischargeDisposition::class,
        'initial_deposit' => 'decimal:2',
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

    public function attendingDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'attending_doctor_id');
    }

    public function admittingDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'admitting_department_id');
    }

    public function bedAssignments(): HasMany
    {
        return $this->hasMany(BedAssignment::class, 'admission_id');
    }

    public function currentBedAssignment(): HasOne
    {
        return $this->hasOne(BedAssignment::class, 'admission_id')->where('is_active', true);
    }

    public function nursingNotes(): HasMany
    {
        return $this->hasMany(NursingNote::class, 'admission_id');
    }

    public function medicationAdministrations(): HasMany
    {
        return $this->hasMany(MedicationAdministration::class, 'admission_id');
    }
}
