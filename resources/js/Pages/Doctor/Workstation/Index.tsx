import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { 
    Stethoscope, Clock, CheckCircle2, User, HeartPulse, 
    AlertTriangle, Pill, FlaskConical, ScanLine, BedDouble, 
    Plus, Trash2, Save, ArrowRight, Activity, ShieldCheck, 
    Calendar, Building2, Search, FileText, Check, ChevronDown
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface Doctor {
    id: string;
    specialization: string;
    qualification: string;
    consultation_fee: number;
    user?: { id: string; name: string };
    department?: { id: string; name: string };
}

interface Patient {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    full_name: string;
    age: number | null;
    gender: string;
    blood_group: string;
    phone: string;
    allergies: string[] | null;
    chronic_conditions: string[] | null;
}

interface QueueItem {
    id: string;
    appointment_number?: string;
    visit_number?: string;
    start_time?: string;
    status: string;
    patient?: Patient;
    patient_id: string;
}

interface MedicineItem {
    id: string;
    brand_name: string;
    generic_name: string;
    strength: string;
    dosage_form: string;
}

interface LabTemplate {
    id: string;
    name: string;
    code: string;
    category?: string;
    price: number;
}

interface RadTemplate {
    id: string;
    name: string;
    code: string;
    modality: string;
    price: number;
}

interface Department {
    id: string;
    name: string;
}

interface Catalogs {
    medicines: MedicineItem[];
    lab_templates: LabTemplate[];
    radiology_templates: RadTemplate[];
    departments: Department[];
}

interface Props {
    doctor: Doctor | null;
    allDoctors: Doctor[];
    waitingQueue: QueueItem[];
    inProgressQueue: QueueItem[];
    completedQueue: QueueItem[];
    activePatient: Patient | null;
    activeAppointmentId?: string | null;
    patientHistory: {
        visits: any[];
        prescriptions: any[];
        lab_results: any[];
        radiology_orders: any[];
        admissions: any[];
    };
    catalogs: Catalogs;
}

export default function DoctorWorkstation({
    doctor,
    allDoctors,
    waitingQueue,
    inProgressQueue,
    completedQueue,
    activePatient,
    activeAppointmentId,
    patientHistory,
    catalogs,
}: Props) {
    const [cpoeTab, setCpoeTab] = useState<'rx' | 'lab' | 'rad' | 'adm'>('rx');

    // Rapid Consultation Form
    const { data, setData, post, processing, errors } = useForm({
        doctor_id: doctor?.id || '',
        patient_id: activePatient?.id || '',
        appointment_id: activeAppointmentId || '',
        chief_complaint: '',
        history_of_present_illness: '',
        physical_examination: '',
        clinical_notes: '',
        advice: '',
        follow_up_date: '',
        vitals: {
            systolic: '',
            diastolic: '',
            pulse_rate: '',
            temperature: '98.6',
            respiratory_rate: '16',
            spo2: '99',
            weight_kg: '',
            height_cm: '',
            bmi: '',
        },
        diagnoses: [
            { code: 'R05', description: 'Acute Cough', is_primary: true },
        ],
        prescription_items: [
            { medicine_name: 'Paracetamol 500mg', dosage: '1 Tablet', frequency: '1-0-1', route: 'ORAL', duration_days: 5, instructions: 'After meals' },
        ],
        lab_orders: [] as Array<{ template_id: string; priority: string }>,
        radiology_orders: [] as Array<{ template_id: string; priority: string; clinical_indication: string }>,
        recommend_ipd_admission: false,
        admitting_department_id: catalogs.departments[0]?.id || '',
        admitting_diagnosis: '',
    });

    // Quick symptom chips
    const symptomChips = [
        'Chest Tightness', 'Acute Fever', 'Shortness of Breath',
        'Severe Headache', 'Productive Cough', 'Abdominal Colic',
        'Nausea & Vomiting', 'Joint Pain & Swelling', 'Fatigue / Malaise'
    ];

    const handleAddSymptom = (symptom: string) => {
        setData('chief_complaint', data.chief_complaint ? `${data.chief_complaint}, ${symptom}` : symptom);
    };

    // Calculate BMI automatically
    const handleVitalsChange = (key: string, value: string) => {
        const updatedVitals = { ...data.vitals, [key]: value };

        const weight = parseFloat(key === 'weight_kg' ? value : updatedVitals.weight_kg);
        const heightM = parseFloat(key === 'height_cm' ? value : updatedVitals.height_cm) / 100;

        if (weight > 0 && heightM > 0) {
            updatedVitals.bmi = (weight / (heightM * heightM)).toFixed(1);
        }

        setData('vitals', updatedVitals);
    };

    // Prescription row actions
    const handleAddRxRow = () => {
        setData('prescription_items', [
            ...data.prescription_items,
            { medicine_name: '', dosage: '1 Tablet', frequency: '1-0-1', route: 'ORAL', duration_days: 5, instructions: 'After meals' },
        ]);
    };

    const handleRemoveRxRow = (index: number) => {
        setData('prescription_items', data.prescription_items.filter((_, i) => i !== index));
    };

    const handleUpdateRxRow = (index: number, field: string, val: any) => {
        const items = [...data.prescription_items];
        items[index] = { ...items[index], [field]: val };
        setData('prescription_items', items);
    };

    // Diagnostic orders toggle
    const handleToggleLab = (templateId: string) => {
        const exists = data.lab_orders.some(l => l.template_id === templateId);
        if (exists) {
            setData('lab_orders', data.lab_orders.filter(l => l.template_id !== templateId));
        } else {
            setData('lab_orders', [...data.lab_orders, { template_id: templateId, priority: 'ROUTINE' }]);
        }
    };

    const handleToggleRad = (templateId: string) => {
        const exists = data.radiology_orders.some(r => r.template_id === templateId);
        if (exists) {
            setData('radiology_orders', data.radiology_orders.filter(r => r.template_id !== templateId));
        } else {
            setData('radiology_orders', [...data.radiology_orders, { template_id: templateId, priority: 'ROUTINE', clinical_indication: data.chief_complaint }]);
        }
    };

    // Patient queue switch
    const handleSelectPatient = (patientId: string, aptId?: string) => {
        router.get('/doctor/workstation', {
            doctor_id: doctor?.id,
            patient_id: patientId,
            appointment_id: aptId,
        }, { preserveState: false });
    };

    const handleSubmitConsultation = (e: React.FormEvent) => {
        e.preventDefault();
        post('/doctor/workstation/consultation', {
            onSuccess: () => {
                // Consultation finished
            },
        });
    };

    return (
        <AppLayout title="Doctor Clinical Workstation">
            <Head title="Doctor Workstation - Rapid Charting & CPOE" />

            <div className="space-y-4">
                {/* Top Doctor Cockpit Header */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-slate-900">
                                    Dr. {doctor?.user?.name ?? 'Physician'}
                                </h1>
                                <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 text-2xs">
                                    {doctor?.department?.name ?? 'Clinical OPD'}
                                </Badge>
                                <span className="font-mono text-2xs text-slate-500">Lic: {doctor?.license_number}</span>
                            </div>
                            <div className="text-xs text-slate-500">
                                {doctor?.specialization} • {doctor?.qualification}
                            </div>
                        </div>
                    </div>

                    {/* Today's Queue Indicator Badges */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-900">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>Waiting: <strong>{waitingQueue.length}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-900">
                            <Activity className="w-4 h-4 text-teal-600" />
                            <span>In-Consultation: <strong>{inProgressQueue.length}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-900">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Completed: <strong>{completedQueue.length}</strong></span>
                        </div>
                    </div>
                </div>

                {/* 3-Column Doctor Cockpit Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* LEFT COLUMN: Queue & Patient 360 (4 cols) */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Patient Queue Accordion */}
                        <Card className="border-slate-200 shadow-xs">
                            <CardHeader className="p-3 border-b border-slate-100 flex flex-row items-center justify-between">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-teal-600" />
                                    Today's Patient Queue ({waitingQueue.length})
                                </CardTitle>
                                <span className="text-2xs text-slate-400 font-medium">Click to Chart</span>
                            </CardHeader>
                            <CardContent className="p-2 max-h-56 overflow-y-auto divide-y divide-slate-100">
                                {waitingQueue.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleSelectPatient(item.patient_id, item.id)}
                                        className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between ${
                                            activePatient?.id === item.patient_id
                                                ? 'bg-teal-50 border border-teal-200 text-teal-900 font-bold'
                                                : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div>
                                            <div className="text-xs font-bold text-slate-900">
                                                {item.patient?.full_name ?? 'Walk-In Patient'}
                                            </div>
                                            <div className="text-2xs text-slate-500 font-mono">
                                                {item.patient?.mrn} • {item.start_time || 'Walk-in'}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-2xs bg-white text-teal-800">
                                            {item.status}
                                        </Badge>
                                    </button>
                                ))}

                                {waitingQueue.length === 0 && (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                        No waiting patients in queue.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Active Patient 360 Dossier */}
                        {activePatient ? (
                            <Card className="border-teal-200/80 shadow-xs bg-linear-to-b from-teal-50/30 to-white">
                                <CardHeader className="p-4 border-b border-teal-100/60 pb-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-mono font-bold bg-teal-100 text-teal-800">
                                                MRN: {activePatient.mrn}
                                            </div>
                                            <h2 className="text-base font-extrabold text-slate-900 mt-1">
                                                {activePatient.full_name}
                                            </h2>
                                            <div className="text-xs text-slate-600">
                                                {activePatient.age ? `${activePatient.age} yrs` : 'Adult'} • {activePatient.gender} • Blood: <strong className="text-rose-600">{activePatient.blood_group}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Allergies Highlight Banner */}
                                    {activePatient.allergies && activePatient.allergies.length > 0 && (
                                        <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-1.5 text-xs text-rose-900">
                                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-rose-700">Allergies:</strong> {activePatient.allergies.join(', ')}
                                            </div>
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent className="p-4 space-y-3 text-xs">
                                    {/* Chronic Conditions */}
                                    <div>
                                        <span className="text-2xs font-semibold text-slate-500 uppercase">Chronic Conditions:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {activePatient.chronic_conditions?.map((c, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded text-2xs bg-slate-100 text-slate-700 font-medium">
                                                    {c}
                                                </span>
                                            )) || <span className="text-slate-400 text-2xs">None documented</span>}
                                        </div>
                                    </div>

                                    {/* Patient Medical History Accordion */}
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                        <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                                            <span>Recent Clinical Visits ({patientHistory.visits?.length || 0})</span>
                                        </div>
                                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                            {patientHistory.visits?.map((v) => (
                                                <div key={v.id} className="p-2 rounded bg-slate-50 border border-slate-100 text-2xs">
                                                    <div className="flex justify-between font-semibold text-slate-800">
                                                        <span>{v.visit_number}</span>
                                                        <span className="text-slate-500">{new Date(v.completed_at || v.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="text-slate-600 truncate">{v.chief_complaint}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Past Prescriptions */}
                                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                        <div className="font-bold text-slate-800 text-xs">
                                            Past Prescriptions ({patientHistory.prescriptions?.length || 0})
                                        </div>
                                        {patientHistory.prescriptions?.slice(0, 2).map((rx) => (
                                            <div key={rx.id} className="p-2 rounded bg-emerald-50/50 border border-emerald-100 text-2xs space-y-1">
                                                <div className="font-bold text-emerald-900">Rx #{rx.prescription_number}</div>
                                                <div className="text-slate-600">
                                                    {rx.items?.map((i: any) => i.medicine_name).join(', ')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="p-6 text-center text-xs text-slate-400">
                                Select a patient from the queue to start consultation.
                            </Card>
                        )}
                    </div>

                    {/* MAIN/RIGHT COLUMN: Rapid Clinical Charting & CPOE (8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                        <form onSubmit={handleSubmitConsultation} className="space-y-4">
                            {/* Clinical Encounter & Vitals Form */}
                            <Card className="border-slate-200 shadow-xs">
                                <CardHeader className="p-4 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <HeartPulse className="w-4.5 h-4.5 text-teal-600" />
                                        Rapid Clinical Encounter & Vitals Entry
                                    </CardTitle>
                                    <span className="text-2xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                                        1-Click Atomic Finalize
                                    </span>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    {/* Chief Complaint & Quick Chips */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-800 mb-1">
                                            Chief Complaint & Primary Symptoms *
                                        </label>
                                        <Input
                                            value={data.chief_complaint}
                                            onChange={(e) => setData('chief_complaint', e.target.value)}
                                            placeholder="e.g. Acute severe retrosternal chest pain radiating to left arm..."
                                            className="text-xs font-medium"
                                            required
                                        />
                                        {errors.chief_complaint && (
                                            <p className="text-2xs text-rose-600 mt-1">{errors.chief_complaint}</p>
                                        )}

                                        {/* Symptom chips */}
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {symptomChips.map((symptom, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleAddSymptom(symptom)}
                                                    className="px-2 py-0.5 rounded-full text-2xs bg-slate-100 hover:bg-teal-100 hover:text-teal-900 text-slate-700 border border-slate-200 transition-colors"
                                                >
                                                    + {symptom}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Vitals Entry Ribbon */}
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                                        <div className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5 text-teal-600" />
                                            Objective Vitals Signs
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                                            <div>
                                                <label className="text-2xs text-slate-500">BP Systolic</label>
                                                <Input
                                                    placeholder="120"
                                                    value={data.vitals.systolic}
                                                    onChange={(e) => handleVitalsChange('systolic', e.target.value)}
                                                    className="h-8 text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-2xs text-slate-500">BP Diastolic</label>
                                                <Input
                                                    placeholder="80"
                                                    value={data.vitals.diastolic}
                                                    onChange={(e) => handleVitalsChange('diastolic', e.target.value)}
                                                    className="h-8 text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-2xs text-slate-500">Pulse (bpm)</label>
                                                <Input
                                                    placeholder="72"
                                                    value={data.vitals.pulse_rate}
                                                    onChange={(e) => handleVitalsChange('pulse_rate', e.target.value)}
                                                    className="h-8 text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-2xs text-slate-500">Temp (°F)</label>
                                                <Input
                                                    placeholder="98.6"
                                                    value={data.vitals.temperature}
                                                    onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                                                    className="h-8 text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-2xs text-slate-500">SpO2 (%)</label>
                                                <Input
                                                    placeholder="99"
                                                    value={data.vitals.spo2}
                                                    onChange={(e) => handleVitalsChange('spo2', e.target.value)}
                                                    className="h-8 text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-2xs text-slate-500">Weight (kg)</label>
                                                <Input
                                                    placeholder="70"
                                                    value={data.vitals.weight_kg}
                                                    onChange={(e) => handleVitalsChange('weight_kg', e.target.value)}
                                                    className="h-8 text-xs font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Physical Exam & Clinical Impression Notes */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Physical Examination Findings
                                            </label>
                                            <textarea
                                                value={data.physical_examination}
                                                onChange={(e) => setData('physical_examination', e.target.value)}
                                                rows={2}
                                                placeholder="Chest clear, S1/S2 audible, abdomen soft non-tender..."
                                                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                Clinical Notes & Plan
                                            </label>
                                            <textarea
                                                value={data.clinical_notes}
                                                onChange={(e) => setData('clinical_notes', e.target.value)}
                                                rows={2}
                                                placeholder="Patient counseled on lifestyle modifications and compliance..."
                                                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CPOE (Computerized Physician Order Entry) Tabs */}
                            <Card className="border-slate-200 shadow-xs">
                                <CardHeader className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCpoeTab('rx')}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                cpoeTab === 'rx'
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            <Pill className="w-3.5 h-3.5" />
                                            Rx Pad ({data.prescription_items.length})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setCpoeTab('lab')}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                cpoeTab === 'lab'
                                                    ? 'bg-purple-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            <FlaskConical className="w-3.5 h-3.5" />
                                            Lab Tests ({data.lab_orders.length})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setCpoeTab('rad')}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                cpoeTab === 'rad'
                                                    ? 'bg-cyan-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            <ScanLine className="w-3.5 h-3.5" />
                                            Radiology Scans ({data.radiology_orders.length})
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setCpoeTab('adm')}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                cpoeTab === 'adm'
                                                    ? 'bg-indigo-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            <BedDouble className="w-3.5 h-3.5" />
                                            IPD Admission Referral
                                        </button>
                                    </div>

                                    {cpoeTab === 'rx' && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleAddRxRow}
                                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs py-1 px-2.5 flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add Drug Row
                                        </Button>
                                    )}
                                </CardHeader>

                                <CardContent className="p-4">
                                    {/* CPOE TAB 1: Prescription Pad */}
                                    {cpoeTab === 'rx' && (
                                        <div className="space-y-3">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 text-2xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                                        <tr>
                                                            <th className="py-2 px-2.5 w-1/3">Medicine / Formulation</th>
                                                            <th className="py-2 px-2">Dosage</th>
                                                            <th className="py-2 px-2">Frequency</th>
                                                            <th className="py-2 px-2">Days</th>
                                                            <th className="py-2 px-2">Instructions</th>
                                                            <th className="py-2 px-2 text-center w-10">Del</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {data.prescription_items.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                                <td className="py-2 px-2.5">
                                                                    <Input
                                                                        value={item.medicine_name}
                                                                        onChange={(e) => handleUpdateRxRow(idx, 'medicine_name', e.target.value)}
                                                                        placeholder="e.g. Amoxicillin 500mg"
                                                                        className="h-8 text-xs font-semibold"
                                                                        required
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <Input
                                                                        value={item.dosage}
                                                                        onChange={(e) => handleUpdateRxRow(idx, 'dosage', e.target.value)}
                                                                        placeholder="1 Cap"
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <select
                                                                        value={item.frequency}
                                                                        onChange={(e) => handleUpdateRxRow(idx, 'frequency', e.target.value)}
                                                                        className="h-8 rounded border border-slate-300 text-xs px-2 w-full"
                                                                    >
                                                                        <option value="1-0-1">1-0-1 (Bid)</option>
                                                                        <option value="1-1-1">1-1-1 (Tid)</option>
                                                                        <option value="1-0-0">1-0-0 (Morning)</option>
                                                                        <option value="0-0-1">0-0-1 (Night)</option>
                                                                        <option value="PRN">PRN (As Needed)</option>
                                                                    </select>
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.duration_days}
                                                                        onChange={(e) => handleUpdateRxRow(idx, 'duration_days', parseInt(e.target.value) || 1)}
                                                                        className="h-8 text-xs w-16"
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <Input
                                                                        value={item.instructions || ''}
                                                                        onChange={(e) => handleUpdateRxRow(idx, 'instructions', e.target.value)}
                                                                        placeholder="After meals"
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveRxRow(idx)}
                                                                        className="p-1 rounded text-rose-500 hover:bg-rose-50"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* General Advice */}
                                            <div>
                                                <label className="block text-2xs font-semibold text-slate-600 mb-1">
                                                    Prescription Advice & Dietary Guidelines
                                                </label>
                                                <Input
                                                    value={data.advice}
                                                    onChange={(e) => setData('advice', e.target.value)}
                                                    placeholder="Drink plenty of fluids, rest for 3 days, avoid strenuous activity..."
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* CPOE TAB 2: Laboratory Test Requisitions */}
                                    {cpoeTab === 'lab' && (
                                        <div className="space-y-3">
                                            <div className="text-xs text-slate-500">
                                                Select clinical pathology tests to order directly for this patient:
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {catalogs.lab_templates?.map((tmpl) => {
                                                    const isChecked = data.lab_orders.some(l => l.template_id === tmpl.id);
                                                    return (
                                                        <button
                                                            key={tmpl.id}
                                                            type="button"
                                                            onClick={() => handleToggleLab(tmpl.id)}
                                                            className={`p-2.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                                                                isChecked
                                                                    ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-1 ring-purple-500'
                                                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                                            }`}
                                                        >
                                                            <div>
                                                                <div className="text-xs">{tmpl.name}</div>
                                                                <div className="text-2xs text-slate-400 font-mono">{tmpl.code}</div>
                                                            </div>
                                                            <span className="text-2xs text-purple-700 font-semibold">${Number(tmpl.price).toFixed(2)}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* CPOE TAB 3: Radiology & Diagnostic Imaging */}
                                    {cpoeTab === 'rad' && (
                                        <div className="space-y-3">
                                            <div className="text-xs text-slate-500">
                                                Select radiology imaging modalities to order:
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {catalogs.radiology_templates?.map((tmpl) => {
                                                    const isChecked = data.radiology_orders.some(r => r.template_id === tmpl.id);
                                                    return (
                                                        <button
                                                            key={tmpl.id}
                                                            type="button"
                                                            onClick={() => handleToggleRad(tmpl.id)}
                                                            className={`p-2.5 rounded-xl border text-left flex items-start justify-between transition-all ${
                                                                isChecked
                                                                    ? 'border-cyan-600 bg-cyan-50 text-cyan-900 font-bold ring-1 ring-cyan-500'
                                                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                                            }`}
                                                        >
                                                            <div>
                                                                <div className="text-xs">{tmpl.name}</div>
                                                                <div className="text-2xs text-slate-400">{tmpl.modality}</div>
                                                            </div>
                                                            <span className="text-2xs text-cyan-700 font-semibold">${Number(tmpl.price).toFixed(2)}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* CPOE TAB 4: Inpatient IPD Admission Referral */}
                                    {cpoeTab === 'adm' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="recommend_ipd"
                                                    checked={data.recommend_ipd_admission}
                                                    onChange={(e) => setData('recommend_ipd_admission', e.target.checked)}
                                                    className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                                                />
                                                <label htmlFor="recommend_ipd" className="text-xs font-bold text-slate-900">
                                                    Recommend Direct Inpatient (IPD) Admission & Bed Allocation
                                                </label>
                                            </div>

                                            {data.recommend_ipd_admission && (
                                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3 text-xs">
                                                    <div>
                                                        <label className="block text-2xs font-semibold text-slate-700 mb-1">
                                                            Target Admitting Department
                                                        </label>
                                                        <select
                                                            value={data.admitting_department_id}
                                                            onChange={(e) => setData('admitting_department_id', e.target.value)}
                                                            className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800"
                                                        >
                                                            {catalogs.departments?.map((dept) => (
                                                                <option key={dept.id} value={dept.id}>
                                                                    {dept.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-2xs font-semibold text-slate-700 mb-1">
                                                            Admitting Diagnosis & Clinical Justification
                                                        </label>
                                                        <Input
                                                            value={data.admitting_diagnosis}
                                                            onChange={(e) => setData('admitting_diagnosis', e.target.value)}
                                                            placeholder="e.g. Acute coronary syndrome requiring CCU telemetry monitoring"
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Bottom Action Ribbon */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500">Follow-up Date:</span>
                                    <Input
                                        type="date"
                                        value={data.follow_up_date}
                                        onChange={(e) => setData('follow_up_date', e.target.value)}
                                        className="h-8 text-xs w-40"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        type="submit"
                                        disabled={processing || !activePatient}
                                        className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2 px-5 shadow-md flex items-center gap-1.5"
                                    >
                                        <Save className="w-4 h-4" />
                                        {processing ? 'Finalizing Encounter...' : 'Complete & Finalize Consultation'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
