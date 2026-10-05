<?php

namespace App\Modules\Patient\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\BloodGroup;
use App\Core\Enums\Gender;
use App\Core\Enums\PatientStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Auth\Models\User;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\IPD\Models\Admission;
use App\Modules\Opd\Models\OpdVisit;
use App\Modules\Opd\Models\Prescription;
use App\Modules\Tenancy\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'patients';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'mrn',
        'first_name',
        'last_name',
        'dob',
        'gender',
        'blood_group',
        'phone',
        'email',
        'national_id',
        'emergency_contact',
        'address',
        'allergies',
        'chronic_conditions',
        'status',
        'portal_activated_at',
    ];

    protected $casts = [
        'dob' => 'date:Y-m-d',
        'portal_activated_at' => 'datetime',
        'gender' => Gender::class,
        'blood_group' => BloodGroup::class,
        'emergency_contact' => 'array',
        'address' => 'array',
        'allergies' => 'array',
        'chronic_conditions' => 'array',
        'status' => PatientStatus::class,
    ];

    protected $appends = [
        'full_name',
        'age',
    ];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function getAgeAttribute(): ?int
    {
        if (! $this->dob) {
            return null;
        }

        return Carbon::parse($this->dob)->age;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    public function opdVisits(): HasMany
    {
        return $this->hasMany(OpdVisit::class, 'patient_id');
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class, 'patient_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'patient_id');
    }

    public function labOrders(): HasMany
    {
        return $this->hasMany(LabOrder::class, 'patient_id');
    }

    public function radiologyOrders(): HasMany
    {
        return $this->hasMany(RadiologyOrder::class, 'patient_id');
    }

    public function admissions(): HasMany
    {
        return $this->hasMany(Admission::class, 'patient_id');
    }
}
