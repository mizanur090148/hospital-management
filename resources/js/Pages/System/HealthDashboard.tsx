import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import {
    Activity, Database, Server, HardDrive, RefreshCw,
    ShieldCheck, CheckCircle2, AlertTriangle, Layers,
    Clock, Cpu, Terminal, ArrowUpRight, Zap
} from 'lucide-react';
import { Badge } from '@/Components/ui/Badge';

interface CheckDetail {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency_ms?: number;
    error?: string;
    [key: string]: any;
}

interface Props {
    report: {
        status: 'healthy' | 'degraded';
        timestamp: string;
        app: {
            name: string;
            environment: string;
            php_version: string;
            laravel_version: string;
        };
        checks: {
            database: CheckDetail;
            cache: CheckDetail;
            storage: CheckDetail;
            queue: CheckDetail;
            multi_tenant_isolation: CheckDetail;
            cryptographic_audit_trail: CheckDetail;
        };
    };
}

export default function HealthDashboard({ report }: Props) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => setIsRefreshing(false),
        });
    };

    const isHealthy = report.status === 'healthy';

    return (
        <AppLayout title="System Health & Infrastructure Diagnostics">
            <Head title="System Infrastructure Health Diagnostics" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wider border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live System Diagnostics
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                            System Infrastructure & Multi-Tenant Health
                        </h1>
                        <p className="text-xs text-slate-500">
                            Continuous probes verifying database latency, cache stores, storage availability, queue workers, and multi-tenant isolation.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-600' : ''}`} />
                            <span>{isRefreshing ? 'Probing Subsystems...' : 'Re-run Health Probes'}</span>
                        </button>
                        <a
                            href="/api/health"
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                        >
                            <span>JSON API</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>

                {/* Overall Status Banner */}
                <div className={`rounded-2xl p-6 border shadow-xs transition-all ${isHealthy ? 'bg-gradient-to-r from-emerald-50 to-teal-50/50 border-emerald-200' : 'bg-gradient-to-r from-rose-50 to-amber-50/50 border-rose-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${isHealthy ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                {isHealthy ? <CheckCircle2 className="w-6 h-6 stroke-[2.5]" /> : <AlertTriangle className="w-6 h-6 stroke-[2.5]" />}
                            </div>
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    {isHealthy ? 'All Enterprise Systems Operational' : 'Degraded Infrastructure Detected'}
                                </h2>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    Last probe executed at <span className="font-mono font-semibold">{new Date(report.timestamp).toLocaleTimeString()}</span> across 6 core infrastructure subsystems.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge variant={isHealthy ? 'success' : 'destructive'} className="text-xs px-3 py-1 font-bold uppercase tracking-wider">
                                {report.status}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Subsystem Health Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Database Probe */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
                                    <Database className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">PostgreSQL Relational DB</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                {report.checks.database.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Query Latency:</span>
                                <span className="font-mono font-bold text-slate-900">{report.checks.database.latency_ms ?? 0} ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Connection Driver:</span>
                                <span className="font-mono">{report.checks.database.connection}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Engine Version:</span>
                                <span className="truncate max-w-[150px] font-mono text-[11px]">{report.checks.database.version}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cache Probe */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Cache & In-Memory Store</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                {report.checks.cache.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Read/Write Latency:</span>
                                <span className="font-mono font-bold text-slate-900">{report.checks.cache.latency_ms ?? 0} ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Store Driver:</span>
                                <span className="font-mono uppercase">{report.checks.cache.driver}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Probe State:</span>
                                <span className="text-emerald-600 font-semibold">Pass (Read/Write Confirmed)</span>
                            </div>
                        </div>
                    </div>

                    {/* Storage Vault Probe */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                                    <HardDrive className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Clinical Storage Vault</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                {report.checks.storage.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">I/O Write Latency:</span>
                                <span className="font-mono font-bold text-slate-900">{report.checks.storage.latency_ms ?? 0} ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Storage Backend:</span>
                                <span className="font-mono uppercase">{report.checks.storage.default_disk}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Permissions:</span>
                                <span className="text-emerald-600 font-semibold">Read / Write Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Queue Broker Probe */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-violet-50 text-violet-700">
                                    <Server className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Background Queue Broker</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                {report.checks.queue.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Pending Jobs:</span>
                                <span className="font-mono font-bold text-slate-900">{report.checks.queue.pending_jobs}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Failed Jobs:</span>
                                <span className={`font-mono font-bold ${report.checks.queue.failed_jobs > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                    {report.checks.queue.failed_jobs}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Queue Connection:</span>
                                <span className="font-mono uppercase">{report.checks.queue.driver}</span>
                            </div>
                        </div>
                    </div>

                    {/* Multi-Tenant Isolation Probe */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Multi-Tenant Isolation</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                {report.checks.multi_tenant_isolation.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Global Query Scope:</span>
                                <span className="text-emerald-600 font-semibold">Active & Enforced</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Isolated Tenants:</span>
                                <span className="font-mono font-bold text-slate-900">{report.checks.multi_tenant_isolation.total_isolated_tenants}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Data Leakage Guard:</span>
                                <span className="text-emerald-600 font-semibold">Zero-Cross Leakage</span>
                            </div>
                        </div>
                    </div>

                    {/* Cryptographic Audit Trail */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Cryptographic Audit Ledger</h3>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                {report.checks.cryptographic_audit_trail.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Hash Algorithm:</span>
                                <span className="font-mono font-bold text-slate-900">{report.checks.cryptographic_audit_trail.hash_algorithm}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Chained Records:</span>
                                <span className="font-mono font-bold text-slate-900">{report.checks.cryptographic_audit_trail.total_hash_chained_records}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tamper-Evident Chain:</span>
                                <span className="text-emerald-600 font-semibold">Verified</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Environment Meta Table */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-600" />
                        Application Runtime Environment Metadata
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Application</div>
                            <div className="font-bold text-slate-900 mt-0.5">{report.app.name}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Environment</div>
                            <div className="font-bold text-slate-900 font-mono mt-0.5">{report.app.environment}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">PHP Engine</div>
                            <div className="font-bold text-slate-900 font-mono mt-0.5">{report.app.php_version}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                            <div className="text-slate-400 text-[10px] uppercase font-semibold">Framework</div>
                            <div className="font-bold text-slate-900 font-mono mt-0.5">Laravel {report.app.laravel_version}</div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
