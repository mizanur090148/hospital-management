<?php

namespace App\Modules\Appointment\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\AppointmentType;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'appointments';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'doctor_id',
        'patient_id',
        'appointment_number',
        'appointment_date',
        'start_time',
        'end_time',
        'type',
        'status',
        'reason_for_visit',
        'consultation_fee',
        'notes',
    ];

    protected $casts = [
        'appointment_date' => 'date:Y-m-d',
        'type' => AppointmentType::class,
        'status' => AppointmentStatus::class,
        'consultation_fee' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function opdVisit(): HasOne
    {
        return $this->hasOne(OpdVisit::class, 'appointment_id');
    }
}
