<?php

namespace App\Modules\Pharmacy\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\DosageForm;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Medicine extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids, SoftDeletes;

    protected $table = 'medicines';

    protected $fillable = [
        'tenant_id',
        'code',
        'generic_name',
        'brand_name',
        'dosage_form',
        'strength',
        'uom',
        'manufacturer',
        'requires_prescription',
        'reorder_level',
        'is_active',
    ];

    protected $casts = [
        'dosage_form' => DosageForm::class,
        'requires_prescription' => 'boolean',
        'reorder_level' => 'integer',
        'is_active' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(MedicineBatch::class, 'medicine_id');
    }

    public function totalQuantityOnHand(): int
    {
        return (int) $this->batches()->sum('quantity_on_hand');
    }
}
