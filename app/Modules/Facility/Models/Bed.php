<?php

namespace App\Modules\Facility\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\BedStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Bed extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'beds';

    protected $fillable = [
        'tenant_id',
        'room_id',
        'bed_number',
        'bed_type',
        'daily_rate',
        'status',
        'is_active',
    ];

    protected $casts = [
        'status' => BedStatus::class,
        'daily_rate' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    public function isAvailable(): bool
    {
        return $this->is_active && $this->status === BedStatus::Available;
    }

    public function occupy(): void
    {
        $this->update(['status' => BedStatus::Occupied]);
    }

    public function releaseToCleaning(): void
    {
        $this->update(['status' => BedStatus::Cleaning]);
    }

    public function setAvailable(): void
    {
        $this->update(['status' => BedStatus::Available]);
    }
}
