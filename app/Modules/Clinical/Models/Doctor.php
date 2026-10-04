<?php

namespace App\Modules\Clinical\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\DoctorStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Department;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Doctor extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'doctors';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'department_id',
        'license_number',
        'qualification',
        'specialization',
        'consultation_fee',
        'follow_up_fee',
        'emergency_fee',
        'bio',
        'is_available_for_teleconsult',
        'status',
    ];

    protected $casts = [
        'consultation_fee' => 'decimal:2',
        'follow_up_fee' => 'decimal:2',
        'emergency_fee' => 'decimal:2',
        'is_available_for_teleconsult' => 'boolean',
        'status' => DoctorStatus::class,
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(DoctorSchedule::class, 'doctor_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'doctor_id');
    }

    public function opdVisits(): HasMany
    {
        return $this->hasMany(OpdVisit::class, 'doctor_id');
    }
}
