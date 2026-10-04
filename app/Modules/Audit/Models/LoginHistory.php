<?php

namespace App\Modules\Audit\Models;

use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginHistory extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'login_histories';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'email',
        'ip_address',
        'user_agent',
        'status',
        'failure_reason',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
