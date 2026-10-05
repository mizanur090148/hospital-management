import React, { useState } from 'react';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Banknote, DollarSign, Calculator, CheckCircle2,
    Calendar, Users, Plus, Search, Filter, ShieldCheck,
    CreditCard, ArrowUpRight, Printer, X, FileText, Check, AlertCircle, Building2
} from 'lucide-react';

interface StaffMember {
    id: string;
    name: string;
    email: string;
    user_type: string;
    branch_id?: string;
}

interface SalaryStructure {
    id: string;
    user_id: string;
    base_salary: number | string;
    medical_allowance: number | string;
    housing_allowance: number | string;
    transport_allowance: number | string;
    hazard_allowance: number | string;
    tax_deduction: number | string;
    provident_fund: number | string;
    health_insurance_deduction: number | string;
    is_active: boolean;
    user?: StaffMember;
}

interface PayrollRecord {
    id: string;
    payslip_number: string;
    user_id: string;
    salary_month: string;
    base_salary: number | string;
    medical_allowance: number | string;
    housing_allowance: number | string;
    transport_allowance: number | string;
    hazard_allowance: number | string;
    gross_salary: number | string;
    tax_deduction: number | string;
    provident_fund: number | string;
    health_insurance_deduction: number | string;
    unpaid_leave_deduction: number | string;
    total_deductions: number | string;
    net_salary: number | string;
    status: 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';
    payment_method?: string;
    disbursed_at?: string;
    notes?: string;
    user?: StaffMember;
    journal_entry?: { id: string; entry_number: string };
    journalEntry?: { id: string; entry_number: string };
}

interface Props {
    payrolls: {
        data: PayrollRecord[];
        links: any[];
        total: number;
    };
    salaryStructures: SalaryStructure[];
    branches: Array<{ id: string; name: string }>;
    staffMembers: StaffMember[];
    metrics: {
        total_gross: number;
        total_deductions: number;
        total_net: number;
        paid_count: number;
        pending_count: number;
        total_records: number;
    };
    filters: {
        month: string;
        status?: string;
    };
    payrollStatuses: string[];
}

export default function PayrollIndex({
    payrolls,
    salaryStructures,
    branches,
    staffMembers,
    metrics,
    filters,
    payrollStatuses,
}: Props) {
    const [activeTab, setActiveTab] = useState<'payrolls' | 'structures'>('payrolls');
    const [searchQuery, setSearchQuery] = useState('');
    const [structureModalOpen, setStructureModalOpen] = useState(false);
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [disburseModalRecord, setDisburseModalRecord] = useState<PayrollRecord | null>(null);
    const [viewPayslipRecord, setViewPayslipRecord] = useState<PayrollRecord | null>(null);

    // Form: Structure
    const structureForm = useForm({
        user_id: staffMembers[0]?.id || '',
        base_salary: 50000,
        medical_allowance: 5000,
        housing_allowance: 10000,
        transport_allowance: 3000,
        hazard_allowance: 2000,
        tax_deduction: 2500,
        provident_fund: 4000,
        health_insurance_deduction: 1500,
        notes: '',
    });

    // Form: Generate
    const generateForm = useForm({
        salary_month: filters.month || new Date().toISOString().slice(0, 7),
    });

    // Form: Disburse
    const disburseForm = useForm({
        payment_method: 'BANK_TRANSFER',
        notes: 'Monthly compensation disbursed via automated banking rails',
    });

    const handleSaveStructure = (e: React.FormEvent) => {
        e.preventDefault();
        structureForm.post('/hr/payroll/structures', {
            preserveScroll: true,
            onSuccess: () => {
                setStructureModalOpen(false);
                structureForm.reset();
            },
        });
    };

    const handleGeneratePayroll = (e: React.FormEvent) => {
        e.preventDefault();
        generateForm.post('/hr/payroll/generate', {
            preserveScroll: true,
            onSuccess: () => {
                setGenerateModalOpen(false);
            },
        });
    };

    const handleApprove = (payrollId: string) => {
        router.patch(`/hr/payroll/${payrollId}/approve`, {}, {
            preserveScroll: true,
        });
    };

    const handleDisburse = (e: React.FormEvent) => {
        e.preventDefault();
        if (!disburseModalRecord) return;
        disburseForm.post(`/hr/payroll/${disburseModalRecord.id}/disburse`, {
            preserveScroll: true,
            onSuccess: () => {
                setDisburseModalRecord(null);
                disburseForm.reset();
            },
        });
    };

    const handleFilterMonth = (newMonth: string) => {
        router.get('/hr/payroll', {
            ...filters,
            month: newMonth,
        }, { preserveState: true });
    };

    const handleFilterStatus = (newStatus: string) => {
        router.get('/hr/payroll', {
            ...filters,
            status: newStatus === 'ALL' ? undefined : newStatus,
        }, { preserveState: true });
    };

    const formatCurrency = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);
    };

    const filteredPayrolls = payrolls.data.filter((p) => {
        const name = p.user?.name || '';
        const payslip = p.payslip_number || '';
        return !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()) || payslip.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge variant="success">Disbursed (GL Synced)</Badge>;
            case 'APPROVED':
                return <Badge variant="info">Approved for Payment</Badge>;
            case 'DRAFT':
                return <Badge variant="warning">Draft Calculation</Badge>;
            case 'CANCELLED':
                return <Badge variant="default">Cancelled</Badge>;
            default:
                return <Badge variant="default">{status}</Badge>;
        }
    };

    return (
        <AppLayout title="Hospital Payroll & Compensation">
            <Head title="Staff Payroll & Compensation - ApexCare Hospital" />

            <div className="space-y-6">
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                <Banknote className="w-5 h-5 stroke-[2.5]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Payroll & Healthcare Compensation</h1>
                                <p className="text-xs text-slate-500 font-medium">Monthly salary processing, hazard allowances, and automated General Ledger sync</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Button
                            variant="secondary"
                            onClick={() => setStructureModalOpen(true)}
                            className="text-xs flex items-center gap-1.5"
                        >
                            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                            Salary Structures ({salaryStructures.length})
                        </Button>
                        <Button
                            onClick={() => setGenerateModalOpen(true)}
                            className="text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Generate Monthly Run
                        </Button>
                    </div>
                </div>

                {/* Payroll Financial Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-white border-slate-200 shadow-2xs">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gross Healthcare Payroll</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(metrics.total_gross)}</div>
                        <div className="text-[11px] text-slate-400 mt-2">Base salaries & allowances combined</div>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200 shadow-2xs">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">Total Deductions & Tax</div>
                        <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">{formatCurrency(metrics.total_deductions)}</div>
                        <div className="text-[11px] text-slate-400 mt-2">Withholdings, PF, and health insurance</div>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200 shadow-2xs">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Net Payable Wages</div>
                        <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{formatCurrency(metrics.total_net)}</div>
                        <div className="text-[11px] text-slate-400 mt-2">Post-tax net compensation</div>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200 shadow-2xs">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Disbursement Progress</div>
                        <div className="text-2xl font-bold text-indigo-700 mt-1 font-mono">
                            {metrics.paid_count} / {metrics.total_records} <span className="text-xs font-normal text-slate-500">Paid</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">{metrics.pending_count} awaiting approval or payment</div>
                    </Card>
                </div>

                {/* Filter and Switcher Strip */}
                <Card className="p-4 bg-white border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setActiveTab('payrolls')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'payrolls' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Payslips & Disbursements ({payrolls.total})
                            </button>
                            <button
                                onClick={() => setActiveTab('structures')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'structures' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Staff Salary Structures ({salaryStructures.length})
                            </button>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">Month:</span>
                                <Input
                                    type="month"
                                    value={filters.month}
                                    onChange={(e) => handleFilterMonth(e.target.value)}
                                    className="text-xs py-1.5 w-36"
                                />
                            </div>

                            <div className="relative w-full md:w-56">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Search staff or payslip #..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 text-xs py-1.5"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Tab 1: Payslips */}
                {activeTab === 'payrolls' && (
                    <Card className="overflow-hidden border-slate-200 shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-4">Payslip #</th>
                                        <th className="py-3 px-4">Healthcare Staff</th>
                                        <th className="py-3 px-4">Gross Salary</th>
                                        <th className="py-3 px-4">Deductions</th>
                                        <th className="py-3 px-4">Net Payout</th>
                                        <th className="py-3 px-4">Status & GL Link</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredPayrolls.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400">
                                                <Banknote className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                                                <p className="font-medium text-slate-600">No payslips calculated for {filters.month}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;Generate Monthly Run&rdquo; to compute batch payroll</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPayrolls.map((payroll) => {
                                            const staff = payroll.user;
                                            const glEntry = payroll.journal_entry || payroll.journalEntry;
                                            return (
                                                <tr key={payroll.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3 px-4 font-mono font-semibold text-cyan-700 whitespace-nowrap">
                                                        {payroll.payslip_number}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900">{staff?.name}</div>
                                                        <div className="text-[10px] text-slate-400 capitalize">
                                                            {staff?.user_type?.replace('_', ' ')} • {staff?.email}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                                                        {formatCurrency(payroll.gross_salary)}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-rose-600 font-medium">
                                                        -{formatCurrency(payroll.total_deductions)}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 text-sm">
                                                        {formatCurrency(payroll.net_salary)}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <div className="space-y-1">
                                                            <div>{getStatusBadge(payroll.status)}</div>
                                                            {glEntry && (
                                                                <Link
                                                                    href="/accounting/general-ledger"
                                                                    className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-600 hover:text-cyan-800 hover:underline"
                                                                >
                                                                    <Building2 className="w-3 h-3" />
                                                                    GL #{glEntry.entry_number}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => setViewPayslipRecord(payroll)}
                                                                className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold transition-colors"
                                                                title="View Full Breakdown"
                                                            >
                                                                View
                                                            </button>
                                                            {payroll.status === 'DRAFT' && (
                                                                <button
                                                                    onClick={() => handleApprove(payroll.id)}
                                                                    className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-semibold transition-colors"
                                                                >
                                                                    Approve
                                                                </button>
                                                            )}
                                                            {payroll.status === 'APPROVED' && (
                                                                <button
                                                                    onClick={() => {
                                                                        setDisburseModalRecord(payroll);
                                                                        disburseForm.setData({
                                                                            payment_method: 'BANK_TRANSFER',
                                                                            notes: `Payroll disbursement for ${payroll.payslip_number}`,
                                                                        });
                                                                    }}
                                                                    className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-semibold transition-colors shadow-2xs"
                                                                >
                                                                    Disburse & GL
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab 2: Salary Structures */}
                {activeTab === 'structures' && (
                    <Card className="overflow-hidden border-slate-200 shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-4">Healthcare Staff</th>
                                        <th className="py-3 px-4">Base Salary</th>
                                        <th className="py-3 px-4">Medical & Housing</th>
                                        <th className="py-3 px-4">Transport & Hazard</th>
                                        <th className="py-3 px-4">Standard Deductions</th>
                                        <th className="py-3 px-4">Est. Net Monthly</th>
                                        <th className="py-3 px-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {salaryStructures.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400">
                                                <Calculator className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                                                <p className="font-medium text-slate-600">No staff salary structures configured yet</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;Salary Structures&rdquo; above to set up compensation plans</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        salaryStructures.map((struct) => {
                                            const base = parseFloat(struct.base_salary as any) || 0;
                                            const med = parseFloat(struct.medical_allowance as any) || 0;
                                            const house = parseFloat(struct.housing_allowance as any) || 0;
                                            const trans = parseFloat(struct.transport_allowance as any) || 0;
                                            const haz = parseFloat(struct.hazard_allowance as any) || 0;
                                            const tax = parseFloat(struct.tax_deduction as any) || 0;
                                            const pf = parseFloat(struct.provident_fund as any) || 0;
                                            const ins = parseFloat(struct.health_insurance_deduction as any) || 0;

                                            const gross = base + med + house + trans + haz;
                                            const ded = tax + pf + ins;
                                            const net = gross - ded;

                                            return (
                                                <tr key={struct.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900">{struct.user?.name}</div>
                                                        <div className="text-[10px] text-slate-400 capitalize">
                                                            {struct.user?.user_type?.replace('_', ' ')}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                                                        {formatCurrency(base)}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-slate-600">
                                                        +{formatCurrency(med + house)}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-slate-600">
                                                        +{formatCurrency(trans + haz)}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-rose-600 font-medium">
                                                        -{formatCurrency(ded)}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                                                        {formatCurrency(net)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <Badge variant="success">Active Plan</Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Modal: Configure Salary Structure */}
            {structureModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Configure Staff Salary Structure</h3>
                            <button onClick={() => setStructureModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveStructure} className="space-y-4 mt-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Select Healthcare Staff *</label>
                                <select
                                    required
                                    value={structureForm.data.user_id}
                                    onChange={(e) => structureForm.setData('user_id', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                >
                                    {staffMembers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.user_type.replace('_', ' ')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                <div className="text-[11px] font-bold uppercase text-emerald-800 mb-2">Base Salary & Healthcare Allowances</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Base Salary ($) *</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={structureForm.data.base_salary}
                                            onChange={(e) => structureForm.setData('base_salary', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Medical Allowance ($)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={structureForm.data.medical_allowance}
                                            onChange={(e) => structureForm.setData('medical_allowance', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Housing Allowance ($)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={structureForm.data.housing_allowance}
                                            onChange={(e) => structureForm.setData('housing_allowance', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Hazard / ICU Pay ($)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={structureForm.data.hazard_allowance}
                                            onChange={(e) => structureForm.setData('hazard_allowance', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                                <div className="text-[11px] font-bold uppercase text-rose-800 mb-2">Statutory Deductions & Withholdings</div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Tax ($)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={structureForm.data.tax_deduction}
                                            onChange={(e) => structureForm.setData('tax_deduction', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Provident ($)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={structureForm.data.provident_fund}
                                            onChange={(e) => structureForm.setData('provident_fund', parseFloat(e.target.value))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 mb-1">Insurance ($)</label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={structureForm.data.health_insurance_deduction}
                                            onChange={(e) => structureForm.setData('health_insurance_deduction', parseFloat(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setStructureModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={structureForm.processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Save Compensation Plan
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Generate Monthly Run */}
            {generateModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Generate Monthly Payroll Run</h3>
                            <button onClick={() => setGenerateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleGeneratePayroll} className="space-y-4 mt-4 text-xs">
                            <p className="text-slate-600">
                                This will automatically calculate and generate draft payslips for all staff members who have an active compensation structure for the selected month.
                            </p>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Target Salary Month *</label>
                                <Input
                                    type="month"
                                    required
                                    value={generateForm.data.salary_month}
                                    onChange={(e) => generateForm.setData('salary_month', e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setGenerateModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={generateForm.processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Calculate & Generate
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Disburse & Post to GL */}
            {disburseModalRecord && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Disburse Salary & Post to GL</h3>
                            <button onClick={() => setDisburseModalRecord(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="my-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                            <div className="font-semibold text-slate-900">{disburseModalRecord.user?.name}</div>
                            <div className="text-slate-500">Payslip #{disburseModalRecord.payslip_number} • Month: {disburseModalRecord.salary_month}</div>
                            <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                                Net Disbursal: {formatCurrency(disburseModalRecord.net_salary)}
                            </div>
                            <div className="text-[11px] text-indigo-700 bg-indigo-50 p-2 rounded-lg mt-2">
                                ℹ️ Automated Double-Entry: Debits 5400 (Wages Expense) & Credits 2150 / 1010 Cash/Bank in the General Ledger.
                            </div>
                        </div>

                        <form onSubmit={handleDisburse} className="space-y-4 mt-2 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Disbursement Channel *</label>
                                <select
                                    required
                                    value={disburseForm.data.payment_method}
                                    onChange={(e) => disburseForm.setData('payment_method', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                >
                                    <option value="BANK_TRANSFER">Direct Hospital Bank Wire / EFT</option>
                                    <option value="CHEQUE">Corporate Pay Order / Cheque</option>
                                    <option value="CASH">Cash Disbursement</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Reference Notes</label>
                                <Input
                                    type="text"
                                    value={disburseForm.data.notes}
                                    onChange={(e) => disburseForm.setData('notes', e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setDisburseModalRecord(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={disburseForm.processing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    Disburse & Sync GL
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Full Payslip Dossier View */}
            {viewPayslipRecord && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <span className="text-[10px] font-mono text-cyan-600 uppercase font-bold">Official Salary Dossier</span>
                                <h3 className="font-bold text-slate-900 text-base">{viewPayslipRecord.payslip_number}</h3>
                            </div>
                            <button onClick={() => setViewPayslipRecord(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="my-4 space-y-4 text-xs">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                <div>
                                    <div className="font-bold text-slate-900">{viewPayslipRecord.user?.name}</div>
                                    <div className="text-slate-500 capitalize">{viewPayslipRecord.user?.user_type?.replace('_', ' ')}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-slate-700 font-semibold">{viewPayslipRecord.salary_month}</div>
                                    <div>{getStatusBadge(viewPayslipRecord.status)}</div>
                                </div>
                            </div>

                            {/* Earnings breakdown */}
                            <div className="border border-slate-100 rounded-xl p-3 space-y-1.5">
                                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">Gross Earnings</div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Base Salary</span>
                                    <span className="font-mono text-slate-800">{formatCurrency(viewPayslipRecord.base_salary)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Medical Allowance</span>
                                    <span className="font-mono text-slate-800">{formatCurrency(viewPayslipRecord.medical_allowance)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Housing Allowance</span>
                                    <span className="font-mono text-slate-800">{formatCurrency(viewPayslipRecord.housing_allowance)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Transport & Hazard</span>
                                    <span className="font-mono text-slate-800">
                                        {formatCurrency(parseFloat(viewPayslipRecord.transport_allowance as any) + parseFloat(viewPayslipRecord.hazard_allowance as any))}
                                    </span>
                                </div>
                                <div className="border-t border-slate-100 pt-1 flex justify-between font-bold text-slate-900">
                                    <span>Total Gross Salary</span>
                                    <span className="font-mono">{formatCurrency(viewPayslipRecord.gross_salary)}</span>
                                </div>
                            </div>

                            {/* Deductions breakdown */}
                            <div className="border border-rose-100 bg-rose-50/20 rounded-xl p-3 space-y-1.5">
                                <div className="font-bold text-rose-800 text-[11px] uppercase tracking-wider mb-1">Deductions & Withholdings</div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Tax Withheld</span>
                                    <span className="font-mono text-rose-700">-{formatCurrency(viewPayslipRecord.tax_deduction)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Provident Fund</span>
                                    <span className="font-mono text-rose-700">-{formatCurrency(viewPayslipRecord.provident_fund)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Health Insurance</span>
                                    <span className="font-mono text-rose-700">-{formatCurrency(viewPayslipRecord.health_insurance_deduction)}</span>
                                </div>
                                <div className="border-t border-rose-100 pt-1 flex justify-between font-bold text-rose-800">
                                    <span>Total Deductions</span>
                                    <span className="font-mono">-{formatCurrency(viewPayslipRecord.total_deductions)}</span>
                                </div>
                            </div>

                            {/* Net payout strip */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-emerald-900 text-sm">Net Disbursed Compensation</div>
                                    <div className="text-[11px] text-emerald-700">Direct transfer or cheque payment</div>
                                </div>
                                <div className="text-xl font-bold font-mono text-emerald-800">
                                    {formatCurrency(viewPayslipRecord.net_salary)}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                            <Button type="button" variant="secondary" onClick={() => window.print()}>
                                <Printer className="w-3.5 h-3.5 mr-1" />
                                Print Payslip
                            </Button>
                            <Button type="button" onClick={() => setViewPayslipRecord(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
