import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import {
    TrendingUp, DollarSign, Users, ShieldAlert,
    CreditCard, ArrowUpRight, BarChart3, Building,
    Edit3, CheckCircle2, Clock, Check, XCircle
} from 'lucide-react';
import { Badge } from '@/Components/ui/Badge';

interface Props {
    metrics: {
        mrr: number;
        arr: number;
        total_revenue: number;
        total_tenants: number;
        active_subscribers_count: number;
        trialing_count: number;
        past_due_count: number;
        churned_count: number;
    };
    plans: Array<{
        plan_id: string;
        name: string;
        slug: string;
        tier_level: number;
        active_subscribers: number;
        monthly_price: number;
        annual_price: number;
        limits: Record<string, number | null>;
        features: Record<string, boolean>;
    }>;
    recentInvoices: Array<{
        id: string;
        invoice_number: string;
        tenant_name: string;
        plan_name: string;
        billing_reason: string;
        total_amount: number;
        status: string;
        status_label: string;
        badge_class: string;
        paid_at?: string;
        created_at: string;
    }>;
}

export default function SuperAdminSaaSCockpit({ metrics, plans, recentInvoices }: Props) {
    const [editingPlan, setEditingPlan] = useState<Props['plans'][0] | null>(null);
    const [editMonthlyPrice, setEditMonthlyPrice] = useState<number>(0);
    const [editAnnualPrice, setEditAnnualPrice] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);

    const openEditModal = (p: Props['plans'][0]) => {
        setEditingPlan(p);
        setEditMonthlyPrice(p.monthly_price);
        setEditAnnualPrice(p.annual_price);
    };

    const handleSavePlan = () => {
        if (!editingPlan) return;
        setIsSaving(true);

        router.patch(`/saas/admin/plans/${editingPlan.plan_id}`, {
            monthly_price: editMonthlyPrice,
            annual_price: editAnnualPrice,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setIsSaving(false);
                setEditingPlan(null);
            },
        });
    };

    return (
        <AppLayout title="SuperAdmin SaaS Cockpit">
            <Head title="SuperAdmin SaaS Monetization & Revenue Cockpit" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider border border-indigo-200">
                            <BarChart3 className="w-3.5 h-3.5" />
                            Multi-Tenant Monetization Engine
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                            SuperAdmin SaaS Revenue & Subscription Cockpit
                        </h1>
                        <p className="text-xs text-slate-500">
                            Global recurring revenue, tier distribution, subscription health metrics, and tenant proration audit.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Badge variant="cyan" className="font-mono text-xs py-1 px-3">
                            {metrics.total_tenants} Hospital Tenants Registered
                        </Badge>
                    </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MRR</span>
                            <span className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
                                <DollarSign className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono">
                            ${metrics.mrr.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Monthly Recurring Revenue
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ARR Projected</span>
                            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                <TrendingUp className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono">
                            ${metrics.arr.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Annualized Run-Rate
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Paid Subs</span>
                            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                                <Users className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono">
                            {metrics.active_subscribers_count}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                            {metrics.trialing_count} currently on trial
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Past-Due / Grace</span>
                            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                                <ShieldAlert className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 font-mono">
                            {metrics.past_due_count}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {metrics.churned_count} cancelled churn
                        </div>
                    </div>
                </div>

                {/* Plan Distribution & Tier Controls */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">SaaS Subscription Tier Catalog</h2>
                            <p className="text-xs text-slate-500">Live pricing, bed/doctor quota caps, and active tenant distribution.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((p) => (
                            <div key={p.plan_id} className="rounded-xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-slate-900">{p.name}</h3>
                                        <Badge variant="slate" className="mt-1 text-[10px]">
                                            Tier Level {p.tier_level}
                                        </Badge>
                                    </div>
                                    <button
                                        onClick={() => openEditModal(p)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                                        title="Configure Pricing"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-2xl font-extrabold text-slate-900 font-mono">
                                        ${p.monthly_price} <span className="text-xs font-normal text-slate-500">/ mo</span>
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">
                                        ${p.annual_price} / year
                                    </div>
                                </div>

                                <div className="py-3 border-y border-slate-100 space-y-1.5 text-xs text-slate-600">
                                    <div className="flex justify-between">
                                        <span>Active Tenants:</span>
                                        <span className="font-bold text-slate-900 font-mono">{p.active_subscribers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Bed Capacity:</span>
                                        <span className="font-semibold">{p.limits?.max_beds ?? 'Unlimited'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Doctor Seats:</span>
                                        <span className="font-semibold">{p.limits?.max_doctors ?? 'Unlimited'}</span>
                                    </div>
                                </div>

                                <div className="text-[11px] text-slate-500 space-y-1">
                                    <span className="font-semibold uppercase tracking-wider text-slate-700">Premium Features:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {Object.entries(p.features || {})
                                            .filter(([_, val]) => Boolean(val))
                                            .slice(0, 3)
                                            .map(([feat]) => (
                                                <span key={feat} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                                    {feat.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Cross-Tenant Subscription Invoices */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recent Cross-Tenant Subscription Invoices</h2>
                        <p className="text-xs text-slate-500">Real-time ledger of billing settlements and plan upgrades across all healthcare institutions.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                                    <th className="py-3 px-4">Invoice #</th>
                                    <th className="py-3 px-4">Tenant Hospital</th>
                                    <th className="py-3 px-4">Plan Tier</th>
                                    <th className="py-3 px-4">Billing Reason</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                                        <td className="py-3 px-4 font-semibold text-slate-800">{inv.tenant_name}</td>
                                        <td className="py-3 px-4">
                                            <Badge variant="cyan" className="text-[10px]">
                                                {inv.plan_name}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 font-medium">{inv.billing_reason.replace(/_/g, ' ')}</td>
                                        <td className="py-3 px-4 font-mono font-bold text-slate-900">${inv.total_amount.toFixed(2)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.badge_class}`}>
                                                {inv.status_label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 font-mono">{new Date(inv.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Plan Edit Modal */}
            {editingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Configure {editingPlan.name}</h3>
                                <p className="text-xs text-slate-500">Update global monthly and annual subscription rates.</p>
                            </div>
                            <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Monthly Price ($ USD)</label>
                                <input
                                    type="number"
                                    value={editMonthlyPrice}
                                    onChange={(e) => setEditMonthlyPrice(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Annual Price ($ USD)</label>
                                <input
                                    type="number"
                                    value={editAnnualPrice}
                                    onChange={(e) => setEditAnnualPrice(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setEditingPlan(null)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePlan}
                                disabled={isSaving}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
                            >
                                {isSaving ? 'Saving...' : 'Save Pricing'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
