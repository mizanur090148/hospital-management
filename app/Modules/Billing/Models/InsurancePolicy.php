<?php

namespace App\Modules\Billing\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InsurancePolicy extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'insurance_policies';

    protected $fillable = [
        'tenant_id',
        'patient_id',
        'insurance_provider_id',
        'policy_number',
        'group_number',
        'coverage_percentage',
        'copay_amount',
        'annual_limit',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'coverage_percentage' => 'decimal:2',
        'copay_amount' => 'decimal:2',
        'annual_limit' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class, 'insurance_provider_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'insurance_policy_id');
    }

    public function claims(): HasMany
    {
        return $this->hasMany(InsuranceClaim::class, 'insurance_policy_id');
    }

    public function isValidNow(): bool
    {
        $today = now()->toDateString();

        return $this->is_active && $this->start_date <= $today && $this->end_date >= $today;
    }
}
