<?php

namespace App\Modules\HR\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Enums\LeaveStatus;
use App\Core\Enums\LeaveType;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class LeaveRequest extends Model
{
    use BelongsToTenant, HasAuditTrail, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'leave_requests';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'leave_type',
        'start_date',
        'end_date',
        'total_days',
        'reason',
        'status',
        'approved_by_user_id',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'leave_type' => LeaveType::class,
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'total_days' => 'integer',
        'status' => LeaveStatus::class,
        'approved_at' => 'datetime',
    ];

    public function getApprovedByAttribute(): ?string
    {
        return $this->approved_by_user_id;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}
