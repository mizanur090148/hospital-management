import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import {
    ShieldCheck, ShieldAlert, KeyRound, Lock, Search, Filter,
    CheckCircle2, AlertOctagon, Terminal, RefreshCw, Eye, ArrowRight,
    FileText, User, Globe
} from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    old_values: Record<string, any> | null;
    new_values: Record<string, any> | null;
    ip_address: string | null;
    user_agent: string | null;
    previous_hash: string | null;
    current_hash: string | null;
    is_break_glass: boolean;
    justification: string | null;
    created_at: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

interface AuditProps {
    auditLogs: {
        data: AuditLog[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    chainIntegrity: {
        is_valid: boolean;
        total_checked: number;
        broken_at_id: string | null;
        status: string;
        message: string;
    };
    stats: {
        total_logs: number;
        chained_logs: number;
        break_glass_count: number;
        chain_status: string;
        is_valid: boolean;
        message: string;
    };
    filters: {
        action?: string;
        entity_type?: string;
        break_glass_only?: boolean;
    };
}

export default function AuditIndex({ auditLogs, chainIntegrity, stats, filters }: AuditProps) {
    const [actionFilter, setActionFilter] = useState(filters.action || '');
    const [entityFilter, setEntityFilter] = useState(filters.entity_type || '');
    const [breakGlassOnly, setBreakGlassOnly] = useState(filters.break_glass_only || false);

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);

    // Break glass form
    const [bgEntityType, setBgEntityType] = useState('PatientRecord');
    const [bgEntityId, setBgEntityId] = useState('');
    const [bgJustification, setBgJustification] = useState('');

    const handleFilter = () => {
        router.get('/audit/compliance', {
            action: actionFilter || undefined,
            entity_type: entityFilter || undefined,
            break_glass_only: breakGlassOnly ? true : undefined,
        }, { preserveState: true });
    };

    const handleVerifyChain = () => {
        router.post('/audit/compliance/verify', {}, { preserveScroll: true });
    };

    const handleTriggerBreakGlass = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/audit/compliance/break-glass', {
            entity_type: bgEntityType,
            entity_id: bgEntityId,
            justification: bgJustification,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowBreakGlassModal(false);
                setBgEntityId('');
                setBgJustification('');
            },
        });
    };

    const getActionBadge = (action: string) => {
        switch (action.toLowerCase()) {
            case 'override':
                return <Badge variant="destructive" className="bg-rose-700 text-white font-mono text-[10px]">OVERRIDE</Badge>;
            case 'delete':
                return <Badge variant="destructive" className="font-mono text-[10px]">DELETE</Badge>;
            case 'create':
                return <Badge variant="cyan" className="font-mono text-[10px]">CREATE</Badge>;
            case 'update':
                return <Badge variant="warning" className="font-mono text-[10px]">UPDATE</Badge>;
            case 'view':
                return <Badge variant="purple" className="font-mono text-[10px]">VIEW</Badge>;
            default:
                return <Badge variant="outline" className="font-mono text-[10px]">{action.toUpperCase()}</Badge>;
        }
    };

    return (
        <AppLayout title="Cryptographic Audit Trail & Compliance">
            <Head title="Cryptographic Audit Trail & Compliance" />

            <div className="space-y-6">
                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-950 text-white shadow-md shadow-indigo-950/20">
                                <KeyRound className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    Cryptographic Audit Trail & Merkle Chain
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                    Immutability-Verified SHA-256 Ledger, Break-Glass Override Protocol & HIPAA Compliance
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleVerifyChain}
                            className="flex items-center gap-1.5 text-xs text-slate-700 bg-white shadow-xs"
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
                            Verify Chain Integrity
                        </Button>

                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowBreakGlassModal(true)}
                            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-xs text-white shadow-sm"
                        >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            Trigger Break-Glass Override
                        </Button>
                    </div>
                </div>

                {/* Cryptographic Chain Integrity Status Banner */}
                <div className={`p-4 rounded-2xl border transition-all ${
                    chainIntegrity.is_valid
                        ? 'bg-gradient-to-r from-emerald-950 to-slate-900 text-white border-emerald-500/40 shadow-md'
                        : 'bg-gradient-to-r from-rose-950 to-slate-900 text-white border-rose-500/60 shadow-lg'
                }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className={`p-2.5 rounded-xl ${chainIntegrity.is_valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {chainIntegrity.is_valid ? (
                                    <ShieldCheck className="w-6 h-6" />
                                ) : (
                                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs uppercase tracking-wider text-emerald-300 font-bold">
                                        Cryptographic Status: {chainIntegrity.status}
                                    </span>
                                    <Badge variant={chainIntegrity.is_valid ? 'cyan' : 'destructive'} className="text-[10px] font-bold">
                                        {chainIntegrity.is_valid ? '100% Tamper-Proof' : 'CRITICAL TAMPER WARNING'}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-xs text-slate-200 leading-relaxed font-sans">
                                    {chainIntegrity.message}
                                </p>
                                <div className="mt-2 text-[11px] text-slate-400 font-mono">
                                    Total Blocks Verified: {chainIntegrity.total_checked} • Genesis Block: GENESIS_HASH_0000000000000000
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 border border-slate-700/60 font-mono text-xs text-cyan-300">
                                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                                SHA-256 Chained
                            </span>
                        </div>
                    </div>
                </div>

                {/* KPI Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Audit Logs</span>
                                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                                    <Terminal className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.total_logs}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Tenant operations recorded</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chained Blocks</span>
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                    <Lock className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.chained_logs}</div>
                            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Cryptographically signed</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Break-Glass Overrides</span>
                                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                                    <AlertOctagon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-rose-600">{stats.break_glass_count}</div>
                            <div className="text-[11px] text-rose-600 font-medium mt-0.5">Audited emergency events</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Integrity SLA</span>
                                <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-cyan-700">100.0%</div>
                            <div className="text-[11px] text-cyan-600 font-medium mt-0.5">Zero tampering tolerance</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Bar */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="text-xs rounded-lg border-slate-200 py-1.5"
                        >
                            <option value="">All Actions</option>
                            <option value="create">Create</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                            <option value="view">View</option>
                            <option value="override">Override</option>
                        </select>

                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search Entity Type..."
                                value={entityFilter}
                                onChange={(e) => setEntityFilter(e.target.value)}
                                className="pl-8 text-xs rounded-lg border-slate-200 py-1.5 w-48"
                            />
                        </div>

                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={breakGlassOnly}
                                onChange={(e) => setBreakGlassOnly(e.target.checked)}
                                className="rounded text-rose-600 border-slate-300"
                            />
                            Break-Glass Only
                        </label>

                        <Button variant="outline" size="sm" onClick={handleFilter} className="text-xs">
                            Apply Filter
                        </Button>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                        Showing {auditLogs.data.length} of {auditLogs.total} records
                    </div>
                </div>

                {/* Main Hash-Chained Audit Log Table */}
                <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Action</th>
                                    <th className="py-3 px-4">Entity</th>
                                    <th className="py-3 px-4">Actor</th>
                                    <th className="py-3 px-4">Cryptographic Hash Chain (SHA-256)</th>
                                    <th className="py-3 px-4">Flags</th>
                                    <th className="py-3 px-4">Timestamp</th>
                                    <th className="py-3 px-4 text-right">Inspect</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {auditLogs.data.map((log) => (
                                    <tr key={log.id} className={`hover:bg-slate-50/60 transition-colors ${log.is_break_glass ? 'bg-rose-50/30' : ''}`}>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900 truncate max-w-[160px]">
                                                {log.entity_type.split('\\').pop()}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                                                ID: {log.entity_id || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="font-semibold text-slate-900">
                                                {log.user ? log.user.name : 'System Event'}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                IP: {log.ip_address || '127.0.0.1'}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[10px]">
                                            {log.current_hash ? (
                                                <div className="space-y-0.5">
                                                    <div className="text-slate-400 truncate max-w-[200px]" title={log.previous_hash || 'GENESIS'}>
                                                        Prev: {log.previous_hash ? log.previous_hash.substring(0, 16) + '...' : 'GENESIS'}
                                                    </div>
                                                    <div className="text-cyan-700 font-bold truncate max-w-[200px]" title={log.current_hash}>
                                                        Hash: {log.current_hash.substring(0, 16)}...
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Legacy unchained</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {log.is_break_glass ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                                                    <AlertOctagon className="w-3 h-3 text-rose-600" /> BREAK-GLASS
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400">Standard</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedLog(log)}
                                                className="text-[11px] py-1 px-2.5 h-auto text-slate-600"
                                            >
                                                <Eye className="w-3 h-3 mr-1" /> Inspect
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* LOG INSPECTION MODAL */}
                {selectedLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="w-5 h-5 text-cyan-600" />
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">Audit Log Payload & Cryptographic Record</h3>
                                        <p className="text-[11px] text-slate-400 font-mono">ID: {selectedLog.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-5 space-y-4 overflow-y-auto flex-1">
                                {selectedLog.is_break_glass && (
                                    <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                                        <div className="font-bold flex items-center gap-1.5 text-xs text-rose-800 uppercase tracking-wider">
                                            <AlertOctagon className="w-4 h-4 text-rose-600" /> Emergency Break-Glass Justification
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed font-medium">
                                            {selectedLog.justification || 'No clinical reason specified.'}
                                        </p>
                                    </div>
                                )}

                                {/* Cryptographic Hashes */}
                                <div className="p-3.5 bg-slate-900 rounded-xl text-slate-200 font-mono text-xs space-y-2">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase">Previous SHA-256 Hash:</span>
                                        <span className="text-slate-300 break-all">{selectedLog.previous_hash || 'GENESIS_HASH_0000000000000000'}</span>
                                    </div>
                                    <div>
                                        <span className="text-cyan-400 block text-[10px] uppercase">Current SHA-256 Hash:</span>
                                        <span className="text-cyan-300 font-bold break-all">{selectedLog.current_hash || 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Payload Diff */}
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Old Values</span>
                                        <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap overflow-x-auto max-h-48">
                                            {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : 'null'}
                                        </pre>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">New Values</span>
                                        <pre className="font-mono text-[11px] text-slate-700 whitespace-pre-wrap overflow-x-auto max-h-48">
                                            {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : 'null'}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 flex justify-end">
                                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* BREAK GLASS MODAL */}
                {showBreakGlassModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-rose-300 overflow-hidden">
                            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertOctagon className="w-5 h-5 text-white" />
                                    <h3 className="font-black text-white text-base">Break-Glass Emergency Protocol</h3>
                                </div>
                                <button
                                    onClick={() => setShowBreakGlassModal(false)}
                                    className="p-1 rounded-lg text-rose-200 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleTriggerBreakGlass} className="p-5 space-y-4">
                                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 text-xs leading-relaxed">
                                    <span className="font-bold block mb-0.5">⚠️ WARNING: HIPAA & GDPR MANDATORY AUDIT</span>
                                    Break-Glass emergency override grants instant administrative clearance to protected clinical records. Every invocation is cryptographically hash-chained and immediately broadcasts an alert to Hospital Administration.
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Entity / Clinical Resource</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PatientRecord, Prescription, LabOrder"
                                        value={bgEntityType}
                                        onChange={(e) => setBgEntityType(e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Entity UUID / MRN</label>
                                    <input
                                        type="text"
                                        placeholder="Target UUID or Resource Identifier"
                                        value={bgEntityId}
                                        onChange={(e) => setBgEntityId(e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200 font-mono"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Mandatory Clinical Emergency Justification</label>
                                    <textarea
                                        rows={3}
                                        placeholder="State explicit clinical emergency reason (e.g., Unconscious trauma patient admitted to ER without consent access)..."
                                        value={bgJustification}
                                        onChange={(e) => setBgJustification(e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                        minLength={10}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowBreakGlassModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                                    >
                                        Authorize & Record Override
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
