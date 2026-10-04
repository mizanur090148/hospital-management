import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    FlaskConical, Search, Plus, Filter, CheckCircle2,
    Clock, AlertTriangle, UserCheck, ChevronDown, ChevronUp,
    FileText, X, Check, Dna, Droplet, ShieldAlert
} from 'lucide-react';

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    gender: string;
    dob: string;
}

interface Doctor {
    id: string;
    user?: { name: string };
    department?: { name: string };
    specialization: string;
}

interface Branch {
    id: string;
    name: string;
}

interface LabTestTemplate {
    id: string;
    code: string;
    name: string;
    category: string;
    sample_type: string;
    price: string;
    turnaround_time_hours: number;
    reference_ranges?: Array<{
        parameter: string;
        range: string;
        unit: string;
        gender?: string;
    }>;
}

interface LabSample {
    id: string;
    sample_barcode: string;
    sample_type: string;
    status: string;
    collected_at?: string;
    collected_by?: { name: string };
    rejection_reason?: string;
}

interface LabResult {
    id: string;
    parameter_name: string;
    observed_value: string;
    reference_range?: string;
    unit?: string;
    is_abnormal: boolean;
    critical_flag: boolean;
    pathologist_notes?: string;
    status: string;
    verified_at?: string;
    verified_by?: { name: string };
}

interface LabOrderItem {
    id: string;
    test_name: string;
    price: string;
    status: string;
    template?: LabTestTemplate;
    results: LabResult[];
}

interface LabOrder {
    id: string;
    order_number: string;
    priority: string;
    status: string;
    ordered_at: string;
    clinical_notes?: string;
    patient: Patient;
    ordering_doctor: Doctor;
    branch: Branch;
    items: LabOrderItem[];
    samples: LabSample[];
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Props {
    labOrders: PaginatedData<LabOrder>;
    templates: LabTestTemplate[];
    doctors: Doctor[];
    patients: Patient[];
    branches: Branch[];
    metrics: {
        total_pending: number;
        in_analysis: number;
        stat_orders: number;
        samples_pending: number;
    };
    filters: {
        status?: string;
        priority?: string;
        search?: string;
    };
    statuses: string[];
    priorities: string[];
}

export default function LabIndex({
    labOrders,
    templates,
    doctors,
    patients,
    branches,
    metrics,
    filters,
    statuses,
    priorities,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [isRequisitionOpen, setIsRequisitionOpen] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    // Result Entry State
    const [resultModalItem, setResultModalItem] = useState<LabOrderItem | null>(null);
    const [resultRows, setResultRows] = useState<Array<{
        parameter_name: string;
        observed_value: string;
        reference_range: string;
        unit: string;
        is_abnormal: boolean;
        critical_flag: boolean;
        pathologist_notes: string;
    }>>([]);

    // New Requisition Form
    const { data, setData, post, processing, errors, reset } = useForm({
        branch_id: branches[0]?.id || '',
        patient_id: '',
        ordering_doctor_id: '',
        priority: 'ROUTINE',
        clinical_notes: '',
        template_ids: [] as string[],
        encounter_type: 'DIRECT',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/laboratory', { ...filters, search }, { preserveState: true });
    };

    const handleFilterStatus = (status: string) => {
        router.get('/laboratory', { ...filters, status: status === filters.status ? undefined : status }, { preserveState: true });
    };

    const handleFilterPriority = (priority: string) => {
        router.get('/laboratory', { ...filters, priority: priority === filters.priority ? undefined : priority }, { preserveState: true });
    };

    const handleCreateOrder = (e: React.FormEvent) => {
        e.preventDefault();
        post('/laboratory/orders', {
            onSuccess: () => {
                setIsRequisitionOpen(false);
                reset();
            },
        });
    };

    const handleCollectSample = (sampleId: string) => {
        router.post(`/laboratory/samples/${sampleId}/collect`, {
            status: 'COLLECTED',
        }, { preserveScroll: true });
    };

    const openResultModal = (item: LabOrderItem) => {
        setResultModalItem(item);
        if (item.results && item.results.length > 0) {
            setResultRows(item.results.map(r => ({
                parameter_name: r.parameter_name,
                observed_value: r.observed_value,
                reference_range: r.reference_range || '',
                unit: r.unit || '',
                is_abnormal: r.is_abnormal,
                critical_flag: r.critical_flag,
                pathologist_notes: r.pathologist_notes || '',
            })));
        } else if (item.template?.reference_ranges && item.template.reference_ranges.length > 0) {
            setResultRows(item.template.reference_ranges.map(rr => ({
                parameter_name: rr.parameter,
                observed_value: '',
                reference_range: rr.range,
                unit: rr.unit,
                is_abnormal: false,
                critical_flag: false,
                pathologist_notes: '',
            })));
        } else {
            setResultRows([{
                parameter_name: item.test_name,
                observed_value: '',
                reference_range: '',
                unit: '',
                is_abnormal: false,
                critical_flag: false,
                pathologist_notes: '',
            }]);
        }
    };

    const handleSaveResults = (e: React.FormEvent) => {
        e.preventDefault();
        if (!resultModalItem) return;

        router.post(`/laboratory/items/${resultModalItem.id}/results`, {
            results: resultRows,
        }, {
            preserveScroll: true,
            onSuccess: () => setResultModalItem(null),
        });
    };

    const handleVerifyOrder = (orderId: string) => {
        if (confirm('Verify and release all finalized diagnostic test results for this order?')) {
            router.post(`/laboratory/orders/${orderId}/verify`, {}, { preserveScroll: true });
        }
    };

    const toggleTemplateSelection = (tmplId: string) => {
        if (data.template_ids.includes(tmplId)) {
            setData('template_ids', data.template_ids.filter(id => id !== tmplId));
        } else {
            setData('template_ids', [...data.template_ids, tmplId]);
        }
    };

    return (
        <AppLayout title="Diagnostic Laboratory Workstation">
            <Head title="Diagnostic Laboratory Workstation" />

            <div className="space-y-6">
                {/* Header & Requisition CTA */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                                <FlaskConical className="w-6 h-6" />
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    Laboratory Diagnostics & Pathology
                                </h1>
                                <p className="text-xs text-slate-500">
                                    Test requisitions, specimen barcode tracking, automated result entry, and pathologist sign-off.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            onClick={() => setIsRequisitionOpen(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Lab Requisition
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">Pending Orders</p>
                            <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.total_pending}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Requisitions awaiting testing</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">Samples to Collect</p>
                            <Droplet className="w-4 h-4 text-sky-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-sky-600">{metrics.samples_pending}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Specimens pending phlebotomy</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">In Analysis</p>
                            <Dna className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-purple-600">{metrics.in_analysis}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Under analyzer processing</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">STAT Emergencies</p>
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-rose-600">{metrics.stat_orders}</p>
                        <p className="text-[10px] text-rose-500/80 mt-1 font-semibold">Immediate turnaround required</p>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <Card className="p-4 bg-white border-slate-200">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <form onSubmit={handleSearch} className="flex-1 w-full md:max-w-md flex gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by Order #, Barcode, MRN or Patient..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                />
                            </div>
                            <Button type="submit" variant="secondary" className="px-4 text-xs">
                                Search
                            </Button>
                        </form>

                        {/* Priority Filters */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center">
                                <Filter className="w-3.5 h-3.5 mr-1" /> Priority:
                            </span>
                            {priorities.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => handleFilterPriority(p)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${filters.priority === p ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        {/* Status Filters */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-xs font-semibold text-slate-400 mr-1">Status:</span>
                            {statuses.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleFilterStatus(s)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${filters.status === s ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Lab Orders Queue Table */}
                <Card className="bg-white border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-4">Order # & Priority</th>
                                    <th className="py-3 px-4">Patient Information</th>
                                    <th className="py-3 px-4">Ordering Physician</th>
                                    <th className="py-3 px-4">Specimens & Barcodes</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {labOrders.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-slate-400">
                                            No laboratory diagnostic orders found matching the filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    labOrders.data.map((order) => {
                                        const isExpanded = expandedOrderId === order.id;
                                        const isStat = order.priority === 'STAT';

                                        return (
                                            <React.Fragment key={order.id}>
                                                <tr className={`hover:bg-slate-50/80 transition-colors ${isStat ? 'bg-rose-50/30' : ''}`}>
                                                    <td className="py-3 px-4">
                                                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                                            {order.order_number}
                                                            {isStat && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                                                                    STAT
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {new Date(order.ordered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900">
                                                            {order.patient.first_name} {order.patient.last_name}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-500">
                                                            MRN: {order.patient.mrn} • {order.patient.gender}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-slate-800">
                                                            {order.ordering_doctor.user?.name || 'Physician'}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {order.ordering_doctor.specialization}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {order.samples.map((s) => (
                                                                <div
                                                                    key={s.id}
                                                                    className={`px-2 py-1 rounded text-[10px] font-mono border flex items-center gap-1 ${s.status === 'COLLECTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
                                                                >
                                                                    <Droplet className="w-3 h-3" />
                                                                    <span>{s.sample_barcode}</span>
                                                                    <span className="font-sans font-bold">({s.sample_type})</span>
                                                                    {s.status === 'PENDING' && (
                                                                        <button
                                                                            onClick={() => handleCollectSample(s.id)}
                                                                            title="Mark Collected"
                                                                            className="ml-1 text-xs text-amber-700 hover:text-emerald-700 font-bold underline"
                                                                        >
                                                                            Collect
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    <td className="py-3 px-4">
                                                        <Badge
                                                            variant={
                                                                order.status === 'VERIFIED'
                                                                    ? 'success'
                                                                    : order.status === 'IN_ANALYSIS'
                                                                    ? 'purple'
                                                                    : order.status === 'SAMPLE_COLLECTED'
                                                                    ? 'blue'
                                                                    : 'warning'
                                                            }
                                                        >
                                                            {order.status.replace('_', ' ')}
                                                        </Badge>
                                                    </td>

                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {order.status !== 'VERIFIED' && order.items.some(i => i.results.length > 0) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="primary"
                                                                    onClick={() => handleVerifyOrder(order.id)}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-1 px-2.5"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                                    Verify
                                                                </Button>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                                                className="text-[11px] py-1 px-2"
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Diagnostic Detail & Result Entry Accordion */}
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/70 border-b border-slate-200">
                                                        <td colSpan={6} className="p-4">
                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                                        Diagnostic Tests in Requisition ({order.items.length})
                                                                    </h4>
                                                                    {order.clinical_notes && (
                                                                        <span className="text-[11px] text-slate-500 italic">
                                                                            Clinical Notes: {order.clinical_notes}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    {order.items.map((item) => (
                                                                        <div key={item.id} className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2">
                                                                            <div className="flex items-center justify-between">
                                                                                <div>
                                                                                    <span className="font-bold text-slate-900 text-xs">{item.test_name}</span>
                                                                                    <span className="ml-2 text-[10px] text-slate-400 font-mono">${item.price}</span>
                                                                                </div>
                                                                                <Badge variant={item.status === 'VERIFIED' ? 'success' : item.status === 'IN_ANALYSIS' ? 'purple' : 'warning'}>
                                                                                    {item.status}
                                                                                </Badge>
                                                                            </div>

                                                                            {/* Test Results Table if Entered */}
                                                                            {item.results && item.results.length > 0 ? (
                                                                                <div className="mt-2 border border-slate-100 rounded-md overflow-hidden">
                                                                                    <table className="w-full text-left text-[11px]">
                                                                                        <thead className="bg-slate-50 text-slate-500">
                                                                                            <tr>
                                                                                                <th className="py-1 px-2">Parameter</th>
                                                                                                <th className="py-1 px-2">Value</th>
                                                                                                <th className="py-1 px-2">Ref. Range</th>
                                                                                                <th className="py-1 px-2">Unit</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-slate-100">
                                                                                            {item.results.map((res) => (
                                                                                                <tr key={res.id} className={res.critical_flag ? 'bg-rose-50 text-rose-800 font-bold' : res.is_abnormal ? 'bg-amber-50 text-amber-800 font-semibold' : ''}>
                                                                                                    <td className="py-1 px-2">{res.parameter_name}</td>
                                                                                                    <td className="py-1 px-2 font-mono">
                                                                                                        {res.observed_value}
                                                                                                        {res.critical_flag && ' (CRITICAL)'}
                                                                                                        {res.is_abnormal && !res.critical_flag && ' (H/L)'}
                                                                                                    </td>
                                                                                                    <td className="py-1 px-2 text-slate-400">{res.reference_range || '-'}</td>
                                                                                                    <td className="py-1 px-2 text-slate-400">{res.unit || '-'}</td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-[11px] text-slate-400 italic">No parameter observations recorded yet.</p>
                                                                            )}

                                                                            {order.status !== 'VERIFIED' && (
                                                                                <div className="pt-1 flex justify-end">
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={() => openResultModal(item)}
                                                                                        className="text-[11px] py-1 px-2.5 text-purple-600 hover:text-purple-700 border-purple-200"
                                                                                    >
                                                                                        <FileText className="w-3 h-3 mr-1" />
                                                                                        Enter / Edit Results
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal: New Laboratory Requisition */}
            {isRequisitionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl border-slate-200 max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-purple-600" />
                                <h3 className="text-base font-bold text-slate-900">New Laboratory Requisition</h3>
                            </div>
                            <button
                                onClick={() => setIsRequisitionOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
                                    <select
                                        value={data.patient_id}
                                        onChange={(e) => setData('patient_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    >
                                        <option value="">-- Choose Patient --</option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.first_name} {p.last_name} ({p.mrn})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.patient_id && <p className="text-rose-500 text-[10px] mt-0.5">{errors.patient_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ordering Doctor *</label>
                                    <select
                                        value={data.ordering_doctor_id}
                                        onChange={(e) => setData('ordering_doctor_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    >
                                        <option value="">-- Choose Physician --</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.user?.name} ({d.specialization})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.ordering_doctor_id && <p className="text-rose-500 text-[10px] mt-0.5">{errors.ordering_doctor_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Priority *</label>
                                    <select
                                        value={data.priority}
                                        onChange={(e) => setData('priority', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    >
                                        <option value="ROUTINE">Routine Standard</option>
                                        <option value="URGENT">Urgent Priority</option>
                                        <option value="STAT">STAT (Immediate Emergency)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Branch *</label>
                                    <select
                                        value={data.branch_id}
                                        onChange={(e) => setData('branch_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Selectable Tests from Catalog */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Select Tests to Order * (Selected: {data.template_ids.length})
                                </label>
                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 divide-y divide-slate-100 bg-slate-50/50">
                                    {templates.map((tmpl) => {
                                        const isSelected = data.template_ids.includes(tmpl.id);
                                        return (
                                            <div
                                                key={tmpl.id}
                                                onClick={() => toggleTemplateSelection(tmpl.id)}
                                                className={`p-2 rounded cursor-pointer flex items-center justify-between text-xs transition-colors ${isSelected ? 'bg-purple-100/60 font-semibold text-purple-900' : 'hover:bg-slate-100 text-slate-700'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300'}`}>
                                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                    </div>
                                                    <span>{tmpl.name}</span>
                                                    <span className="text-[10px] text-slate-400">({tmpl.category} • {tmpl.sample_type})</span>
                                                </div>
                                                <span className="font-mono text-xs text-slate-600">${tmpl.price}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {errors.template_ids && <p className="text-rose-500 text-[10px] mt-0.5">{errors.template_ids}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Indications / Notes</label>
                                <textarea
                                    value={data.clinical_notes}
                                    onChange={(e) => setData('clinical_notes', e.target.value)}
                                    placeholder="Patient clinical indications or suspected conditions..."
                                    rows={2}
                                    className="w-full text-xs rounded-lg border-slate-200"
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                                <Button type="button" variant="secondary" onClick={() => setIsRequisitionOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={processing || data.template_ids.length === 0} className="bg-purple-600 hover:bg-purple-700 text-white">
                                    Confirm Requisition
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Result Entry Workstation */}
            {resultModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl border-slate-200 max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Enter Results: {resultModalItem.test_name}</h3>
                                <p className="text-[11px] text-slate-400">Record observed diagnostic parameters and alert flags</p>
                            </div>
                            <button
                                onClick={() => setResultModalItem(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveResults} className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="space-y-3">
                                {resultRows.map((row, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-800 text-xs">{row.parameter_name}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                Ref: {row.reference_range || 'N/A'} {row.unit}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Observed Value *</label>
                                                <input
                                                    type="text"
                                                    value={row.observed_value}
                                                    onChange={(e) => {
                                                        const updated = [...resultRows];
                                                        updated[idx].observed_value = e.target.value;
                                                        setResultRows(updated);
                                                    }}
                                                    placeholder="Enter observed measurement..."
                                                    className="w-full text-xs rounded border-slate-200"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Pathologist Notes</label>
                                                <input
                                                    type="text"
                                                    value={row.pathologist_notes}
                                                    onChange={(e) => {
                                                        const updated = [...resultRows];
                                                        updated[idx].pathologist_notes = e.target.value;
                                                        setResultRows(updated);
                                                    }}
                                                    placeholder="Morphology or comment..."
                                                    className="w-full text-xs rounded border-slate-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 pt-1">
                                            <label className="flex items-center gap-1.5 text-xs text-amber-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={row.is_abnormal}
                                                    onChange={(e) => {
                                                        const updated = [...resultRows];
                                                        updated[idx].is_abnormal = e.target.checked;
                                                        setResultRows(updated);
                                                    }}
                                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <span>Flag Abnormal (High/Low)</span>
                                            </label>

                                            <label className="flex items-center gap-1.5 text-xs text-rose-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={row.critical_flag}
                                                    onChange={(e) => {
                                                        const updated = [...resultRows];
                                                        updated[idx].critical_flag = e.target.checked;
                                                        setResultRows(updated);
                                                    }}
                                                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                                />
                                                <span className="font-bold">Panic / Critical Alert</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                                <Button type="button" variant="secondary" onClick={() => setResultModalItem(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white">
                                    Save Results
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
