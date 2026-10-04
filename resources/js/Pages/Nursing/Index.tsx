import React, { useState } from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import {
    Activity, Pill, Plus, Search, Filter, Clock,
    User, HeartPulse, BedDouble, CheckCircle2, X,
    FileText, AlertTriangle, ArrowRight, ShieldCheck
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface Inpatient {
    id: string;
    ipd_number: string;
    admitted_at: string;
    admitting_diagnosis: string;
    patient: {
        id: string;
        mrn: string;
        full_name: string;
        age: number | null;
        gender: string;
        blood_group: string;
        allergies: Array<{ substance: string }> | null;
    };
    attendingDoctor: {
        user: { name: string };
    };
    currentBedAssignment: {
        bed: {
            bed_number: string;
            bed_type: string;
            room: {
                room_number: string;
                ward: {
                    id: string;
                    name: string;
                };
            };
        };
    } | null;
    nursingNotes: Array<{
        id: string;
        shift: string;
        notes: string;
        vitals: any;
        created_at: string;
    }>;
    medicationAdministrations: Array<{
        id: string;
        medicine_name: string;
        dose_given: string;
        status: string;
        administered_at: string;
    }>;
}

interface NursingIndexProps {
    activeInpatients: Inpatient[];
    wards: Array<{ id: string; name: string; branch: { name: string } }>;
    selectedWardId: string | null;
    shifts: string[];
    marStatuses: string[];
}

export default function NursingIndex({
    activeInpatients,
    wards,
    selectedWardId,
    shifts,
    marStatuses,
}: NursingIndexProps) {
    const [noteAdmission, setNoteAdmission] = useState<Inpatient | null>(null);
    const [marAdmission, setMarAdmission] = useState<Inpatient | null>(null);

    // Form: Record Care Note
    const careNoteForm = useForm({
        shift: 'MORNING',
        notes: '',
        vitals: {
            systolic: '',
            diastolic: '',
            pulse_rate: '',
            temperature: '98.6',
            spo2: '98',
        },
        intake_output: {
            oral_intake_ml: '',
            iv_fluid_ml: '',
            urine_output_ml: '',
            drain_output_ml: '',
        },
    });

    // Form: Record MAR Entry
    const marForm = useForm({
        medicine_name: '',
        dose_given: '',
        route: 'ORAL',
        status: 'GIVEN',
        notes: '',
    });

    const handleWardFilterChange = (wardId: string) => {
        router.get('/nursing', { ward_id: wardId || undefined }, { preserveState: true });
    };

    const handleCareNoteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteAdmission) return;
        careNoteForm.post(`/nursing/${noteAdmission.id}/notes`, {
            onSuccess: () => {
                setNoteAdmission(null);
                careNoteForm.reset();
            },
        });
    };

    const handleMarSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!marAdmission) return;
        marForm.post(`/nursing/${marAdmission.id}/mar`, {
            onSuccess: () => {
                setMarAdmission(null);
                marForm.reset();
            },
        });
    };

    return (
        <AppLayout title="Inpatient Nursing Station & MAR">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <Activity className="w-6 h-6 text-cyan-600 stroke-[2.5]" />
                                Inpatient Nursing Station
                            </h1>
                            <Badge variant="cyan" className="font-semibold">{activeInpatients.length} Inpatients Charted</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Ward rounding, nursing shift handovers, intake/output monitoring, and Medication Administration Records (MAR).
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Filter by Ward:</span>
                        <select
                            value={selectedWardId || ''}
                            onChange={(e) => handleWardFilterChange(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-800"
                        >
                            <option value="">All Hospital Wards</option>
                            {wards.map((w) => (
                                <option key={w.id} value={w.id}>{w.name} ({w.branch.name})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Inpatients Bed Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeInpatients.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                            <BedDouble className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-700">No active inpatients in this ward</p>
                            <p className="text-xs text-slate-400 mt-1">Admit a patient from IPD or transfer an Emergency case to see them here.</p>
                        </div>
                    ) : (
                        activeInpatients.map((inpatient) => (
                            <Card key={inpatient.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                {/* Bed Header */}
                                <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                                            {inpatient.currentBedAssignment?.bed.bed_number || 'N/A'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs text-slate-900">
                                                {inpatient.currentBedAssignment?.bed.room.ward.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                Room {inpatient.currentBedAssignment?.bed.room.room_number} • {inpatient.ipd_number}
                                            </div>
                                        </div>
                                    </div>

                                    <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                                        {inpatient.patient.blood_group}
                                    </span>
                                </div>

                                <CardContent className="p-4 space-y-3">
                                    {/* Patient Info */}
                                    <div>
                                        <Link href={`/ipd/admissions/${inpatient.id}`} className="font-bold text-sm text-slate-900 hover:text-cyan-700">
                                            {inpatient.patient?.full_name || 'Patient'}
                                        </Link>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            MRN: {inpatient.patient?.mrn || 'N/A'} • {inpatient.patient?.age ?? '-'}y • {inpatient.patient?.gender || '-'}
                                        </div>
                                        <div className="text-xs text-slate-600 mt-1 font-medium">
                                            Attending: Dr. {inpatient.attendingDoctor?.user?.name || (inpatient as any).attending_doctor?.user?.name || 'Physician'}
                                        </div>
                                    </div>

                                    {/* Allergies Alert */}
                                    {inpatient.patient?.allergies && inpatient.patient.allergies.length > 0 && (
                                        <div className="flex items-center gap-1.5 p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            <span>Allergy: {inpatient.patient.allergies.map(a => a.substance).join(', ')}</span>
                                        </div>
                                    )}

                                    {/* Latest Vitals / Care Snippet */}
                                    {(inpatient.nursingNotes || []).length > 0 && inpatient.nursingNotes[0]?.vitals && (
                                        <div className="p-2 bg-slate-50 rounded-lg text-xs grid grid-cols-3 gap-1 text-center font-medium">
                                            <div>BP: <strong className="text-slate-800">{inpatient.nursingNotes[0].vitals.systolic}/{inpatient.nursingNotes[0].vitals.diastolic}</strong></div>
                                            <div>Pulse: <strong className="text-slate-800">{inpatient.nursingNotes[0].vitals.pulse_rate}</strong></div>
                                            <div>SpO2: <strong className="text-slate-800">{inpatient.nursingNotes[0].vitals.spo2}%</strong></div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7 flex-1"
                                            onClick={() => setNoteAdmission(inpatient)}
                                        >
                                            <Activity className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Care Note
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            className="text-xs h-7 flex-1"
                                            onClick={() => setMarAdmission(inpatient)}
                                        >
                                            <Pill className="w-3.5 h-3.5 mr-1" /> Administer (MAR)
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Modal: Record Nursing Care Note */}
            {noteAdmission && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Record Nursing Handover Note</h2>
                                <p className="text-xs text-slate-500">Patient: {noteAdmission.patient.full_name} ({noteAdmission.ipd_number})</p>
                            </div>
                            <button onClick={() => setNoteAdmission(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCareNoteSubmit} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Selection *</label>
                                <select
                                    value={careNoteForm.data.shift}
                                    onChange={(e) => careNoteForm.setData('shift', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                >
                                    <option value="MORNING">Morning Shift (07:00 - 15:00)</option>
                                    <option value="EVENING">Evening Shift (15:00 - 23:00)</option>
                                    <option value="NIGHT">Night Shift (23:00 - 07:00)</option>
                                </select>
                            </div>

                            {/* Vitals Recording */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Current Shift Vitals
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    <Input
                                        placeholder="BP Sys"
                                        value={careNoteForm.data.vitals.systolic}
                                        onChange={(e) => careNoteForm.setData('vitals', { ...careNoteForm.data.vitals, systolic: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="BP Dia"
                                        value={careNoteForm.data.vitals.diastolic}
                                        onChange={(e) => careNoteForm.setData('vitals', { ...careNoteForm.data.vitals, diastolic: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="Pulse"
                                        value={careNoteForm.data.vitals.pulse_rate}
                                        onChange={(e) => careNoteForm.setData('vitals', { ...careNoteForm.data.vitals, pulse_rate: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="SpO2 %"
                                        value={careNoteForm.data.vitals.spo2}
                                        onChange={(e) => careNoteForm.setData('vitals', { ...careNoteForm.data.vitals, spo2: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                    <Input
                                        placeholder="Temp °F"
                                        value={careNoteForm.data.vitals.temperature}
                                        onChange={(e) => careNoteForm.setData('vitals', { ...careNoteForm.data.vitals, temperature: e.target.value })}
                                        className="h-8 text-xs font-bold"
                                    />
                                </div>
                            </div>

                            {/* Intake & Output */}
                            <div className="p-3 bg-cyan-50/40 rounded-xl border border-cyan-100">
                                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-900 mb-2">
                                    Intake & Output Balance (mL)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <Input
                                        placeholder="Oral (mL)"
                                        type="number"
                                        value={careNoteForm.data.intake_output.oral_intake_ml}
                                        onChange={(e) => careNoteForm.setData('intake_output', { ...careNoteForm.data.intake_output, oral_intake_ml: e.target.value })}
                                        className="h-8 text-xs bg-white"
                                    />
                                    <Input
                                        placeholder="IV Fluids (mL)"
                                        type="number"
                                        value={careNoteForm.data.intake_output.iv_fluid_ml}
                                        onChange={(e) => careNoteForm.setData('intake_output', { ...careNoteForm.data.intake_output, iv_fluid_ml: e.target.value })}
                                        className="h-8 text-xs bg-white"
                                    />
                                    <Input
                                        placeholder="Urine (mL)"
                                        type="number"
                                        value={careNoteForm.data.intake_output.urine_output_ml}
                                        onChange={(e) => careNoteForm.setData('intake_output', { ...careNoteForm.data.intake_output, urine_output_ml: e.target.value })}
                                        className="h-8 text-xs bg-white"
                                    />
                                    <Input
                                        placeholder="Drain (mL)"
                                        type="number"
                                        value={careNoteForm.data.intake_output.drain_output_ml}
                                        onChange={(e) => careNoteForm.setData('intake_output', { ...careNoteForm.data.intake_output, drain_output_ml: e.target.value })}
                                        className="h-8 text-xs bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Nursing Observations & Care Notes *</label>
                                <textarea
                                    rows={3}
                                    value={careNoteForm.data.notes}
                                    onChange={(e) => careNoteForm.setData('notes', e.target.value)}
                                    placeholder="Patient comfort, wound dressings, IV site condition, ambulation..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    required
                                />
                                {careNoteForm.errors.notes && <p className="text-xs text-rose-500 mt-1">{careNoteForm.errors.notes}</p>}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setNoteAdmission(null)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={careNoteForm.processing}>
                                    {careNoteForm.processing ? 'Saving...' : 'Save Shift Care Note'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Administer Medication (MAR) */}
            {marAdmission && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                                    <Pill className="w-5 h-5 text-cyan-600" />
                                    Medication Administration (MAR)
                                </h2>
                                <p className="text-xs text-slate-500">Patient: {marAdmission.patient.full_name}</p>
                            </div>
                            <button onClick={() => setMarAdmission(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleMarSubmit} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Medication Name & Strength *</label>
                                <Input
                                    value={marForm.data.medicine_name}
                                    onChange={(e) => marForm.setData('medicine_name', e.target.value)}
                                    placeholder="e.g. Ceftriaxone 1g IV or Enoxaparin 40mg"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dose Given *</label>
                                    <Input
                                        value={marForm.data.dose_given}
                                        onChange={(e) => marForm.setData('dose_given', e.target.value)}
                                        placeholder="e.g. 1 Vial / 1 Tab"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Route *</label>
                                    <select
                                        value={marForm.data.route}
                                        onChange={(e) => marForm.setData('route', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    >
                                        <option value="ORAL">Oral</option>
                                        <option value="IV">Intravenous (IV)</option>
                                        <option value="IM">Intramuscular (IM)</option>
                                        <option value="SC">Subcutaneous (SC)</option>
                                        <option value="INHALATION">Inhalation</option>
                                        <option value="TOPICAL">Topical</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Administration Status *</label>
                                <select
                                    value={marForm.data.status}
                                    onChange={(e) => marForm.setData('status', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 font-semibold"
                                >
                                    <option value="GIVEN">Given / Administered</option>
                                    <option value="REFUSED">Patient Refused</option>
                                    <option value="HELD">Held on Clinical Judgment</option>
                                    <option value="MISSED">Missed Dose</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Nurse Notes</label>
                                <Input
                                    value={marForm.data.notes}
                                    onChange={(e) => marForm.setData('notes', e.target.value)}
                                    placeholder="Patient tolerated well, no adverse reactions..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setMarAdmission(null)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={marForm.processing}>
                                    {marForm.processing ? 'Recording...' : 'Confirm MAR Administration'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
