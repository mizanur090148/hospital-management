import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Receipt, Search, Plus, Filter, DollarSign,
    CreditCard, Shield, CheckCircle2, Clock, Printer,
    FileText, X, Trash2, ArrowUpRight, User, AlertCircle
} from 'lucide-react';

interface Patient {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
}

interface Branch {
    id: string;
    name: string;
    code: string;
}

interface Department {
    id: string;
    name: string;
    code: string;
}

interface InsurancePolicy {
    id: string;
    policy_number: string;
    coverage_percentage: string;
    copay_amount: string;
    annual_limit: string;
    patient?: Patient;
    provider?: {
        name: string;
        code: string;
    };
}

interface InvoiceItem {
    id: string;
    item_type: string;
    description: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
    department?: {
        name: string;
    };
}

interface Payment {
    id: string;
    receipt_number: string;
    payment_method: string;
    amount: string;
    transaction_reference?: string;
    payment_date: string;
    receivedByUser?: {
        name: string;
    };
}

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date?: string;
    subtotal: string;
    discount_amount: string;
    tax_amount: string;
    insurance_covered_amount: string;
    patient_payable_amount: string;
    total_amount: string;
    paid_amount: string;
    status: string;
    notes?: string;
    patient: Patient;
    branch: Branch;
    policy?: InsurancePolicy;
    items: InvoiceItem[];
    payments: Payment[];
}

interface Props {
    invoices: {
        data: Invoice[];
        links: any[];
        total: number;
    };
    patients: Patient[];
    branches: Branch[];
    departments: Department[];
    policies: InsurancePolicy[];
    itemTypes: string[];
    paymentMethods: string[];
    filters: {
        status?: string;
        search?: string;
    };
    stats: {
        total_invoiced: number;
        total_paid: number;
        total_ar: number;
        total_insurance: number;
    };
}

export default function InvoicesIndex({
    invoices,
    patients,
    branches,
    departments,
    policies,
    itemTypes,
    paymentMethods,
    filters,
    stats,
}: Props) {
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

    // Filters
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/billing/invoices', {
            search: search || undefined,
            status: statusFilter || undefined,
        }, { preserveState: true });
    };

    // Form: Create Invoice
    const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
    const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');

    // Detect if patient has policy
    const patientPolicies = policies.filter((p) => p.patient?.id === selectedPatientId);

    const [lineItems, setLineItems] = useState<Array<{
        department_id?: string;
        item_type: string;
        description: string;
        quantity: number;
        unit_price: number;
    }>>([
        {
            department_id: departments[0]?.id,
            item_type: 'OPD_CONSULTATION',
            description: 'Specialist Physician Consultation Fee',
            quantity: 1,
            unit_price: 75.00,
        }
    ]);

    const {
        data: invoiceData,
        setData: setInvoiceData,
        post: postInvoice,
        processing: invoiceProcessing,
        reset: resetInvoice,
    } = useForm({
        branch_id: branches[0]?.id || '',
        patient_id: patients[0]?.id || '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        insurance_policy_id: '',
        notes: '',
        items: [] as any[],
    });

    const calculateSubtotal = () => {
        return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        invoiceData.patient_id = selectedPatientId;
        invoiceData.insurance_policy_id = selectedPolicyId;
        invoiceData.items = lineItems;

        postInvoice('/billing/invoices', {
            onSuccess: () => {
                setIsCreateOpen(false);
                resetInvoice();
            },
        });
    };

    // Form: Record Payment
    const {
        data: paymentData,
        setData: setPaymentData,
        post: postPayment,
        processing: paymentProcessing,
        reset: resetPayment,
    } = useForm({
        amount: 0,
        payment_method: 'CASH',
        transaction_reference: '',
        notes: '',
    });

    const openPaymentModal = (inv: Invoice) => {
        setPaymentInvoice(inv);
        const balance = Math.max(0, parseFloat(inv.total_amount) - parseFloat(inv.paid_amount));
        setPaymentData('amount', balance);
        setPaymentData('payment_method', 'CASH');
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentInvoice) return;

        postPayment(`/billing/invoices/${paymentInvoice.id}/payments`, {
            onSuccess: () => {
                setPaymentInvoice(null);
                resetPayment();
            },
        });
    };

    return (
        <AppLayout title="Billing & Cashier Workstation">
            <Head title="Hospital Invoicing & Cashier POS" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Phase 7: Financial Core
                            </span>
                            <span className="text-xs text-slate-400">Automated GL Integration</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2.5">
                            <Receipt className="w-7 h-7 text-emerald-400" />
                            Unified Hospital Billing & Cashier POS
                        </h1>
                        <p className="text-slate-300 text-sm mt-1">
                            Centralized charge capture, insurance co-pay splits, cashier settlement, and double-entry general ledger posting.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 text-xs py-2 px-4"
                        >
                            <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                            Create Invoice
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-5 border-l-4 border-l-emerald-500 bg-white shadow-xs">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced Volume</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">
                            ${Number(stats.total_invoiced).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Cumulative clinical charges</p>
                    </Card>

                    <Card className="p-5 border-l-4 border-l-teal-500 bg-white shadow-xs">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cashier Collections</p>
                        <p className="text-2xl font-black text-teal-700 mt-1">
                            ${Number(stats.total_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Settled patient & insurer funds</p>
                    </Card>

                    <Card className="p-5 border-l-4 border-l-amber-500 bg-white shadow-xs">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accounts Receivable (AR)</p>
                        <p className="text-2xl font-black text-amber-600 mt-1">
                            ${Number(stats.total_ar).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Outstanding balance due</p>
                    </Card>

                    <Card className="p-5 border-l-4 border-l-indigo-500 bg-white shadow-xs">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Insurance Coverage</p>
                        <p className="text-2xl font-black text-indigo-700 mt-1">
                            ${Number(stats.total_insurance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">TPA claims portion</p>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <Card className="p-4 bg-white border border-slate-200">
                    <form onSubmit={handleFilter} className="flex flex-col md:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by invoice # (INV-...), patient MRN, or patient name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full md:w-48 py-2 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">All Invoice Statuses</option>
                            <option value="ISSUED">Issued (Unpaid)</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="PAID">Paid in Full</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 text-sm px-5 w-full md:w-auto">
                                Filter
                            </Button>
                            {(filters.search || filters.status) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setSearch('');
                                        setStatusFilter('');
                                        router.get('/billing/invoices');
                                    }}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>
                </Card>

                {/* Invoices Table */}
                <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 text-base">Invoices & Financial Ledger</h2>
                        <span className="text-xs text-slate-400">Total: {invoices.total} invoices</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Invoice #</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Patient</th>
                                    <th className="py-3 px-4">Total</th>
                                    <th className="py-3 px-4">Insurance</th>
                                    <th className="py-3 px-4">Patient Due</th>
                                    <th className="py-3 px-4">Paid</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoices.data.map((inv) => {
                                    const balanceDue = Math.max(0, parseFloat(inv.total_amount) - parseFloat(inv.paid_amount));
                                    const isPaid = balanceDue <= 0;

                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-xs">
                                                {inv.invoice_number}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                                                {inv.invoice_date}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900">
                                                    {inv.patient?.first_name} {inv.patient?.last_name}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">
                                                    MRN: {inv.patient?.mrn}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                                ${Number(inv.total_amount).toFixed(2)}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-xs text-indigo-700 font-semibold">
                                                ${Number(inv.insurance_covered_amount).toFixed(2)}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-xs text-slate-800 font-bold">
                                                ${Number(inv.patient_payable_amount).toFixed(2)}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-xs text-emerald-700 font-bold">
                                                ${Number(inv.paid_amount).toFixed(2)}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {isPaid ? (
                                                    <Badge variant="success" className="text-[10px]">Paid in Full</Badge>
                                                ) : parseFloat(inv.paid_amount) > 0 ? (
                                                    <Badge variant="amber" className="text-[10px]">Partially Paid</Badge>
                                                ) : (
                                                    <Badge variant="cyan" className="text-[10px]">Issued</Badge>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right space-x-2">
                                                {!isPaid && (
                                                    <Button
                                                        onClick={() => openPaymentModal(inv)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1 px-2.5 shadow-xs font-bold"
                                                    >
                                                        <DollarSign className="w-3.5 h-3.5 mr-1" />
                                                        Pay
                                                    </Button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedInvoice(inv)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    View Bill
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal: Create Invoice */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-3xl w-full p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Generate Patient Hospital Bill</h3>
                                <p className="text-xs text-slate-500">Capture clinical service items, verify insurance coverage & post to GL</p>
                            </div>
                            <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Patient *</label>
                                    <select
                                        value={selectedPatientId}
                                        onChange={(e) => {
                                            setSelectedPatientId(e.target.value);
                                            setSelectedPolicyId('');
                                        }}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Branch *</label>
                                    <select
                                        value={invoiceData.branch_id}
                                        onChange={(e) => setInvoiceData('branch_id', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Insurance Policy Detection */}
                            {patientPolicies.length > 0 && (
                                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-indigo-600" />
                                        <div>
                                            <span className="text-xs font-bold text-indigo-900">Active Insurance Policy Found</span>
                                            <p className="text-[11px] text-indigo-700">
                                                {patientPolicies[0].provider?.name} (Policy: #{patientPolicies[0].policy_number}, Coverage: {patientPolicies[0].coverage_percentage}%)
                                            </p>
                                        </div>
                                    </div>
                                    <select
                                        value={selectedPolicyId}
                                        onChange={(e) => setSelectedPolicyId(e.target.value)}
                                        className="py-1 px-3 rounded-lg border border-indigo-300 text-xs bg-white text-indigo-900 font-semibold"
                                    >
                                        <option value="">Do Not Apply Insurance</option>
                                        {patientPolicies.map((p) => (
                                            <option key={p.id} value={p.id}>Apply {p.provider?.name} ({p.coverage_percentage}%)</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date *</label>
                                    <Input
                                        type="date"
                                        value={invoiceData.invoice_date}
                                        onChange={(e) => setInvoiceData('invoice_date', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Due Date</label>
                                    <Input
                                        type="date"
                                        value={invoiceData.due_date}
                                        onChange={(e) => setInvoiceData('due_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700">Billable Services & Consumables</label>
                                    <button
                                        type="button"
                                        onClick={() => setLineItems([
                                            ...lineItems,
                                            {
                                                department_id: departments[0]?.id,
                                                item_type: 'GENERAL_SERVICE',
                                                description: 'Medical Nursing & Care',
                                                quantity: 1,
                                                unit_price: 30.00,
                                            }
                                        ])}
                                        className="text-xs text-emerald-600 font-semibold hover:underline"
                                    >
                                        + Add Charge Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {lineItems.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={item.item_type}
                                                    onChange={(e) => {
                                                        const copy = [...lineItems];
                                                        copy[idx].item_type = e.target.value;
                                                        setLineItems(copy);
                                                    }}
                                                    className="w-48 py-1.5 px-2 rounded-lg border border-slate-200 text-xs bg-white font-semibold"
                                                >
                                                    {itemTypes.map((t) => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => {
                                                        const copy = [...lineItems];
                                                        copy[idx].description = e.target.value;
                                                        setLineItems(copy);
                                                    }}
                                                    placeholder="Description of procedure / test / medication"
                                                    className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                                                    required
                                                />
                                                {lineItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                                                        className="text-rose-500 hover:text-rose-700 p-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-end gap-3 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">Qty:</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const copy = [...lineItems];
                                                            copy[idx].quantity = parseInt(e.target.value) || 1;
                                                            setLineItems(copy);
                                                        }}
                                                        className="w-16 py-1 px-2 rounded border border-slate-200 text-center font-bold"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">Unit Price ($):</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.unit_price}
                                                        onChange={(e) => {
                                                            const copy = [...lineItems];
                                                            copy[idx].unit_price = parseFloat(e.target.value) || 0;
                                                            setLineItems(copy);
                                                        }}
                                                        className="w-24 py-1 px-2 rounded border border-slate-200 text-right font-mono font-bold"
                                                    />
                                                </div>
                                                <div className="font-mono font-bold text-slate-900 w-28 text-right">
                                                    = ${(item.quantity * item.unit_price).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Breakdown */}
                            <div className="pt-3 border-t border-slate-200 flex justify-end">
                                <div className="w-72 space-y-1.5 text-xs text-slate-700 font-mono">
                                    <div className="flex justify-between">
                                        <span>Gross Subtotal:</span>
                                        <span className="font-bold">${calculateSubtotal().toFixed(2)}</span>
                                    </div>
                                    {selectedPolicyId && (
                                        <div className="flex justify-between text-indigo-700">
                                            <span>Insurance Portion:</span>
                                            <span>-${(calculateSubtotal() * 0.8).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                                        <span>Patient Co-Pay:</span>
                                        <span className="text-emerald-700">
                                            ${(selectedPolicyId ? calculateSubtotal() * 0.2 : calculateSubtotal()).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={invoiceProcessing} className="bg-emerald-600 text-white hover:bg-emerald-500 font-bold">
                                    Issue Invoice & Post to GL
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Collect Payment */}
            {paymentInvoice && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-md w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">Cashier Payment POS</h3>
                                <p className="text-xs text-slate-500">Invoice #{paymentInvoice.invoice_number}</p>
                            </div>
                            <button onClick={() => setPaymentInvoice(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                                <div>
                                    <span className="text-xs text-slate-500 block">Total Due</span>
                                    <span className="font-bold text-sm text-slate-900 font-mono">
                                        ${Number(paymentInvoice.total_amount).toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 block">Outstanding Balance</span>
                                    <span className="font-bold text-base text-rose-600 font-mono">
                                        ${(parseFloat(paymentInvoice.total_amount) - parseFloat(paymentInvoice.paid_amount)).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount to Collect ($) *</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData('amount', parseFloat(e.target.value) || 0)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
                                <select
                                    value={paymentData.payment_method}
                                    onChange={(e) => setPaymentData('payment_method', e.target.value)}
                                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500"
                                >
                                    {paymentMethods.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Ref / Slip #</label>
                                <Input
                                    value={paymentData.transaction_reference}
                                    onChange={(e) => setPaymentData('transaction_reference', e.target.value)}
                                    placeholder="e.g. POS-AUTH-9921 / MPESA-Q4"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setPaymentInvoice(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={paymentProcessing} className="bg-emerald-600 text-white hover:bg-emerald-500 font-bold">
                                    Record Payment & Issue Receipt
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: View / Print Invoice */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-2xl w-full p-8 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto font-sans">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Formal Medical Bill</span>
                            <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Bill Header */}
                        <div className="mt-4 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">APEXCARE HOSPITAL SYSTEM</h2>
                                <p className="text-xs text-slate-500">Inpatient & Outpatient Clinical Financial Services</p>
                                <p className="text-xs text-slate-500">Branch: {selectedInvoice.branch?.name}</p>
                            </div>
                            <div className="text-right font-mono">
                                <div className="text-base font-bold text-emerald-700">{selectedInvoice.invoice_number}</div>
                                <div className="text-xs text-slate-500">Date: {selectedInvoice.invoice_date}</div>
                                <div className="text-xs text-slate-500">Due: {selectedInvoice.due_date || 'On Receipt'}</div>
                            </div>
                        </div>

                        {/* Patient & Insurance Details */}
                        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="font-bold text-slate-500 uppercase text-[10px] block">Patient Information</span>
                                <span className="font-bold text-slate-900 text-sm block mt-0.5">
                                    {selectedInvoice.patient?.first_name} {selectedInvoice.patient?.last_name}
                                </span>
                                <span className="font-mono text-slate-500 block">MRN: {selectedInvoice.patient?.mrn}</span>
                            </div>
                            <div>
                                <span className="font-bold text-slate-500 uppercase text-[10px] block">Coverage / Payer</span>
                                <span className="font-bold text-indigo-900 block mt-0.5">
                                    {selectedInvoice.policy?.provider?.name || 'Self-Pay / Direct Patient'}
                                </span>
                                {selectedInvoice.policy && (
                                    <span className="font-mono text-slate-500 block">
                                        Policy: #{selectedInvoice.policy.policy_number} ({selectedInvoice.policy.coverage_percentage}%)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Itemized Table */}
                        <div className="mt-6">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="py-2.5 px-3 text-left">Clinical Service / Consumable</th>
                                        <th className="py-2.5 px-3 text-center">Qty</th>
                                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedInvoice.items?.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3">
                                                <div className="font-bold text-slate-800">{item.description}</div>
                                                <div className="text-[10px] text-slate-400 font-mono uppercase">{item.item_type}</div>
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                                            <td className="py-2.5 px-3 text-right font-mono">${Number(item.unit_price).toFixed(2)}</td>
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                                ${Number(item.subtotal).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary & Settlement */}
                        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
                            <div className="w-72 space-y-1.5 font-mono text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Gross Subtotal:</span>
                                    <span>${Number(selectedInvoice.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-indigo-700">
                                    <span>Insurance Claim Portion:</span>
                                    <span>-${Number(selectedInvoice.insurance_covered_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-700">
                                    <span>Patient Payable (Co-Pay):</span>
                                    <span>${Number(selectedInvoice.patient_payable_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-100 pt-1">
                                    <span>Cashier Paid to Date:</span>
                                    <span>${Number(selectedInvoice.paid_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-1">
                                    <span>Balance Due:</span>
                                    <span className="text-rose-600">
                                        ${Math.max(0, parseFloat(selectedInvoice.total_amount) - parseFloat(selectedInvoice.paid_amount)).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Receipts Issued */}
                        {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                            <div className="mt-6 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                                <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] block mb-1">Payment Receipts</span>
                                <ul className="space-y-1 font-mono text-slate-700">
                                    {selectedInvoice.payments.map((p, pIdx) => (
                                        <li key={pIdx} className="flex justify-between">
                                            <span>Receipt #{p.receipt_number} via {p.payment_method} ({p.payment_date})</span>
                                            <span className="font-bold text-emerald-800">${Number(p.amount).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                            <Button onClick={() => window.print()} className="bg-slate-900 text-white hover:bg-slate-800 text-xs">
                                <Printer className="w-3.5 h-3.5 mr-1.5" />
                                Print Invoice
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
