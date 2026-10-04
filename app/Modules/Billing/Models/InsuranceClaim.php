<?php

namespace App\Modules\Billing\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\ClaimStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class InsuranceClaim extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'insurance_claims';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'claim_number',
        'invoice_id',
        'insurance_provider_id',
        'insurance_policy_id',
        'patient_id',
        'pre_auth_code',
        'claimed_amount',
        'approved_amount',
        'disallowed_amount',
        'status',
        'submitted_at',
        'adjudicated_at',
        'adjudication_notes',
        'adjudicated_by_user_id',
    ];

    protected $casts = [
        'claimed_amount' => 'decimal:2',
        'approved_amount' => 'decimal:2',
        'disallowed_amount' => 'decimal:2',
        'status' => ClaimStatus::class,
        'submitted_at' => 'datetime',
        'adjudicated_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(InsuranceProvider::class, 'insurance_provider_id');
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(InsurancePolicy::class, 'insurance_policy_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id');
    }

    public function adjudicatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adjudicated_by_user_id');
    }
}
