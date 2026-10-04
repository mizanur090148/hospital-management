import React, { useState } from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import {
    BedDouble, ArrowLeft, ArrowRightLeft, DoorOpen, Calendar,
    Clock, Stethoscope, User, HeartPulse, Pill, FileText,
    CheckCircle2, AlertTriangle, X, ShieldAlert, Activity
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface AdmissionDossierProps {
    admission: {
        id: string;
        ipd_number: string;
        admission_type: string;
        admitting_diagnosis: string;
        initial_deposit: string;
        admitted_at: string;
        discharged_at: string | null;
        discharge_disposition: string | null;
        discharge_summary: string | null;
        status: 'ADMITTED' | 'DISCHARGED' | 'CANCELLED';
        patient: {
            id: string;
            mrn: string;
            full_name: string;
            dob: string;
            age: number | null;
            gender: string;
            blood_group: string;
            phone: string;
            allergies: Array<{ substance: string; severity: string }> | null;
        };
        attendingDoctor: {
            id: string;
            user: { name: string; email: string };
            department: { name: string };
        };
        currentBedAssignment: {
            id: string;
            assigned_at: string;
            bed: {
                id: string;
                bed_number: string;
                bed_type: string;
                daily_rate: string;
                room: {
                    room_number: string;
                    room_type: string;
                    ward: {
                        name: string;
                        code: string;
                        floor: string | null;
                        branch?: {
                            name: string;
                        };
                    };
                };
            };
        } | null;
        bedAssignments: Array<{
            id: string;
            assigned_at: string;
            released_at: string | null;
            transfer_reason: string | null;
            is_active: boolean;
            bed: {
                bed_number: string;
                bed_type: string;
                room: {
                    room_number: string;
                    room_type: string;
                    ward: {
                        name: string;
                        floor: string | null;
                        branch?: {
                            name: string;
                        };
                    };
                };
            };
        }>;
        nursingNotes: Array<{
            id: string;
            shift: string;
            notes: string;
            vitals: any;
            intake_output: any;
            created_at: string;
            nurse: {
                name: string;
            };
        }>;
        medicationAdministrations: Array<{
            id: string;
            medicine_name: string;
            dose_given: string;
            route: string;
            status: string;
            notes: string | null;
            administered_at: string;
            administeredBy: {
                name: string;
            };
        }>;
    };
    availableBeds: Array<{
        id: string;
        bed_number: string;
        bed_type: string;
        daily_rate: string;
        room: {
            room_number: string;
            room_type: string;
            ward: {
                name: string;
                code?: string;
                floor: string | null;
                branch?: {
                    name: string;
                };
            };
        };
    }>;
    dispositionOptions: string[];
}

export default function IPDShow({ admission, availableBeds, dispositionOptions }: AdmissionDossierProps) {
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'nursing' | 'mar'>('overview');

    const getCabinBadge = (type?: string) => {
        switch (type) {
            case 'cabin_vip': return { label: 'VIP Suite', color: 'bg-amber-50 text-amber-800 border-amber-300' };
            case 'cabin_deluxe': return { label: 'Deluxe Cabin', color: 'bg-purple-50 text-purple-800 border-purple-300' };
            case 'cabin_single': return { label: 'Single Cabin', color: 'bg-cyan-50 text-cyan-800 border-cyan-300' };
            case 'cabin_twin': return { label: 'Twin Cabin', color: 'bg-blue-50 text-blue-800 border-blue-300' };
            case 'cabin_non_ac': return { label: 'Non-AC Cabin', color: 'bg-slate-100 text-slate-700 border-slate-300' };
            case 'icu': return { label: 'ICU Bay', color: 'bg-rose-50 text-rose-800 border-rose-300' };
            case 'isolation': return { label: 'Isolation', color: 'bg-orange-50 text-orange-800 border-orange-300' };
            case 'general_ward': return { label: 'General Ward', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
            default: return { label: (type || 'Standard').replace('_', ' '), color: 'bg-slate-100 text-slate-700 border-slate-200' };
        }
    };

    // Transfer Bed Form
    const transferForm = useForm({
        new_bed_id: '',
        transfer_reason: 'Clinical condition upgrade / ward realignment',
    });

    // Discharge Form
    const dischargeForm = useForm({
        discharge_disposition: 'HOME',
        discharge_summary: '',
    });

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transferForm.post(`/ipd/admissions/${admission.id}/transfer-bed`, {
            onSuccess: () => {
                setIsTransferModalOpen(false);
                transferForm.reset();
            },
        });
    };

    const handleDischargeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        dischargeForm.post(`/ipd/admissions/${admission.id}/discharge`, {
            onSuccess: () => {
                setIsDischargeModalOpen(false);
            },
        });
    };

    return (
        <AppLayout title={`Inpatient Dossier - ${admission.ipd_number}`}>
            <div className="space-y-6">
                {/* Back and Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link
                        href="/ipd"
                        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Inpatient Directory
                    </Link>

                    {admission.status === 'ADMITTED' && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsTransferModalOpen(true)}
                            >
                                <ArrowRightLeft className="w-4 h-4 mr-1.5 text-cyan-600" />
                                Transfer Bed / Ward
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setIsDischargeModalOpen(true)}
                                className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                            >
                                <DoorOpen className="w-4 h-4 mr-1.5" />
                                Discharge Patient
                            </Button>
                        </div>
                    )}
                </div>

                {/* Inpatient Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700/60">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 font-extrabold flex items-center justify-center text-xl shrink-0">
                                IPD
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-2xl font-bold tracking-tight text-white">{admission.patient.full_name}</h1>
                                    <span className="font-mono text-xs font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 px-2.5 py-0.5 rounded-md">
                                        {admission.ipd_number}
                                    </span>
                                    <Badge variant={admission.status === 'ADMITTED' ? 'success' : 'secondary'}>
                                        {admission.status}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300 mt-2 font-medium">
                                    <span>MRN: <strong className="text-white font-mono">{admission.patient.mrn}</strong></span>
                                    <span>•</span>
                                    <span>{admission.patient.age} yrs • {admission.patient.gender}</span>
                                    <span>•</span>
                                    <span className="text-rose-300">Blood: <strong>{admission.patient.blood_group}</strong></span>
                                    <span>•</span>
                                    <span>Admitted: <strong>{new Date(admission.admitted_at).toLocaleDateString()}</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Current Bed Widget */}
                        {admission.currentBedAssignment ? (
                            <div className="bg-black/30 backdrop-blur-xs p-4 rounded-xl border border-white/10 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                                    <BedDouble className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold text-teal-300">Current Assigned Bed</span>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-teal-400/20 text-teal-200 border border-teal-300/30">
                                            {getCabinBadge(admission.currentBedAssignment.bed.room.room_type).label}
                                        </span>
                                    </div>
                                    <div className="font-extrabold text-base text-white">
                                        Bed {admission.currentBedAssignment.bed.bed_number}
                                        <span className="text-xs font-normal text-teal-200 ml-2">
                                            ({admission.currentBedAssignment.bed.room.room_number})
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-300">
                                        {admission.currentBedAssignment.bed.room.ward.name}
                                        {admission.currentBedAssignment.bed.room.ward.floor && ` • Floor ${admission.currentBedAssignment.bed.room.ward.floor}`}
                                        {' • '}
                                        <span className="text-teal-200">
                                            {admission.currentBedAssignment.bed.room.ward.branch?.name || 'Main Campus'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-rose-500/20 p-3 rounded-lg border border-rose-400/30 text-rose-200 text-xs">
                                Patient currently has no active bed assignment.
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'overview'
                                ? 'border-cyan-600 text-cyan-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <BedDouble className="w-4 h-4" />
                        Inpatient Overview & Bed History
                    </button>

                    <button
                        onClick={() => setActiveTab('nursing')}
                        className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'nursing'
                                ? 'border-cyan-600 text-cyan-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Activity className="w-4 h-4" />
                        Nursing Handover Notes ({admission.nursingNotes.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('mar')}
                        className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'mar'
                                ? 'border-cyan-600 text-cyan-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Pill className="w-4 h-4" />
                        Medication Administration (MAR) ({admission.medicationAdministrations.length})
                    </button>
                </div>

                {/* Tab: Inpatient Overview & Bed History */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Clinical Summary */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Stethoscope className="w-4 h-4 text-cyan-600" /> Physician Care Team
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 block font-semibold">Attending Doctor</span>
                                        <span className="font-bold text-slate-900 text-sm">Dr. {admission.attendingDoctor.user.name}</span>
                                        <span className="text-slate-500 block">{admission.attendingDoctor.department.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-semibold">Admission Type</span>
                                        <Badge variant="secondary" className="text-[11px] mt-0.5">{admission.admission_type}</Badge>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-semibold">Initial Deposit Paid</span>
                                        <span className="font-mono font-bold text-slate-800">${admission.initial_deposit}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-cyan-600" /> Admitting Diagnosis
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                                        {admission.admitting_diagnosis}
                                    </p>
                                </CardContent>
                            </Card>

                            {admission.discharge_summary && (
                                <Card className="border-rose-200 bg-rose-50/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
                                            <DoorOpen className="w-4 h-4 text-rose-700" /> Discharge Disposition
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs space-y-2">
                                        <div>
                                            <span className="text-slate-400 block">Disposition</span>
                                            <Badge variant="cyan">{admission.discharge_disposition}</Badge>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block">Summary Notes</span>
                                            <p className="text-slate-800 bg-white p-2.5 rounded border border-rose-100 mt-1">
                                                {admission.discharge_summary}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Bed Transfer & Location Audit History */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <BedDouble className="w-4 h-4 text-cyan-600" /> Bed Allocation & Movement History
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {admission.bedAssignments.length} Assignments
                                    </Badge>
                                </CardHeader>

                                <div className="divide-y divide-slate-100">
                                    {admission.bedAssignments.map((assign, idx) => (
                                        <div key={assign.id} className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                                    assign.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    #{idx + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm text-slate-900">
                                                            Bed {assign.bed.bed_number}
                                                        </span>
                                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getCabinBadge(assign.bed.room.room_type).color}`}>
                                                            {getCabinBadge(assign.bed.room.room_type).label}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            ({assign.bed.room.ward.name} - Room {assign.bed.room.room_number})
                                                        </span>
                                                        {assign.is_active && (
                                                            <Badge variant="success" className="text-[10px]">Active Bed</Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        From: {new Date(assign.assigned_at).toLocaleString()}
                                                        {assign.released_at && ` • Released: ${new Date(assign.released_at).toLocaleString()}`}
                                                    </div>
                                                    {assign.transfer_reason && (
                                                        <div className="text-[11px] text-slate-600 italic mt-0.5">
                                                            Reason: {assign.transfer_reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Tab: Nursing Care Notes */}
                {activeTab === 'nursing' && (
                    <div className="space-y-4">
                        {admission.nursingNotes.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center text-slate-400">
                                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="font-semibold text-slate-700">No nursing handover notes recorded yet</p>
                                    <p className="text-xs text-slate-400 mt-1">Open the Nursing Station tab to enter care notes.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            admission.nursingNotes.map((note) => (
                                <Card key={note.id}>
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="cyan">{note.shift} Shift</Badge>
                                            <span className="text-xs font-semibold text-slate-800">Nurse: {note.nurse.name}</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{new Date(note.created_at).toLocaleString()}</span>
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <p className="text-xs text-slate-800 whitespace-pre-line">{note.notes}</p>

                                        {note.vitals && (
                                            <div className="flex flex-wrap gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                {note.vitals.systolic && <span>BP: <strong>{note.vitals.systolic}/{note.vitals.diastolic}</strong></span>}
                                                {note.vitals.pulse_rate && <span>Pulse: <strong>{note.vitals.pulse_rate}</strong> bpm</span>}
                                                {note.vitals.spo2 && <span>SpO2: <strong>{note.vitals.spo2}%</strong></span>}
                                                {note.vitals.temperature && <span>Temp: <strong>{note.vitals.temperature}°F</strong></span>}
                                            </div>
                                        )}

                                        {note.intake_output && (
                                            <div className="text-[11px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                                                <div>Oral Intake: <strong>{note.intake_output.oral_intake_ml || 0} mL</strong></div>
                                                <div>IV Fluids: <strong>{note.intake_output.iv_fluid_ml || 0} mL</strong></div>
                                                <div>Urine Output: <strong>{note.intake_output.urine_output_ml || 0} mL</strong></div>
                                                <div>Drain Output: <strong>{note.intake_output.drain_output_ml || 0} mL</strong></div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* Tab: Medication Administration Records (MAR) */}
                {activeTab === 'mar' && (
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Timestamp</th>
                                        <th className="px-6 py-3">Medication Name</th>
                                        <th className="px-6 py-3">Dose Given</th>
                                        <th className="px-6 py-3">Route</th>
                                        <th className="px-6 py-3">Administered By</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {admission.medicationAdministrations.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                                                No MAR entries recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        admission.medicationAdministrations.map((mar) => (
                                            <tr key={mar.id}>
                                                <td className="px-6 py-3.5 font-mono">{new Date(mar.administered_at).toLocaleString()}</td>
                                                <td className="px-6 py-3.5 font-bold text-slate-900">{mar.medicine_name}</td>
                                                <td className="px-6 py-3.5">{mar.dose_given}</td>
                                                <td className="px-6 py-3.5 font-semibold text-cyan-700">{mar.route}</td>
                                                <td className="px-6 py-3.5">{mar.administeredBy.name}</td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                        mar.status === 'GIVEN' ? 'bg-emerald-100 text-emerald-800' :
                                                        mar.status === 'REFUSED' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-rose-100 text-rose-800'
                                                    }`}>
                                                        {mar.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-slate-400 italic">{mar.notes || '--'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Modal: Transfer Bed */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Bed Transfer</h2>
                                <p className="text-xs text-slate-500">Releases current bed into cleaning cycle and allocates target bed.</p>
                            </div>
                            <button onClick={() => setIsTransferModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Inpatient Bed *</label>
                                <select
                                    value={transferForm.data.new_bed_id}
                                    onChange={(e) => transferForm.setData('new_bed_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-medium"
                                    required
                                >
                                    <option value="">-- Select Available Target Bed / Cabin --</option>
                                    {availableBeds.map((b) => {
                                        const buildingName = b.room.ward.branch?.name || 'Main Facility';
                                        const cabinBadge = getCabinBadge(b.room.room_type).label;
                                        const floorInfo = b.room.ward.floor ? ` [Floor ${b.room.ward.floor}]` : '';
                                        return (
                                            <option key={b.id} value={b.id}>
                                                [{buildingName}] {b.room.ward.name}{floorInfo} ➔ {b.room.room_number} ({cabinBadge}) ➔ Bed {b.bed_number} — ${b.daily_rate}/day
                                            </option>
                                        );
                                    })}
                                </select>
                                {transferForm.errors.new_bed_id && (
                                    <p className="text-xs text-rose-500 mt-1">{transferForm.errors.new_bed_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Transfer *</label>
                                <Input
                                    value={transferForm.data.transfer_reason}
                                    onChange={(e) => transferForm.setData('transfer_reason', e.target.value)}
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={transferForm.processing || !transferForm.data.new_bed_id}>
                                    {transferForm.processing ? 'Transferring...' : 'Execute Bed Transfer'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Discharge Patient */}
            {isDischargeModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Patient Discharge</h2>
                                <p className="text-xs text-slate-500">Finalizes inpatient stay, discharges bed, and records disposition.</p>
                            </div>
                            <button onClick={() => setIsDischargeModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleDischargeSubmit} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Discharge Disposition *</label>
                                <select
                                    value={dischargeForm.data.discharge_disposition}
                                    onChange={(e) => dischargeForm.setData('discharge_disposition', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    required
                                >
                                    {dispositionOptions.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Discharge Summary & Instructions *</label>
                                <textarea
                                    rows={4}
                                    value={dischargeForm.data.discharge_summary}
                                    onChange={(e) => dischargeForm.setData('discharge_summary', e.target.value)}
                                    placeholder="Clinical course during stay, discharge medications, follow-up instructions..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    required
                                />
                                {dischargeForm.errors.discharge_summary && (
                                    <p className="text-xs text-rose-500 mt-1">{dischargeForm.errors.discharge_summary}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsDischargeModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" className="bg-rose-600 hover:bg-rose-700" disabled={dischargeForm.processing}>
                                    {dischargeForm.processing ? 'Discharging...' : 'Confirm Patient Discharge'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
