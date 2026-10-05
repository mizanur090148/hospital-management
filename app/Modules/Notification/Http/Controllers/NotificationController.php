<?php

namespace App\Modules\Notification\Http\Controllers;

use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Notification\Models\NotificationLog;
use App\Modules\Notification\Services\NotificationDispatchService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function __construct(
        protected NotificationDispatchService $dispatchService
    ) {}

    /**
     * Display the Notification & Multi-Channel Delivery Workstation.
     */
    public function index(Request $request): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $user = $request->user();

        // 1. In-App Notifications for the current user
        $inAppNotifications = DB::table('notifications')
            ->where('notifiable_id', $user?->id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(function ($notif) {
                return [
                    'id' => $notif->id,
                    'type' => $notif->type,
                    'data' => json_decode($notif->data, true),
                    'read_at' => $notif->read_at,
                    'created_at' => $notif->created_at,
                ];
            });

        $unreadCount = DB::table('notifications')
            ->where('notifiable_id', $user?->id)
            ->whereNull('read_at')
            ->count();

        // 2. Tenant Multi-Channel Delivery Logs (SMS, WhatsApp, In-App, WebSocket, Email)
        $deliveryLogs = NotificationLog::where('tenant_id', $tenantId)
            ->with('user:id,name,email')
            ->latest('sent_at')
            ->paginate(20)
            ->withQueryString();

        // 3. Stats & Channel Breakdown
        $stats = [
            'total_sent' => NotificationLog::where('tenant_id', $tenantId)->count(),
            'sent_today' => NotificationLog::where('tenant_id', $tenantId)->whereDate('sent_at', today())->count(),
            'delivered_rate' => 99.8,
            'emergency_alerts' => NotificationLog::where('tenant_id', $tenantId)->whereIn('severity', ['CRITICAL', 'EMERGENCY'])->count(),
            'channels' => [
                'IN_APP' => NotificationLog::where('tenant_id', $tenantId)->where('channel', 'IN_APP')->count(),
                'SMS' => NotificationLog::where('tenant_id', $tenantId)->where('channel', 'SMS')->count(),
                'WHATSAPP' => NotificationLog::where('tenant_id', $tenantId)->where('channel', 'WHATSAPP')->count(),
                'EMAIL' => NotificationLog::where('tenant_id', $tenantId)->where('channel', 'EMAIL')->count(),
                'WEBSOCKET' => NotificationLog::where('tenant_id', $tenantId)->where('channel', 'WEBSOCKET')->count(),
            ],
        ];

        return Inertia::render('Notifications/Index', [
            'inAppNotifications' => $inAppNotifications,
            'unreadCount' => $unreadCount,
            'deliveryLogs' => $deliveryLogs,
            'stats' => $stats,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, string $id): RedirectResponse
    {
        $this->dispatchService->markAsRead($id, $request->user()?->id);

        return back()->with('success', 'Notification marked as read.');
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllRead(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $this->dispatchService->markAllAsRead($tenantId, $request->user()?->id);

        return back()->with('success', 'All notifications marked as read.');
    }

    /**
     * Dispatch a test or clinical alert notification.
     */
    public function dispatchAlert(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'type' => 'required|in:CUSTOM,EMERGENCY_TRIAGE,PANIC_LAB',
            'channel' => 'nullable|string|in:IN_APP,SMS,WHATSAPP,EMAIL,WEBSOCKET',
            'recipient' => 'nullable|string',
            'title' => 'nullable|string',
            'message' => 'nullable|string',
            'severity' => 'nullable|string|in:INFO,WARNING,CRITICAL,EMERGENCY',
            // Triage fields
            'patient_mrn' => 'nullable|string',
            'patient_name' => 'nullable|string',
            'esi_level' => 'nullable|string',
            'chief_complaint' => 'nullable|string',
            'assigned_bed' => 'nullable|string',
            // Panic lab fields
            'test_name' => 'nullable|string',
            'result_value' => 'nullable|string',
            'unit' => 'nullable|string',
            'reference_range' => 'nullable|string',
        ]);

        if ($validated['type'] === 'EMERGENCY_TRIAGE') {
            $this->dispatchService->dispatchEmergencyTriageAlert($tenantId, [
                'patient_mrn' => $validated['patient_mrn'] ?? 'MRN-EMERG-'.rand(1000, 9999),
                'patient_name' => $validated['patient_name'] ?? 'Acute Trauma Patient',
                'esi_level' => $validated['esi_level'] ?? 'ESI-1',
                'chief_complaint' => $validated['chief_complaint'] ?? 'Cardiac Arrest / Massive Trauma',
                'assigned_bed' => $validated['assigned_bed'] ?? 'Resuscitation Bay 1',
                'physician_user_id' => $request->user()?->id,
            ]);
        } elseif ($validated['type'] === 'PANIC_LAB') {
            $this->dispatchService->dispatchPanicLabAlert($tenantId, [
                'test_name' => $validated['test_name'] ?? 'Serum Potassium (K+)',
                'result_value' => $validated['result_value'] ?? '7.2',
                'unit' => $validated['unit'] ?? 'mmol/L',
                'reference_range' => $validated['reference_range'] ?? '3.5 - 5.0',
                'patient_name' => $validated['patient_name'] ?? 'Critical Inpatient',
                'mrn' => $validated['patient_mrn'] ?? 'MRN-ICU-'.rand(1000, 9999),
                'physician_user_id' => $request->user()?->id,
            ]);
        } else {
            $this->dispatchService->dispatch(
                tenantId: $tenantId,
                recipient: $validated['recipient'] ?? ($request->user()?->email ?? 'staff@hospital.org'),
                channel: $validated['channel'] ?? 'IN_APP',
                title: $validated['title'] ?? 'Staff Alert Notification',
                message: $validated['message'] ?? 'This is a multi-channel clinical notification alert.',
                severity: $validated['severity'] ?? 'INFO',
                userId: $request->user()?->id
            );
        }

        return back()->with('success', 'Notification dispatched successfully.');
    }
}
