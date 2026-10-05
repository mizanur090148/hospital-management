import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import {
    Bell, CheckCheck, Send, MessageSquare, Smartphone, Globe, Mail,
    AlertTriangle, ShieldAlert, CheckCircle2, Radio, Filter, Flame, Clock
} from 'lucide-react';

interface InAppNotification {
    id: string;
    type: string;
    data: {
        title: string;
        message: string;
        severity?: string;
        metadata?: Record<string, any>;
    };
    read_at: string | null;
    created_at: string;
}

interface DeliveryLog {
    id: string;
    channel: string;
    recipient: string;
    title: string;
    message: string;
    severity: string;
    status: string;
    external_id: string | null;
    sent_at: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

interface NotificationsProps {
    inAppNotifications: InAppNotification[];
    unreadCount: number;
    deliveryLogs: {
        data: DeliveryLog[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    stats: {
        total_sent: number;
        sent_today: number;
        delivered_rate: number;
        emergency_alerts: number;
        channels: {
            IN_APP: number;
            SMS: number;
            WHATSAPP: number;
            EMAIL: number;
            WEBSOCKET: number;
        };
    };
}

export default function NotificationsIndex({ inAppNotifications, unreadCount, deliveryLogs, stats }: NotificationsProps) {
    const [activeTab, setActiveTab] = useState<'inbox' | 'delivery_logs'>('inbox');
    const [showModal, setShowModal] = useState(false);
    const [dispatchType, setDispatchType] = useState<'EMERGENCY_TRIAGE' | 'PANIC_LAB' | 'CUSTOM'>('CUSTOM');

    // Form fields
    const [channel, setChannel] = useState('IN_APP');
    const [recipient, setRecipient] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('INFO');

    // Emergency fields
    const [patientMrn, setPatientMrn] = useState('MRN-90210');
    const [patientName, setPatientName] = useState('John Doe');
    const [esiLevel, setEsiLevel] = useState('ESI-1');
    const [chiefComplaint, setChiefComplaint] = useState('Severe polytrauma, airway compromise');
    const [assignedBed, setAssignedBed] = useState('Resuscitation Bay 1');

    // Panic lab fields
    const [testName, setTestName] = useState('Serum Potassium (K+)');
    const [resultValue, setResultValue] = useState('7.2');
    const [unit, setUnit] = useState('mmol/L');
    const [referenceRange, setReferenceRange] = useState('3.5 - 5.0');

    const handleMarkAsRead = (id: string) => {
        router.post(`/notifications/mark-read/${id}`, {}, { preserveScroll: true });
    };

    const handleMarkAllRead = () => {
        router.post('/notifications/mark-all-read', {}, { preserveScroll: true });
    };

    const handleDispatch = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/notifications/dispatch', {
            type: dispatchType,
            channel,
            recipient,
            title,
            message,
            severity,
            patient_mrn: patientMrn,
            patient_name: patientName,
            esi_level: esiLevel,
            chief_complaint: chiefComplaint,
            assigned_bed: assignedBed,
            test_name: testName,
            result_value: resultValue,
            unit,
            reference_range: referenceRange,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowModal(false);
                setTitle('');
                setMessage('');
                setRecipient('');
            },
        });
    };

    const getChannelIcon = (ch: string) => {
        switch (ch) {
            case 'SMS':
                return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
            case 'WHATSAPP':
                return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
            case 'EMAIL':
                return <Mail className="w-3.5 h-3.5 text-amber-500" />;
            case 'WEBSOCKET':
                return <Radio className="w-3.5 h-3.5 text-purple-500" />;
            default:
                return <Bell className="w-3.5 h-3.5 text-cyan-500" />;
        }
    };

    const getSeverityBadge = (sev?: string) => {
        switch (sev?.toUpperCase()) {
            case 'EMERGENCY':
                return <Badge variant="destructive" className="animate-pulse bg-rose-600 text-white font-bold text-[10px]">EMERGENCY ESI-1</Badge>;
            case 'CRITICAL':
                return <Badge variant="destructive" className="bg-amber-600 text-white font-bold text-[10px]">CRITICAL</Badge>;
            case 'WARNING':
                return <Badge variant="warning" className="text-[10px]">WARNING</Badge>;
            default:
                return <Badge variant="cyan" className="text-[10px]">INFO</Badge>;
        }
    };

    return (
        <AppLayout title="Notifications & Multi-Channel Delivery">
            <Head title="Notifications & Multi-Channel Delivery" />

            <div className="space-y-6">
                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20">
                                <Bell className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    Multi-Channel Notification & Alert Hub
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                    In-App Database Alerts, Real-Time WebSockets, SMS & WhatsApp Delivery Engine
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1.5 text-xs text-slate-700 bg-white shadow-xs"
                            >
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Mark All Read ({unreadCount})
                            </Button>
                        )}

                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-xs text-white shadow-sm"
                        >
                            <Send className="w-3.5 h-3.5" />
                            Dispatch Clinical Alert
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unread In-App</span>
                                <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                                    <Bell className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{unreadCount}</div>
                            <div className="text-[11px] text-cyan-700 font-medium mt-0.5">Active inbox messages</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sent Today</span>
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.sent_today}</div>
                            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{stats.total_sent} total dispatches</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Rate</span>
                                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                    <Globe className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.delivered_rate}%</div>
                            <div className="text-[11px] text-blue-600 font-medium mt-0.5">Gateway SLA compliant</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency Alerts</span>
                                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                                    <ShieldAlert className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-rose-600">{stats.emergency_alerts}</div>
                            <div className="text-[11px] text-rose-600 font-medium mt-0.5">ESI-1 & Panic labs logged</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Channel Badges Summary */}
                <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Dispatches by Channel:</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200/60">
                        <Bell className="w-3.5 h-3.5 text-cyan-600" /> In-App: {stats.channels.IN_APP}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                        <Smartphone className="w-3.5 h-3.5 text-blue-600" /> SMS: {stats.channels.SMS}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp: {stats.channels.WHATSAPP}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                        <Radio className="w-3.5 h-3.5 text-purple-600" /> WebSockets: {stats.channels.WEBSOCKET}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                        <Mail className="w-3.5 h-3.5 text-amber-600" /> Email: {stats.channels.EMAIL}
                    </span>
                </div>

                {/* Tabs: Inbox vs Delivery Logs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`pb-3 px-4 text-xs font-bold tracking-tight uppercase transition-colors relative ${
                            activeTab === 'inbox'
                                ? 'text-cyan-700 border-b-2 border-cyan-600'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        My In-App Inbox ({unreadCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('delivery_logs')}
                        className={`pb-3 px-4 text-xs font-bold tracking-tight uppercase transition-colors relative ${
                            activeTab === 'delivery_logs'
                                ? 'text-cyan-700 border-b-2 border-cyan-600'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Multi-Channel Delivery Audit Logs ({deliveryLogs.total})
                    </button>
                </div>

                {/* TAB 1: INBOX */}
                {activeTab === 'inbox' && (
                    <div className="space-y-3">
                        {inAppNotifications.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-semibold">No in-app notifications found.</p>
                                <p className="text-xs text-slate-400">All clinical alerts and messages have been acknowledged.</p>
                            </div>
                        ) : (
                            inAppNotifications.map((notif) => {
                                const isUnread = !notif.read_at;
                                return (
                                    <div
                                        key={notif.id}
                                        className={`p-4 rounded-xl border transition-all ${
                                            isUnread
                                                ? 'bg-white border-cyan-300/80 shadow-xs'
                                                : 'bg-slate-50/70 border-slate-200 opacity-90'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-0.5 p-2 rounded-lg ${isUnread ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-200 text-slate-500'}`}>
                                                    <Bell className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-sm ${isUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                                                            {notif.data?.title || 'Notification Alert'}
                                                        </h4>
                                                        {getSeverityBadge(notif.data?.severity)}
                                                        {isUnread && (
                                                            <span className="w-2 h-2 rounded-full bg-cyan-600" />
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                                                        {notif.data?.message}
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(notif.created_at).toLocaleString()}
                                                        </span>
                                                        {notif.read_at && (
                                                            <span className="text-emerald-600 flex items-center gap-1 font-medium">
                                                                <CheckCircle2 className="w-3 h-3" /> Read: {new Date(notif.read_at).toLocaleTimeString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {isUnread && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleMarkAsRead(notif.id)}
                                                    className="text-xs text-slate-600 shrink-0"
                                                >
                                                    Mark Read
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* TAB 2: MULTI-CHANNEL DELIVERY LOGS */}
                {activeTab === 'delivery_logs' && (
                    <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-700">
                                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Channel</th>
                                        <th className="py-3 px-4">Recipient</th>
                                        <th className="py-3 px-4">Title & Details</th>
                                        <th className="py-3 px-4">Severity</th>
                                        <th className="py-3 px-4">Gateway ID</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {deliveryLogs.data.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-1.5 font-bold">
                                                    {getChannelIcon(log.channel)}
                                                    <span>{log.channel}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900 truncate max-w-[150px]">{log.recipient}</div>
                                                {log.user && (
                                                    <div className="text-[10px] text-slate-400 truncate">{log.user.name}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 max-w-xs">
                                                <div className="font-semibold text-slate-900 truncate">{log.title}</div>
                                                <div className="text-[11px] text-slate-500 truncate">{log.message}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {getSeverityBadge(log.severity)}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                                                {log.external_id || 'LOCAL-DIRECT'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3" /> {log.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                                                {new Date(log.sent_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* DISPATCH MODAL */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Send className="w-5 h-5 text-cyan-600" />
                                    <h3 className="font-black text-slate-900 text-base">Dispatch Multi-Channel Alert</h3>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleDispatch} className="p-5 space-y-4">
                                {/* Alert Scenario Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Scenario / Alert Type
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setDispatchType('CUSTOM')}
                                            className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                                                dispatchType === 'CUSTOM'
                                                    ? 'bg-cyan-50 border-cyan-500 text-cyan-800'
                                                    : 'bg-white border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            Custom Broadcast
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDispatchType('EMERGENCY_TRIAGE')}
                                            className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                                                dispatchType === 'EMERGENCY_TRIAGE'
                                                    ? 'bg-rose-50 border-rose-500 text-rose-800'
                                                    : 'bg-white border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            🚨 ESI-1 Resuscitation
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDispatchType('PANIC_LAB')}
                                            className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                                                dispatchType === 'PANIC_LAB'
                                                    ? 'bg-amber-50 border-amber-500 text-amber-800'
                                                    : 'bg-white border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            ⚠️ Panic Lab Value
                                        </button>
                                    </div>
                                </div>

                                {dispatchType === 'CUSTOM' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Channel</label>
                                                <select
                                                    value={channel}
                                                    onChange={(e) => setChannel(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-slate-200"
                                                >
                                                    <option value="IN_APP">In-App Notification</option>
                                                    <option value="SMS">SMS Gateway</option>
                                                    <option value="WHATSAPP">WhatsApp Cloud API</option>
                                                    <option value="EMAIL">SMTP Email</option>
                                                    <option value="WEBSOCKET">WebSocket Real-Time</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Severity</label>
                                                <select
                                                    value={severity}
                                                    onChange={(e) => setSeverity(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-slate-200"
                                                >
                                                    <option value="INFO">INFO</option>
                                                    <option value="WARNING">WARNING</option>
                                                    <option value="CRITICAL">CRITICAL</option>
                                                    <option value="EMERGENCY">EMERGENCY</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Recipient</label>
                                            <input
                                                type="text"
                                                placeholder="+1-555-0199, staff@hospital.org, or User ID"
                                                value={recipient}
                                                onChange={(e) => setRecipient(e.target.value)}
                                                className="w-full text-xs rounded-lg border-slate-200"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                                            <input
                                                type="text"
                                                placeholder="Clinical Alert Headline"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full text-xs rounded-lg border-slate-200"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Message Content</label>
                                            <textarea
                                                rows={3}
                                                placeholder="Detailed message..."
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                className="w-full text-xs rounded-lg border-slate-200"
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                {dispatchType === 'EMERGENCY_TRIAGE' && (
                                    <div className="space-y-3 bg-rose-50/50 p-3.5 rounded-xl border border-rose-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-rose-900 mb-1">Patient MRN</label>
                                                <input
                                                    type="text"
                                                    value={patientMrn}
                                                    onChange={(e) => setPatientMrn(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-rose-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-rose-900 mb-1">Patient Name</label>
                                                <input
                                                    type="text"
                                                    value={patientName}
                                                    onChange={(e) => setPatientName(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-rose-200"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-rose-900 mb-1">ESI Level</label>
                                                <select
                                                    value={esiLevel}
                                                    onChange={(e) => setEsiLevel(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-rose-200 font-bold"
                                                >
                                                    <option value="ESI-1">ESI-1: Resuscitation (Immediate)</option>
                                                    <option value="ESI-2">ESI-2: Emergent (&lt;15 mins)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-rose-900 mb-1">Assigned Bed</label>
                                                <input
                                                    type="text"
                                                    value={assignedBed}
                                                    onChange={(e) => setAssignedBed(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-rose-200"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-rose-900 mb-1">Chief Complaint</label>
                                            <input
                                                type="text"
                                                value={chiefComplaint}
                                                onChange={(e) => setChiefComplaint(e.target.value)}
                                                className="w-full text-xs rounded-lg border-rose-200"
                                            />
                                        </div>
                                    </div>
                                )}

                                {dispatchType === 'PANIC_LAB' && (
                                    <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-amber-900 mb-1">Test Name</label>
                                                <input
                                                    type="text"
                                                    value={testName}
                                                    onChange={(e) => setTestName(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-amber-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-amber-900 mb-1">Critical Value</label>
                                                <input
                                                    type="text"
                                                    value={resultValue}
                                                    onChange={(e) => setResultValue(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-amber-200 font-bold text-rose-700"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-amber-900 mb-1">Unit</label>
                                                <input
                                                    type="text"
                                                    value={unit}
                                                    onChange={(e) => setUnit(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-amber-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-amber-900 mb-1">Ref Range</label>
                                                <input
                                                    type="text"
                                                    value={referenceRange}
                                                    onChange={(e) => setReferenceRange(e.target.value)}
                                                    className="w-full text-xs rounded-lg border-amber-200"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold"
                                    >
                                        Execute Dispatch
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
