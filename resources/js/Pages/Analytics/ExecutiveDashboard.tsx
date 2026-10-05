import React from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import {
    TrendingUp, Activity, BedDouble, Users, AlertTriangle,
    Clock, DollarSign, Pill, FlaskConical, ScanLine, Scissors,
    Building2, ShieldAlert, CheckCircle2, ChevronRight,
    ArrowUpRight, ArrowDownRight, Layers, PieChart, Sparkles
} from 'lucide-react';

interface ExecutiveKpis {
    bed_occupancy_rate: number;
    total_beds: number;
    occupied_beds: number;
    available_beds: number;
    cleaning_beds: number;
    active_inpatients: number;
    alos_days: number;
    opd_visits_count: number;
    emergency_visits_count: number;
    emergency_triage_breakdown: Record<string, number>;
    surgeries_total: number;
    surgeries_completed: number;
    lab_orders_total: number;
    lab_orders_completed: number;
    radiology_scans_total: number;
    radiology_completed: number;
    active_batches_count: number;
    expiring_batches_count: number;
    out_of_stock_count: number;
    total_invoiced: number;
    total_collected: number;
    payroll_disbursed: number;
    pending_claims_amount: number;
    operating_surplus: number;
    income_statement?: {
        total_revenue: number;
        total_expense: number;
        net_income: number;
    };
}

interface Props {
    timeframe: string;
    kpis: ExecutiveKpis;
}

export default function ExecutiveDashboard({ timeframe, kpis }: Props) {
    const handleTimeframeChange = (newTimeframe: string) => {
        router.get('/analytics/executive', { timeframe: newTimeframe }, { preserveState: true });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const occupancyRate = kpis.bed_occupancy_rate || 0;
    const occupancyVariant = occupancyRate > 90 ? 'destructive' : occupancyRate > 75 ? 'warning' : 'success';

    return (
        <AppLayout title="Executive Analytics & Hospital KPIs">
            <Head title="C-Suite Executive Analytics - ApexCare Hospital" />

            <div className="space-y-6">
                {/* Header & Intelligence Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-400">Live Hospital Executive Intelligence</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                            C-Suite Operational & Financial KPIs
                        </h1>
                        <p className="text-xs text-slate-300 max-w-2xl mt-1">
                            Real-time inpatient census, clinical throughput, emergency triage velocity, pharmacy stock health, and Double-Entry GL fiscal performance.
                        </p>
                    </div>

                    {/* Timeframe Filter Buttons */}
                    <div className="relative z-10 flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: '7_days', label: '7 Days' },
                            { id: '30_days', label: '30 Days' },
                            { id: 'this_year', label: 'Fiscal Year' },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => handleTimeframeChange(t.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${timeframe === t.id ? 'bg-cyan-500 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Executive Scorecard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Bed Occupancy Card */}
                    <Card className="p-5 bg-white border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bed Occupancy Rate</span>
                            <Badge variant={occupancyVariant} className="font-mono">
                                {occupancyRate}%
                            </Badge>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900">{kpis.occupied_beds}</span>
                            <span className="text-xs text-slate-400 font-medium">/ {kpis.total_beds} total beds</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${occupancyRate > 90 ? 'bg-rose-500' : occupancyRate > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, occupancyRate)}%` }}
                            />
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span>{kpis.available_beds} beds free</span>
                            <span>{kpis.cleaning_beds} in sanitization</span>
                        </div>
                    </Card>

                    {/* ALOS Card */}
                    <Card className="p-5 bg-white border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Length of Stay (ALOS)</span>
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900 font-mono">{kpis.alos_days}</span>
                            <span className="text-xs text-slate-400 font-medium">days / patient</span>
                        </div>
                        <div className="mt-4 text-[11px] text-emerald-700 bg-emerald-50/70 p-2 rounded-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Optimal clinical discharge efficiency</span>
                        </div>
                    </Card>

                    {/* Total Cash Collections Card */}
                    <Card className="p-5 bg-white border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue Collected</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-emerald-700 font-mono">{formatCurrency(kpis.total_collected)}</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Invoiced: {formatCurrency(kpis.total_invoiced)}</span>
                            <span className="text-slate-400 font-mono">
                                {kpis.total_invoiced > 0 ? `${Math.round((kpis.total_collected / kpis.total_invoiced) * 100)}%` : '100%'} rec.
                            </span>
                        </div>
                    </Card>

                    {/* Operating Surplus / Margin */}
                    <Card className="p-5 bg-white border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operating Margin</span>
                            <Badge variant={kpis.operating_surplus >= 0 ? 'success' : 'destructive'}>
                                {kpis.operating_surplus >= 0 ? 'Surplus' : 'Deficit'}
                            </Badge>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold font-mono text-slate-900">
                                {formatCurrency(kpis.operating_surplus)}
                            </span>
                        </div>
                        <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
                            <span>Payroll: {formatCurrency(kpis.payroll_disbursed)}</span>
                            <span>Pending TPA: {formatCurrency(kpis.pending_claims_amount)}</span>
                        </div>
                    </Card>
                </div>

                {/* Grid 2: Clinical Care Throughput & Emergency Triage */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Clinical Encounters & Surgeries */}
                    <Card className="p-6 bg-white border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-cyan-600" />
                                <h3 className="font-bold text-slate-900 text-sm">Ambulatory & Surgical Throughput</h3>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Selected timeframe</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-5">
                            <div className="p-4 bg-cyan-50/50 rounded-xl border border-cyan-100">
                                <div className="text-[11px] font-bold uppercase text-cyan-800">OPD Consultations</div>
                                <div className="text-2xl font-black text-cyan-900 mt-1">{kpis.opd_visits_count}</div>
                                <div className="text-[10px] text-cyan-700 mt-1">Outpatient encounters</div>
                            </div>

                            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                                <div className="text-[11px] font-bold uppercase text-rose-800">Emergency Visits</div>
                                <div className="text-2xl font-black text-rose-900 mt-1">{kpis.emergency_visits_count}</div>
                                <div className="text-[10px] text-rose-700 mt-1">Trauma & triage cases</div>
                            </div>

                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="text-[11px] font-bold uppercase text-indigo-800">OT Surgeries</div>
                                <div className="text-2xl font-black text-indigo-900 mt-1">
                                    {kpis.surgeries_completed} <span className="text-xs font-normal text-indigo-600">/ {kpis.surgeries_total}</span>
                                </div>
                                <div className="text-[10px] text-indigo-700 mt-1">Theatres completed</div>
                            </div>
                        </div>

                        {/* Emergency Triage ESI 1-5 Breakdown */}
                        <div className="mt-6">
                            <div className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                                <span>Emergency Triage Velocity (ESI Levels)</span>
                                <span className="text-[11px] text-slate-400 font-normal">Level 1 (Resuscitation) to Level 5 (Non-urgent)</span>
                            </div>

                            <div className="space-y-2 text-xs">
                                {[
                                    { level: '1', name: 'ESI 1: Resuscitation / Immediate', color: 'bg-rose-600 text-rose-600' },
                                    { level: '2', name: 'ESI 2: Emergent / High Risk', color: 'bg-orange-500 text-orange-500' },
                                    { level: '3', name: 'ESI 3: Urgent / Multiple Resources', color: 'bg-amber-500 text-amber-500' },
                                    { level: '4', name: 'ESI 4: Less Urgent', color: 'bg-teal-500 text-teal-500' },
                                    { level: '5', name: 'ESI 5: Non-Urgent', color: 'bg-slate-400 text-slate-400' },
                                ].map((tier) => {
                                    const count = kpis.emergency_triage_breakdown[tier.level] || 0;
                                    const total = kpis.emergency_visits_count || 1;
                                    const pct = Math.round((count / total) * 100);
                                    return (
                                        <div key={tier.level} className="flex items-center gap-3">
                                            <span className="w-56 truncate text-slate-600 text-[11px] font-medium">{tier.name}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className={`h-full ${tier.color.split(' ')[0]}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="w-12 text-right font-mono font-bold text-slate-800 text-[11px]">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>

                    {/* Diagnostics & Pharmacy Health */}
                    <Card className="p-6 bg-white border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-purple-600" />
                                <h3 className="font-bold text-slate-900 text-sm">Diagnostics & Pharmacy Supply Risk</h3>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Quality & Continuity</span>
                        </div>

                        {/* Diagnostics Completion */}
                        <div className="grid grid-cols-2 gap-4 mt-5">
                            <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                                <div className="flex items-center justify-between">
                                    <div className="text-[11px] font-bold uppercase text-purple-800">Laboratory Orders</div>
                                    <FlaskConical className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="text-2xl font-black text-purple-900 mt-2">
                                    {kpis.lab_orders_completed} <span className="text-xs font-normal text-purple-600">/ {kpis.lab_orders_total}</span>
                                </div>
                                <div className="text-[10px] text-purple-700 mt-1">
                                    {kpis.lab_orders_total > 0 ? Math.round((kpis.lab_orders_completed / kpis.lab_orders_total) * 100) : 100}% reported
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="flex items-center justify-between">
                                    <div className="text-[11px] font-bold uppercase text-blue-800">Radiology PACS</div>
                                    <ScanLine className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="text-2xl font-black text-blue-900 mt-2">
                                    {kpis.radiology_completed} <span className="text-xs font-normal text-blue-600">/ {kpis.radiology_scans_total}</span>
                                </div>
                                <div className="text-[10px] text-blue-700 mt-1">
                                    {kpis.radiology_scans_total > 0 ? Math.round((kpis.radiology_completed / kpis.radiology_scans_total) * 100) : 100}% scanned
                                </div>
                            </div>
                        </div>

                        {/* Pharmacy Inventory Risk Alerts */}
                        <div className="mt-6 border-t border-slate-100 pt-5">
                            <div className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                                <span>Pharmacy Supply Chain Health & FEFO</span>
                                <Badge variant="cyan">{kpis.active_batches_count} Active Batches</Badge>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                            <AlertTriangle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-800">Batches Expiring in 30 Days</div>
                                            <div className="text-[11px] text-slate-400">Requires FEFO prioritized dispensing</div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-amber-700 text-sm">{kpis.expiring_batches_count}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-200/60">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                                            <ShieldAlert className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-rose-900">Critical Stockouts (Zero Units)</div>
                                            <div className="text-[11px] text-rose-600">Emergency reorder requisition triggered</div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-rose-700 text-sm">{kpis.out_of_stock_count}</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Grid 3: Double-Entry GL Real-Time Fiscal Standing */}
                {kpis.income_statement && (
                    <Card className="p-6 bg-white border-slate-200 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-bold text-slate-900 text-sm">General Ledger Real-Time Fiscal Standing</h3>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Synchronized with Phase 7 Balanced Double-Entry COA (Assets, Liabilities, Revenues & Healthcare Expenses)
                                </p>
                            </div>
                            <Badge variant="cyan" className="font-mono">GL Balanced</Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="text-[11px] font-bold uppercase text-slate-500">GL Operating Revenue</div>
                                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                                    {formatCurrency(kpis.income_statement.total_revenue)}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">Patient services & pharmacy billing</div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="text-[11px] font-bold uppercase text-slate-500">GL Operating Expenses</div>
                                <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
                                    {formatCurrency(kpis.income_statement.total_expense)}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">Healthcare wages, supplies & facility</div>
                            </div>

                            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
                                <div className="text-[11px] font-bold uppercase text-emerald-800">Net Operating Income</div>
                                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                                    {formatCurrency(kpis.income_statement.net_income)}
                                </div>
                                <div className="text-[11px] text-emerald-600 mt-1">Double-entry verified net bottom line</div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
