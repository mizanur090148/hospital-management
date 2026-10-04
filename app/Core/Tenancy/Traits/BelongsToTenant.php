<?php

namespace App\Core\Tenancy\Traits;

use App\Core\Tenancy\Scopes\TenantScope;
use App\Core\Tenancy\TenantContext;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model): void {
            if (empty($model->tenant_id)) {
                $tenantId = app(TenantContext::class)->getTenantId();
                if ($tenantId !== null) {
                    $model->tenant_id = $tenantId;
                }
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}
