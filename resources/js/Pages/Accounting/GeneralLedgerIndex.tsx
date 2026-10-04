import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Scale, Building2, BookOpen, Plus, Search,
    CheckCircle2, AlertTriangle, Layers, ChevronDown, ChevronUp,
    FileText, X, Trash2, ArrowUpRight, DollarSign, PieChart
} from 'lucide-react';

interface Account {
    id: string;
    code: string;
    name: string;
    account_type: string;
    type_label: string;
    normal_balance: string;
    balance: number;
    is_system: boolean;
}

interface JournalEntryItem {
    id: string;
    entry_type: 'DEBIT' | 'CREDIT';
    amount: string;
    narration?: string;
    account?: {
        code: string;
        name: string;
    };
}

interface JournalEntry {
    id: string;
    entry_number: string;
    posting_date: string;
    reference_type?: string;
    reference_id?: string;
    description: string;
    is_posted: boolean;
    postedByUser?: {
        name: string;
    };
    items?: JournalEntryItem[];
}

interface TrialBalanceRow {
    code: string;
    name: string;
    type: string;
    debit: number;
    credit: number;
    balance: number;
}

interface TrialBalance {
    accounts: TrialBalanceRow[];
    total_debit: number;
    total_credit: number;
    is_balanced: boolean;
}

interface IncomeStatement {
    revenue_accounts: Array<{ code: string; name: string; amount: number }>;
    expense_accounts: Array<{ code: string; name: string; amount: number }>;
    total_revenue: number;
    total_expense: number;
    net_income: number;
}

interface Props {
    accounts: Account[];
    journalEntries: {
        data: JournalEntry[];
        links: any[];
        total: number;
    };
    trialBalance: TrialBalance;
    incomeStatement: IncomeStatement;
    accountTypes: string[];
    entryTypes: string[];
    activeTab: string;
}

export default function GeneralLedgerIndex({
    accounts,
    journalEntries,
    trialBalance,
    incomeStatement,
    accountTypes,
    entryTypes,
    activeTab: initialTab,
}: Props) {
    const [activeTab, setActiveTab] = useState<'ledger' | 'tb' | 'coa' | 'pnl'>(
        initialTab === 'tb' ? 'tb' : initialTab === 'coa' ? 'coa' : initialTab === 'pnl' ? 'pnl' : 'ledger'
    );

    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
    const [isCreateEntryOpen, setIsCreateEntryOpen] = useState(false);

    // Form: Create Account
    const {
        data: accData,
        setData: setAccData,
        post: postAcc,
        processing: accProcessing,
        reset: resetAcc,
    } = useForm({
        code: '',
        name: '',
        account_type: 'ASSET',
        description: '',
    });

    const handleAccSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postAcc('/accounting/accounts', {
            onSuccess: () => {
                setIsCreateAccountOpen(false);
                resetAcc();
                setActiveTab('coa');
            },
        });
    };

    // Form: Post Manual Journal Entry
    const [entryLines, setEntryLines] = useState<Array<{
        account_id: string;
        entry_type: 'DEBIT' | 'CREDIT';
        amount: number;
        narration?: string;
    }>>([
        { account_id: accounts[0]?.id || '', entry_type: 'DEBIT', amount: 100.00, narration: '' },
        { account_id: accounts[1]?.id || '', entry_type: 'CREDIT', amount: 100.00, narration: '' },
    ]);

    const {
        data: entryData,
        setData: setEntryData,
        post: postEntry,
        processing: entryProcessing,
        reset: resetEntry,
        errors: entryErrors,
    } = useForm({
        posting_date: new Date().toISOString().split('T')[0],
        description: '',
        lines: [] as any[],
    });

    const totalDebits = entryLines
        .filter((l) => l.entry_type === 'DEBIT')
        .reduce((sum, l) => sum + (l.amount || 0), 0);

    const totalCredits = entryLines
        .filter((l) => l.entry_type === 'CREDIT')
        .reduce((sum, l) => sum + (l.amount || 0), 0);

    const diff = Math.abs(totalDebits - totalCredits);
    const isBalanced = diff < 0.005 && totalDebits > 0;

    const handleEntrySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) return;

        entryData.lines = entryLines;
        postEntry('/accounting/journal-entries', {
            onSuccess: () => {
                setIsCreateEntryOpen(false);
                resetEntry();
                setActiveTab('ledger');
            },
        });
    };

    return (
        <AppLayout title="General Ledger & Double-Entry Accounting">
            <Head title="Hospital General Ledger & Double-Entry Accounting" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Phase 7: General Ledger
                            </span>
                            <span className="text-xs text-slate-400">Strict Invariant: Σ(Debits) === Σ(Credits)</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2.5">
                            <Scale className="w-7 h-7 text-emerald-400" />
                            Double-Entry General Ledger & Financials
                        </h1>
                        <p className="text-slate-300 text-sm mt-1">
                            Mathematical double-entry book-keeping, Chart of Accounts, atomic journal vouchers, live Trial Balance, and Profit & Loss statement.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsCreateAccountOpen(true)}
                            variant="outline"
                            className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700 text-xs"
                        >
                            <Building2 className="w-4 h-4 mr-1.5" />
                            Add Account
                        </Button>
                        <Button
                            onClick={() => setIsCreateEntryOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                        >
                            <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                            Post Journal Voucher
                        </Button>
                    </div>
                </div>

                {/* Equilibrium Status Banner */}
                <Card className={`p-4 border ${trialBalance.is_balanced ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trialBalance.is_balanced ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                <Scale className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">
                                    {trialBalance.is_balanced ? 'General Ledger in Perfect Equilibrium' : 'General Ledger Imbalance Warning'}
                                </h3>
                                <p className="text-xs text-slate-600 font-mono mt-0.5">
                                    Total Debits: <strong>${trialBalance.total_debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                                    {' '} • Total Credits: <strong>${trialBalance.total_credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                                </p>
                            </div>
                        </div>

                        <Badge variant={trialBalance.is_balanced ? 'success' : 'destructive'} className="font-mono text-xs">
                            {trialBalance.is_balanced ? 'Invariant Passed: 0.00 Variance' : 'Variance Detected'}
                        </Badge>
                    </div>
                </Card>

                {/* Tabs */}
                <div className="flex items-center gap-3 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'ledger' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Journal Entries Ledger ({journalEntries.total})
                    </button>
                    <button
                        onClick={() => setActiveTab('tb')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'tb' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Scale className="w-4 h-4" />
                        Live Trial Balance
                    </button>
                    <button
                        onClick={() => setActiveTab('coa')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'coa' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Building2 className="w-4 h-4" />
                        Chart of Accounts ({accounts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pnl')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'pnl' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <PieChart className="w-4 h-4" />
                        Income Statement (P&L)
                    </button>
                </div>

                {/* Tab: Journal Entries */}
                {activeTab === 'ledger' && (
                    <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 text-base">General Ledger Journal Entries</h2>
                            <span className="text-xs text-slate-400">Showing page of {journalEntries.total} posted entries</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Entry #</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Description</th>
                                        <th className="py-3 px-4">Reference</th>
                                        <th className="py-3 px-4">Posted By</th>
                                        <th className="py-3 px-4 text-right">Debit / Credit Breakdown</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {journalEntries.data.map((je) => {
                                        const isExpanded = expandedEntryId === je.id;
                                        return (
                                            <React.Fragment key={je.id}>
                                                <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-emerald-50/20' : ''}`}>
                                                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 text-xs">
                                                        {je.entry_number}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                                                        {je.posting_date}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-medium text-slate-900">
                                                        {je.description}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs font-mono text-indigo-700 font-semibold">
                                                        {je.reference_type || 'Manual'}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-xs text-slate-600">
                                                        {je.postedByUser?.name || 'Automated Engine'}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <button
                                                            onClick={() => setExpandedEntryId(isExpanded ? null : je.id)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                                        >
                                                            <span>{je.items?.length || 0} Lines</span>
                                                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expandable Debit / Credit Line Breakdown */}
                                                {isExpanded && (
                                                    <tr className="bg-slate-50 border-b border-emerald-100">
                                                        <td colSpan={6} className="p-4">
                                                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                                                                <table className="w-full text-xs font-mono">
                                                                    <thead className="bg-slate-100 text-slate-600 font-semibold">
                                                                        <tr>
                                                                            <th className="py-1.5 px-3 text-left">Account Code & Name</th>
                                                                            <th className="py-1.5 px-3 text-left">Narration</th>
                                                                            <th className="py-1.5 px-3 text-right">Debit (DR)</th>
                                                                            <th className="py-1.5 px-3 text-right">Credit (CR)</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {je.items?.map((it, itIdx) => (
                                                                            <tr key={itIdx}>
                                                                                <td className="py-1.5 px-3 font-bold text-slate-800">
                                                                                    {it.account?.code} - {it.account?.name}
                                                                                </td>
                                                                                <td className="py-1.5 px-3 text-slate-500 font-sans">
                                                                                    {it.narration || '—'}
                                                                                </td>
                                                                                <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                                                                                    {it.entry_type === 'DEBIT' ? `$${Number(it.amount).toFixed(2)}` : ''}
                                                                                </td>
                                                                                <td className="py-1.5 px-3 text-right font-bold text-emerald-700">
                                                                                    {it.entry_type === 'CREDIT' ? `$${Number(it.amount).toFixed(2)}` : ''}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab: Live Trial Balance */}
                {activeTab === 'tb' && (
                    <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-slate-800 text-base">Live Trial Balance Statement</h2>
                                <p className="text-xs text-slate-400">Verifies debit and credit equality across all general ledger accounts</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Account Code</th>
                                        <th className="py-3 px-4">Account Description</th>
                                        <th className="py-3 px-4">Category</th>
                                        <th className="py-3 px-4 text-right">Debit (DR)</th>
                                        <th className="py-3 px-4 text-right">Credit (CR)</th>
                                        <th className="py-3 px-4 text-right">Net Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {trialBalance.accounts.map((row) => (
                                        <tr key={row.code} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-4 font-mono font-bold text-xs text-slate-700">
                                                {row.code}
                                            </td>
                                            <td className="py-2.5 px-4 font-bold text-slate-900">
                                                {row.name}
                                            </td>
                                            <td className="py-2.5 px-4">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${row.type === 'ASSET' ? 'bg-sky-50 text-sky-700' : row.type === 'REVENUE' ? 'bg-emerald-50 text-emerald-700' : row.type === 'EXPENSE' ? 'bg-rose-50 text-rose-700' : 'bg-purple-50 text-purple-700'}`}>
                                                    {row.type}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                                {row.debit > 0 ? `$${row.debit.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                                                {row.credit > 0 ? `$${row.credit.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono text-slate-800 font-semibold">
                                                ${row.balance.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                                    <tr>
                                        <td colSpan={3} className="py-3 px-4 text-base">
                                            GRAND TOTALS
                                        </td>
                                        <td className="py-3 px-4 text-right text-base text-slate-900">
                                            ${trialBalance.total_debit.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-base text-emerald-700">
                                            ${trialBalance.total_credit.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-xs">
                                            <span className="text-emerald-600">Equilibrium OK</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab: Chart of Accounts */}
                {activeTab === 'coa' && (
                    <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 text-base">Master Chart of Accounts (COA)</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Code</th>
                                        <th className="py-3 px-4">Account Title</th>
                                        <th className="py-3 px-4">Classification</th>
                                        <th className="py-3 px-4">Normal Balance</th>
                                        <th className="py-3 px-4 text-right">Computed Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {accounts.map((acc) => (
                                        <tr key={acc.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-800 text-xs">
                                                {acc.code}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {acc.name}
                                                {acc.is_system && (
                                                    <span className="ml-2 text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                                                        SYSTEM
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-xs font-semibold text-slate-600">
                                                {acc.type_label}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">
                                                {acc.normal_balance}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                                ${Number(acc.balance).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab: Profit & Loss Statement (P&L) */}
                {activeTab === 'pnl' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Operating Revenues */}
                        <Card className="p-6 bg-white border border-slate-200 shadow-xs">
                            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center justify-between pb-3 border-b border-slate-100">
                                <span>Operating Clinical Revenues</span>
                                <span className="text-emerald-600 font-mono text-lg font-bold">
                                    ${incomeStatement.total_revenue.toFixed(2)}
                                </span>
                            </h3>

                            <div className="space-y-2.5">
                                {incomeStatement.revenue_accounts.map((r) => (
                                    <div key={r.code} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-700">
                                            <strong className="font-mono text-slate-500 mr-1.5">{r.code}</strong>
                                            {r.name}
                                        </span>
                                        <span className="font-mono font-bold text-slate-900">${r.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Operating Expenses & Net Income */}
                        <div className="space-y-6">
                            <Card className="p-6 bg-white border border-slate-200 shadow-xs">
                                <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center justify-between pb-3 border-b border-slate-100">
                                    <span>Operating Expenses</span>
                                    <span className="text-rose-600 font-mono text-lg font-bold">
                                        ${incomeStatement.total_expense.toFixed(2)}
                                    </span>
                                </h3>

                                <div className="space-y-2.5">
                                    {incomeStatement.expense_accounts.map((e) => (
                                        <div key={e.code} className="flex justify-between items-center text-xs">
                                            <span className="text-slate-700">
                                                <strong className="font-mono text-slate-500 mr-1.5">{e.code}</strong>
                                                {e.name}
                                            </span>
                                            <span className="font-mono font-bold text-slate-900">${e.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card className="p-6 bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl">
                                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                                    Net Hospital Operating Income
                                </span>
                                <div className="text-3xl font-black font-mono mt-1 text-emerald-400">
                                    ${incomeStatement.net_income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    Gross Clinical Revenues minus Operating Expenditures
                                </p>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Add Chart of Account */}
            {isCreateAccountOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-md w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Register Chart of Account</h3>
                            <button onClick={() => setIsCreateAccountOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAccSubmit} className="mt-4 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
                                    <Input
                                        value={accData.code}
                                        onChange={(e) => setAccData('code', e.target.value)}
                                        placeholder="4009"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Title *</label>
                                    <Input
                                        value={accData.name}
                                        onChange={(e) => setAccData('name', e.target.value)}
                                        placeholder="e.g. Telemedicine Consultation Revenue"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Classification *</label>
                                <select
                                    value={accData.account_type}
                                    onChange={(e) => setAccData('account_type', e.target.value)}
                                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 font-semibold"
                                >
                                    {accountTypes.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                                <Input
                                    value={accData.description}
                                    onChange={(e) => setAccData('description', e.target.value)}
                                    placeholder="Purpose of account"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsCreateAccountOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={accProcessing} className="bg-emerald-600 text-white hover:bg-emerald-500 font-bold">
                                    Create Account
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Post Manual Journal Voucher */}
            {isCreateEntryOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-2xl w-full p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Post Manual Journal Voucher</h3>
                                <p className="text-xs text-slate-500">Atomic double-entry posting with real-time balance validation</p>
                            </div>
                            <button onClick={() => setIsCreateEntryOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEntrySubmit} className="mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Posting Date *</label>
                                    <Input
                                        type="date"
                                        value={entryData.posting_date}
                                        onChange={(e) => setEntryData('posting_date', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Description *</label>
                                    <Input
                                        value={entryData.description}
                                        onChange={(e) => setEntryData('description', e.target.value)}
                                        placeholder="e.g. End of month depreciation or bank fee"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Lines */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700">Journal Lines (Debits & Credits)</label>
                                    <button
                                        type="button"
                                        onClick={() => setEntryLines([
                                            ...entryLines,
                                            { account_id: accounts[0]?.id || '', entry_type: 'CREDIT', amount: 0, narration: '' }
                                        ])}
                                        className="text-xs text-emerald-600 font-semibold hover:underline"
                                    >
                                        + Add Line
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {entryLines.map((line, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                                            <select
                                                value={line.account_id}
                                                onChange={(e) => {
                                                    const copy = [...entryLines];
                                                    copy[idx].account_id = e.target.value;
                                                    setEntryLines(copy);
                                                }}
                                                className="flex-1 py-1 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                                            >
                                                {accounts.map((a) => (
                                                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={line.entry_type}
                                                onChange={(e) => {
                                                    const copy = [...entryLines];
                                                    copy[idx].entry_type = e.target.value as any;
                                                    setEntryLines(copy);
                                                }}
                                                className={`py-1 px-2 rounded-lg border text-xs font-mono font-bold ${line.entry_type === 'DEBIT' ? 'bg-slate-900 text-white' : 'bg-emerald-700 text-white'}`}
                                            >
                                                <option value="DEBIT">DEBIT (DR)</option>
                                                <option value="CREDIT">CREDIT (CR)</option>
                                            </select>

                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={line.amount}
                                                onChange={(e) => {
                                                    const copy = [...entryLines];
                                                    copy[idx].amount = parseFloat(e.target.value) || 0;
                                                    setEntryLines(copy);
                                                }}
                                                placeholder="Amount"
                                                className="w-24 py-1 px-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-right bg-white"
                                            />

                                            {entryLines.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEntryLines(entryLines.filter((_, i) => i !== idx))}
                                                    className="text-rose-500 hover:text-rose-700 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Balance Verification Footer */}
                            <div className="p-3 rounded-xl border bg-slate-50 flex items-center justify-between text-xs font-mono">
                                <div>
                                    <span>Debits: <strong>${totalDebits.toFixed(2)}</strong></span>
                                    <span className="mx-2">|</span>
                                    <span>Credits: <strong>${totalCredits.toFixed(2)}</strong></span>
                                </div>
                                <div>
                                    {isBalanced ? (
                                        <Badge variant="success" className="text-xs">
                                            Equilibrium Balanced
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="text-xs">
                                            Diff: ${diff.toFixed(2)}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {entryErrors.journal_entry && (
                                <div className="text-xs text-rose-600 font-semibold">
                                    {entryErrors.journal_entry}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsCreateEntryOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={entryProcessing || !isBalanced} className="bg-emerald-600 text-white hover:bg-emerald-500 font-bold">
                                    Post Journal Voucher
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
