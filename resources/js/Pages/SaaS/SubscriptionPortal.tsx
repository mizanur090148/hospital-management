import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import {
    CreditCard, ShieldCheck, Zap, AlertTriangle, CheckCircle2,
    Calendar, ArrowUpRight, Check, Sparkles, Building2,
    FileText, HelpCircle, RefreshCw, XCircle, ChevronRight
} from 'lucide-react';
import { Badge } from '@/Components/ui/Badge';

interface MetricInfo {
    metric: string;
    name: string;
    unit: string;
    usage: number;
    limit: number | null;
    percentage: number;
    is_unlimited: boolean;
    status: 'safe' | 'warning' | 'critical' | 'exceeded';
}

interface PlanInfo {
    id: string;
    name: string;
    slug: string;
    tier_level: number;
    monthly_price: number;
    annual_price: number;
    description?: string;
    is_popular?: boolean;
    limits: Record<string, number | null>;
    features: Record<string, boolean>;
}

interface InvoiceInfo {
    id: string;
    invoice_number: string;
    billing_reason: string;
    subtotal: number;
    discount_amount: number;
    total_amount: number;
    currency: string;
    status: string;
    status_label: string;
    badge_class: string;
    due_date?: string;
    paid_at?: string;
    line_items: Array<{ description: string; amount: number }>;
}

interface Props {
    usageOverview: {
        tenant: { id: string; name: string; slug: string };
        plan: PlanInfo;
        subscription: {
            id: string;
            number: string;
            status: string;
            status_label: string;
            badge_class: string;
            billing_cycle: 'MONTHLY' | 'ANNUAL';
            price: number;
            current_period_ends_at?: string;
            on_trial?: boolean;
        } | null;
        metrics: Record<string, MetricInfo>;
    };
    availablePlans: PlanInfo[];
    invoices: InvoiceInfo[];
}

export default function SubscriptionPortal({ usageOverview, availablePlans, invoices }: Props) {
    const { tenant, plan: currentPlan, subscription, metrics } = usageOverview;
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>(
        subscription?.billing_cycle || 'MONTHLY'
    );
    const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<PlanInfo | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceInfo | null>(null);

    const handlePlanChange = (targetPlan: PlanInfo) => {
        setIsProcessing(true);
        router.post('/saas/subscription/change-plan', {
            plan_id: targetPlan.id,
            billing_cycle: billingCycle,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setIsProcessing(false);
                setSelectedPlanToUpgrade(null);
            },
        });
    };

    const handlePayInvoice = (invoiceId: string) => {
        setIsProcessing(true);
        router.post(`/saas/subscription/invoices/${invoiceId}/pay`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setIsProcessing(false);
                setSelectedInvoice(null);
            },
        });
    };

    const getStatusProgressBarClass = (status: MetricInfo['status']) => {
        switch (status) {
            case 'exceeded':
                return 'bg-rose-500';
            case 'critical':
                return 'bg-amber-500';
            case 'warning':
                return 'bg-yellow-400';
            default:
                return 'bg-gradient-to-r from-teal-500 to-cyan-500';
        }
    };

    return (
        <AppLayout title="Subscription & Resource Quotas">
            <Head title="SaaS Subscription & Resource Quotas" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-800/40">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold uppercase tracking-wider border border-cyan-500/30">
                                <Sparkles className="w-3.5 h-3.5" />
                                Enterprise Subscription Tier
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                {currentPlan.name}
                            </h1>
                            <p className="text-slate-300 text-sm max-w-2xl">
                                Real-time monitoring of tenant resource usage, inpatient bed capacities, staff seats, and active SaaS subscription lifecycle.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            {subscription ? (
                                <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700 text-left min-w-[200px]">
                                    <div className="text-[11px] text-slate-400 font-semibold uppercase">Active Status</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${subscription.badge_class}`}>
                                            {subscription.status_label}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-300 mt-2 font-mono">
                                        Renews: {subscription.current_period_ends_at || 'N/A'}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-950/60 rounded-xl p-4 border border-amber-800/60 text-left">
                                    <div className="text-xs font-semibold text-amber-300">Standard Tier Active</div>
                                    <div className="text-[11px] text-amber-200 mt-0.5">Upgrade to activate higher bed and doctor quotas.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Resource Quota Meter Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Tenant Resource Quotas & Live Consumption</h2>
                            <p className="text-xs text-slate-500">Limits enforced dynamically on your active subscription plan.</p>
                        </div>
                        <Badge variant="cyan" className="font-mono text-xs">
                            Tier Level: {currentPlan.tier_level}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Object.values(metrics).map((item) => (
                            <div key={item.metric} className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                                            {item.is_unlimited ? 'Unlimited Capacity' : `Cap: ${item.limit?.toLocaleString()} ${item.unit}`}
                                        </p>
                                    </div>
                                    {item.status === 'exceeded' && (
                                        <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200" title="Quota Exceeded">
                                            <AlertTriangle className="w-4 h-4" />
                                        </span>
                                    )}
                                    {item.status === 'safe' && (
                                        <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200" title="Within Normal Limits">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-bold text-slate-800 text-sm">
                                            {item.usage.toLocaleString()} <span className="text-xs text-slate-500 font-normal">{item.unit}</span>
                                        </span>
                                        {!item.is_unlimited && (
                                            <span className="font-mono font-semibold text-slate-600">
                                                {item.percentage}%
                                            </span>
                                        )}
                                    </div>

                                    {!item.is_unlimited && (
                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className={`h-2.5 rounded-full transition-all duration-500 ${getStatusProgressBarClass(item.status)}`}
                                                style={{ width: `${Math.min(100, item.percentage)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {item.status === 'exceeded' && (
                                    <p className="text-[11px] text-rose-600 font-medium">
                                        Creation of new {item.unit.toLowerCase()} is blocked. Upgrade your plan to increase limit.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Plan Selection Matrix */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Available Subscription Plans</h2>
                            <p className="text-xs text-slate-500">Seamlessly scale bed capacity, multi-branch operations, and AI intelligence.</p>
                        </div>

                        {/* Billing Cycle Switcher */}
                        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                            <button
                                onClick={() => setBillingCycle('MONTHLY')}
                                className={`px-4 py-1.5 rounded-lg transition-all ${billingCycle === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('ANNUAL')}
                                className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${billingCycle === 'ANNUAL' ? 'bg-cyan-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Annual
                                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                                    Save 20%
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {availablePlans.map((plan) => {
                            const isCurrent = currentPlan.id === plan.id;
                            const price = billingCycle === 'ANNUAL' ? plan.annual_price : plan.monthly_price;
                            const monthlyEquivalent = billingCycle === 'ANNUAL' ? Math.round(plan.annual_price / 12) : plan.monthly_price;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 ${isCurrent ? 'ring-2 ring-cyan-600 bg-cyan-50/20 shadow-md' : 'border border-slate-200 hover:border-slate-300 hover:shadow-md bg-white'}`}
                                >
                                    {plan.is_popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-xs">
                                            Most Popular
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-lg text-slate-900">{plan.name}</h3>
                                            {isCurrent && (
                                                <Badge variant="cyan" className="font-semibold text-xs">
                                                    Current Plan
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-500 min-h-[36px]">{plan.description}</p>

                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-extrabold text-slate-900">${monthlyEquivalent}</span>
                                                <span className="text-xs text-slate-500">/ month</span>
                                            </div>
                                            {billingCycle === 'ANNUAL' && (
                                                <div className="text-[11px] text-cyan-700 font-medium mt-0.5">
                                                    Billed annually (${plan.annual_price}/yr)
                                                </div>
                                            )}
                                        </div>

                                        {/* Quota Highlights */}
                                        <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                                            <div className="flex items-center justify-between text-slate-700">
                                                <span className="text-slate-500">Max Beds:</span>
                                                <span className="font-semibold">{plan.limits?.max_beds?.toLocaleString() ?? 'Unlimited'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-700">
                                                <span className="text-slate-500">Doctor Seats:</span>
                                                <span className="font-semibold">{plan.limits?.max_doctors?.toLocaleString() ?? 'Unlimited'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-700">
                                                <span className="text-slate-500">SMS / Month:</span>
                                                <span className="font-semibold">{plan.limits?.monthly_sms_quota?.toLocaleString() ?? 'Unlimited'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-700">
                                                <span className="text-slate-500">Storage:</span>
                                                <span className="font-semibold">{plan.limits?.max_storage_gb ?? 10} GB</span>
                                            </div>
                                        </div>

                                        {/* Included Features */}
                                        <div className="space-y-2 text-xs">
                                            <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider">Features Included</div>
                                            {Object.entries(plan.features || {}).map(([key, enabled]) => (
                                                <div key={key} className="flex items-center gap-2">
                                                    {enabled ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                    ) : (
                                                        <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                                    )}
                                                    <span className={enabled ? 'text-slate-700' : 'text-slate-400 line-through'}>
                                                        {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        {isCurrent ? (
                                            <button
                                                disabled
                                                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed text-center"
                                            >
                                                Active Plan
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setSelectedPlanToUpgrade(plan)}
                                                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <span>Switch to {plan.name}</span>
                                                <ArrowUpRight className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Subscription Invoice History */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Subscription Invoices & Receipts</h2>
                            <p className="text-xs text-slate-500">History of automated monthly/annual recurring charges and plan migrations.</p>
                        </div>
                    </div>

                    {invoices.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                            No subscription invoices recorded yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
                                        <th className="py-3 px-4">Invoice #</th>
                                        <th className="py-3 px-4">Billing Reason</th>
                                        <th className="py-3 px-4">Subtotal</th>
                                        <th className="py-3 px-4">Discount</th>
                                        <th className="py-3 px-4">Total Amount</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                                            <td className="py-3 px-4 font-medium text-slate-700">{inv.billing_reason.replace(/_/g, ' ')}</td>
                                            <td className="py-3 px-4 font-mono">${inv.subtotal.toFixed(2)}</td>
                                            <td className="py-3 px-4 font-mono text-emerald-600">-${inv.discount_amount.toFixed(2)}</td>
                                            <td className="py-3 px-4 font-mono font-bold text-slate-900">${inv.total_amount.toFixed(2)}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.badge_class}`}>
                                                    {inv.status_label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 font-mono">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : inv.due_date}</td>
                                            <td className="py-3 px-4 text-right">
                                                {inv.status === 'PENDING' ? (
                                                    <button
                                                        onClick={() => handlePayInvoice(inv.id)}
                                                        disabled={isProcessing}
                                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                                                    >
                                                        Pay Now
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setSelectedInvoice(inv)}
                                                        className="text-cyan-700 hover:text-cyan-900 font-semibold cursor-pointer"
                                                    >
                                                        View Receipt
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Plan Switch Confirmation Modal */}
            {selectedPlanToUpgrade && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Confirm Plan Migration</h3>
                                <p className="text-xs text-slate-500">Switching from {currentPlan.name} to {selectedPlanToUpgrade.name}</p>
                            </div>
                            <button onClick={() => setSelectedPlanToUpgrade(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600">
                                <span>Selected Billing Cycle:</span>
                                <span className="font-bold text-slate-900">{billingCycle === 'ANNUAL' ? 'Annual (20% Off)' : 'Monthly'}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                                <span>New Plan Rate:</span>
                                <span className="font-mono font-bold text-slate-900">
                                    ${billingCycle === 'ANNUAL' ? selectedPlanToUpgrade.annual_price : selectedPlanToUpgrade.monthly_price}
                                </span>
                            </div>
                            <div className="flex justify-between text-emerald-700 font-medium pt-2 border-t border-slate-200">
                                <span>Prorated Unused Credit:</span>
                                <span>Calculated automatically</span>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500">
                            By confirming, your tenant subscription will be migrated immediately. Your quotas will update in real time and an itemized prorated invoice will be generated.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setSelectedPlanToUpgrade(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handlePlanChange(selectedPlanToUpgrade)}
                                disabled={isProcessing}
                                className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs cursor-pointer"
                            >
                                {isProcessing ? 'Processing Migration...' : 'Confirm Plan Switch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Receipt Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Invoice {selectedInvoice.invoice_number}</h3>
                                <p className="text-xs text-slate-500">Billing: {selectedInvoice.billing_reason.replace(/_/g, ' ')}</p>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="font-semibold text-slate-800">Line Items</div>
                            <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                                {selectedInvoice.line_items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-700 font-medium">{item.description}</span>
                                        <span className="font-mono font-bold text-slate-900">${Number(item.amount).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-200 text-right text-xs">
                                <div className="text-slate-500">Subtotal: <span className="font-mono font-bold text-slate-800">${selectedInvoice.subtotal.toFixed(2)}</span></div>
                                {selectedInvoice.discount_amount > 0 && (
                                    <div className="text-emerald-600">Discount/Credit: <span className="font-mono font-bold">-${selectedInvoice.discount_amount.toFixed(2)}</span></div>
                                )}
                                <div className="text-base font-extrabold text-slate-900">
                                    Total: ${selectedInvoice.total_amount.toFixed(2)} {selectedInvoice.currency}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl"
                            >
                                Close Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
