<?php

namespace App\Modules\Clinical\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorSchedule extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'doctor_schedules';

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'branch_id',
        'day_of_week',
        'start_time',
        'end_time',
        'slot_duration_minutes',
        'max_patients',
        'is_active',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'slot_duration_minutes' => 'integer',
        'max_patients' => 'integer',
        'is_active' => 'boolean',
    ];

    public function getDayNameAttribute(): string
    {
        return match ($this->day_of_week) {
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
            7 => 'Sunday',
            default => 'Unknown',
        };
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
