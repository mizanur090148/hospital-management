import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { 
    Calendar, HeartPulse, Pill, Receipt, CreditCard, 
    ShieldCheck, DollarSign, CheckCircle2, ArrowRight, 
    Building2, Smartphone, X, Printer, AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface InvoiceItem {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date?: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    insurance_covered_amount: number;
    patient_payable_amount: number;
    total_amount: number;
    paid_amount: number;
    status: string;
    items?: InvoiceItem[];
}

interface Payment {
    id: string;
    receipt_number: string;
    payment_method: string;
    amount: number;
    transaction_reference?: string;
    payment_date: string;
    invoice?: {
        invoice_number: string;
    };
}

interface Summary {
    total_invoiced: number;
    insurance_covered: number;
    patient_payable: number;
    total_paid: number;
    outstanding_balance: number;
}

interface Props {
    patient: {
        id: string;
        mrn: string;
        full_name: string;
        phone: string;
        email: string;
    };
    invoices: Invoice[];
    payments: Payment[];
    summary: Summary;
}

export default function Billing({
    patient,
    invoices,
    payments,
    summary,
}: Props) {
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        payment_method: 'CREDIT_CARD',
        amount: '',
        transaction_reference: '',
    });

    const handleOpenPay = (inv: Invoice) => {
        setPayingInvoice(inv);
        const due = Math.max(0, Number(inv.patient_payable_amount) - Number(inv.paid_amount));
        setData({
            payment_method: 'CREDIT_CARD',
            amount: due.toFixed(2),
            transaction_reference: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
        });
    };

    const handleClosePay = () => {
        setPayingInvoice(null);
        reset();
    };

    const handleSubmitPay = (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingInvoice) return;

        post(`/portal/patient/billing/${payingInvoice.id}/pay`, {
            onSuccess: () => {
                handleClosePay();
            },
        });
    };

    return (
        <AppLayout title="Billing & Statements - Patient Portal">
            <Head title="Billing & Invoices - Patient Portal" />

            <div className="space-y-6">
                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 rounded-xl shadow-xs overflow-x-auto">
                    <Link
                        href="/portal/patient"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <HeartPulse className="w-4 h-4 text-slate-500" />
                        Dashboard
                    </Link>
                    <Link
                        href="/portal/patient/appointments"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <Calendar className="w-4 h-4 text-slate-500" />
                        Appointments
                    </Link>
                    <Link
                        href="/portal/patient/medical-records"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <Pill className="w-4 h-4 text-slate-500" />
                        Prescriptions & Lab Reports
                    </Link>
                    <Link
                        href="/portal/patient/billing"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 shadow-xs"
                    >
                        <Receipt className="w-4 h-4 text-teal-600" />
                        Invoices & Receipts
                    </Link>
                </div>

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Hospital Billing & Account Statements</h1>
                        <p className="text-sm text-slate-500">
                            Transparent invoice charge capture, insurance co-pay splits, and online payment settlement.
                        </p>
                    </div>
                </div>

                {/* 4 Financial KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-slate-200 bg-white shadow-xs">
                        <CardContent className="p-4 space-y-1">
                            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Total Hospital Invoiced</span>
                            <div className="text-2xl font-black text-slate-900">
                                ${summary.total_invoiced.toFixed(2)}
                            </div>
                            <span className="text-2xs text-slate-500">All procedures, OPD, IPD, and pharmacy</span>
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-100 bg-indigo-50/50 shadow-xs">
                        <CardContent className="p-4 space-y-1">
                            <span className="text-2xs font-bold uppercase tracking-wider text-indigo-700">Insurance (TPA) Covered</span>
                            <div className="text-2xl font-black text-indigo-900">
                                ${summary.insurance_covered.toFixed(2)}
                            </div>
                            <span className="text-2xs text-indigo-600 font-medium">Payer direct adjudication liability</span>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-100 bg-emerald-50/50 shadow-xs">
                        <CardContent className="p-4 space-y-1">
                            <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700">Total Patient Paid</span>
                            <div className="text-2xl font-black text-emerald-900">
                                ${summary.total_paid.toFixed(2)}
                            </div>
                            <span className="text-2xs text-emerald-600 font-medium">Settled via POS, card, or online MFS</span>
                        </CardContent>
                    </Card>

                    <Card className={`shadow-xs ${summary.outstanding_balance > 0 ? 'border-rose-200 bg-rose-50/50' : 'border-teal-200 bg-teal-50/50'}`}>
                        <CardContent className="p-4 space-y-1">
                            <span className={`text-2xs font-bold uppercase tracking-wider ${summary.outstanding_balance > 0 ? 'text-rose-700' : 'text-teal-700'}`}>
                                Outstanding Balance Due
                            </span>
                            <div className={`text-2xl font-black ${summary.outstanding_balance > 0 ? 'text-rose-900' : 'text-teal-900'}`}>
                                ${summary.outstanding_balance.toFixed(2)}
                            </div>
                            <span className="text-2xs text-slate-500">
                                {summary.outstanding_balance > 0 ? 'Patient copay & deductible due' : 'Account in good standing'}
                            </span>
                        </CardContent>
                    </Card>
                </div>

                {/* Invoices List Table */}
                <Card className="border-slate-200 shadow-xs">
                    <CardHeader className="border-b border-slate-100 pb-3">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Receipt className="w-4.5 h-4.5 text-teal-600" />
                                Hospital Invoices ({invoices.length})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {invoices.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-700">
                                    <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Invoice #</th>
                                            <th className="py-2.5 px-3">Date</th>
                                            <th className="py-2.5 px-3 text-right">Total Charges</th>
                                            <th className="py-2.5 px-3 text-right">Insurance Paid</th>
                                            <th className="py-2.5 px-3 text-right">Patient Due</th>
                                            <th className="py-2.5 px-3 text-right">Amount Paid</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoices.map((inv) => {
                                            const due = Math.max(0, Number(inv.patient_payable_amount) - Number(inv.paid_amount));
                                            return (
                                                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="py-3 px-3 font-mono text-xs font-bold text-teal-700">
                                                        #{inv.invoice_number}
                                                    </td>
                                                    <td className="py-3 px-3 text-xs text-slate-600">
                                                        {inv.invoice_date}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-medium text-slate-900 text-xs">
                                                        ${Number(inv.total_amount).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right text-indigo-700 text-xs">
                                                        ${Number(inv.insurance_covered_amount).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-bold text-slate-900 text-xs">
                                                        ${Number(inv.patient_payable_amount).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right text-emerald-700 text-xs">
                                                        ${Number(inv.paid_amount).toFixed(2)}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-2xs ${
                                                                inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                                                inv.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                                                'bg-rose-50 text-rose-800 border-rose-200'
                                                            }`}
                                                        >
                                                            {inv.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        {due > 0 ? (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleOpenPay(inv)}
                                                                className="bg-teal-700 hover:bg-teal-800 text-white text-xs py-1 px-3 shadow-xs"
                                                            >
                                                                Pay ${due.toFixed(2)}
                                                            </Button>
                                                        ) : (
                                                            <span className="text-2xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-xs text-slate-500">
                                No billing invoices generated for your account.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Receipts History */}
                <Card className="border-slate-200 shadow-xs">
                    <CardHeader className="border-b border-slate-100 pb-3">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <DollarSign className="w-4.5 h-4.5 text-emerald-600" />
                                Payment Receipts History ({payments.length})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {payments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-700">
                                    <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Receipt #</th>
                                            <th className="py-2.5 px-3">Invoice Ref</th>
                                            <th className="py-2.5 px-3">Date</th>
                                            <th className="py-2.5 px-3">Payment Method</th>
                                            <th className="py-2.5 px-3">Txn Reference</th>
                                            <th className="py-2.5 px-3 text-right">Amount Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {payments.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/60">
                                                <td className="py-2.5 px-3 font-mono text-xs font-bold text-emerald-800">
                                                    #{p.receipt_number}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                                                    #{p.invoice?.invoice_number ?? 'Direct Settlement'}
                                                </td>
                                                <td className="py-2.5 px-3 text-xs text-slate-600">
                                                    {new Date(p.payment_date).toLocaleDateString()}
                                                </td>
                                                <td className="py-2.5 px-3 text-xs">
                                                    <span className="font-semibold text-slate-800">{p.payment_method}</span>
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-2xs text-slate-500">
                                                    {p.transaction_reference || 'N/A'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700 text-xs">
                                                    +${Number(p.amount).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-xs text-slate-500">
                                No payment transaction receipts recorded.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Online Payment Modal Dialog */}
                {payingInvoice && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
                        <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Pay Hospital Invoice #{payingInvoice.invoice_number}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Fast & secure payment gateway simulation
                                    </p>
                                </div>
                                <button
                                    onClick={handleClosePay}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitPay} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Select Payment Mode
                                    </label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {[
                                            { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
                                            { id: 'DEBIT_CARD', label: 'Debit Card', icon: CreditCard },
                                            { id: 'MOBILE_MONEY', label: 'Mobile MFS / Apple Pay', icon: Smartphone },
                                            { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
                                        ].map((method) => {
                                            const Icon = method.icon;
                                            return (
                                                <button
                                                    key={method.id}
                                                    type="button"
                                                    onClick={() => setData('payment_method', method.id)}
                                                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                                                        data.payment_method === method.id
                                                            ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20 text-teal-900 font-bold'
                                                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                                    }`}
                                                >
                                                    <Icon className="w-4 h-4 text-teal-600 shrink-0" />
                                                    <span className="text-xs">{method.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Payment Amount ($ USD)
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        value={data.amount}
                                        onChange={(e) => setData('amount', e.target.value)}
                                        className="text-sm font-bold"
                                    />
                                    {errors.amount && (
                                        <p className="text-2xs text-rose-600 mt-1">{errors.amount}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Transaction Reference
                                    </label>
                                    <Input
                                        type="text"
                                        value={data.transaction_reference}
                                        onChange={(e) => setData('transaction_reference', e.target.value)}
                                        className="text-xs font-mono"
                                    />
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Invoice Total:</span>
                                        <span>${Number(payingInvoice.total_amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-indigo-700">
                                        <span>Insurance Portion:</span>
                                        <span>-${Number(payingInvoice.insurance_covered_amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                                        <span>Payment Due:</span>
                                        <span>${(Number(payingInvoice.patient_payable_amount) - Number(payingInvoice.paid_amount)).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClosePay}
                                        className="text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-1.5"
                                    >
                                        <CreditCard className="w-3.5 h-3.5" />
                                        {processing ? 'Processing Payment...' : `Authorize & Pay $${Number(data.amount || 0).toFixed(2)}`}
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
