<?php

namespace App\Modules\Notification\Services;

use App\Modules\Auth\Models\User;
use App\Modules\Notification\Models\NotificationLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationDispatchService
{
    /**
     * Dispatch a multi-channel notification.
     */
    public function dispatch(
        string $tenantId,
        string $recipient,
        string $channel,
        string $title,
        string $message,
        string $severity = 'INFO',
        ?string $userId = null,
        ?array $meta = null
    ): NotificationLog {
        $validChannels = ['IN_APP', 'SMS', 'WHATSAPP', 'EMAIL', 'WEBSOCKET'];
        $channel = strtoupper($channel);
        if (! in_array($channel, $validChannels, true)) {
            $channel = 'IN_APP';
        }

        // Simulate gateway provider dispatch ID
        $prefix = match ($channel) {
            'SMS' => 'SMS-GW-',
            'WHATSAPP' => 'WA-API-',
            'EMAIL' => 'SMTP-MSG-',
            'WEBSOCKET' => 'WS-EVT-',
            default => 'APP-NOTIF-',
        };
        $externalId = $prefix.Str::upper(Str::random(16));

        // If recipient looks like user ID and $userId not provided
        if (! $userId && Str::isUuid($recipient)) {
            $userId = $recipient;
        }

        // If In-App and user ID is known, insert into Laravel notifications table
        if ($channel === 'IN_APP' && $userId) {
            $notifId = (string) Str::uuid();
            DB::table('notifications')->insert([
                'id' => $notifId,
                'type' => 'App\\Notifications\\ClinicalAlertNotification',
                'notifiable_type' => User::class,
                'notifiable_id' => $userId,
                'data' => json_encode([
                    'title' => $title,
                    'message' => $message,
                    'severity' => $severity,
                    'metadata' => $meta ?? [],
                ]),
                'read_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Create log record
        return NotificationLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'channel' => $channel,
            'recipient' => $recipient,
            'title' => $title,
            'message' => $message,
            'severity' => strtoupper($severity),
            'status' => 'DELIVERED',
            'external_id' => $externalId,
            'metadata' => $meta ?? [],
            'sent_at' => now(),
        ]);
    }

    /**
     * Dispatch an emergency triage alert (ESI Level 1 / Level 2).
     */
    public function dispatchEmergencyTriageAlert(string $tenantId, array $triageData): NotificationLog
    {
        $patientMrn = $triageData['patient_mrn'] ?? 'UNKNOWN';
        $patientName = $triageData['patient_name'] ?? 'Emergency Patient';
        $triageLevel = $triageData['esi_level'] ?? 'ESI-1';
        $chiefComplaint = $triageData['chief_complaint'] ?? 'Acute distress';
        $assignedBed = $triageData['assigned_bed'] ?? 'Resuscitation Bay 1';

        $title = "🚨 EMERGENCY TRIAGE ALERT: {$triageLevel} - {$patientName}";
        $message = "Immediate trauma/code resuscitation required for MRN {$patientMrn} ({$patientName}) in {$assignedBed}. Chief Complaint: {$chiefComplaint}.";

        return $this->dispatch(
            tenantId: $tenantId,
            recipient: $triageData['recipient_phone'] ?? 'ER-RESUSCITATION-TEAM',
            channel: 'SMS',
            title: $title,
            message: $message,
            severity: 'EMERGENCY',
            userId: $triageData['physician_user_id'] ?? null,
            meta: [
                'type' => 'EMERGENCY_TRIAGE',
                'esi_level' => $triageLevel,
                'mrn' => $patientMrn,
                'bed' => $assignedBed,
            ]
        );
    }

    /**
     * Dispatch a critical panic laboratory alert.
     */
    public function dispatchPanicLabAlert(string $tenantId, array $labData): NotificationLog
    {
        $testName = $labData['test_name'] ?? 'Critical Assay';
        $resultValue = $labData['result_value'] ?? 'CRITICAL';
        $unit = $labData['unit'] ?? '';
        $referenceRange = $labData['reference_range'] ?? 'Normal';
        $patientName = $labData['patient_name'] ?? 'Patient';
        $mrn = $labData['mrn'] ?? 'UNKNOWN';

        $title = "⚠️ CRITICAL PANIC LAB VALUE: {$testName}";
        $message = "Critical abnormal value detected for {$patientName} (MRN: {$mrn}): {$testName} = {$resultValue} {$unit} (Ref: {$referenceRange}). Immediate clinical intervention required.";

        return $this->dispatch(
            tenantId: $tenantId,
            recipient: $labData['ordering_physician_contact'] ?? 'ORDERING-PHYSICIAN',
            channel: 'IN_APP',
            title: $title,
            message: $message,
            severity: 'CRITICAL',
            userId: $labData['physician_user_id'] ?? null,
            meta: [
                'type' => 'PANIC_LAB_VALUE',
                'test_name' => $testName,
                'result_value' => $resultValue,
                'unit' => $unit,
                'patient_name' => $patientName,
                'mrn' => $mrn,
            ]
        );
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(string $notificationId, ?string $userId = null): bool
    {
        $query = DB::table('notifications')->where('id', $notificationId);
        if ($userId) {
            $query->where('notifiable_id', $userId);
        }

        return $query->update(['read_at' => now()]) > 0;
    }

    /**
     * Mark all notifications as read for a user.
     */
    public function markAllAsRead(string $tenantId, string $userId): int
    {
        return DB::table('notifications')
            ->where('notifiable_type', User::class)
            ->where('notifiable_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }
}
