import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Shield, Building2, FileCheck, Plus, Search,
    CheckCircle2, Clock, X, AlertCircle, FileText,
    DollarSign, ArrowUpRight, Check
} from 'lucide-react';

interface Patient {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
}

interface InsuranceProvider {
    id: string;
    name: string;
    code: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    tax_id?: string;
    is_active: boolean;
    policies_count?: number;
    claims_count?: number;
}

interface InsurancePolicy {
    id: string;
    policy_number: string;
    group_number?: string;
    coverage_percentage: string;
    copay_amount: string;
    annual_limit: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    patient?: Patient;
    provider?: InsuranceProvider;
}

interface InsuranceClaim {
    id: string;
    claim_number: string;
    claimed_amount: string;
    approved_amount: string;
    disallowed_amount: string;
    status: string;
    submitted_at: string;
    adjudicated_at?: string;
    adjudication_notes?: string;
    pre_auth_code?: string;
    patient?: Patient;
    provider?: InsuranceProvider;
    policy?: InsurancePolicy;
    invoice?: {
        invoice_number: string;
        total_amount: string;
    };
    adjudicatedByUser?: {
        name: string;
    };
}

interface Props {
    claims: {
        data: InsuranceClaim[];
        links: any[];
        total: number;
    };
    providers: InsuranceProvider[];
    policies: {
        data: InsurancePolicy[];
        links: any[];
        total: number;
    };
    patients: Patient[];
    activeTab: string;
    claimStatuses: string[];
    filters: {
        claim_status?: string;
    };
}

export default function InsuranceIndex({
    claims,
    providers,
    policies,
    patients,
    activeTab: initialTab,
    claimStatuses,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState<'claims' | 'providers' | 'policies'>(
        initialTab === 'providers' ? 'providers' : initialTab === 'policies' ? 'policies' : 'claims'
    );

    const [isCreateProviderOpen, setIsCreateProviderOpen] = useState(false);
    const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
    const [adjudicateClaim, setAdjudicateClaim] = useState<InsuranceClaim | null>(null);

    // Form: Register Provider
    const {
        data: providerData,
        setData: setProviderData,
        post: postProvider,
        processing: providerProcessing,
        reset: resetProvider,
    } = useForm({
        name: '',
        code: '',
        contact_person: '',
        email: '',
        phone: '',
        tax_id: '',
        address: '',
    });

    const handleProviderSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postProvider('/billing/insurance/providers', {
            onSuccess: () => {
                setIsCreateProviderOpen(false);
                resetProvider();
            },
        });
    };

    // Form: Assign Policy
    const {
        data: policyData,
        setData: setPolicyData,
        post: postPolicy,
        processing: policyProcessing,
        reset: resetPolicy,
    } = useForm({
        patient_id: patients[0]?.id || '',
        insurance_provider_id: providers[0]?.id || '',
        policy_number: '',
        group_number: '',
        coverage_percentage: 80.00,
        copay_amount: 20.00,
        annual_limit: 50000.00,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    const handlePolicySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postPolicy('/billing/insurance/policies', {
            onSuccess: () => {
                setIsCreatePolicyOpen(false);
                resetPolicy();
                setActiveTab('policies');
            },
        });
    };

    // Form: Adjudicate Claim
    const {
        data: adjData,
        setData: setAdjData,
        post: postAdjudicate,
        processing: adjProcessing,
    } = useForm({
        status: 'APPROVED',
        approved_amount: 0,
        disallowed_amount: 0,
        notes: '',
    });

    const openAdjudicate = (claim: InsuranceClaim) => {
        setAdjudicateClaim(claim);
        const claimed = parseFloat(claim.claimed_amount);
        setAdjData('status', 'APPROVED');
        setAdjData('approved_amount', claimed);
        setAdjData('disallowed_amount', 0);
        setAdjData('notes', 'Adjudicated and verified in accordance with TPA policy limits.');
    };

    const handleAdjudicateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjudicateClaim) return;

        postAdjudicate(`/billing/insurance/claims/${adjudicateClaim.id}/adjudicate`, {
            onSuccess: () => {
                setAdjudicateClaim(null);
            },
        });
    };

    return (
        <AppLayout title="Insurance & TPA Claims">
            <Head title="Hospital Insurance Claims & Payers" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Phase 7: Payer & Claims Gateway
                            </span>
                            <span className="text-xs text-slate-400">TPA Claims Adjudication</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2.5">
                            <Shield className="w-7 h-7 text-indigo-400" />
                            Insurance Providers, Policies & Claims
                        </h1>
                        <p className="text-slate-300 text-sm mt-1">
                            Submit medical claims, adjudicate payouts, track disallowances, and post automated claim settlements to the General Ledger.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsCreateProviderOpen(true)}
                            variant="outline"
                            className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700 text-xs"
                        >
                            <Building2 className="w-4 h-4 mr-1.5" />
                            Add Payer
                        </Button>
                        <Button
                            onClick={() => setIsCreatePolicyOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                        >
                            <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                            Assign Policy
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-3 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('claims')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'claims' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <FileCheck className="w-4 h-4" />
                        Claims Adjudication Queue ({claims.total})
                    </button>
                    <button
                        onClick={() => setActiveTab('providers')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'providers' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Building2 className="w-4 h-4" />
                        Insurance Payers ({providers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('policies')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'policies' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Shield className="w-4 h-4" />
                        Patient Policies ({policies.total})
                    </button>
                </div>

                {/* Tab: Claims */}
                {activeTab === 'claims' && (
                    <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 text-base">Third-Party Payer (TPA) Claims Queue</h2>
                            <span className="text-xs text-slate-400">Total: {claims.total} claims</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Claim #</th>
                                        <th className="py-3 px-4">Payer / Insurer</th>
                                        <th className="py-3 px-4">Patient</th>
                                        <th className="py-3 px-4">Invoice #</th>
                                        <th className="py-3 px-4">Claimed</th>
                                        <th className="py-3 px-4">Approved</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {claims.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                                                No insurance claims submitted yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        claims.data.map((c) => (
                                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 text-xs">
                                                    {c.claim_number}
                                                </td>
                                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                                    {c.provider?.name}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-slate-900">
                                                        {c.patient?.first_name} {c.patient?.last_name}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono">
                                                        MRN: {c.patient?.mrn}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                                                    {c.invoice?.invoice_number}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                                    ${Number(c.claimed_amount).toFixed(2)}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-xs text-emerald-700 font-bold">
                                                    ${Number(c.approved_amount).toFixed(2)}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {c.status === 'APPROVED' ? (
                                                        <Badge variant="success" className="text-[10px]">Approved</Badge>
                                                    ) : c.status === 'PARTIALLY_APPROVED' ? (
                                                        <Badge variant="amber" className="text-[10px]">Partially Approved</Badge>
                                                    ) : c.status === 'REJECTED' ? (
                                                        <Badge variant="destructive" className="text-[10px]">Rejected</Badge>
                                                    ) : (
                                                        <Badge variant="cyan" className="text-[10px]">Submitted</Badge>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    {c.status === 'SUBMITTED' || c.status === 'IN_REVIEW' ? (
                                                        <Button
                                                            onClick={() => openAdjudicate(c)}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1 px-2.5 shadow-xs font-bold"
                                                        >
                                                            Adjudicate
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium">Adjudicated</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab: Providers */}
                {activeTab === 'providers' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {providers.map((p) => (
                            <Card key={p.id} className="p-5 bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                            {p.code}
                                        </div>
                                        <Badge variant={p.is_active ? 'success' : 'slate'} className="text-[10px]">
                                            {p.is_active ? 'Active Payer' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-base mt-3">{p.name}</h3>
                                    <div className="text-xs text-slate-500 mt-0.5">Contact: {p.contact_person || 'N/A'}</div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Email:</span>
                                            <span className="font-medium text-slate-800">{p.email || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Phone:</span>
                                            <span className="font-medium text-slate-800">{p.phone || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Tax / Payer ID:</span>
                                            <span className="font-mono text-slate-800">{p.tax_id || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Tab: Policies */}
                {activeTab === 'policies' && (
                    <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 text-base">Active Patient Insurance Policies</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Policy #</th>
                                        <th className="py-3 px-4">Insurance Company</th>
                                        <th className="py-3 px-4">Patient</th>
                                        <th className="py-3 px-4">Coverage %</th>
                                        <th className="py-3 px-4">Co-Pay</th>
                                        <th className="py-3 px-4">Annual Limit</th>
                                        <th className="py-3 px-4">Validity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {policies.data.map((pol) => (
                                        <tr key={pol.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-indigo-700 text-xs">
                                                {pol.policy_number}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {pol.provider?.name}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-900">
                                                    {pol.patient?.first_name} {pol.patient?.last_name}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">
                                                    MRN: {pol.patient?.mrn}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                                                {pol.coverage_percentage}%
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-slate-700">
                                                ${Number(pol.copay_amount).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-slate-900 font-bold">
                                                ${Number(pol.annual_limit).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-xs font-mono text-slate-500">
                                                {pol.start_date} to {pol.end_date}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Modal: Register Provider */}
            {isCreateProviderOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-md w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Register Insurance Payer / TPA</h3>
                            <button onClick={() => setIsCreateProviderOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleProviderSubmit} className="mt-4 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                                    <Input
                                        value={providerData.name}
                                        onChange={(e) => setProviderData('name', e.target.value)}
                                        placeholder="e.g. Aetna Global Healthcare"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
                                    <Input
                                        value={providerData.code}
                                        onChange={(e) => setProviderData('code', e.target.value)}
                                        placeholder="AETNA"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                                <Input
                                    value={providerData.contact_person}
                                    onChange={(e) => setProviderData('contact_person', e.target.value)}
                                    placeholder="e.g. Marcus Flint, Claims Director"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                                    <Input
                                        type="email"
                                        value={providerData.email}
                                        onChange={(e) => setProviderData('email', e.target.value)}
                                        placeholder="claims@insurer.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                                    <Input
                                        value={providerData.phone}
                                        onChange={(e) => setProviderData('phone', e.target.value)}
                                        placeholder="+1 800-555-0199"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax / Payer ID</label>
                                <Input
                                    value={providerData.tax_id}
                                    onChange={(e) => setProviderData('tax_id', e.target.value)}
                                    placeholder="e.g. TPA-88912"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsCreateProviderOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={providerProcessing} className="bg-indigo-600 text-white hover:bg-indigo-500 font-bold">
                                    Save Payer
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Assign Policy to Patient */}
            {isCreatePolicyOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-lg w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Assign Insurance Policy to Patient</h3>
                            <button onClick={() => setIsCreatePolicyOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePolicySubmit} className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient *</label>
                                <select
                                    value={policyData.patient_id}
                                    onChange={(e) => setPolicyData('patient_id', e.target.value)}
                                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                                >
                                    {patients.map((p) => (
                                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Insurance Provider *</label>
                                <select
                                    value={policyData.insurance_provider_id}
                                    onChange={(e) => setPolicyData('insurance_provider_id', e.target.value)}
                                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                                >
                                    {providers.map((pr) => (
                                        <option key={pr.id} value={pr.id}>{pr.name} ({pr.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Policy / Member # *</label>
                                    <Input
                                        value={policyData.policy_number}
                                        onChange={(e) => setPolicyData('policy_number', e.target.value)}
                                        placeholder="POL-882193"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Group #</label>
                                    <Input
                                        value={policyData.group_number}
                                        onChange={(e) => setPolicyData('group_number', e.target.value)}
                                        placeholder="GRP-441"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Coverage (%) *</label>
                                    <Input
                                        type="number"
                                        value={policyData.coverage_percentage}
                                        onChange={(e) => setPolicyData('coverage_percentage', parseFloat(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Co-Pay ($)</label>
                                    <Input
                                        type="number"
                                        value={policyData.copay_amount}
                                        onChange={(e) => setPolicyData('copay_amount', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Cap ($)</label>
                                    <Input
                                        type="number"
                                        value={policyData.annual_limit}
                                        onChange={(e) => setPolicyData('annual_limit', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Coverage Start *</label>
                                    <Input
                                        type="date"
                                        value={policyData.start_date}
                                        onChange={(e) => setPolicyData('start_date', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Coverage End *</label>
                                    <Input
                                        type="date"
                                        value={policyData.end_date}
                                        onChange={(e) => setPolicyData('end_date', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsCreatePolicyOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={policyProcessing} className="bg-indigo-600 text-white hover:bg-indigo-500 font-bold">
                                    Assign Policy
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Adjudicate Claim */}
            {adjudicateClaim && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-md w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">Adjudicate Insurance Claim</h3>
                                <p className="text-xs text-slate-500">Claim #{adjudicateClaim.claim_number} ({adjudicateClaim.provider?.name})</p>
                            </div>
                            <button onClick={() => setAdjudicateClaim(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAdjudicateSubmit} className="mt-4 space-y-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                                <div>
                                    <span className="text-slate-500 block">Claimed by Hospital</span>
                                    <span className="font-bold text-sm text-indigo-700 font-mono">
                                        ${Number(adjudicateClaim.claimed_amount).toFixed(2)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-500 block">Patient</span>
                                    <span className="font-medium text-slate-800">
                                        {adjudicateClaim.patient?.first_name} {adjudicateClaim.patient?.last_name}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjudication Decision *</label>
                                <select
                                    value={adjData.status}
                                    onChange={(e) => setAdjData('status', e.target.value)}
                                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 font-semibold"
                                >
                                    <option value="APPROVED">Approve in Full</option>
                                    <option value="PARTIALLY_APPROVED">Partially Approve (with deductions)</option>
                                    <option value="REJECTED">Reject / Deny Claim</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Settlement ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={adjData.approved_amount}
                                        onChange={(e) => {
                                            const appVal = parseFloat(e.target.value) || 0;
                                            setAdjData('approved_amount', appVal);
                                            setAdjData('disallowed_amount', Math.max(0, parseFloat(adjudicateClaim.claimed_amount) - appVal));
                                        }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Disallowed / Bad Debt ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={adjData.disallowed_amount}
                                        onChange={(e) => setAdjData('disallowed_amount', parseFloat(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjudication Notes / Reason</label>
                                <Input
                                    value={adjData.notes}
                                    onChange={(e) => setAdjData('notes', e.target.value)}
                                    placeholder="e.g. Approved per schedule of benefits; 10% deductible applied"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setAdjudicateClaim(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={adjProcessing} className="bg-indigo-600 text-white hover:bg-indigo-500 font-bold">
                                    Settle Claim & Post to GL
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
