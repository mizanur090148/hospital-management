import React from 'react';
import { usePage, Link } from '@inertiajs/react';
import {
    Activity, Users, Building2, ShieldCheck,
    Database, Cpu, Clock, CheckCircle2, ArrowUpRight,
    Server, Lock, Key, Layers
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';

interface DashboardStats {
    totalStaff: number;
    activeBranches: number;
    recentAudits: Array<{
        id: string;
        action: string;
        entity: string;
        user: string;
        ip: string;
        time: string;
    }>;
    systemHealth: {
        database: string;
        tenancy: string;
        phpVersion: string;
        framework: string;
    };
}

export default function Dashboard({ stats }: { stats: DashboardStats }) {
    const { auth, tenantContext } = usePage<PageProps>().props;

    return (
        <AppLayout title="Executive Overview">
            <div className="space-y-6">
                {/* Welcome Hospital Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 sm:p-8 text-white shadow-lg border border-slate-700/50">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="cyan" className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30">
                                    <Building2 className="w-3.5 h-3.5 mr-1" />
                                    {tenantContext.tenant?.trade_name || 'Apex SaaS Platform'}
                                </Badge>
                                {tenantContext.branch && (
                                    <Badge variant="default" className="bg-white/10 text-white border-white/20">
                                        Branch: {tenantContext.branch.name}
                                    </Badge>
                                )}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                Welcome, {auth.user?.name}
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                                Enterprise Clinical Workspace initialized under isolated multi-tenancy. You are authenticated as <span className="font-semibold text-cyan-400">{auth.user?.user_type_label}</span>.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Tenant ID</span>
                                <span className="text-xs font-mono text-cyan-300 truncate max-w-[140px] block">
                                    {tenantContext.tenant?.id || 'Platform Root'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Core Architecture Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="hover:border-cyan-200 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hospital Staff</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalStaff}</h3>
                                <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Provisioned & Active
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-cyan-200 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Facility Branches</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.activeBranches}</h3>
                                <p className="text-[11px] text-cyan-600 font-medium flex items-center mt-1">
                                    <Building2 className="w-3.5 h-3.5 mr-1" /> Active Topology
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                <Layers className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-cyan-200 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Database Engine</p>
                                <h3 className="text-base font-bold text-slate-900 mt-1">PostgreSQL 18</h3>
                                <p className="text-[11px] text-indigo-600 font-medium flex items-center mt-1">
                                    <Lock className="w-3.5 h-3.5 mr-1" /> Row-Level Security Ready
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Database className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:border-cyan-200 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">PHP 8.4 Runtime</p>
                                <h3 className="text-base font-bold text-slate-900 mt-1">{stats.systemHealth.framework}</h3>
                                <p className="text-[11px] text-emerald-600 font-medium flex items-center mt-1">
                                    <Cpu className="w-3.5 h-3.5 mr-1" /> JIT & Strict Typing
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Server className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Architecture & Audit Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Phase 1 Foundations Verified */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                <span>Phase 1 Verification</span>
                            </CardTitle>
                            <CardDescription>
                                Foundational enterprise architectural controls in place
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-800">Multi-Tenancy Isolation</h5>
                                    <p className="text-[11px] text-slate-500 leading-normal">
                                        Eloquent <code>TenantScope</code> + PostgreSQL RLS session binding.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-800">Granular RBAC Engine</h5>
                                    <p className="text-[11px] text-slate-500 leading-normal">
                                        Hierarchical permission taxonomy with role assignments.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-800">Immutable Audit Logging</h5>
                                    <p className="text-[11px] text-slate-500 leading-normal">
                                        Automated tracking of login events, user actions, and changes.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-800">React 19 + Inertia UI</h5>
                                    <p className="text-[11px] text-slate-500 leading-normal">
                                        Tailwind v4 tokens, TypeScript strict interfaces, medical layout.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Real-time Immutable Audit Logs */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-cyan-600" />
                                    Recent Tenant Audit Events
                                </span>
                                <Badge variant="default" className="text-[10px]">
                                    Live Stream
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Immutable security and operational audit trail for compliance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats.recentAudits && stats.recentAudits.length > 0 ? (
                                <div className="divide-y divide-slate-100 overflow-hidden">
                                    {stats.recentAudits.map((log) => (
                                        <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant={log.action.includes('Logged In') ? 'success' : 'info'}
                                                    className="text-[10px]"
                                                >
                                                    {log.action}
                                                </Badge>
                                                <div>
                                                    <span className="font-semibold text-slate-800">{log.user}</span>
                                                    <span className="text-slate-400 text-[11px] ml-1.5">on {log.entity}</span>
                                                </div>
                                            </div>
                                            <div className="text-right text-[11px] text-slate-400 flex items-center gap-3">
                                                <span className="font-mono">{log.ip}</span>
                                                <span>{log.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-xs text-slate-400">
                                    No audit entries recorded for this session yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
