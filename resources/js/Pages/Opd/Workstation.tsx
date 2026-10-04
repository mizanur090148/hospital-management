import React, { useState, useEffect } from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import {
    Activity, Stethoscope, Clock, UserCheck, AlertTriangle,
    HeartPulse, Pill, Plus, X, CheckCircle2, ChevronRight,
    Search, Calendar, FileText, ArrowRight, Printer, AlertCircle
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface OpdWorkstationProps {
    doctors: Array<{
        id: string;
        user: { name: string; email: string };
        department: { name: string };
    }>;
    selectedDoctorId: string;
    waitingQueue: Array<{
        id: string;
        appointment_number: string;
        start_time: string;
        type: string;
        status: string;
        reason_for_visit: string | null;
        patient: {
            id: string;
            mrn: string;
            full_name: string;
            dob: string;
            age: number | null;
            gender: string;
            blood_group: string;
            allergies: Array<{ substance: string; severity: string }> | null;
        };
    }>;
    inProgressVisits: Array<{
        id: string;
        visit_number: string;
        patient: {
            id: string;
            mrn: string;
            full_name: string;
            age: number | null;
            blood_group: string;
        };
    }>;
    completedToday: Array<{
        id: string;
        visit_number: string;
        patient: {
            id: string;
            full_name: string;
            mrn: string;
        };
        prescriptions: Array<{ id: string; prescription_number: string }>;
    }>;
    activePatient: {
        id: string;
        mrn: string;
        full_name: string;
        dob: string;
        age: number | null;
        gender: string;
        blood_group: string;
        allergies: Array<{ substance: string; severity: string; reaction?: string }> | null;
        chronic_conditions: Array<{ condition: string; notes?: string }> | null;
        opdVisits: Array<{
            id: string;
            visit_number: string;
            chief_complaint: string;
            vitals: any;
            diagnoses: any;
            created_at: string;
        }>;
    } | null;
    selectedAppointmentId: string | null;
    icd10Reference: Array<{ code: string; description: string }>;
}

export default function OpdWorkstation({
    doctors,
    selectedDoctorId,
    waitingQueue,
    inProgressVisits,
    completedToday,
    activePatient,
    selectedAppointmentId,
    icd10Reference,
}: OpdWorkstationProps) {
    // Encounter & Rx Form
    const { data, setData, post, processing, errors } = useForm({
        patient_id: activePatient?.id || '',
        doctor_id: selectedDoctorId,
        appointment_id: selectedAppointmentId || '',
        chief_complaint: '',
        history_of_present_illness: '',
        physical_examination: '',
        clinical_notes: '',
        vitals: {
            systolic: '',
            diastolic: '',
            pulse_rate: '',
            temperature: '98.6',
            respiratory_rate: '18',
            spo2: '99',
            weight_kg: '',
            height_cm: '',
            bmi: '',
        },
        diagnoses: [] as Array<{ code: string; description: string; is_primary: boolean }>,
        advice: '',
        follow_up_date: '',
        prescription_items: [
            { medicine_name: '', dosage: '1 Tab', frequency: '1-0-1', route: 'ORAL', duration_days: 5, instructions: 'After meals' },
        ],
    });

    // Sync patient_id and appointment_id when activePatient updates
    useEffect(() => {
        if (activePatient) {
            setData((prev) => ({
                ...prev,
                patient_id: activePatient.id,
                appointment_id: selectedAppointmentId || '',
            }));
        }
    }, [activePatient, selectedAppointmentId]);

    // Auto-calculate BMI from weight (kg) and height (cm)
    const calculateBmi = (weightKg: string, heightCm: string) => {
        const w = parseFloat(weightKg);
        const h = parseFloat(heightCm) / 100;
        if (w > 0 && h > 0) {
            const bmiVal = (w / (h * h)).toFixed(1);
            setData('vitals', { ...data.vitals, weight_kg: weightKg, height_cm: heightCm, bmi: bmiVal });
        } else {
            setData('vitals', { ...data.vitals, weight_kg: weightKg, height_cm: heightCm });
        }
    };

    const handleDoctorChange = (docId: string) => {
        router.get('/opd', { doctor_id: docId });
    };

    const handleSelectPatientFromQueue = (patientId: string, appointmentId: string) => {
        router.get('/opd', {
            doctor_id: selectedDoctorId,
            patient_id: patientId,
            appointment_id: appointmentId,
        }, { preserveState: true });
    };

    const addDiagnosisFromRef = (icd: { code: string; description: string }) => {
        if (!data.diagnoses.some(d => d.code === icd.code)) {
            setData('diagnoses', [
                ...data.diagnoses,
                { code: icd.code, description: icd.description, is_primary: data.diagnoses.length === 0 },
            ]);
        }
    };

    const removeDiagnosis = (index: number) => {
        setData('diagnoses', data.diagnoses.filter((_, i) => i !== index));
    };

    const addPrescriptionItem = () => {
        setData('prescription_items', [
            ...data.prescription_items,
            { medicine_name: '', dosage: '1 Tab', frequency: '1-0-1', route: 'ORAL', duration_days: 5, instructions: 'After meals' },
        ]);
    };

    const removePrescriptionItem = (index: number) => {
        setData('prescription_items', data.prescription_items.filter((_, i) => i !== index));
    };

    const handleFinalizeEncounter = (e: React.FormEvent) => {
        e.preventDefault();
        post('/opd/encounters', {
            onSuccess: () => {
                // Submit complete flow if needed
            },
        });
    };

    return (
        <AppLayout title="Doctor's Clinical Workstation (OPD)">
            <div className="space-y-4">
                {/* Header & Attending Doctor Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-sm shadow-cyan-600/30">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">OPD Clinical Workstation</h1>
                            <p className="text-xs text-slate-500">Live consultation chart, real-time vitals & digital prescription pad.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Attending Physician:</span>
                        <select
                            value={selectedDoctorId}
                            onChange={(e) => handleDoctorChange(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-800"
                        >
                            {doctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>Dr. {doc.user.name} ({doc.department.name})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 3-Column Clinical Workstation Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* LEFT COLUMN: Queue & Waiting Board (3 cols) */}
                    <div className="lg:col-span-3 space-y-4">
                        <Card>
                            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-cyan-600" /> Today's Waiting Queue ({waitingQueue.length})
                                </CardTitle>
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                    Live
                                </span>
                            </CardHeader>

                            <div className="divide-y divide-slate-100 max-h-[65vh] overflow-y-auto">
                                {waitingQueue.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-slate-400">
                                        <UserCheck className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                                        No patients waiting in queue.
                                    </div>
                                ) : (
                                    waitingQueue.map((apt) => {
                                        const isSelected = activePatient?.id === apt.patient.id;
                                        return (
                                            <div
                                                key={apt.id}
                                                onClick={() => handleSelectPatientFromQueue(apt.patient.id, apt.id)}
                                                className={`p-3 cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-cyan-50/80 border-l-4 border-cyan-600' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-slate-900">{apt.patient.full_name}</span>
                                                    <span className="font-mono text-[10px] text-cyan-700 font-semibold">{apt.start_time.substring(0, 5)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                                    <span>{apt.patient.mrn}</span>
                                                    <span>•</span>
                                                    <span>{apt.patient.age}y</span>
                                                    <span>•</span>
                                                    <span className="text-rose-600 font-semibold">{apt.patient.blood_group}</span>
                                                </div>
                                                {apt.reason_for_visit && (
                                                    <div className="text-[11px] text-slate-600 truncate mt-1 italic">
                                                        "{apt.reason_for_visit}"
                                                    </div>
                                                )}
                                                {apt.patient.allergies && apt.patient.allergies.length > 0 && (
                                                    <div className="flex items-center gap-1 text-[10px] text-amber-700 mt-1">
                                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                        Allergy: {apt.patient.allergies[0].substance}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>

                        {/* In-Progress Consultations */}
                        {inProgressVisits.length > 0 && (
                            <Card className="border-indigo-200 bg-indigo-50/30">
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                                        In-Progress ({inProgressVisits.length})
                                    </CardTitle>
                                </CardHeader>
                                <div className="p-3 space-y-1.5">
                                    {inProgressVisits.map((v) => (
                                        <div key={v.id} className="text-xs font-medium text-indigo-900 flex justify-between">
                                            <span>{v.patient.full_name}</span>
                                            <span className="font-mono text-[10px]">{v.visit_number}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Completed Today */}
                        {completedToday.length > 0 && (
                            <Card className="border-emerald-200 bg-emerald-50/20">
                                <CardHeader className="p-3 pb-1">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                                        Completed Today ({completedToday.length})
                                    </CardTitle>
                                </CardHeader>
                                <div className="p-3 space-y-1.5 text-xs text-slate-600">
                                    {completedToday.slice(0, 5).map((comp) => (
                                        <div key={comp.id} className="flex justify-between items-center">
                                            <span>{comp.patient.full_name}</span>
                                            <span className="text-[10px] text-emerald-700 font-semibold font-mono">
                                                {comp.visit_number}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* CENTER & RIGHT COLUMNS: Active Encounter & Prescription Pad (9 cols) */}
                    <div className="lg:col-span-9 space-y-4">
                        {!activePatient ? (
                            <Card className="p-12 text-center text-slate-400">
                                <Stethoscope className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <h3 className="text-base font-bold text-slate-800">No Patient Selected</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                    Select a patient from today's waiting queue on the left to begin consultation, chart vitals, and issue prescriptions.
                                </p>
                            </Card>
                        ) : (
                            <form onSubmit={handleFinalizeEncounter} className="space-y-4">
                                {/* Active Patient Ribbon */}
                                <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-extrabold flex items-center justify-center text-sm">
                                            {activePatient.full_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="font-bold text-base text-white">{activePatient.full_name}</h2>
                                                <span className="font-mono text-xs bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded">
                                                    {activePatient.mrn}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                                                <span>{activePatient.age} yrs • {activePatient.gender}</span>
                                                <span>•</span>
                                                <span className="text-rose-400 font-bold">Blood: {activePatient.blood_group}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* High-Alert Allergies Warning */}
                                    {activePatient.allergies && activePatient.allergies.length > 0 && (
                                        <div className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-400/30 text-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                            <span>Allergies: {activePatient.allergies.map(a => a.substance).join(', ')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Clinical Vitals Chart */}
                                <Card>
                                    <CardHeader className="p-4 pb-2 border-b border-slate-100">
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                            <HeartPulse className="w-4 h-4 text-rose-600" /> Patient Vitals Signs
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">BP Systolic</label>
                                            <Input
                                                type="number"
                                                placeholder="120"
                                                value={data.vitals.systolic}
                                                onChange={(e) => setData('vitals', { ...data.vitals, systolic: e.target.value })}
                                                className="h-8 text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">BP Diastolic</label>
                                            <Input
                                                type="number"
                                                placeholder="80"
                                                value={data.vitals.diastolic}
                                                onChange={(e) => setData('vitals', { ...data.vitals, diastolic: e.target.value })}
                                                className="h-8 text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Pulse (bpm)</label>
                                            <Input
                                                type="number"
                                                placeholder="72"
                                                value={data.vitals.pulse_rate}
                                                onChange={(e) => setData('vitals', { ...data.vitals, pulse_rate: e.target.value })}
                                                className="h-8 text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">SpO2 (%)</label>
                                            <Input
                                                type="number"
                                                placeholder="99"
                                                value={data.vitals.spo2}
                                                onChange={(e) => setData('vitals', { ...data.vitals, spo2: e.target.value })}
                                                className="h-8 text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Temp (°F)</label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                placeholder="98.6"
                                                value={data.vitals.temperature}
                                                onChange={(e) => setData('vitals', { ...data.vitals, temperature: e.target.value })}
                                                className="h-8 text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Weight (kg)</label>
                                            <Input
                                                type="number"
                                                placeholder="70"
                                                value={data.vitals.weight_kg}
                                                onChange={(e) => calculateBmi(e.target.value, data.vitals.height_cm)}
                                                className="h-8 text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Height (cm)</label>
                                            <Input
                                                type="number"
                                                placeholder="175"
                                                value={data.vitals.height_cm}
                                                onChange={(e) => calculateBmi(data.vitals.weight_kg, e.target.value)}
                                                className="h-8 text-xs font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">BMI</label>
                                            <div className="h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-800 border border-slate-200">
                                                {data.vitals.bmi || '--'}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Consultation Notes & Diagnosis */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                Clinical Notes & Symptoms
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3.5 space-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Complaint *</label>
                                                <Input
                                                    value={data.chief_complaint}
                                                    onChange={(e) => setData('chief_complaint', e.target.value)}
                                                    placeholder="Primary symptom or reason for OPD visit..."
                                                    required
                                                />
                                                {errors.chief_complaint && <p className="text-xs text-rose-500 mt-1">{errors.chief_complaint}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">History of Present Illness (HPI)</label>
                                                <textarea
                                                    rows={2}
                                                    value={data.history_of_present_illness}
                                                    onChange={(e) => setData('history_of_present_illness', e.target.value)}
                                                    placeholder="Onset, duration, progression of symptoms..."
                                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Examination & Observations</label>
                                                <textarea
                                                    rows={2}
                                                    value={data.physical_examination}
                                                    onChange={(e) => setData('physical_examination', e.target.value)}
                                                    placeholder="Auscultation, palpation, signs..."
                                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* ICD-10 Diagnoses Picker */}
                                    <Card>
                                        <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                ICD-10 Diagnostic Tagging
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3.5 space-y-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Quick Select Common Diagnoses:</label>
                                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200/60">
                                                    {icd10Reference.map((icd) => (
                                                        <button
                                                            key={icd.code}
                                                            type="button"
                                                            onClick={() => addDiagnosisFromRef(icd)}
                                                            className="text-[11px] bg-white hover:bg-cyan-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700 flex items-center gap-1"
                                                        >
                                                            <strong className="font-mono text-cyan-800">{icd.code}</strong>
                                                            <span className="truncate max-w-[120px]">{icd.description}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Tagged Diagnoses */}
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-bold uppercase text-slate-700">Assigned Diagnoses:</label>
                                                {data.diagnoses.length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic">No ICD-10 code attached yet.</p>
                                                ) : (
                                                    data.diagnoses.map((dx, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-2 bg-cyan-50 border border-cyan-200 rounded-lg text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-cyan-900">{dx.code}</span>
                                                                <span className="text-slate-800">{dx.description}</span>
                                                                {dx.is_primary && (
                                                                    <span className="text-[10px] bg-cyan-600 text-white font-bold px-1.5 rounded">Primary</span>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeDiagnosis(idx)}
                                                                className="text-slate-400 hover:text-rose-600"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* DIGITAL PRESCRIPTION PAD (RX) */}
                                <Card className="border-cyan-200/80 shadow-xs">
                                    <CardHeader className="p-3.5 pb-2 bg-gradient-to-r from-cyan-50/60 to-teal-50/40 border-b border-cyan-100 flex flex-row items-center justify-between">
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-cyan-900 flex items-center gap-1.5">
                                            <Pill className="w-4 h-4 text-cyan-700" /> Electronic Prescription Pad (Rx)
                                        </CardTitle>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={addPrescriptionItem}
                                            className="text-xs h-7 text-cyan-800 border-cyan-300 hover:bg-cyan-100"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Medication
                                        </Button>
                                    </CardHeader>

                                    <CardContent className="p-4 space-y-3">
                                        <div className="space-y-2">
                                            {data.prescription_items.map((item, index) => (
                                                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 items-center">
                                                    <div className="sm:col-span-4">
                                                        <Input
                                                            placeholder="Medicine name (e.g. Amoxicillin 500mg)"
                                                            value={item.medicine_name}
                                                            onChange={(e) => {
                                                                const updated = [...data.prescription_items];
                                                                updated[index].medicine_name = e.target.value;
                                                                setData('prescription_items', updated);
                                                            }}
                                                            className="h-8 text-xs bg-white"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <Input
                                                            placeholder="Dosage (e.g. 1 Tab)"
                                                            value={item.dosage}
                                                            onChange={(e) => {
                                                                const updated = [...data.prescription_items];
                                                                updated[index].dosage = e.target.value;
                                                                setData('prescription_items', updated);
                                                            }}
                                                            className="h-8 text-xs bg-white"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <select
                                                            value={item.frequency}
                                                            onChange={(e) => {
                                                                const updated = [...data.prescription_items];
                                                                updated[index].frequency = e.target.value;
                                                                setData('prescription_items', updated);
                                                            }}
                                                            className="w-full h-8 px-2 border border-slate-200 rounded-lg text-xs bg-white font-medium text-slate-800"
                                                        >
                                                            <option value="1-0-1">1-0-1 (BID)</option>
                                                            <option value="1-1-1">1-1-1 (TID)</option>
                                                            <option value="1-0-0">1-0-0 (Morning)</option>
                                                            <option value="0-0-1">0-0-1 (Night)</option>
                                                            <option value="PRN">PRN (As needed)</option>
                                                        </select>
                                                    </div>
                                                    <div className="sm:col-span-1">
                                                        <Input
                                                            type="number"
                                                            placeholder="Days"
                                                            value={item.duration_days}
                                                            onChange={(e) => {
                                                                const updated = [...data.prescription_items];
                                                                updated[index].duration_days = parseInt(e.target.value) || 1;
                                                                setData('prescription_items', updated);
                                                            }}
                                                            className="h-8 text-xs bg-white"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <Input
                                                            placeholder="Instructions"
                                                            value={item.instructions}
                                                            onChange={(e) => {
                                                                const updated = [...data.prescription_items];
                                                                updated[index].instructions = e.target.value;
                                                                setData('prescription_items', updated);
                                                            }}
                                                            className="h-8 text-xs bg-white"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-1 flex justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removePrescriptionItem(index)}
                                                            className="p-1 text-slate-400 hover:text-rose-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">General Dietary & Lifestyle Advice</label>
                                                <Input
                                                    placeholder="e.g. Drink plenty of water, low sodium diet..."
                                                    value={data.advice}
                                                    onChange={(e) => setData('advice', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Consultation Date</label>
                                                <Input
                                                    type="date"
                                                    value={data.follow_up_date}
                                                    onChange={(e) => setData('follow_up_date', e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="text-xs text-slate-500">
                                        Finalizing encounter records audit events and commits digital prescription pad.
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.get('/opd', { doctor_id: selectedDoctorId })}
                                        >
                                            Hold Encounter
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={processing}
                                            className="shadow-sm shadow-cyan-600/30"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                            {processing ? 'Finalizing Encounter...' : 'Finalize Consultation & Sign Rx'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
