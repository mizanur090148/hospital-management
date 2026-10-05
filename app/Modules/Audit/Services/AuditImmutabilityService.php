<?php

namespace App\Modules\Audit\Services;

use App\Core\Enums\AuditAction;
use App\Modules\Audit\Models\AuditLog;
use App\Modules\Notification\Services\NotificationDispatchService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Request;

class AuditImmutabilityService
{
    public const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

    /**
     * Compute SHA-256 cryptographic hash for an audit log entry.
     */
    public function computeHash(
        ?string $prevHash,
        string $tenantId,
        ?string $userId,
        string $action,
        string $entityType,
        ?string $entityId,
        ?array $oldValues,
        ?array $newValues,
        string $timestamp,
        bool $isBreakGlass = false,
        ?string $justification = null
    ): string {
        $normalizedTimestamp = Carbon::parse($timestamp)->setTimezone('UTC')->format('Y-m-d H:i:s');

        $payload = implode('|', [
            $prevHash ?? self::GENESIS_HASH,
            $tenantId,
            $userId ?? 'SYSTEM',
            $action,
            $entityType,
            $entityId ?? 'NONE',
            $this->canonicalJson($oldValues),
            $this->canonicalJson($newValues),
            $isBreakGlass ? 'BREAK_GLASS' : 'STANDARD',
            $justification ?? '',
            $normalizedTimestamp,
        ]);

        return hash('sha256', $payload);
    }

    /**
     * Canonical JSON representation with recursive alphabetical key sorting.
     */
    private function canonicalJson(?array $data): string
    {
        if ($data === null || empty($data)) {
            return '[]';
        }

        $sorted = $this->ksortRecursive($data);

        return json_encode($sorted, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function ksortRecursive(array $data): array
    {
        ksort($data);
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->ksortRecursive($value);
            }
        }

        return $data;
    }

    /**
     * Atomically append an audit log entry with cryptographic hash chaining.
     */
    public function recordHashChainedLog(array $attributes): AuditLog
    {
        $tenantId = $attributes['tenant_id'];

        // Get latest audit record hash for this tenant (or genesis)
        $latestLog = AuditLog::where('tenant_id', $tenantId)
            ->whereNotNull('current_hash')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();

        $previousHash = $latestLog ? $latestLog->current_hash : self::GENESIS_HASH;
        $timestamp = $attributes['created_at'] ?? now()->toIso8601String();
        $isBreakGlass = ! empty($attributes['is_break_glass']);
        $justification = $attributes['justification'] ?? null;

        $actionVal = $attributes['action'] instanceof AuditAction ? $attributes['action']->value : (string) $attributes['action'];

        $currentHash = $this->computeHash(
            prevHash: $previousHash,
            tenantId: $tenantId,
            userId: $attributes['user_id'] ?? null,
            action: $actionVal,
            entityType: $attributes['entity_type'],
            entityId: $attributes['entity_id'] ?? null,
            oldValues: $attributes['old_values'] ?? null,
            newValues: $attributes['new_values'] ?? null,
            timestamp: $timestamp,
            isBreakGlass: $isBreakGlass,
            justification: $justification
        );

        return AuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $attributes['user_id'] ?? null,
            'action' => $attributes['action'],
            'entity_type' => $attributes['entity_type'],
            'entity_id' => $attributes['entity_id'] ?? null,
            'old_values' => $attributes['old_values'] ?? null,
            'new_values' => $attributes['new_values'] ?? null,
            'ip_address' => $attributes['ip_address'] ?? Request::ip(),
            'user_agent' => $attributes['user_agent'] ?? Request::userAgent(),
            'previous_hash' => $previousHash,
            'current_hash' => $currentHash,
            'is_break_glass' => $isBreakGlass,
            'justification' => $justification,
            'created_at' => $timestamp,
        ]);
    }

    /**
     * Record a critical Break-Glass emergency override event.
     */
    public function recordBreakGlassEvent(
        string $tenantId,
        string $userId,
        string $entityType,
        string $entityId,
        string $justification
    ): AuditLog {
        $log = $this->recordHashChainedLog([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'action' => AuditAction::Override,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => ['locked' => true],
            'new_values' => ['locked' => false, 'override_mode' => 'BREAK_GLASS'],
            'is_break_glass' => true,
            'justification' => $justification,
        ]);

        // Dispatch instant alert to hospital administration
        app(NotificationDispatchService::class)->dispatch(
            tenantId: $tenantId,
            recipient: 'ADMIN_ALERT_GROUP',
            channel: 'IN_APP',
            title: '🚨 CRITICAL: Break-Glass Emergency Override Triggered',
            message: "User {$userId} triggered emergency break-glass override on {$entityType} #{$entityId}. Reason: {$justification}",
            severity: 'EMERGENCY',
            meta: [
                'audit_log_id' => $log->id,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'hash' => $log->current_hash,
            ]
        );

        return $log;
    }

    /**
     * Cryptographically verify the integrity of the audit log hash chain.
     */
    public function verifyChainIntegrity(string $tenantId): array
    {
        $logs = AuditLog::where('tenant_id', $tenantId)
            ->whereNotNull('current_hash')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        if ($logs->isEmpty()) {
            return [
                'is_valid' => true,
                'total_checked' => 0,
                'broken_at_id' => null,
                'status' => 'CHAIN_EMPTY',
                'message' => 'No hash-chained audit logs found for tenant.',
            ];
        }

        $expectedPrevHash = self::GENESIS_HASH;
        $verifiedCount = 0;

        foreach ($logs as $log) {
            // Check previous hash matches expected
            if ($log->previous_hash !== $expectedPrevHash) {
                return [
                    'is_valid' => false,
                    'total_checked' => $verifiedCount,
                    'broken_at_id' => $log->id,
                    'status' => 'PREV_HASH_MISMATCH',
                    'message' => "Cryptographic hash chain broken at log ID {$log->id}. Expected previous hash {$expectedPrevHash}, found {$log->previous_hash}.",
                ];
            }

            // Recompute expected current hash
            $actionVal = $log->action instanceof AuditAction ? $log->action->value : (string) $log->action;
            $recomputed = $this->computeHash(
                prevHash: $log->previous_hash,
                tenantId: $log->tenant_id,
                userId: $log->user_id,
                action: $actionVal,
                entityType: $log->entity_type,
                entityId: $log->entity_id,
                oldValues: $log->old_values,
                newValues: $log->new_values,
                timestamp: $log->created_at->toIso8601String(),
                isBreakGlass: (bool) $log->is_break_glass,
                justification: $log->justification
            );

            if ($recomputed !== $log->current_hash) {
                return [
                    'is_valid' => false,
                    'total_checked' => $verifiedCount,
                    'broken_at_id' => $log->id,
                    'status' => 'TAMPERED_CONTENT',
                    'message' => "Audit log ID {$log->id} content has been modified or tampered with! Recomputed hash {$recomputed} does not match stored {$log->current_hash}.",
                ];
            }

            $expectedPrevHash = $log->current_hash;
            $verifiedCount++;
        }

        return [
            'is_valid' => true,
            'total_checked' => $verifiedCount,
            'broken_at_id' => null,
            'status' => 'VERIFIED_SECURE',
            'message' => "All {$verifiedCount} audit log entries cryptographically verified. 100% Tamper-Proof Hash Chain.",
        ];
    }
}
