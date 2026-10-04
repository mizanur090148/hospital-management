<?php

namespace App\Core\Audit\Traits;

use App\Core\Enums\AuditAction;
use App\Core\Tenancy\TenantContext;
use App\Modules\Audit\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

trait HasAuditTrail
{
    public static function bootHasAuditTrail(): void
    {
        static::created(function ($model): void {
            self::recordAuditLog($model, AuditAction::Create, null, $model->getAttributes());
        });

        static::updated(function ($model): void {
            $old = array_intersect_key($model->getOriginal(), $model->getDirty());
            $new = $model->getDirty();
            // Don't log password or token changes in plaintext
            unset($old['password'], $new['password'], $old['remember_token'], $new['remember_token']);

            if (! empty($new)) {
                self::recordAuditLog($model, AuditAction::Update, $old, $new);
            }
        });

        static::deleted(function ($model): void {
            self::recordAuditLog($model, AuditAction::Delete, $model->getAttributes(), null);
        });
    }

    protected static function recordAuditLog($model, AuditAction $action, ?array $oldValues, ?array $newValues): void
    {
        try {
            $tenantId = $model->tenant_id ?? app(TenantContext::class)->getTenantId();

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => Auth::id(),
                'action' => $action,
                'entity_type' => get_class($model),
                'entity_id' => $model->id,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Fail safely without interrupting clinical write paths
            report($e);
        }
    }
}
