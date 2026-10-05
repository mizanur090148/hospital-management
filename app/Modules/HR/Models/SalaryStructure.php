<?php

namespace App\Modules\HR\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalaryStructure extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'salary_structures';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'currency',
        'base_salary',
        'housing_allowance',
        'transport_allowance',
        'medical_allowance',
        'special_allowance',
        'tax_deduction_percent',
        'provident_fund_deduction',
        'insurance_deduction',
        'payment_method',
        'bank_name',
        'bank_account_number',
        'effective_from',
        'is_active',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'housing_allowance' => 'decimal:2',
        'transport_allowance' => 'decimal:2',
        'medical_allowance' => 'decimal:2',
        'special_allowance' => 'decimal:2',
        'tax_deduction_percent' => 'decimal:2',
        'provident_fund_deduction' => 'decimal:2',
        'insurance_deduction' => 'decimal:2',
        'effective_from' => 'date:Y-m-d',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'gross_salary',
        'total_allowances',
        'total_deductions',
        'estimated_net_salary',
    ];

    protected static function booted(): void
    {
        static::creating(function (SalaryStructure $model) {
            if (empty($model->effective_from)) {
                $model->effective_from = now()->startOfMonth()->toDateString();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function getTotalAllowancesAttribute(): float
    {
        return (float) ($this->housing_allowance + $this->transport_allowance + $this->medical_allowance + $this->special_allowance);
    }

    public function getHazardAllowanceAttribute(): float
    {
        return (float) $this->special_allowance;
    }

    public function setHazardAllowanceAttribute($value): void
    {
        $this->attributes['special_allowance'] = $value;
    }

    public function getGrossSalaryAttribute(): float
    {
        return (float) ($this->base_salary + $this->total_allowances);
    }

    public function getTotalDeductionsAttribute(): float
    {
        $tax = ($this->gross_salary * $this->tax_deduction_percent) / 100;

        return (float) ($tax + $this->provident_fund_deduction + $this->insurance_deduction);
    }

    public function getEstimatedNetSalaryAttribute(): float
    {
        return max(0.00, (float) ($this->gross_salary - $this->total_deductions));
    }
}
