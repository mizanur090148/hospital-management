<?php

namespace App\Modules\Nursing\Models;

use App\Core\Enums\NursingShift;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Auth\Models\User;
use App\Modules\IPD\Models\Admission;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NursingNote extends Model
{
    use BelongsToTenant, HasUuids;

    protected $table = 'nursing_notes';

    protected $fillable = [
        'tenant_id',
        'admission_id',
        'nurse_user_id',
        'shift',
        'vitals',
        'notes',
        'intake_output',
    ];

    protected $casts = [
        'shift' => NursingShift::class,
        'vitals' => 'array',
        'intake_output' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class, 'admission_id');
    }

    public function nurse(): BelongsTo
    {
        return $this->belongsTo(User::class, 'nurse_user_id');
    }
}
