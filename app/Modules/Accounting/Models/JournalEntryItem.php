<?php

namespace App\Modules\Accounting\Models;

use App\Core\Enums\JournalEntryType;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalEntryItem extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'journal_entry_items';

    protected $fillable = [
        'tenant_id',
        'journal_entry_id',
        'account_id',
        'entry_type',
        'amount',
        'narration',
    ];

    protected $casts = [
        'entry_type' => JournalEntryType::class,
        'amount' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }
}
