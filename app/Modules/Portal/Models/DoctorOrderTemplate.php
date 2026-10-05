<?php

namespace App\Modules\Portal\Models;

use App\Core\Audit\Traits\HasAuditTrail;
use App\Core\Tenancy\Traits\BelongsToTenant;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorOrderTemplate extends Model
{
    use BelongsToTenant, HasAuditTrail, HasUuids;

    protected $table = 'doctor_order_templates';

    protected $fillable = [
        'tenant_id',
        'doctor_id',
        'template_type',
        'title',
        'content',
    ];

    protected $casts = [
        'content' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }
}
