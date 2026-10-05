<?php

namespace App\Modules\HR\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\PayrollStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Auth\Models\User;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payroll extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'payrolls';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'user_id',
        'payslip_number',
        'salary_month',
        'base_salary',
        'total_allowances',
        'overtime_pay',
        'gross_salary',
        'total_deductions',
        'tax_deduction',
        'net_salary',
        'status',
        'payment_method',
        'paid_at',
        'journal_entry_id',
        'remarks',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'total_allowances' => 'decimal:2',
        'overtime_pay' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'tax_deduction' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'status' => PayrollStatus::class,
        'paid_at' => 'datetime',
    ];

    protected $appends = [
        'journalEntry',
    ];

    public function getDisbursedAtAttribute(): ?\DateTimeInterface
    {
        return $this->paid_at;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function getJournalEntryAttribute(): ?JournalEntry
    {
        return $this->relationLoaded('journalEntry') ? $this->getRelation('journalEntry') : null;
    }
}
