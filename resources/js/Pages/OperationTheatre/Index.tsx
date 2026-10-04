import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Scissors, Plus, Calendar, Clock, Activity, CheckCircle2,
    ShieldCheck, AlertTriangle, UserCheck, X, Check,
    Building2, RefreshCw, Layers, Sparkles
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

interface OperationTheatre {
    id: string;
    code: string;
    name: string;
    theatre_type: string;
    floor?: string;
    status: string;
    surgeries?: Surgery[];
}

interface Surgery {
    id: string;
    surgery_number: string;
    procedure_name: string;
    anesthesia_type: string;
    scheduled_date: string;
    scheduled_start_time: string;
    scheduled_end_time: string;
    actual_start_at?: string;
    actual_end_at?: string;
    pre_op_diagnosis?: string;
    post_op_diagnosis?: string;
    surgical_notes?: string;
    safety_checklist?: {
        sign_in?: Record<string, boolean>;
        time_out?: Record<string, boolean>;
        sign_out?: Record<string, boolean>;
    };
    status: string;
    patient: Patient;
    primary_surgeon: Doctor;
    anesthesiologist?: Doctor;
    operation_theatre: OperationTheatre;
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
    theatres: OperationTheatre[];
    surgeries: PaginatedData<Surgery>;
    doctors: Doctor[];
    patients: Patient[];
    branches: Branch[];
    metrics: {
        in_progress: number;
        scheduled_today: number;
        completed_today: number;
        available_rooms: number;
    };
    filters: {
        date?: string;
        operation_theatre_id?: string;
        status?: string;
    };
    anesthesiaTypes: string[];
    statuses: string[];
    otRoomStatuses: string[];
}

export default function OperationTheatreIndex({
    theatres,
    surgeries,
    doctors,
    patients,
    branches,
    metrics,
    filters,
    anesthesiaTypes,
    statuses,
    otRoomStatuses,
}: Props) {
    const [selectedDate, setSelectedDate] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isAddTheatreOpen, setIsAddTheatreOpen] = useState(false);

    // WHO Checklist Modal
    const [checklistSurgery, setChecklistSurgery] = useState<Surgery | null>(null);
    const [activeChecklistTab, setActiveChecklistTab] = useState<'sign_in' | 'time_out' | 'sign_out'>('sign_in');
    const [checklistData, setChecklistData] = useState<{
        sign_in: Record<string, boolean>;
        time_out: Record<string, boolean>;
        sign_out: Record<string, boolean>;
    }>({
        sign_in: {
            patient_identity_confirmed: false,
            site_marked: false,
            anesthesia_machine_checked: false,
            pulse_oximeter_functioning: false,
            allergy_assessed: false,
            difficult_airway_evaluated: false,
            aspiration_risk_managed: false,
        },
        time_out: {
            all_team_members_introduced: false,
            patient_name_and_procedure_verified: false,
            antibiotic_prophylaxis_given_60min: false,
            anticipated_critical_events_reviewed: false,
            essential_imaging_displayed: false,
            sterility_indicators_confirmed: false,
        },
        sign_out: {
            nurse_confirms_procedure_name: false,
            instruments_sponges_needles_counted: false,
            specimen_labeled_correctly: false,
            equipment_problems_addressed: false,
            post_op_recovery_plan_reviewed: false,
        },
    });

    // Schedule Surgery Form
    const { data: scheduleData, setData: setScheduleData, post: postSchedule, processing: scheduleProcessing, errors: scheduleErrors, reset: resetSchedule } = useForm({
        branch_id: branches[0]?.id || '',
        patient_id: '',
        primary_surgeon_id: '',
        anesthesiologist_id: '',
        operation_theatre_id: '',
        procedure_name: '',
        anesthesia_type: 'GENERAL',
        scheduled_date: selectedDate,
        scheduled_start_time: '09:00',
        scheduled_end_time: '11:00',
        pre_op_diagnosis: '',
    });

    // Add Theatre Form
    const { data: theatreData, setData: setTheatreData, post: postTheatre, processing: theatreProcessing, errors: theatreErrors, reset: resetTheatre } = useForm({
        branch_id: branches[0]?.id || '',
        code: '',
        name: '',
        theatre_type: 'Major OT',
        floor: '4th Floor - Surgical Wing',
    });

    const handleDateChange = (newDate: string) => {
        setSelectedDate(newDate);
        setScheduleData('scheduled_date', newDate);
        router.get('/operation-theatres', { ...filters, date: newDate }, { preserveState: true });
    };

    const handleScheduleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postSchedule('/operation-theatres/surgeries', {
            onSuccess: () => {
                setIsScheduleOpen(false);
                resetSchedule();
            },
        });
    };

    const handleAddTheatreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postTheatre('/operation-theatres', {
            onSuccess: () => {
                setIsAddTheatreOpen(false);
                resetTheatre();
            },
        });
    };

    const handleUpdateStatus = (surgeryId: string, status: string) => {
        router.patch(`/operation-theatres/surgeries/${surgeryId}/status`, {
            status,
        }, { preserveScroll: true });
    };

    const openChecklistModal = (surgery: Surgery) => {
        setChecklistSurgery(surgery);
        if (surgery.safety_checklist) {
            setChecklistData({
                sign_in: { ...checklistData.sign_in, ...(surgery.safety_checklist.sign_in || {}) },
                time_out: { ...checklistData.time_out, ...(surgery.safety_checklist.time_out || {}) },
                sign_out: { ...checklistData.sign_out, ...(surgery.safety_checklist.sign_out || {}) },
            });
        }
    };

    const handleSaveChecklist = () => {
        if (!checklistSurgery) return;
        router.post(`/operation-theatres/surgeries/${checklistSurgery.id}/checklist`, {
            safety_checklist: checklistData,
        }, {
            preserveScroll: true,
            onSuccess: () => setChecklistSurgery(null),
        });
    };

    const toggleChecklistField = (stage: 'sign_in' | 'time_out' | 'sign_out', key: string) => {
        setChecklistData(prev => ({
            ...prev,
            [stage]: {
                ...prev[stage],
                [key]: !prev[stage][key],
            },
        }));
    };

    return (
        <AppLayout title="Operation Theatre (OT) & Surgical Scheduling">
            <Head title="Operation Theatre (OT) & Surgical Scheduling" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                                <Scissors className="w-6 h-6" />
                            </span>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                    Operation Theatre (OT) Scheduling & Intra-Op
                                </h1>
                                <p className="text-xs text-slate-500">
                                    Surgical suite availability, anti-conflict scheduling engine, and WHO 3-stage surgical safety checklists.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsAddTheatreOpen(true)}
                            className="text-xs"
                        >
                            <Building2 className="w-4 h-4 mr-1.5" />
                            New OT Room
                        </Button>

                        <Button
                            variant="primary"
                            onClick={() => setIsScheduleOpen(true)}
                            className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Schedule Surgery
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">In Intra-Op Procedure</p>
                            <Activity className="w-4 h-4 text-rose-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-rose-600 animate-pulse">{metrics.in_progress}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Actively underway in OT suites</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">Surgeries Today</p>
                            <Calendar className="w-4 h-4 text-teal-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.scheduled_today}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Total bookings on calendar</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">Completed Today</p>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-emerald-600">{metrics.completed_today}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Procedures transferred to PACU</p>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-500">Available Suites</p>
                            <Sparkles className="w-4 h-4 text-cyan-500" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold text-cyan-600">{metrics.available_rooms}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Sterilized and ready for induction</p>
                    </Card>
                </div>

                {/* OT Suites Real-Time Ribbon */}
                <div>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Live Operation Theatre Suites
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {theatres.map((ot) => {
                            const isOccupied = ot.status === 'OCCUPIED';
                            const activeSurgery = ot.surgeries?.find(s => s.status === 'IN_PROGRESS');

                            return (
                                <Card
                                    key={ot.id}
                                    className={`p-4 border transition-all ${isOccupied ? 'border-rose-400/80 bg-rose-50/20 shadow-xs' : 'border-slate-200 bg-white'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 text-sm">{ot.name}</span>
                                            <span className="text-[10px] font-mono text-slate-400">({ot.code})</span>
                                        </div>
                                        <Badge
                                            variant={
                                                ot.status === 'AVAILABLE'
                                                    ? 'success'
                                                    : ot.status === 'OCCUPIED'
                                                    ? 'destructive'
                                                    : ot.status === 'CLEANING'
                                                    ? 'warning'
                                                    : 'secondary'
                                            }
                                        >
                                            {ot.status}
                                        </Badge>
                                    </div>

                                    <div className="text-[11px] text-slate-500 mt-1">
                                        {ot.theatre_type} • {ot.floor || 'Main Wing'}
                                    </div>

                                    {/* Active Surgery Card if In Progress */}
                                    {isOccupied && activeSurgery && (
                                        <div className="mt-3 p-2.5 rounded-lg bg-rose-100/60 border border-rose-200/80 text-xs space-y-1">
                                            <div className="font-bold text-rose-900">{activeSurgery.procedure_name}</div>
                                            <div className="text-[10px] text-rose-700">
                                                Patient: {activeSurgery.patient.first_name} {activeSurgery.patient.last_name} ({activeSurgery.patient.mrn})
                                            </div>
                                            <div className="text-[10px] text-rose-700">
                                                Surgeon: {activeSurgery.primary_surgeon.user?.name} • Anesthesia: {activeSurgery.anesthesia_type}
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Date Filter & Surgery Schedule Table */}
                <Card className="p-4 bg-white border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-bold text-slate-700">Surgery Date:</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="text-xs rounded-lg border-slate-200 py-1.5 px-3 font-mono"
                            />
                        </div>

                        <div className="text-xs text-slate-400 font-medium">
                            Showing procedures scheduled for {new Date(selectedDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>

                    <div className="overflow-x-auto border-t border-slate-100 pt-2">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-4">Surgery # & Time</th>
                                    <th className="py-3 px-4">Patient Information</th>
                                    <th className="py-3 px-4">Procedure & Suite</th>
                                    <th className="py-3 px-4">Surgical Team</th>
                                    <th className="py-3 px-4">Safety Checklist</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {surgeries.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-slate-400">
                                            No surgical procedures scheduled for this selected date.
                                        </td>
                                    </tr>
                                ) : (
                                    surgeries.data.map((surgery) => {
                                        const isInProgress = surgery.status === 'IN_PROGRESS';
                                        const checklistCount =
                                            Object.values(surgery.safety_checklist?.sign_in || {}).filter(Boolean).length +
                                            Object.values(surgery.safety_checklist?.time_out || {}).filter(Boolean).length +
                                            Object.values(surgery.safety_checklist?.sign_out || {}).filter(Boolean).length;

                                        return (
                                            <tr key={surgery.id} className={`hover:bg-slate-50/80 transition-colors ${isInProgress ? 'bg-rose-50/30' : ''}`}>
                                                <td className="py-3 px-4">
                                                    <div className="font-mono font-bold text-slate-900">{surgery.surgery_number}</div>
                                                    <div className="text-[10px] font-mono text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {surgery.scheduled_start_time} - {surgery.scheduled_end_time}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-900">
                                                        {surgery.patient.first_name} {surgery.patient.last_name}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-slate-500">
                                                        MRN: {surgery.patient.mrn} • {surgery.patient.gender}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-900">{surgery.procedure_name}</div>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                                        <span className="font-semibold text-teal-800">{surgery.operation_theatre.name}</span>
                                                        <span>• Anesthesia: {surgery.anesthesia_type}</span>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-slate-800">
                                                        Surgeon: {surgery.primary_surgeon.user?.name || 'Surgeon'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Anesthetist: {surgery.anesthesiologist?.user?.name || 'Unassigned'}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => openChecklistModal(surgery)}
                                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                                                        <span>WHO Checklist ({checklistCount}/18)</span>
                                                    </button>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant={
                                                            surgery.status === 'COMPLETED'
                                                                ? 'success'
                                                                : surgery.status === 'IN_PROGRESS'
                                                                ? 'destructive'
                                                                : surgery.status === 'PRE_OP'
                                                                ? 'warning'
                                                                : surgery.status === 'POST_OP'
                                                                ? 'purple'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {surgery.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {surgery.status === 'SCHEDULED' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleUpdateStatus(surgery.id, 'PRE_OP')}
                                                                className="text-[11px] py-1 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                                                            >
                                                                Pre-Op
                                                            </Button>
                                                        )}

                                                        {surgery.status === 'PRE_OP' && (
                                                            <Button
                                                                size="sm"
                                                                variant="primary"
                                                                onClick={() => handleUpdateStatus(surgery.id, 'IN_PROGRESS')}
                                                                className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] py-1 px-2"
                                                            >
                                                                Start Surgery
                                                            </Button>
                                                        )}

                                                        {surgery.status === 'IN_PROGRESS' && (
                                                            <Button
                                                                size="sm"
                                                                variant="primary"
                                                                onClick={() => handleUpdateStatus(surgery.id, 'POST_OP')}
                                                                className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] py-1 px-2"
                                                            >
                                                                To PACU
                                                            </Button>
                                                        )}

                                                        {surgery.status === 'POST_OP' && (
                                                            <Button
                                                                size="sm"
                                                                variant="primary"
                                                                onClick={() => handleUpdateStatus(surgery.id, 'COMPLETED')}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-1 px-2"
                                                            >
                                                                Conclude
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

            {/* Modal: Schedule New Surgery */}
            {isScheduleOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl border-slate-200 max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Scissors className="w-5 h-5 text-teal-600" />
                                <h3 className="text-base font-bold text-slate-900">Book Surgical Suite (Anti-Conflict Engine)</h3>
                            </div>
                            <button
                                onClick={() => setIsScheduleOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleScheduleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
                                    <select
                                        value={scheduleData.patient_id}
                                        onChange={(e) => setScheduleData('patient_id', e.target.value)}
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
                                    {scheduleErrors.patient_id && <p className="text-rose-500 text-[10px] mt-0.5">{scheduleErrors.patient_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Operation Theatre *</label>
                                    <select
                                        value={scheduleData.operation_theatre_id}
                                        onChange={(e) => setScheduleData('operation_theatre_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    >
                                        <option value="">-- Choose OT Suite --</option>
                                        {theatres.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({t.theatre_type}) - Status: {t.status}
                                            </option>
                                        ))}
                                    </select>
                                    {scheduleErrors.operation_theatre_id && <p className="text-rose-500 text-[10px] mt-0.5 font-bold">{scheduleErrors.operation_theatre_id}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Surgeon *</label>
                                    <select
                                        value={scheduleData.primary_surgeon_id}
                                        onChange={(e) => setScheduleData('primary_surgeon_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    >
                                        <option value="">-- Choose Primary Surgeon --</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.user?.name} ({d.specialization})
                                            </option>
                                        ))}
                                    </select>
                                    {scheduleErrors.primary_surgeon_id && <p className="text-rose-500 text-[10px] mt-0.5 font-bold">{scheduleErrors.primary_surgeon_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Anesthesiologist</label>
                                    <select
                                        value={scheduleData.anesthesiologist_id}
                                        onChange={(e) => setScheduleData('anesthesiologist_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                    >
                                        <option value="">-- Optional / Unassigned --</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.user?.name} ({d.specialization})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Surgical Procedure Name *</label>
                                <Input
                                    value={scheduleData.procedure_name}
                                    onChange={(e) => setScheduleData('procedure_name', e.target.value)}
                                    placeholder="e.g. Laparoscopic Cholecystectomy, Coronary Artery Bypass, Total Knee Arthroplasty"
                                    required
                                />
                                {scheduleErrors.procedure_name && <p className="text-rose-500 text-[10px] mt-0.5">{scheduleErrors.procedure_name}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Anesthesia Type *</label>
                                    <select
                                        value={scheduleData.anesthesia_type}
                                        onChange={(e) => setScheduleData('anesthesia_type', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    >
                                        {anesthesiaTypes.map((a) => (
                                            <option key={a} value={a}>
                                                {a.replace('_', ' ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time (HH:MM) *</label>
                                    <input
                                        type="time"
                                        value={scheduleData.scheduled_start_time}
                                        onChange={(e) => setScheduleData('scheduled_start_time', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200 font-mono"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Time (HH:MM) *</label>
                                    <input
                                        type="time"
                                        value={scheduleData.scheduled_end_time}
                                        onChange={(e) => setScheduleData('scheduled_end_time', e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200 font-mono"
                                        required
                                    />
                                    {scheduleErrors.scheduled_end_time && <p className="text-rose-500 text-[10px] mt-0.5">{scheduleErrors.scheduled_end_time}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Pre-Operative Diagnosis</label>
                                <textarea
                                    value={scheduleData.pre_op_diagnosis}
                                    onChange={(e) => setScheduleData('pre_op_diagnosis', e.target.value)}
                                    placeholder="Indication, pre-op imaging confirmation, American Society of Anesthesiologists (ASA) class..."
                                    rows={2}
                                    className="w-full text-xs rounded-lg border-slate-200"
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                                <Button type="button" variant="secondary" onClick={() => setIsScheduleOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={scheduleProcessing} className="bg-teal-600 hover:bg-teal-700 text-white">
                                    Book Surgical Suite
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Add New Operation Theatre Room */}
            {isAddTheatreOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <Card className="w-full max-w-md bg-white shadow-2xl border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Register Operation Theatre</h3>
                            <button onClick={() => setIsAddTheatreOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddTheatreSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Code *</label>
                                <Input
                                    value={theatreData.code}
                                    onChange={(e) => setTheatreData('code', e.target.value)}
                                    placeholder="e.g. OT-1, OT-CARDIAC"
                                    required
                                />
                                {theatreErrors.code && <p className="text-rose-500 text-[10px] mt-0.5">{theatreErrors.code}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Suite Name *</label>
                                <Input
                                    value={theatreData.name}
                                    onChange={(e) => setTheatreData('name', e.target.value)}
                                    placeholder="e.g. Main Surgical Suite Alpha"
                                    required
                                />
                                {theatreErrors.name && <p className="text-rose-500 text-[10px] mt-0.5">{theatreErrors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Theatre Specialty Type *</label>
                                <select
                                    value={theatreData.theatre_type}
                                    onChange={(e) => setTheatreData('theatre_type', e.target.value)}
                                    className="w-full text-xs rounded-lg border-slate-200"
                                >
                                    <option value="Major OT">Major General Surgical Suite</option>
                                    <option value="Cardiac OT">Cardiac & Catheterization Suite</option>
                                    <option value="Neuro OT">Neurosurgical OT</option>
                                    <option value="Ortho OT">Orthopedic Laminar Flow OT</option>
                                    <option value="Minor OT">Daycare / Minor Surgery</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Floor / Wing</label>
                                <Input
                                    value={theatreData.floor}
                                    onChange={(e) => setTheatreData('floor', e.target.value)}
                                    placeholder="e.g. 4th Floor - Surgical Wing"
                                />
                            </div>

                            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                                <Button type="button" variant="secondary" onClick={() => setIsAddTheatreOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={theatreProcessing} className="bg-teal-600 hover:bg-teal-700 text-white">
                                    Register Suite
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: WHO Surgical Safety Checklist */}
            {checklistSurgery && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl border-slate-200 max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">WHO Surgical Safety Checklist</h3>
                                <p className="text-[11px] text-slate-500">
                                    Patient: {checklistSurgery.patient.first_name} {checklistSurgery.patient.last_name} ({checklistSurgery.patient.mrn}) • {checklistSurgery.procedure_name}
                                </p>
                            </div>
                            <button onClick={() => setChecklistSurgery(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Checklist Stage Tabs */}
                        <div className="flex border-b border-slate-200 bg-slate-50 text-xs">
                            <button
                                onClick={() => setActiveChecklistTab('sign_in')}
                                className={`flex-1 py-2.5 px-3 text-center font-bold transition-all border-b-2 ${activeChecklistTab === 'sign_in' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                1. SIGN IN (Pre-Anesthesia)
                            </button>
                            <button
                                onClick={() => setActiveChecklistTab('time_out')}
                                className={`flex-1 py-2.5 px-3 text-center font-bold transition-all border-b-2 ${activeChecklistTab === 'time_out' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                2. TIME OUT (Pre-Incision)
                            </button>
                            <button
                                onClick={() => setActiveChecklistTab('sign_out')}
                                className={`flex-1 py-2.5 px-3 text-center font-bold transition-all border-b-2 ${activeChecklistTab === 'sign_out' ? 'border-teal-600 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                3. SIGN OUT (Pre-Recovery)
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {/* Sign In Stage */}
                            {activeChecklistTab === 'sign_in' && (
                                <div className="space-y-2.5">
                                    <p className="text-xs font-semibold text-slate-500 mb-2">Before Induction of Anesthesia (with Nurse & Anesthetist):</p>
                                    {[
                                        { key: 'patient_identity_confirmed', label: 'Patient has confirmed identity, surgical site, and informed consent' },
                                        { key: 'site_marked', label: 'Surgical site is marked by the primary surgeon' },
                                        { key: 'anesthesia_machine_checked', label: 'Anesthesia safety check completed (ventilator, gases, emergency suction)' },
                                        { key: 'pulse_oximeter_functioning', label: 'Pulse oximeter on patient and functioning with audible pitch' },
                                        { key: 'allergy_assessed', label: 'Known patient drug and latex allergies reviewed' },
                                        { key: 'difficult_airway_evaluated', label: 'Difficult airway / aspiration risk evaluated and equipment available' },
                                        { key: 'aspiration_risk_managed', label: 'Risk of >500ml blood loss assessed; IV access and fluids ready' },
                                    ].map((item) => (
                                        <label
                                            key={item.key}
                                            onClick={() => toggleChecklistField('sign_in', item.key)}
                                            className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${checklistData.sign_in[item.key] ? 'bg-teal-50 border-teal-200 text-teal-900 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <span>{item.label}</span>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${checklistData.sign_in[item.key] ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'}`}>
                                                {checklistData.sign_in[item.key] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Time Out Stage */}
                            {activeChecklistTab === 'time_out' && (
                                <div className="space-y-2.5">
                                    <p className="text-xs font-semibold text-slate-500 mb-2">Before Skin Incision (with Full Team: Surgeon, Anesthetist & Nurse):</p>
                                    {[
                                        { key: 'all_team_members_introduced', label: 'All surgical team members have introduced themselves by name and role' },
                                        { key: 'patient_name_and_procedure_verified', label: 'Surgeon, Anesthetist & Nurse verbally confirm patient name, site, and procedure' },
                                        { key: 'antibiotic_prophylaxis_given_60min', label: 'Antibiotic prophylaxis administered within past 60 minutes' },
                                        { key: 'anticipated_critical_events_reviewed', label: 'Surgeon & Anesthetist review critical operative steps and anticipated blood loss' },
                                        { key: 'sterility_indicators_confirmed', label: 'Nursing team confirms indicator sterility and equipment sterilization' },
                                        { key: 'essential_imaging_displayed', label: 'Essential diagnostic radiographic imaging displayed in OT suite' },
                                    ].map((item) => (
                                        <label
                                            key={item.key}
                                            onClick={() => toggleChecklistField('time_out', item.key)}
                                            className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${checklistData.time_out[item.key] ? 'bg-teal-50 border-teal-200 text-teal-900 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <span>{item.label}</span>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${checklistData.time_out[item.key] ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'}`}>
                                                {checklistData.time_out[item.key] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Sign Out Stage */}
                            {activeChecklistTab === 'sign_out' && (
                                <div className="space-y-2.5">
                                    <p className="text-xs font-semibold text-slate-500 mb-2">Before Patient Leaves the Operating Suite (with Surgeon, Anesthetist & Nurse):</p>
                                    {[
                                        { key: 'nurse_confirms_procedure_name', label: 'Nurse verbally confirms exact recorded surgical procedure name' },
                                        { key: 'instruments_sponges_needles_counted', label: 'Instrument, gauze sponge, and needle counts are confirmed correct' },
                                        { key: 'specimen_labeled_correctly', label: 'Pathological specimens labeled (including patient name, MRN, and anatomical source)' },
                                        { key: 'equipment_problems_addressed', label: 'Any biomedical equipment malfunction or concerns addressed' },
                                        { key: 'post_op_recovery_plan_reviewed', label: 'Surgeon and anesthetist review key PACU recovery and post-op analgesia plan' },
                                    ].map((item) => (
                                        <label
                                            key={item.key}
                                            onClick={() => toggleChecklistField('sign_out', item.key)}
                                            className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${checklistData.sign_out[item.key] ? 'bg-teal-50 border-teal-200 text-teal-900 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            <span>{item.label}</span>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${checklistData.sign_out[item.key] ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'}`}>
                                                {checklistData.sign_out[item.key] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
                            <Button variant="secondary" onClick={() => setChecklistSurgery(null)}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleSaveChecklist} className="bg-teal-600 hover:bg-teal-700 text-white">
                                Save WHO Checklist
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
