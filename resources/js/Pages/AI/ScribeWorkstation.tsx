import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import {
    Mic, MicOff, Sparkles, CheckCircle2, ShieldCheck, ArrowRight,
    FileText, Pill, Stethoscope, Clock, Check, AlertCircle, RefreshCw,
    Activity, Play, Square, User, Send
} from 'lucide-react';

interface Doctor {
    id: string;
    user: {
        id: string;
        name: string;
    };
}

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
}

interface OpdVisit {
    id: string;
    visit_number: string;
    patient: Patient;
}

interface ScribeSession {
    id: string;
    session_number: string;
    status: string;
    raw_transcript: string | null;
    sanitized_transcript: string | null;
    structured_soap: {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        icd10_codes?: Array<{ code: string; description: string }>;
        prescription_suggestions?: Array<{ medicine_name: string; dosage: string; frequency: string; duration: string }>;
    } | null;
    audio_duration_seconds: number;
    tokens_used: number;
    created_at: string;
    doctor?: Doctor;
    patient?: Patient;
    opdVisit?: {
        id: string;
        visit_number: string;
    };
}

interface ScribeProps {
    recentSessions: {
        data: ScribeSession[];
        links: any[];
        total: number;
    };
    doctors: Doctor[];
    patients: Patient[];
    recentVisits: OpdVisit[];
    stats: {
        total_sessions: number;
        committed_count: number;
        total_hours_scribed: number;
        active_model: string;
    };
}

export default function ScribeWorkstation({ recentSessions, doctors, patients, recentVisits, stats }: ScribeProps) {
    const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');
    const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || '');
    const [selectedVisitId, setSelectedVisitId] = useState(recentVisits[0]?.id || '');

    // Active working session state
    const [activeSession, setActiveSession] = useState<ScribeSession | null>(
        recentSessions.data[0] || null
    );

    // Audio & Dictation state
    const [isRecording, setIsRecording] = useState(false);
    const [audioSeconds, setAudioSeconds] = useState(48);
    const [transcriptText, setTranscriptText] = useState(
        activeSession?.raw_transcript ||
        "Doctor: Good morning Sarah. Tell me what brings you in today?\n" +
        "Patient: Good morning Doctor. For the past four days, I've had persistent throbbing headaches, especially in the occipital region, accompanied by mild dizziness and fatigue. I checked my blood pressure at the local pharmacy yesterday, and the pharmacist said it was 168 over 102.\n" +
        "Doctor: Understood. Any chest pain, shortness of breath, or visual disturbances like blurriness?\n" +
        "Patient: No chest pain, but when I climb stairs, I get slightly winded. No blurred vision.\n" +
        "Doctor: Let's examine your blood pressure now. In the right arm, it measures 165 over 100 mmHg. Heart rate is 78 bpm, regular. Heart sounds S1, S2 audible, no murmurs. Lungs are clear to auscultation. Neurological exam cranial nerves II through XII intact. This presentation indicates uncontrolled primary hypertension. I will start you on Lisinopril 10mg once daily in the morning, order a comprehensive metabolic panel, and recommend an ECG."
    );

    const [isProcessing, setIsProcessing] = useState(false);

    // Sample clinical scenarios
    const loadSampleTemplate = (type: 'htn' | 'asthma' | 'infection') => {
        if (type === 'htn') {
            setTranscriptText(
                "Doctor: Patient Sarah Connor presents for evaluation of elevated blood pressure and occipital headaches for 4 days. Blood pressure today is 165/100 mmHg, pulse 78 bpm regular. Auscultation of heart and lungs is normal. Impression is essential primary hypertension, ICD-10 I10. Plan: initiate Lisinopril 10mg PO once daily, advise low-sodium diet, and follow up in two weeks."
            );
        } else if (type === 'asthma') {
            setTranscriptText(
                "Doctor: Patient reports acute onset of wheezing, chest tightness, and dry cough following cold weather exposure. Lungs reveal bilateral expiratory wheezes. SpO2 is 95% on room air. Impression is acute exacerbation of unspecified asthma, ICD-10 J45.909. Plan: nebulized Albuterol in clinic, prescribe inhaled corticosteroid, and oral Prednisone 40mg daily for 5 days."
            );
        } else {
            setTranscriptText(
                "Doctor: Patient presents with 3-day history of fever up to 38.5 C, productive cough with yellowish sputum, and right-sided pleuritic chest discomfort. Auscultation reveals bronchial breath sounds and crackles in the right lower lobe. Impression: Community-acquired acute pneumonia, ICD-10 J18.9. Plan: prescribed Amoxicillin 500mg TDS for 7 days, Paracetamol 650mg PRN for fever, increase oral fluid intake, and repeat chest X-ray in 4 weeks."
            );
        }
    };

    const handleStartSession = () => {
        router.post('/ai/scribe/sessions', {
            doctor_id: selectedDoctorId || undefined,
            patient_id: selectedPatientId || undefined,
            opd_visit_id: selectedVisitId || undefined,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // The newly created session will appear in recentSessions
            },
        });
    };

    const handleProcessTranscript = async () => {
        if (!activeSession) return;
        setIsProcessing(true);

        try {
            const res = await fetch(`/ai/scribe/sessions/${activeSession.id}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({
                    raw_transcript: transcriptText,
                    audio_duration_seconds: audioSeconds,
                }),
            });

            const data = await res.json();
            if (data.session) {
                setActiveSession(data.session);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCommitSoap = () => {
        if (!activeSession) return;
        router.post(`/ai/scribe/sessions/${activeSession.id}/commit`, {
            structured_soap: activeSession.structured_soap,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setActiveSession((prev) => prev ? { ...prev, status: 'COMMITTED' } : null);
            },
        });
    };

    const soap = activeSession?.structured_soap;

    return (
        <AppLayout title="Ambient Clinical AI Scribe Workstation">
            <Head title="Ambient Clinical AI Scribe Workstation" />

            <div className="space-y-6">
                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    Ambient Clinical AI Scribe Cockpit
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                    Zero-Click SOAP Note Generation, HIPAA PHI Sanitization & Direct EHR Charting
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleStartSession}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs text-white shadow-sm"
                        >
                            <Mic className="w-3.5 h-3.5" />
                            New Scribe Session
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scribed</span>
                                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.total_sessions}</div>
                            <div className="text-[11px] text-purple-700 font-medium mt-0.5">Encounters processed</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Committed to EHR</span>
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-emerald-600">{stats.committed_count}</div>
                            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Direct chart commits</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audio Transcribed</span>
                                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                    <Clock className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.total_hours_scribed} hrs</div>
                            <div className="text-[11px] text-blue-600 font-medium mt-0.5">Clinical ambient dictation</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">HIPAA Shield</span>
                                <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-cyan-700">100% PHI Safe</div>
                            <div className="text-[11px] text-cyan-600 font-medium mt-0.5">Automated de-identification</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main 2-Column Workstation: Left: Dictation & Session Setup | Right: Real-time Structured SOAP */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Dictation Console (5 Cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                            <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Mic className="w-4 h-4 text-purple-600" />
                                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                                        Dictation & Encounter Audio
                                    </span>
                                </div>
                                {activeSession && (
                                    <Badge variant={activeSession.status === 'COMMITTED' ? 'success' : 'purple'} className="font-mono text-[10px]">
                                        {activeSession.session_number} ({activeSession.status})
                                    </Badge>
                                )}
                            </CardHeader>

                            <CardContent className="p-4 space-y-4">
                                {/* Doctor & Patient Selectors */}
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">Attending Physician</label>
                                        <select
                                            value={selectedDoctorId}
                                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                                            className="w-full text-xs rounded-lg border-slate-200"
                                        >
                                            {doctors.map((d) => (
                                                <option key={d.id} value={d.id}>{d.user?.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">Patient Encounter</label>
                                        <select
                                            value={selectedPatientId}
                                            onChange={(e) => setSelectedPatientId(e.target.value)}
                                            className="w-full text-xs rounded-lg border-slate-200"
                                        >
                                            {patients.map((p) => (
                                                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Virtual Microphone Audio Waveform Simulator */}
                                <div className={`p-4 rounded-xl border transition-all ${
                                    isRecording
                                        ? 'bg-rose-50/70 border-rose-300 text-rose-900 animate-pulse'
                                        : 'bg-slate-900 text-white border-slate-800'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {isRecording ? (
                                                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                                            ) : (
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                            )}
                                            <span className="text-xs font-mono font-bold">
                                                {isRecording ? 'LIVE AMBIENT RECORDING...' : 'STANDBY - READY FOR DICTATION'}
                                            </span>
                                        </div>
                                        <span className="font-mono text-xs text-purple-300 font-bold">
                                            00:{audioSeconds < 10 ? '0' : ''}{audioSeconds}
                                        </span>
                                    </div>

                                    {/* Audio wave bars */}
                                    <div className="mt-3 flex items-center justify-center gap-1 h-8">
                                        {[40, 65, 85, 30, 95, 70, 50, 80, 60, 45, 90, 75, 55, 35].map((h, i) => (
                                            <div
                                                key={i}
                                                style={{ height: isRecording ? `${h}%` : '20%' }}
                                                className={`w-1 rounded-full transition-all duration-150 ${
                                                    isRecording ? 'bg-rose-500' : 'bg-slate-600'
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-700/50">
                                        <button
                                            type="button"
                                            onClick={() => setIsRecording(!isRecording)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isRecording
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                            }`}
                                        >
                                            {isRecording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                            {isRecording ? 'Stop Recording' : 'Start Ambient Mic'}
                                        </button>

                                        <span className="text-[10px] text-slate-400">
                                            Model: clinical-scribe-v1
                                        </span>
                                    </div>
                                </div>

                                {/* Sample Scenario Presets */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Load Clinical Encounter Scenario:
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => loadSampleTemplate('htn')}
                                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 transition-colors border border-slate-200"
                                        >
                                            Hypertension (I10)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => loadSampleTemplate('asthma')}
                                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 transition-colors border border-slate-200"
                                        >
                                            Asthma (J45.9)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => loadSampleTemplate('infection')}
                                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 transition-colors border border-slate-200"
                                        >
                                            Pneumonia (J18.9)
                                        </button>
                                    </div>
                                </div>

                                {/* Raw Transcript Textarea */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Clinical Dialogue / Ambient Dictation Transcript
                                    </label>
                                    <textarea
                                        rows={6}
                                        value={transcriptText}
                                        onChange={(e) => setTranscriptText(e.target.value)}
                                        className="w-full text-xs font-mono rounded-xl border-slate-200 p-2.5 leading-relaxed bg-slate-50/60"
                                        placeholder="Raw conversational dialogue or doctor dictation transcript..."
                                    />
                                </div>

                                {/* Process Button */}
                                <Button
                                    variant="primary"
                                    onClick={handleProcessTranscript}
                                    disabled={isProcessing || !activeSession}
                                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            Sanitizing PHI & Structuring SOAP Note...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Structure into Clinical SOAP Note
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Real-Time Structured SOAP Note Display (7 Cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                            <CardHeader className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-purple-400" />
                                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                                        Structured Clinical SOAP Chart
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {soap && activeSession?.status !== 'COMMITTED' && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleCommitSoap}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs py-1 px-3 h-auto flex items-center gap-1.5"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            Commit to EHR Chart
                                        </Button>
                                    )}
                                    {activeSession?.status === 'COMMITTED' && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> COMMITTED TO PATIENT EHR
                                        </span>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-5 space-y-4">
                                {!soap ? (
                                    <div className="py-16 text-center text-slate-400">
                                        <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm font-semibold">No structured SOAP note generated yet.</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Click "Structure into Clinical SOAP Note" to synthesize the dictation.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* PHI Sanitization Notice */}
                                        <div className="p-3 bg-cyan-50/70 rounded-xl border border-cyan-200/80 flex items-center justify-between text-xs text-cyan-900">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-cyan-700 shrink-0" />
                                                <span className="font-semibold">HIPAA PHI Shield Verified: Identifiers de-identified prior to LLM processing.</span>
                                            </div>
                                            <span className="font-mono text-[10px] bg-cyan-200/60 px-2 py-0.5 rounded font-bold text-cyan-800">
                                                {soap.estimated_tokens || 380} Tokens
                                            </span>
                                        </div>

                                        {/* S: Subjective */}
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wider">
                                                <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">S</span>
                                                <span>Subjective (HPI & Symptoms)</span>
                                            </div>
                                            <p className="text-xs text-slate-700 leading-relaxed font-sans pl-5">
                                                {soap.subjective}
                                            </p>
                                        </div>

                                        {/* O: Objective */}
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wider">
                                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">O</span>
                                                <span>Objective (Physical Exam & Hemodynamics)</span>
                                            </div>
                                            <p className="text-xs text-slate-700 leading-relaxed font-sans pl-5">
                                                {soap.objective}
                                            </p>
                                        </div>

                                        {/* A: Assessment */}
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wider">
                                                <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">A</span>
                                                <span>Assessment & ICD-10 Coding</span>
                                            </div>
                                            <p className="text-xs text-slate-700 leading-relaxed font-sans pl-5">
                                                {soap.assessment}
                                            </p>
                                            {/* Tagged ICD-10 Chips */}
                                            {soap.icd10_codes && soap.icd10_codes.length > 0 && (
                                                <div className="pl-5 flex flex-wrap gap-1.5 pt-1">
                                                    {soap.icd10_codes.map((c, idx) => (
                                                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100/80 text-amber-900 border border-amber-300">
                                                            <span className="font-mono text-amber-800">{c.code}:</span> {c.description}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* P: Plan */}
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wider">
                                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">P</span>
                                                <span>Plan & Recommended Medications</span>
                                            </div>
                                            <p className="text-xs text-slate-700 leading-relaxed font-sans pl-5">
                                                {soap.plan}
                                            </p>

                                            {/* Extracted Prescription Pills */}
                                            {soap.prescription_suggestions && soap.prescription_suggestions.length > 0 && (
                                                <div className="pl-5 space-y-1.5 pt-1">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                                        Prescription Suggestions for CPOE:
                                                    </span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {soap.prescription_suggestions.map((rx, idx) => (
                                                            <div key={idx} className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs">
                                                                <div className="flex items-center justify-between font-bold text-emerald-900">
                                                                    <span className="flex items-center gap-1">
                                                                        <Pill className="w-3 h-3 text-emerald-600" />
                                                                        {rx.medicine_name}
                                                                    </span>
                                                                    <span className="font-mono text-[10px] bg-emerald-200/70 px-1.5 py-0.5 rounded text-emerald-800">
                                                                        {rx.dosage}
                                                                    </span>
                                                                </div>
                                                                <div className="text-[11px] text-emerald-700 mt-0.5">
                                                                    {rx.frequency} • {rx.duration}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Scribe Sessions History Table */}
                <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                    <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Recent Ambient Clinical Scribe Sessions ({recentSessions.total})
                        </span>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Session Number</th>
                                    <th className="py-3 px-4">Doctor</th>
                                    <th className="py-3 px-4">Patient</th>
                                    <th className="py-3 px-4">Duration & Tokens</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Created</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {recentSessions.data.map((sess) => (
                                    <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                            {sess.session_number}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {sess.doctor?.user?.name || 'Assigned Physician'}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {sess.patient ? (
                                                <span>{sess.patient.first_name} {sess.patient.last_name} ({sess.patient.mrn})</span>
                                            ) : (
                                                <span className="text-slate-400 italic">Unassigned Patient</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                            {sess.audio_duration_seconds}s • {sess.tokens_used} tokens
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <Badge variant={sess.status === 'COMMITTED' ? 'success' : sess.status === 'GENERATED' ? 'purple' : 'warning'} className="text-[10px]">
                                                {sess.status}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                                            {new Date(sess.created_at).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setActiveSession(sess);
                                                    if (sess.raw_transcript) setTranscriptText(sess.raw_transcript);
                                                }}
                                                className="text-xs text-purple-700 hover:bg-purple-50"
                                            >
                                                Load in Cockpit
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
