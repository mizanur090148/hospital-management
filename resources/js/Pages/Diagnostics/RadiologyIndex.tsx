import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    ScanLine, Search, Plus, Filter, CheckCircle2,
    Eye, Sliders, RotateCcw, ZoomIn, ZoomOut, Contrast,
    FileText, X, Check, ShieldAlert, Clock, AlertCircle
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

interface RadiologyTemplate {
    id: string;
    code: string;
    name: string;
    modality: string;
    body_part: string;
    price: string;
    instructions?: string;
}

interface RadiologyOrder {
    id: string;
    order_number: string;
    priority: string;
    status: string;
    clinical_indication: string;
    findings?: string;
    impression?: string;
    radiologist_notes?: string;
    dicom_study_uid?: string;
    dicom_preview_url?: string;
    ordered_at: string;
    verified_at?: string;
    patient: Patient;
    ordering_doctor: Doctor;
    reporting_doctor?: Doctor;
    template: RadiologyTemplate;
    branch: Branch;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Props {
    radiologyOrders: PaginatedData<RadiologyOrder>;
    templates: RadiologyTemplate[];
    doctors: Doctor[];
    patients: Patient[];
    branches: Branch[];
    metrics: {
        total_pending: number;
        captured: number;
        reported: number;
        stat_urgent: number;
    };
    filters: {
        status?: string;
        modality?: string;
        priority?: string;
        search?: string;
    };
    modalities: string[];
    statuses: string[];
    priorities: string[];
}

export default function RadiologyIndex({
    radiologyOrders,
    templates,
    doctors,
    patients,
    branches,
    metrics,
    filters,
    modalities,
    statuses,
    priorities,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [isRequisitionOpen, setIsRequisitionOpen] = useState(false);

    // DICOM Viewer Modal
    const [viewingDicomOrder, setViewingDicomOrder] = useState<RadiologyOrder | null>(null);
    const [dicomZoom, setDicomZoom] = useState(1);
    const [dicomInverted, setDicomInverted] = useState(false);
    const [dicomPreset, setDicomPreset] = useState<'bone' | 'soft' | 'lung'>('soft');

    // Reporting Modal
    const [reportingOrder, setReportingOrder] = useState<RadiologyOrder | null>(null);
    const [reportingDoctorId, setReportingDoctorId] = useState('');
    const [findings, setFindings] = useState('');
    const [impression, setImpression] = useState('');
    const [radiologistNotes, setRadiologistNotes] = useState('');

    // Requisition Form
    const { data, setData, post, processing, errors, reset } = useForm({
        branch_id: branches[0]?.id || '',
        patient_id: '',
        ordering_doctor_id: '',
        template_id: '',
        priority: 'ROUTINE',
        clinical_indication: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/radiology', { ...filters, search }, { preserveState: true });
    };

    const handleFilterModality = (mod: string) => {
        router.get('/radiology', { ...filters, modality: mod === filters.modality ? undefined : mod }, { preserveState: true });
    };

    const handleFilterStatus = (status: string) => {
        router.get('/radiology', { ...filters, status: status === filters.status ? undefined : status }, { preserveState: true });
    };

    const handleCreateOrder = (e: React.FormEvent) => {
        e.preventDefault();
        post('/radiology/orders', {
            onSuccess: () => {
                setIsRequisitionOpen(false);
                reset();
            },
        });
    };

    const handleCaptureScan = (orderId: string) => {
        router.post(`/radiology/orders/${orderId}/capture`, {
            dicom_study_uid: `1.2.840.113619.2.55.${Date.now()}`,
        }, { preserveScroll: true });
    };

    const openReportingModal = (order: RadiologyOrder) => {
        setReportingOrder(order);
        setReportingDoctorId(order.reporting_doctor?.id || doctors[0]?.id || '');
        setFindings(order.findings || '');
        setImpression(order.impression || '');
        setRadiologistNotes(order.radiologist_notes || '');
    };

    const handleSaveReport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportingOrder) return;

        router.post(`/radiology/orders/${reportingOrder.id}/report`, {
            reporting_doctor_id: reportingDoctorId,
            findings,
            impression,
            radiologist_notes: radiologistNotes,
        }, {
            preserveScroll: true,
            onSuccess: () => setReportingOrder(null),
        });
    };

    const handleVerifyReport = (orderId: string) => {
        if (confirm('Verify and officially sign this radiology diagnostic report?')) {
            router.post(`/radiology/orders/${orderId}/verify`, {}, { preserveScroll: true });
        }
    };

    return (
        <AppLayout title="Radiology & DICOM Imaging Workstation">
            <Head title="Radiology & DICOM Imaging Workstation" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600">
                                <ScanLine className="w-6 h-6" />
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    Radiology & Medical Imaging (PACS)
                                </h1>
                                <p className="text-xs text-slate-500">
                                    Digital Radiography, CT, MRI, Ultrasound scan scheduling, DICOM viewer, and verified reports.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="primary"
                            onClick={() => setIsRequisitionOpen(true)}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm shadow-cyan-600/20"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Imaging Requisition
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">Pending Scans</p>
                            <Clock className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.total_pending}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Requisitions awaiting scan</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">Captured Series</p>
                            <ScanLine className="w-4 h-4 text-indigo-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-indigo-600">{metrics.captured}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Images in PACS waiting report</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">Reports Drafted</p>
                            <FileText className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-purple-600">{metrics.reported}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Awaiting radiologist sign-off</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">STAT Emergencies</p>
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-rose-600">{metrics.stat_urgent}</p>
                        <p className="text-[10px] text-rose-500/80 mt-1 font-semibold">Priority imaging required</p>
                    </Card>
                </div>

                {/* Filter & Modality Switcher */}
                <Card className="p-4 bg-white border-slate-200 space-y-3">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <form onSubmit={handleSearch} className="flex-1 w-full md:max-w-md flex gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by Order #, Study UID, MRN or Patient..."
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                                />
                            </div>
                            <Button type="submit" variant="secondary" className="px-4 text-xs">
                                Search
                            </Button>
                        </form>

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

                    {/* Modality Tabs */}
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto">
                        <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center">
                            <Filter className="w-3.5 h-3.5 mr-1" /> Modality:
                        </span>
                        <button
                            onClick={() => handleFilterModality('')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${!filters.modality ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            All Modalities
                        </button>
                        {modalities.map((mod) => (
                            <button
                                key={mod}
                                onClick={() => handleFilterModality(mod)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filters.modality === mod ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                {mod.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Radiology Orders Queue Table */}
                <Card className="bg-white border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-4">Order # & Priority</th>
                                    <th className="py-3 px-4">Patient Information</th>
                                    <th className="py-3 px-4">Procedure & Modality</th>
                                    <th className="py-3 px-4">Indication & Findings</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {radiologyOrders.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-slate-400">
                                            No radiology imaging orders found matching the filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    radiologyOrders.data.map((order) => {
                                        const isStat = order.priority === 'STAT';

                                        return (
                                            <tr key={order.id} className={`hover:bg-slate-50/80 transition-colors ${isStat ? 'bg-rose-50/30' : ''}`}>
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
                                                    <div className="font-bold text-slate-900">{order.template.name}</div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge variant="cyan" className="text-[9px] uppercase">
                                                            {order.template.modality.replace('_', ' ')}
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400">({order.template.body_part})</span>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4 max-w-xs">
                                                    <p className="text-[11px] text-slate-700 truncate" title={order.clinical_indication}>
                                                        <span className="font-semibold">Indication:</span> {order.clinical_indication}
                                                    </p>
                                                    {order.impression && (
                                                        <p className="text-[11px] text-emerald-800 font-medium truncate mt-0.5" title={order.impression}>
                                                            <span className="font-bold">Impression:</span> {order.impression}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant={
                                                            order.status === 'VERIFIED'
                                                                ? 'success'
                                                                : order.status === 'REPORTED'
                                                                ? 'purple'
                                                                : order.status === 'CAPTURED'
                                                                ? 'blue'
                                                                : 'warning'
                                                        }
                                                    >
                                                        {order.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {order.status === 'ORDERED' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleCaptureScan(order.id)}
                                                                className="text-[11px] py-1 px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                            >
                                                                <ScanLine className="w-3 h-3 mr-1" />
                                                                Capture
                                                            </Button>
                                                        )}

                                                        {/* DICOM Viewer Button */}
                                                        {order.status !== 'ORDERED' && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => setViewingDicomOrder(order)}
                                                                className="text-[11px] py-1 px-2"
                                                                title="Open DICOM PACS Viewer"
                                                            >
                                                                <Eye className="w-3 h-3 mr-1 text-cyan-600" />
                                                                PACS
                                                            </Button>
                                                        )}

                                                        {/* Reporting Button */}
                                                        {order.status !== 'VERIFIED' && order.status !== 'ORDERED' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openReportingModal(order)}
                                                                className="text-[11px] py-1 px-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                                                            >
                                                                <FileText className="w-3 h-3 mr-1" />
                                                                Report
                                                            </Button>
                                                        )}

                                                        {/* Pathologist / Radiologist Verification Sign-off */}
                                                        {order.status === 'REPORTED' && (
                                                            <Button
                                                                size="sm"
                                                                variant="primary"
                                                                onClick={() => handleVerifyReport(order.id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-1 px-2"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Verify
                                                            </Button>
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
            </div>

            {/* Modal: New Radiology Requisition */}
            {isRequisitionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <Card className="w-full max-w-xl bg-white shadow-2xl border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ScanLine className="w-5 h-5 text-cyan-600" />
                                <h3 className="text-base font-bold text-slate-900">New Imaging Requisition</h3>
                            </div>
                            <button
                                onClick={() => setIsRequisitionOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrder} className="p-4 space-y-4">
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
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Imaging Procedure *</label>
                                    <select
                                        value={data.template_id}
                                        onChange={(e) => setData('template_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    >
                                        <option value="">-- Select Modality & Scan --</option>
                                        {templates.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                [{t.modality}] {t.name} (${t.price})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.template_id && <p className="text-rose-500 text-[10px] mt-0.5">{errors.template_id}</p>}
                                </div>

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
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Indications / Reason for Scan *</label>
                                <textarea
                                    value={data.clinical_indication}
                                    onChange={(e) => setData('clinical_indication', e.target.value)}
                                    placeholder="Suspected fractures, trauma assessment, follow-up findings..."
                                    rows={3}
                                    className="w-full text-xs rounded-lg border-slate-200"
                                    required
                                />
                                {errors.clinical_indication && <p className="text-rose-500 text-[10px] mt-0.5">{errors.clinical_indication}</p>}
                            </div>

                            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                                <Button type="button" variant="secondary" onClick={() => setIsRequisitionOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={processing} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                                    Place Order
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Interactive DICOM PACS Viewer */}
            {viewingDicomOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                    <Card className="w-full max-w-4xl bg-slate-900 border-slate-800 text-white flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
                        {/* PACS Top Bar */}
                        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                            <div className="flex items-center gap-3">
                                <ScanLine className="w-5 h-5 text-cyan-400" />
                                <div>
                                    <div className="text-xs font-bold font-mono text-cyan-300">
                                        STUDY UID: {viewingDicomOrder.dicom_study_uid || 'N/A'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-sans">
                                        Patient: {viewingDicomOrder.patient.first_name} {viewingDicomOrder.patient.last_name} ({viewingDicomOrder.patient.mrn}) • Modality: {viewingDicomOrder.template.modality}
                                    </div>
                                </div>
                            </div>

                            {/* Viewer Controls */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
                                    <button
                                        onClick={() => setDicomZoom(Math.max(0.5, dicomZoom - 0.2))}
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-300"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="px-2 text-[10px] font-mono">{Math.round(dicomZoom * 100)}%</span>
                                    <button
                                        onClick={() => setDicomZoom(Math.min(2.5, dicomZoom + 0.2))}
                                        className="p-1.5 hover:bg-slate-700 rounded text-slate-300"
                                        title="Zoom In"
                                    >
                                        <ZoomIn className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => setDicomInverted(!dicomInverted)}
                                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${dicomInverted ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                                    title="Invert Grayscale"
                                >
                                    <Contrast className="w-3.5 h-3.5" />
                                </button>

                                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-[10px]">
                                    <button
                                        onClick={() => setDicomPreset('soft')}
                                        className={`px-2 py-1 rounded ${dicomPreset === 'soft' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                                    >
                                        Soft Tissue
                                    </button>
                                    <button
                                        onClick={() => setDicomPreset('bone')}
                                        className={`px-2 py-1 rounded ${dicomPreset === 'bone' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                                    >
                                        Bone
                                    </button>
                                    <button
                                        onClick={() => setDicomPreset('lung')}
                                        className={`px-2 py-1 rounded ${dicomPreset === 'lung' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                                    >
                                        Lung
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setDicomZoom(1);
                                        setDicomInverted(false);
                                        setDicomPreset('soft');
                                    }}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"
                                    title="Reset View"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                <button
                                    onClick={() => setViewingDicomOrder(null)}
                                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Simulated Medical DICOM Canvas Viewport */}
                        <div className="flex-1 bg-black p-6 flex items-center justify-center overflow-hidden min-h-[420px] relative select-none">
                            {/* Medical Crosshair Annotation */}
                            <div className="absolute top-4 left-4 text-[10px] font-mono text-cyan-400 space-y-0.5 pointer-events-none">
                                <div>TE: 12.0 ms • TR: 450.0 ms</div>
                                <div>MATRIX: 512 x 512 • FOV: 240mm</div>
                                <div>SLICE: 3.0mm • POSITION: AXIAL</div>
                            </div>

                            <div
                                style={{
                                    transform: `scale(${dicomZoom})`,
                                    filter: `${dicomInverted ? 'invert(1)' : 'none'} ${dicomPreset === 'bone' ? 'contrast(200%) brightness(120%)' : dicomPreset === 'lung' ? 'contrast(150%) brightness(80%)' : 'contrast(120%)'}`,
                                }}
                                className="transition-all duration-150 flex items-center justify-center"
                            >
                                {/* High-Fidelity SVG Diagnostic Anatomy Simulator */}
                                <div className="w-80 h-96 border border-slate-700/60 rounded-xl bg-radial from-slate-800 via-slate-900 to-black p-4 flex flex-col items-center justify-center relative shadow-2xl">
                                    <ScanLine className="w-36 h-36 text-slate-400/40 animate-pulse stroke-[1.2]" />
                                    <div className="mt-4 text-center">
                                        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest block">
                                            {viewingDicomOrder.template.name}
                                        </span>
                                        <span className="text-[10px] text-cyan-400/70 font-mono">
                                            Series 01 / Image 12 (DICOM Lossless 16-bit)
                                        </span>
                                    </div>

                                    {/* Ruler Scale */}
                                    <div className="absolute bottom-3 right-3 text-[9px] font-mono text-slate-500 border-b border-l border-slate-600 pl-1 pr-2 pb-0.5">
                                        5 cm
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal: Formulate / Edit Diagnostic Report */}
            {reportingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Radiology Diagnostic Report</h3>
                                <p className="text-[11px] text-slate-500">
                                    {reportingOrder.template.name} • {reportingOrder.order_number}
                                </p>
                            </div>
                            <button
                                onClick={() => setReportingOrder(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveReport} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Radiologist *</label>
                                <select
                                    value={reportingDoctorId}
                                    onChange={(e) => setReportingDoctorId(e.target.value)}
                                    className="w-full text-xs rounded-lg border-slate-200"
                                    required
                                >
                                    <option value="">-- Select Radiologist / Physician --</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.user?.name} ({d.specialization})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Radiographic Findings *</label>
                                <textarea
                                    value={findings}
                                    onChange={(e) => setFindings(e.target.value)}
                                    placeholder="Detailed anatomical observations, parenchymal densities, osseous integrity..."
                                    rows={4}
                                    className="w-full text-xs rounded-lg border-slate-200 font-sans"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnostic Impression *</label>
                                <textarea
                                    value={impression}
                                    onChange={(e) => setImpression(e.target.value)}
                                    placeholder="Summary diagnosis, e.g. 'Normal cardiac silhouette. No acute infiltrates or pleural effusion.'"
                                    rows={2}
                                    className="w-full text-xs rounded-lg border-slate-200 font-sans font-semibold text-slate-800"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Recommendations / Addendum</label>
                                <textarea
                                    value={radiologistNotes}
                                    onChange={(e) => setRadiologistNotes(e.target.value)}
                                    placeholder="Suggested correlation with clinical laboratory findings or follow-up CT scan..."
                                    rows={2}
                                    className="w-full text-xs rounded-lg border-slate-200"
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                                <Button type="button" variant="secondary" onClick={() => setReportingOrder(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" className="bg-purple-600 hover:bg-purple-700 text-white">
                                    Save Diagnostic Report
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
