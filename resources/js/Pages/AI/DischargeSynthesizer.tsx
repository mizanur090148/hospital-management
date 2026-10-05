import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import {
    FileCheck2, Sparkles, CheckCircle2, User, BedDouble, Calendar,
    Pill, Activity, Clock, Edit3, Check, Printer, FileText, Stethoscope
} from 'lucide-react';

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
}

interface Admission {
    id: string;
    admission_number: string;
    admission_date: string;
    patient: Patient;
    bed?: {
        name: string;
    };
    ward?: {
        name: string;
    };
}

interface ClinicalSummary {
    id: string;
    summary_number: string;
    summary_type: string;
    chief_complaint: string | null;
    hospital_course: string | null;
    diagnostic_summary: string | null;
    medication_plan: string | null;
    follow_up_instructions: string | null;
    status: string;
    approved_at: string | null;
    created_at: string;
    patient?: Patient;
    admission?: {
        id: string;
        admission_number: string;
        admission_date: string;
    };
    doctor?: {
        user?: {
            name: string;
        };
    };
}

interface SynthesizerProps {
    summaries: {
        data: ClinicalSummary[];
        links: any[];
        total: number;
    };
    activeAdmissions: Admission[];
    stats: {
        total_summaries: number;
        approved_count: number;
        draft_count: number;
        synthesis_engine: string;
    };
}

export default function DischargeSynthesizer({ summaries, activeAdmissions, stats }: SynthesizerProps) {
    const [selectedSummary, setSelectedSummary] = useState<ClinicalSummary | null>(
        summaries.data[0] || null
    );

    // Editable fields for approval
    const [chiefComplaint, setChiefComplaint] = useState(selectedSummary?.chief_complaint || '');
    const [hospitalCourse, setHospitalCourse] = useState(selectedSummary?.hospital_course || '');
    const [diagnosticSummary, setDiagnosticSummary] = useState(selectedSummary?.diagnostic_summary || '');
    const [medicationPlan, setMedicationPlan] = useState(selectedSummary?.medication_plan || '');
    const [followUp, setFollowUp] = useState(selectedSummary?.follow_up_instructions || '');

    const handleSelectSummary = (summ: ClinicalSummary) => {
        setSelectedSummary(summ);
        setChiefComplaint(summ.chief_complaint || '');
        setHospitalCourse(summ.hospital_course || '');
        setDiagnosticSummary(summ.diagnostic_summary || '');
        setMedicationPlan(summ.medication_plan || '');
        setFollowUp(summ.follow_up_instructions || '');
    };

    const handleSynthesizeForAdmission = (admissionId: string) => {
        router.post(`/ai/discharge-summaries/admission/${admissionId}`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                // Newly generated summary will be loaded
            },
        });
    };

    const handleApproveSummary = () => {
        if (!selectedSummary) return;
        router.patch(`/ai/discharge-summaries/${selectedSummary.id}/approve`, {
            chief_complaint: chiefComplaint,
            hospital_course: hospitalCourse,
            diagnostic_summary: diagnosticSummary,
            medication_plan: medicationPlan,
            follow_up_instructions: followUp,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedSummary((prev) => prev ? { ...prev, status: 'PHYSICIAN_APPROVED' } : null);
            },
        });
    };

    return (
        <AppLayout title="Automated Discharge Summary Synthesizer">
            <Head title="Automated Discharge Summary Synthesizer" />

            <div className="space-y-6">
                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-md shadow-emerald-600/20">
                                <FileCheck2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    Automated Clinical & Discharge Summary Synthesizer
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                    Inpatient Data Aggregation, Vitals & Diagnostics Synthesis & Physician Sign-Off
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Summaries</span>
                                <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.total_summaries}</div>
                            <div className="text-[11px] text-teal-700 font-medium mt-0.5">Synthesized dossiers</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physician Approved</span>
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-emerald-600">{stats.approved_count}</div>
                            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Signed off by doctors</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drafts Pending</span>
                                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                                    <Clock className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-amber-600">{stats.draft_count}</div>
                            <div className="text-[11px] text-amber-600 font-medium mt-0.5">Awaiting physician review</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admitted Inpatients</span>
                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                    <BedDouble className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-indigo-700">{activeAdmissions.length}</div>
                            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">Eligible for synthesis</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Inpatient Admission Quick-Synthesis Ribbon */}
                {activeAdmissions.length > 0 && (
                    <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                        <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BedDouble className="w-4 h-4 text-teal-600" />
                                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                                    Admitted Inpatients Ready for Discharge Synthesis
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-400">One-click AI aggregation</span>
                        </CardHeader>
                        <div className="p-4 overflow-x-auto">
                            <div className="flex items-center gap-3">
                                {activeAdmissions.map((adm) => (
                                    <div
                                        key={adm.id}
                                        className="shrink-0 p-3 bg-slate-50 hover:bg-teal-50/50 rounded-xl border border-slate-200 transition-colors w-64 text-xs"
                                    >
                                        <div className="font-bold text-slate-900 truncate">
                                            {adm.patient?.first_name} {adm.patient?.last_name}
                                        </div>
                                        <div className="text-[10px] text-teal-700 font-mono mt-0.5">
                                            MRN: {adm.patient?.mrn}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-1">
                                            {adm.ward?.name || 'General Ward'} • Bed {adm.bed?.name || 'N/A'}
                                        </div>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleSynthesizeForAdmission(adm.id)}
                                            className="w-full mt-2.5 py-1 text-[11px] bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-1.5"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Synthesize Summary
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Main Review & Approval Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Summaries List (4 Cols) */}
                    <div className="lg:col-span-4 space-y-3">
                        <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                            <CardHeader className="p-4 bg-slate-50 border-b border-slate-200">
                                <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                                    Clinical Summaries Dossier ({summaries.total})
                                </span>
                            </CardHeader>
                            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                                {summaries.data.map((summ) => {
                                    const isSelected = selectedSummary?.id === summ.id;
                                    return (
                                        <button
                                            key={summ.id}
                                            onClick={() => handleSelectSummary(summ)}
                                            className={`w-full p-4 text-left transition-colors flex flex-col gap-1 ${
                                                isSelected
                                                    ? 'bg-teal-50/70 border-l-4 border-l-teal-600'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-xs font-bold text-slate-900">{summ.summary_number}</span>
                                                <Badge variant={summ.status === 'PHYSICIAN_APPROVED' ? 'success' : 'warning'} className="text-[10px]">
                                                    {summ.status === 'PHYSICIAN_APPROVED' ? 'APPROVED' : 'DRAFT'}
                                                </Badge>
                                            </div>
                                            <div className="text-xs font-semibold text-slate-800">
                                                {summ.patient ? `${summ.patient.first_name} ${summ.patient.last_name}` : 'Unknown Patient'}
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-mono">
                                                MRN: {summ.patient?.mrn || 'N/A'} • {new Date(summ.created_at).toLocaleDateString()}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Right: Detailed Summary Editor & Sign-off (8 Cols) */}
                    <div className="lg:col-span-8">
                        {!selectedSummary ? (
                            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
                                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-semibold">Select a summary from the list or synthesize a new one.</p>
                            </div>
                        ) : (
                            <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                                <CardHeader className="p-4 bg-slate-900 text-white flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4 text-teal-400" />
                                        <div>
                                            <span className="font-mono text-xs font-bold text-teal-300">
                                                {selectedSummary.summary_number}
                                            </span>
                                            <span className="text-xs text-slate-300 ml-2">
                                                {selectedSummary.patient?.first_name} {selectedSummary.patient?.last_name} ({selectedSummary.patient?.mrn})
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {selectedSummary.status !== 'PHYSICIAN_APPROVED' ? (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleApproveSummary}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                Approve & Sign Off
                                            </Button>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> PHYSICIAN SIGNED OFF
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="p-5 space-y-4">
                                    {/* Section 1: Chief Complaint */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            1. Reason for Admission / Chief Complaint
                                        </label>
                                        <input
                                            type="text"
                                            value={chiefComplaint}
                                            onChange={(e) => setChiefComplaint(e.target.value)}
                                            className="w-full text-xs rounded-xl border-slate-200 bg-slate-50/70 p-2.5 font-medium"
                                        />
                                    </div>

                                    {/* Section 2: Hospital Course */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            2. Hospital Course & Clinical Progression
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={hospitalCourse}
                                            onChange={(e) => setHospitalCourse(e.target.value)}
                                            className="w-full text-xs rounded-xl border-slate-200 bg-slate-50/70 p-2.5 leading-relaxed font-sans"
                                        />
                                    </div>

                                    {/* Section 3: Diagnostic Summary */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            3. Laboratory & Diagnostic Imaging Findings
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={diagnosticSummary}
                                            onChange={(e) => setDiagnosticSummary(e.target.value)}
                                            className="w-full text-xs rounded-xl border-slate-200 bg-slate-50/70 p-2.5 leading-relaxed font-sans"
                                        />
                                    </div>

                                    {/* Section 4: Discharge Medications */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            4. Discharge Medication Regimen
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={medicationPlan}
                                            onChange={(e) => setMedicationPlan(e.target.value)}
                                            className="w-full text-xs rounded-xl border-slate-200 bg-slate-50/70 p-2.5 leading-relaxed font-sans"
                                        />
                                    </div>

                                    {/* Section 5: Follow-Up & Warning Signs */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            5. Follow-Up Instructions & Urgent Warning Signs
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={followUp}
                                            onChange={(e) => setFollowUp(e.target.value)}
                                            className="w-full text-xs rounded-xl border-slate-200 bg-slate-50/70 p-2.5 leading-relaxed font-sans"
                                        />
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                        <span>
                                            Approved by: {selectedSummary.doctor?.user?.name || 'Attending Physician'}
                                        </span>
                                        <span>
                                            Date: {selectedSummary.approved_at ? new Date(selectedSummary.approved_at).toLocaleString() : 'Pending Sign-Off'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
