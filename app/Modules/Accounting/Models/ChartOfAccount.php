<?php

namespace App\Modules\Accounting\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\AccountType;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChartOfAccount extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'chart_of_accounts';

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'account_type',
        'parent_id',
        'description',
        'is_system',
        'is_active',
    ];

    protected $casts = [
        'account_type' => AccountType::class,
        'is_system' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function journalEntryItems(): HasMany
    {
        return $this->hasMany(JournalEntryItem::class, 'account_id');
    }

    /**
     * Calculate net balance based on the account's normal balance rule.
     */
    public function calculateBalance(): float
    {
        $debits = (float) $this->journalEntryItems()->where('entry_type', 'DEBIT')->sum('amount');
        $credits = (float) $this->journalEntryItems()->where('entry_type', 'CREDIT')->sum('amount');

        if ($this->account_type->normalBalance() === 'DEBIT') {
            return round($debits - $credits, 2);
        }

        return round($credits - $debits, 2);
    }
}
