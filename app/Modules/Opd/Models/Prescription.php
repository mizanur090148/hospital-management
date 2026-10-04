<?php

namespace App\Modules\Opd\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\PrescriptionStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Prescription extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'prescriptions';

    protected $fillable = [
        'tenant_id',
        'patient_id',
        'doctor_id',
        'opd_visit_id',
        'prescription_number',
        'advice',
        'follow_up_date',
        'status',
    ];

    protected $casts = [
        'follow_up_date' => 'date:Y-m-d',
        'status' => PrescriptionStatus::class,
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function opdVisit(): BelongsTo
    {
        return $this->belongsTo(OpdVisit::class, 'opd_visit_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PrescriptionItem::class, 'prescription_id');
    }
}
