import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    Users, Calendar, Activity, Pill, AlertTriangle, HeartPulse,
    Phone, Mail, MapPin, ShieldAlert, ArrowLeft, Clock, Stethoscope,
    FileText, CheckCircle2, ChevronRight, AlertCircle, Plus
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';

interface PatientDossierProps {
    patient: {
        id: string;
        mrn: string;
        first_name: string;
        last_name: string;
        full_name: string;
        dob: string;
        age: number | null;
        gender: string;
        blood_group: string;
        phone: string;
        email: string | null;
        national_id: string | null;
        status: string;
        allergies: Array<{ substance: string; severity: string; reaction?: string }> | null;
        chronic_conditions: Array<{ condition: string; diagnosed_year?: number; notes?: string }> | null;
        emergency_contact: { name?: string; relationship?: string; phone?: string } | null;
        address: { street?: string; city?: string; state?: string; country?: string } | null;
        created_at: string;
        appointments: Array<{
            id: string;
            appointment_number: string;
            appointment_date: string;
            start_time: string;
            type: string;
            status: string;
            reason_for_visit: string | null;
            doctor: {
                user: { name: string };
                department: { name: string };
            };
        }>;
        opdVisits: Array<{
            id: string;
            visit_number: string;
            chief_complaint: string;
            clinical_notes: string | null;
            status: string;
            arrived_at: string;
            completed_at: string | null;
            vitals: {
                systolic?: number;
                diastolic?: number;
                pulse_rate?: number;
                temperature?: number;
                spo2?: number;
                bmi?: number;
                weight_kg?: number;
                height_cm?: number;
            } | null;
            diagnoses: Array<{ code: string; description: string; is_primary?: boolean }> | null;
            doctor: {
                user: { name: string };
            };
            prescriptions: Array<{
                id: string;
                prescription_number: string;
                items: Array<{
                    medicine_name: string;
                    dosage: string;
                    frequency: string;
                    duration_days: number;
                    instructions?: string;
                }>;
            }>;
        }>;
        prescriptions: Array<{
            id: string;
            prescription_number: string;
            follow_up_date: string | null;
            advice: string | null;
            status: string;
            created_at: string;
            doctor: {
                user: { name: string };
            };
            items: Array<{
                id: string;
                medicine_name: string;
                dosage: string;
                frequency: string;
                duration_days: number;
                instructions?: string;
            }>;
        }>;
    };
}

export default function PatientShow({ patient }: PatientDossierProps) {
    const [activeTab, setActiveTab] = useState<'timeline' | 'prescriptions' | 'appointments'>('timeline');

    return (
        <AppLayout title={`${patient.full_name} (${patient.mrn}) - Patient Dossier`}>
            <div className="space-y-6">
                {/* Back button and quick actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link
                        href="/patients"
                        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Patient Directory
                    </Link>

                    <div className="flex items-center gap-2">
                        <Link href={`/appointments?patient_id=${patient.id}`}>
                            <Button variant="outline" size="sm">
                                <Calendar className="w-4 h-4 mr-1.5" /> Book Appointment
                            </Button>
                        </Link>
                        <Link href={`/opd?patient_id=${patient.id}`}>
                            <Button variant="primary" size="sm" className="shadow-xs shadow-cyan-600/30">
                                <Activity className="w-4 h-4 mr-1.5" /> Start OPD Consultation
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Patient Master Profile Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-extrabold flex items-center justify-center text-xl shadow-inner shrink-0">
                                {patient.first_name[0]}{patient.last_name[0]}
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h1 className="text-2xl font-bold tracking-tight text-white">{patient.full_name}</h1>
                                    <span className="font-mono text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-2.5 py-0.5 rounded-md">
                                        {patient.mrn}
                                    </span>
                                    <Badge variant={patient.status === 'ACTIVE' ? 'success' : 'secondary'}>
                                        {patient.status}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300 mt-2 font-medium">
                                    <span>Age: <strong className="text-white">{patient.age} yrs</strong></span>
                                    <span>•</span>
                                    <span>DOB: <strong className="text-white">{patient.dob}</strong></span>
                                    <span>•</span>
                                    <span>Gender: <strong className="text-white capitalize">{patient.gender.toLowerCase()}</strong></span>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1 text-rose-300">
                                        <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                                        Blood: <strong className="text-rose-200">{patient.blood_group}</strong>
                                    </span>
                                    {patient.national_id && (
                                        <>
                                            <span>•</span>
                                            <span>ID: <strong className="text-white">{patient.national_id}</strong></span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Critical Allergies Ribbon */}
                        <div className="flex flex-col gap-1.5 bg-black/30 backdrop-blur-xs p-3.5 rounded-xl border border-white/10 max-w-sm">
                            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                                <AlertTriangle className="w-3.5 h-3.5" /> High-Risk Allergies
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {patient.allergies && patient.allergies.length > 0 ? (
                                    patient.allergies.map((al, idx) => (
                                        <span key={idx} className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30">
                                            {al.substance} ({al.severity})
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400">No drug or food allergies on record.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 360 Information Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Demographics, Contacts & Medical Alerts */}
                    <div className="space-y-6">
                        {/* Contact & Demographics */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-cyan-600" /> Contact & Residence
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Primary Phone</span>
                                    <span className="font-semibold text-slate-800">{patient.phone}</span>
                                </div>
                                {patient.email && (
                                    <div>
                                        <span className="text-slate-400 block">Email</span>
                                        <span className="font-semibold text-slate-800">{patient.email}</span>
                                    </div>
                                )}
                                {patient.address && (
                                    <div>
                                        <span className="text-slate-400 block">Address</span>
                                        <span className="font-medium text-slate-700">
                                            {[patient.address.street, patient.address.city, patient.address.state, patient.address.country].filter(Boolean).join(', ') || 'N/A'}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Emergency Contact */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-rose-600" /> Emergency Contact
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs">
                                {patient.emergency_contact?.name ? (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Name</span>
                                            <span className="font-semibold text-slate-800">{patient.emergency_contact.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Relationship</span>
                                            <span className="font-medium text-slate-700">{patient.emergency_contact.relationship || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Phone</span>
                                            <span className="font-mono font-semibold text-cyan-700">{patient.emergency_contact.phone || 'N/A'}</span>
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-slate-400 italic">No emergency contact provided.</span>
                                )}
                            </CardContent>
                        </Card>

                        {/* Chronic Conditions */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <HeartPulse className="w-4 h-4 text-cyan-600" /> Chronic Conditions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {patient.chronic_conditions && patient.chronic_conditions.length > 0 ? (
                                    <div className="space-y-2">
                                        {patient.chronic_conditions.map((item, idx) => (
                                            <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-start justify-between">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-800">{item.condition}</div>
                                                    {item.notes && <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>}
                                                </div>
                                                {item.diagnosed_year && (
                                                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                                        Since {item.diagnosed_year}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No chronic medical conditions recorded.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Columns (2 spans): Clinical Encounters, Prescriptions & Appointments Tabs */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Tab Switcher */}
                        <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                                    activeTab === 'timeline'
                                        ? 'border-cyan-600 text-cyan-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Activity className="w-4 h-4" />
                                Clinical Consultations ({patient.opdVisits.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('prescriptions')}
                                className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                                    activeTab === 'prescriptions'
                                        ? 'border-cyan-600 text-cyan-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Pill className="w-4 h-4" />
                                Prescriptions ({patient.prescriptions.length})
                            </button>

                            <button
                                onClick={() => setActiveTab('appointments')}
                                className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                                    activeTab === 'appointments'
                                        ? 'border-cyan-600 text-cyan-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Calendar className="w-4 h-4" />
                                Appointments ({patient.appointments.length})
                            </button>
                        </div>

                        {/* Tab: Clinical Consultations Timeline */}
                        {activeTab === 'timeline' && (
                            <div className="space-y-4">
                                {patient.opdVisits.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-8 text-center text-slate-400">
                                            <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                            <p className="font-semibold text-slate-700">No clinical consultations yet</p>
                                            <p className="text-xs text-slate-400 mt-1">Start an OPD consultation from the button above to record vitals and diagnosis.</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    patient.opdVisits.map((visit) => (
                                        <Card key={visit.id} className="overflow-hidden">
                                            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-100/60 px-2 py-0.5 rounded">
                                                        {visit.visit_number}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-700">
                                                        Attending: Dr. {visit.doctor.user.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(visit.arrived_at).toLocaleDateString()}
                                                    </span>
                                                    <Badge variant={visit.status === 'COMPLETED' ? 'success' : 'warning'}>
                                                        {visit.status}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <CardContent className="p-4 space-y-4">
                                                {/* Chief Complaint */}
                                                <div>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Chief Complaint</span>
                                                    <p className="text-sm font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                        {visit.chief_complaint}
                                                    </p>
                                                </div>

                                                {/* Vitals Ribbon */}
                                                {visit.vitals && (
                                                    <div>
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 block mb-1.5">Recorded Vitals</span>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                            {visit.vitals.systolic && visit.vitals.diastolic && (
                                                                <div className="p-2 bg-slate-50 rounded-lg text-center border border-slate-200/60">
                                                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Blood Pressure</div>
                                                                    <div className="text-sm font-bold text-slate-800">{visit.vitals.systolic}/{visit.vitals.diastolic} <span className="text-[10px] font-normal text-slate-500">mmHg</span></div>
                                                                </div>
                                                            )}
                                                            {visit.vitals.pulse_rate && (
                                                                <div className="p-2 bg-slate-50 rounded-lg text-center border border-slate-200/60">
                                                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Heart Rate</div>
                                                                    <div className="text-sm font-bold text-slate-800">{visit.vitals.pulse_rate} <span className="text-[10px] font-normal text-slate-500">bpm</span></div>
                                                                </div>
                                                            )}
                                                            {visit.vitals.spo2 && (
                                                                <div className="p-2 bg-slate-50 rounded-lg text-center border border-slate-200/60">
                                                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Oxygen SpO2</div>
                                                                    <div className="text-sm font-bold text-slate-800">{visit.vitals.spo2} <span className="text-[10px] font-normal text-slate-500">%</span></div>
                                                                </div>
                                                            )}
                                                            {visit.vitals.temperature && (
                                                                <div className="p-2 bg-slate-50 rounded-lg text-center border border-slate-200/60">
                                                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Temperature</div>
                                                                    <div className="text-sm font-bold text-slate-800">{visit.vitals.temperature} <span className="text-[10px] font-normal text-slate-500">°F</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Diagnoses ICD-10 */}
                                                {visit.diagnoses && visit.diagnoses.length > 0 && (
                                                    <div>
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">ICD-10 Diagnoses</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {visit.diagnoses.map((dx, i) => (
                                                                <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium bg-cyan-50 text-cyan-800 border border-cyan-200 px-2.5 py-1 rounded-md">
                                                                    <strong className="font-mono text-cyan-900">{dx.code}:</strong> {dx.description}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Clinical Notes */}
                                                {visit.clinical_notes && (
                                                    <div>
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Clinical Notes</span>
                                                        <p className="text-xs text-slate-700 whitespace-pre-line bg-slate-50/50 p-2 rounded border border-slate-100">
                                                            {visit.clinical_notes}
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Tab: Prescriptions Pad */}
                        {activeTab === 'prescriptions' && (
                            <div className="space-y-4">
                                {patient.prescriptions.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-8 text-center text-slate-400">
                                            <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                            <p className="font-semibold text-slate-700">No prescriptions issued yet</p>
                                            <p className="text-xs text-slate-400 mt-1">Prescriptions will be recorded during or after OPD consultations.</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    patient.prescriptions.map((rx) => (
                                        <Card key={rx.id}>
                                            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-100/60 px-2 py-0.5 rounded">
                                                        {rx.prescription_number}
                                                    </span>
                                                    <span className="text-xs text-slate-600">Prescribed by Dr. {rx.doctor.user.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400">{new Date(rx.created_at).toLocaleDateString()}</span>
                                                    <Link href={`/prescriptions/${rx.id}`}>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs">
                                                            View / Print
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>

                                            <CardContent className="p-4">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                        <tr>
                                                            <th className="py-2 px-3">Medicine</th>
                                                            <th className="py-2 px-3">Dosage</th>
                                                            <th className="py-2 px-3">Frequency</th>
                                                            <th className="py-2 px-3">Duration</th>
                                                            <th className="py-2 px-3">Instructions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {rx.items.map((item) => (
                                                            <tr key={item.id}>
                                                                <td className="py-2.5 px-3 font-bold text-slate-800">{item.medicine_name}</td>
                                                                <td className="py-2.5 px-3">{item.dosage}</td>
                                                                <td className="py-2.5 px-3 font-semibold text-cyan-700">{item.frequency}</td>
                                                                <td className="py-2.5 px-3">{item.duration_days} days</td>
                                                                <td className="py-2.5 px-3 text-slate-500">{item.instructions || 'As advised'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                {rx.advice && (
                                                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                                                        <span className="font-semibold text-slate-700">General Advice: </span>
                                                        <span className="text-slate-600">{rx.advice}</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Tab: Appointments History */}
                        {activeTab === 'appointments' && (
                            <div className="space-y-3">
                                {patient.appointments.length === 0 ? (
                                    <Card>
                                        <CardContent className="p-8 text-center text-slate-400">
                                            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                            <p className="font-semibold text-slate-700">No appointments scheduled</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    patient.appointments.map((apt) => (
                                        <Card key={apt.id} className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                                    <Calendar className="w-5 h-5 text-cyan-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm text-slate-900">Dr. {apt.doctor.user.name}</span>
                                                        <span className="text-xs text-slate-500 font-normal">({apt.doctor.department.name})</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        {apt.appointment_date} at {apt.start_time} • {apt.type} • {apt.appointment_number}
                                                    </div>
                                                </div>
                                            </div>

                                            <Badge variant={apt.status === 'COMPLETED' ? 'success' : apt.status === 'CANCELLED' ? 'danger' : 'cyan'}>
                                                {apt.status}
                                            </Badge>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
