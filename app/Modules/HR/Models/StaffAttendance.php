<?php

namespace App\Modules\HR\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\AttendanceStatus;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StaffAttendance extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'staff_attendances';

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'user_id',
        'attendance_date',
        'clock_in',
        'clock_out',
        'total_hours',
        'overtime_hours',
        'status',
        'verification_method',
        'notes',
    ];

    protected $casts = [
        'attendance_date' => 'date:Y-m-d',
        'clock_in' => 'datetime',
        'clock_out' => 'datetime',
        'total_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'status' => AttendanceStatus::class,
    ];

    public function getWorkingHoursAttribute(): float
    {
        return (float) $this->total_hours;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_id');
    }
}
