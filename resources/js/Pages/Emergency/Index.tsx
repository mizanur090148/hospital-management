import React, { useState } from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import {
    Siren, Plus, Search, Filter, AlertTriangle, HeartPulse,
    Activity, Clock, User, Stethoscope, BedDouble, CheckCircle2,
    X, Ambulance, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface EmergencyCase {
    id: string;
    er_number: string;
    anonymous_patient_name: string | null;
    triage_level: 'ESI_1' | 'ESI_2' | 'ESI_3' | 'ESI_4' | 'ESI_5';
    chief_complaint: string;
    arrival_mode: string;
    trauma_type: string;
    vitals: {
        systolic?: number;
        diastolic?: number;
        pulse_rate?: number;
        temperature?: number;
        spo2?: number;
        gcs_score?: number;
    } | null;
    status: 'TRIAGED' | 'IN_TREATMENT' | 'ADMITTED_TO_IPD' | 'DISCHARGED' | 'DECEASED';
    admitted_at: string;
    patient: {
        id: string;
        mrn: string;
        full_name: string;
        age: number | null;
        gender: string;
        blood_group: string;
    } | null;
    assignedDoctor: {
        id: string;
        user: { name: string };
    } | null;
}

interface EmergencyIndexProps {
    emergencyCases: {
        data: EmergencyCase[];
        total: number;
    };
    doctors: Array<{ id: string; user: { name: string } }>;
    branches: Array<{ id: string; name: string }>;
    patients: Array<{ id: string; full_name: string; mrn: string }>;
    availableBeds: Array<{
        id: string;
        bed_number: string;
        room: {
            room_number: string;
            ward: { name: string };
        };
    }>;
    metrics: {
        esi1: number;
        esi2: number;
        esi3: number;
        totalActive: number;
    };
    filters: {
        status?: string;
        triage_level?: string;
    };
    triageLevels: string[];
}

export default function EmergencyIndex({
    emergencyCases,
    doctors,
    branches,
    patients,
    availableBeds,
    metrics,
    filters,
    triageLevels,
}: EmergencyIndexProps) {
    const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
    const [admitCase, setAdmitCase] = useState<EmergencyCase | null>(null);

    // Form: Rapid ER Triage
    const { data, setData, post, processing, errors, reset } = useForm({
        branch_id: branches[0]?.id || '',
        patient_id: '',
        anonymous_patient_name: '',
        triage_level: 'ESI_2',
        chief_complaint: '',
        arrival_mode: 'AMBULANCE',
        trauma_type: 'MEDICAL',
        vitals: {
            systolic: '',
            diastolic: '',
            pulse_rate: '',
            temperature: '98.6',
            spo2: '97',
            gcs_score: '15',
        },
        triage_notes: '',
        assigned_doctor_id: '',
    });

    // Form: Admit ER Patient to IPD Bed
    const ipdAdmitForm = useForm({
        patient_id: '',
        bed_id: '',
        attending_doctor_id: '',
        admitting_diagnosis: '',
    });

    const handleTriageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/emergency/triage', {
            onSuccess: () => {
                setIsTriageModalOpen(false);
                reset();
            },
        });
    };

    const handleStatusTransition = (caseId: string, newStatus: string) => {
        router.patch(`/emergency/${caseId}/status`, { status: newStatus }, { preserveScroll: true });
    };

    const handleOpenAdmitModal = (c: EmergencyCase) => {
        setAdmitCase(c);
        ipdAdmitForm.setData({
            patient_id: c.patient?.id || '',
            bed_id: '',
            attending_doctor_id: c.assignedDoctor?.id || doctors[0]?.id || '',
            admitting_diagnosis: `Admitted from Emergency (${c.er_number}): ${c.chief_complaint}`,
        });
    };

    const handleAdmitToIpdSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!admitCase) return;
        ipdAdmitForm.post(`/emergency/${admitCase.id}/admit-to-ipd`, {
            onSuccess: () => {
                setAdmitCase(null);
            },
        });
    };

    const esiColorMap: Record<string, string> = {
        ESI_1: 'bg-red-600 text-white animate-pulse',
        ESI_2: 'bg-orange-500 text-white',
        ESI_3: 'bg-amber-400 text-slate-900',
        ESI_4: 'bg-emerald-500 text-white',
        ESI_5: 'bg-blue-500 text-white',
    };

    return (
        <AppLayout title="Emergency Department & Trauma Triage">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <Siren className="w-6 h-6 text-red-600 stroke-[2.5]" />
                                Emergency & Trauma Triage Board
                            </h1>
                            <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                {metrics.totalActive} Active ER Cases
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Emergency Severity Index (ESI 1–5), fast-track resuscitation, trauma bay queue, and immediate IPD bed conversion.
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => setIsTriageModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/30"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Rapid Triage Admission
                    </Button>
                </div>

                {/* ESI Triage Metric Ribbons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card className="border-red-300 bg-red-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-700 block">
                                    ESI 1: Resuscitation
                                </span>
                                <div className="text-2xl font-black text-red-900 mt-0.5">{metrics.esi1}</div>
                                <span className="text-[10px] text-red-600 font-semibold">Immediate Life Threat</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
                                1
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-orange-300 bg-orange-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700 block">
                                    ESI 2: Emergent
                                </span>
                                <div className="text-2xl font-black text-orange-900 mt-0.5">{metrics.esi2}</div>
                                <span className="text-[10px] text-orange-600 font-semibold">High Risk / Severe Pain</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                                2
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-300 bg-amber-50/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 block">
                                    ESI 3: Urgent
                                </span>
                                <div className="text-2xl font-black text-amber-900 mt-0.5">{metrics.esi3}</div>
                                <span className="text-[10px] text-amber-700 font-semibold">Multiple Resources</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
                                3
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                    Total Active In ER
                                </span>
                                <div className="text-2xl font-black text-slate-900 mt-0.5">{metrics.totalActive}</div>
                                <span className="text-[10px] text-slate-500 font-semibold">Under ER Care</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                                ER
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ER Cases Table */}
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5">Priority / ESI</th>
                                    <th className="px-6 py-3.5">ER # & Arrival</th>
                                    <th className="px-6 py-3.5">Patient Details</th>
                                    <th className="px-6 py-3.5">Trauma / Chief Complaint</th>
                                    <th className="px-6 py-3.5">Triage Vitals</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Emergency Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {emergencyCases.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                            <Siren className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                            <p className="font-semibold text-slate-700">No active emergency cases on board</p>
                                        </td>
                                    </tr>
                                ) : (
                                    emergencyCases.data.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md font-extrabold text-xs tracking-wider ${esiColorMap[c.triage_level] || 'bg-slate-200'}`}>
                                                    {c.triage_level}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-xs text-slate-900">{c.er_number}</div>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Ambulance className="w-3.5 h-3.5 text-red-600" />
                                                    {c.arrival_mode}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">
                                                    {c.patient ? c.patient.full_name : c.anonymous_patient_name}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {c.patient ? `${c.patient.mrn} • ${c.patient.blood_group}` : 'Identity Pending'}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 max-w-[220px]">
                                                <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded">
                                                    {c.trauma_type}
                                                </span>
                                                <p className="text-xs text-slate-700 mt-1 truncate" title={c.chief_complaint}>
                                                    {c.chief_complaint}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                {c.vitals ? (
                                                    <div className="text-[11px] space-y-0.5 font-medium">
                                                        {c.vitals.systolic && <div>BP: <strong>{c.vitals.systolic}/{c.vitals.diastolic}</strong></div>}
                                                        {c.vitals.pulse_rate && <div>Pulse: <strong>{c.vitals.pulse_rate}</strong> • SpO2: <strong>{c.vitals.spo2}%</strong></div>}
                                                        {c.vitals.gcs_score && <div>GCS: <strong className="text-red-700">{c.vitals.gcs_score}/15</strong></div>}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Vitals pending</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <Badge variant={c.status === 'IN_TREATMENT' ? 'warning' : c.status === 'TRIAGED' ? 'secondary' : 'success'}>
                                                    {c.status}
                                                </Badge>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {c.status === 'TRIAGED' && (
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            className="text-xs h-7"
                                                            onClick={() => handleStatusTransition(c.id, 'IN_TREATMENT')}
                                                        >
                                                            Start Treatment
                                                        </Button>
                                                    )}

                                                    {c.status !== 'ADMITTED_TO_IPD' && c.status !== 'DISCHARGED' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs h-7 border-teal-300 text-teal-700 hover:bg-teal-50"
                                                            onClick={() => handleOpenAdmitModal(c)}
                                                        >
                                                            <BedDouble className="w-3.5 h-3.5 mr-1" /> Admit to Bed
                                                        </Button>
                                                    )}

                                                    {c.status === 'IN_TREATMENT' && (
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            className="text-xs h-7"
                                                            onClick={() => handleStatusTransition(c.id, 'DISCHARGED')}
                                                        >
                                                            Discharge
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal: Rapid Triage Registration */}
            {isTriageModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Siren className="w-5 h-5 text-red-600" />
                                    Rapid Emergency Triage Entry
                                </h2>
                                <p className="text-xs text-slate-500">Emergency Severity Index (ESI) assignment with immediate trauma charting.</p>
                            </div>
                            <button onClick={() => setIsTriageModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTriageSubmit} className="space-y-4 pt-4">
                            {/* ESI Level Radio Selection */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Emergency Severity Index (ESI Level) *
                                </label>
                                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                    {[
                                        { val: 'ESI_1', label: '1 - Resuscitation', desc: 'Immediate threat', col: 'bg-red-600 text-white' },
                                        { val: 'ESI_2', label: '2 - Emergent', desc: 'Severe risk', col: 'bg-orange-500 text-white' },
                                        { val: 'ESI_3', label: '3 - Urgent', desc: 'Moderate risk', col: 'bg-amber-400 text-slate-900' },
                                        { val: 'ESI_4', label: '4 - Less Urgent', desc: '1 resource', col: 'bg-emerald-500 text-white' },
                                        { val: 'ESI_5', label: '5 - Non-Urgent', desc: 'Routine minor', col: 'bg-blue-500 text-white' },
                                    ].map((tier) => (
                                        <button
                                            key={tier.val}
                                            type="button"
                                            onClick={() => setData('triage_level', tier.val as any)}
                                            className={`p-2.5 rounded-xl font-bold transition-all border ${
                                                data.triage_level === tier.val
                                                    ? `${tier.col} ring-2 ring-slate-900 shadow-md`
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            <div className="text-sm font-extrabold">{tier.val}</div>
                                            <div className="text-[10px] leading-tight mt-0.5">{tier.label.split(' - ')[1]}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Known Patient (Optional)</label>
                                    <select
                                        value={data.patient_id}
                                        onChange={(e) => setData('patient_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    >
                                        <option value="">-- Anonymous / Unknown Patient --</option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.full_name} ({p.mrn})</option>
                                        ))}
                                    </select>
                                </div>

                                {!data.patient_id && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Anonymous Identifier</label>
                                        <Input
                                            value={data.anonymous_patient_name}
                                            onChange={(e) => setData('anonymous_patient_name', e.target.value)}
                                            placeholder="e.g. Unknown Trauma Male #1"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival Mode *</label>
                                    <select
                                        value={data.arrival_mode}
                                        onChange={(e) => setData('arrival_mode', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="AMBULANCE">Ambulance (EMS)</option>
                                        <option value="WALK_IN">Walk-In / Private Vehicle</option>
                                        <option value="POLICE">Police Escort</option>
                                        <option value="HELICOPTER">Air Ambulance / Helicopter</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Trauma Classification *</label>
                                    <select
                                        value={data.trauma_type}
                                        onChange={(e) => setData('trauma_type', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="MEDICAL">Medical Emergency (Cardiac, Stroke, etc.)</option>
                                        <option value="BLUNT">Blunt Force Trauma (MVA, Fall)</option>
                                        <option value="PENETRATING">Penetrating Trauma (GSW, Stab)</option>
                                        <option value="BURN">Burn / Inhalation Injury</option>
                                        <option value="PSYCHIATRIC">Psychiatric / Behavioral Emergency</option>
                                        <option value="NONE">Non-Trauma Minor</option>
                                    </select>
                                </div>
                            </div>

                            {/* Rapid Vitals Strip */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Initial Triage Vitals
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    <Input
                                        placeholder="BP Sys"
                                        value={data.vitals.systolic}
                                        onChange={(e) => setData('vitals', { ...data.vitals, systolic: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="BP Dia"
                                        value={data.vitals.diastolic}
                                        onChange={(e) => setData('vitals', { ...data.vitals, diastolic: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="Pulse"
                                        value={data.vitals.pulse_rate}
                                        onChange={(e) => setData('vitals', { ...data.vitals, pulse_rate: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="SpO2 %"
                                        value={data.vitals.spo2}
                                        onChange={(e) => setData('vitals', { ...data.vitals, spo2: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="Temp °F"
                                        value={data.vitals.temperature}
                                        onChange={(e) => setData('vitals', { ...data.vitals, temperature: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="GCS (3-15)"
                                        value={data.vitals.gcs_score}
                                        onChange={(e) => setData('vitals', { ...data.vitals, gcs_score: e.target.value })}
                                        className="h-8 text-xs font-bold text-red-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Emergency Complaint *</label>
                                <textarea
                                    rows={2}
                                    value={data.chief_complaint}
                                    onChange={(e) => setData('chief_complaint', e.target.value)}
                                    placeholder="Acute symptoms, injury mechanism, time of incident..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    required
                                />
                                {errors.chief_complaint && <p className="text-xs text-rose-500 mt-1">{errors.chief_complaint}</p>}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsTriageModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 text-white" disabled={processing}>
                                    {processing ? 'Registering...' : 'Confirm Triage Admission'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Admit ER Case into IPD Inpatient Bed */}
            {admitCase && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Transfer ER to Inpatient Ward</h2>
                                <p className="text-xs text-slate-500">Fast-track admission from ER {admitCase.er_number} to an inpatient bed.</p>
                            </div>
                            <button onClick={() => setAdmitCase(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAdmitToIpdSubmit} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Patient Profile *</label>
                                <select
                                    value={ipdAdmitForm.data.patient_id}
                                    onChange={(e) => ipdAdmitForm.setData('patient_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    required
                                >
                                    <option value="">-- Select Patient Account --</option>
                                    {patients.map((p) => (
                                        <option key={p.id} value={p.id}>{p.full_name} ({p.mrn})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Inpatient Bed *</label>
                                <select
                                    value={ipdAdmitForm.data.bed_id}
                                    onChange={(e) => ipdAdmitForm.setData('bed_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    required
                                >
                                    <option value="">-- Choose Available Bed --</option>
                                    {availableBeds.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.room.ward.name} • Room {b.room.room_number} • Bed {b.bed_number}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Attending Inpatient Physician *</label>
                                <select
                                    value={ipdAdmitForm.data.attending_doctor_id}
                                    onChange={(e) => ipdAdmitForm.setData('attending_doctor_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    required
                                >
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>Dr. {d.user.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Admitting Diagnosis *</label>
                                <Input
                                    value={ipdAdmitForm.data.admitting_diagnosis}
                                    onChange={(e) => ipdAdmitForm.setData('admitting_diagnosis', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setAdmitCase(null)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={ipdAdmitForm.processing || !ipdAdmitForm.data.bed_id}>
                                    {ipdAdmitForm.processing ? 'Transferring...' : 'Execute IPD Admission'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
