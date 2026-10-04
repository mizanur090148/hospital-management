<?php

namespace App\Modules\Nursing\Models;

use App\Core\Enums\MarStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\IPD\Models\Admission;
use App\Modules\Opd\Models\PrescriptionItem;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicationAdministration extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'medication_administrations';

    protected $fillable = [
        'tenant_id',
        'admission_id',
        'prescription_item_id',
        'medicine_name',
        'dose_given',
        'route',
        'administered_by_user_id',
        'administered_at',
        'status',
        'notes',
    ];

    protected $casts = [
        'status' => MarStatus::class,
        'administered_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class, 'admission_id');
    }

    public function prescriptionItem(): BelongsTo
    {
        return $this->belongsTo(PrescriptionItem::class, 'prescription_item_id');
    }

    public function administeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administered_by_user_id');
    }
}
