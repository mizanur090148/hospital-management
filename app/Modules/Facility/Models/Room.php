<?php

namespace App\Modules\Facility\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Room extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'rooms';

    protected $fillable = [
        'tenant_id',
        'ward_id',
        'room_number',
        'room_type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class, 'ward_id');
    }

    public function beds(): HasMany
    {
        return $this->hasMany(Bed::class, 'room_id');
    }
}
