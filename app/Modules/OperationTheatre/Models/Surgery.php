<?php

namespace App\Modules\OperationTheatre\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\AnesthesiaType;
use App\Core\Enums\SurgeryStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Surgery extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'surgeries';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'surgery_number',
        'patient_id',
        'primary_surgeon_id',
        'anesthesiologist_id',
        'operation_theatre_id',
        'procedure_name',
        'anesthesia_type',
        'scheduled_date',
        'scheduled_start_time',
        'scheduled_end_time',
        'actual_start_at',
        'actual_end_at',
        'pre_op_diagnosis',
        'post_op_diagnosis',
        'surgical_notes',
        'safety_checklist',
        'status',
    ];

    protected $casts = [
        'anesthesia_type' => AnesthesiaType::class,
        'status' => SurgeryStatus::class,
        'scheduled_date' => 'date',
        'actual_start_at' => 'datetime',
        'actual_end_at' => 'datetime',
        'safety_checklist' => 'array',
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

    public function primarySurgeon(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'primary_surgeon_id');
    }

    public function anesthesiologist(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'anesthesiologist_id');
    }

    public function operationTheatre(): BelongsTo
    {
        return $this->belongsTo(OperationTheatre::class, 'operation_theatre_id');
    }
}
