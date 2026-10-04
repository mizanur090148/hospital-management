<?php

namespace App\Modules\Diagnostics\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\DiagnosticPriority;
use App\Core\Enums\RadiologyOrderStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class RadiologyOrder extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'radiology_orders';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'order_number',
        'patient_id',
        'ordering_doctor_id',
        'template_id',
        'priority',
        'clinical_indication',
        'findings',
        'impression',
        'radiologist_notes',
        'dicom_study_uid',
        'dicom_preview_url',
        'reporting_doctor_id',
        'verified_at',
        'status',
        'ordered_at',
    ];

    protected $casts = [
        'priority' => DiagnosticPriority::class,
        'status' => RadiologyOrderStatus::class,
        'ordered_at' => 'datetime',
        'verified_at' => 'datetime',
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

    public function orderingDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'ordering_doctor_id');
    }

    public function reportingDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'reporting_doctor_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(RadiologyTemplate::class, 'template_id');
    }
}
