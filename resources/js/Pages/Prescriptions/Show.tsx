import React from 'react';
import { Link } from '@inertiajs/react';
import {
    ArrowLeft, Printer, Pill, HeartPulse, Building2,
    Calendar, Phone, Mail, Stethoscope, AlertTriangle
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Button } from '@/Components/ui/Button';

interface PrescriptionShowProps {
    prescription: {
        id: string;
        prescription_number: string;
        advice: string | null;
        follow_up_date: string | null;
        status: string;
        created_at: string;
        tenant: {
            trade_name: string;
            legal_name: string;
            phone?: string;
            email?: string;
        };
        doctor: {
            license_number: string;
            qualification: string;
            specialization: string;
            user: { name: string; email: string };
            department: { name: string };
        };
        patient: {
            id: string;
            mrn: string;
            full_name: string;
            age: number | null;
            dob: string;
            gender: string;
            blood_group: string;
            phone: string;
            allergies: Array<{ substance: string }> | null;
        };
        opdVisit: {
            visit_number: string;
            vitals: {
                systolic?: number;
                diastolic?: number;
                pulse_rate?: number;
                temperature?: number;
                weight_kg?: number;
                spo2?: number;
            } | null;
            diagnoses: Array<{ code: string; description: string }> | null;
        } | null;
        items: Array<{
            id: string;
            medicine_name: string;
            dosage: string;
            frequency: string;
            route: string;
            duration_days: number;
            instructions: string | null;
        }>;
    };
}

export default function PrescriptionShow({ prescription }: PrescriptionShowProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <AppLayout title={`Prescription ${prescription.prescription_number}`}>
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Actions Ribbon (Hidden during printing) */}
                <div className="print:hidden flex items-center justify-between">
                    <Link
                        href="/prescriptions"
                        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Prescriptions
                    </Link>

                    <Button
                        variant="primary"
                        onClick={handlePrint}
                        className="shadow-sm shadow-cyan-600/30"
                    >
                        <Printer className="w-4 h-4 mr-1.5" /> Print Prescription Slip
                    </Button>
                </div>

                {/* Printable Prescription Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sm:p-12 print:shadow-none print:border-none print:p-0 print:m-0 text-slate-800">
                    {/* Top Hospital Header */}
                    <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-cyan-700">
                                <Building2 className="w-6 h-6 stroke-[2.5]" />
                                <span className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                    {prescription.tenant.trade_name}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {prescription.tenant.legal_name} • Multi-Specialty Hospital & Diagnostics
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Emergency & OPD Care • 24/7 Pharmacy
                            </p>
                        </div>

                        {/* Doctor Identification */}
                        <div className="sm:text-right">
                            <h2 className="text-lg font-extrabold text-slate-900">Dr. {prescription.doctor.user.name}</h2>
                            <p className="text-xs font-bold text-cyan-800">{prescription.doctor.qualification}</p>
                            <p className="text-xs text-slate-600">{prescription.doctor.specialization} ({prescription.doctor.department.name})</p>
                            <p className="text-[11px] font-mono text-slate-400 mt-1">Medical Reg: {prescription.doctor.license_number}</p>
                        </div>
                    </div>

                    {/* Patient Master Demographics Strip */}
                    <div className="my-6 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Patient Name</span>
                            <span className="font-bold text-slate-900 text-sm">{prescription.patient.full_name}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-semibold uppercase">MRN & Age/Sex</span>
                            <span className="font-mono font-bold text-slate-800">{prescription.patient.mrn}</span>
                            <span className="text-slate-500 ml-1.5 font-medium">({prescription.patient.age}y / {prescription.patient.gender[0]})</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Blood Group & Date</span>
                            <span className="font-bold text-rose-700">{prescription.patient.blood_group}</span>
                            <span className="text-slate-500 ml-2 font-mono">{new Date(prescription.created_at).toLocaleDateString()}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Prescription #</span>
                            <span className="font-mono font-bold text-cyan-800">{prescription.prescription_number}</span>
                        </div>
                    </div>

                    {/* Clinical Summary & Vitals (if available) */}
                    {prescription.opdVisit && (
                        <div className="mb-6 p-3 bg-cyan-50/50 rounded-lg border border-cyan-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-4">
                                {prescription.opdVisit.vitals?.systolic && (
                                    <span>BP: <strong>{prescription.opdVisit.vitals.systolic}/{prescription.opdVisit.vitals.diastolic}</strong> mmHg</span>
                                )}
                                {prescription.opdVisit.vitals?.pulse_rate && (
                                    <span>Pulse: <strong>{prescription.opdVisit.vitals.pulse_rate}</strong> bpm</span>
                                )}
                                {prescription.opdVisit.vitals?.weight_kg && (
                                    <span>Weight: <strong>{prescription.opdVisit.vitals.weight_kg}</strong> kg</span>
                                )}
                            </div>

                            {prescription.opdVisit.diagnoses && prescription.opdVisit.diagnoses.length > 0 && (
                                <div className="text-xs">
                                    <span className="font-semibold text-slate-500">Diagnosis: </span>
                                    <span className="font-bold text-cyan-950">
                                        {prescription.opdVisit.diagnoses.map(d => `${d.code} (${d.description})`).join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Prescription Medications Section (Rx) */}
                    <div className="space-y-4 my-8">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <span className="font-serif font-black text-3xl text-cyan-800 italic">℞</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Prescribed Medications</span>
                        </div>

                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="py-2.5 px-3">#</th>
                                    <th className="py-2.5 px-3">Medication Name & Strength</th>
                                    <th className="py-2.5 px-3">Dosage</th>
                                    <th className="py-2.5 px-3">Frequency</th>
                                    <th className="py-2.5 px-3">Route</th>
                                    <th className="py-2.5 px-3">Duration</th>
                                    <th className="py-2.5 px-3">Instructions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {prescription.items.map((item, idx) => (
                                    <tr key={item.id}>
                                        <td className="py-3 px-3 font-semibold text-slate-400">{idx + 1}</td>
                                        <td className="py-3 px-3 font-bold text-slate-900 text-sm">{item.medicine_name}</td>
                                        <td className="py-3 px-3 font-medium text-slate-700">{item.dosage}</td>
                                        <td className="py-3 px-3 font-bold text-cyan-700 font-mono">{item.frequency}</td>
                                        <td className="py-3 px-3 text-slate-500">{item.route}</td>
                                        <td className="py-3 px-3 font-medium text-slate-800">{item.duration_days} Days</td>
                                        <td className="py-3 px-3 text-slate-600 italic">{item.instructions || 'As directed'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Advice & Follow-Up Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-xs">
                        <div>
                            <span className="font-bold uppercase text-[11px] text-slate-400 block mb-1">General Advice & Lifestyle:</span>
                            <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                {prescription.advice || 'Follow medication schedule strictly. Maintain adequate hydration and rest.'}
                            </p>
                        </div>

                        <div>
                            <span className="font-bold uppercase text-[11px] text-slate-400 block mb-1">Next Follow-Up Consultation:</span>
                            <div className="p-3 bg-cyan-50/60 rounded-lg border border-cyan-200/60 font-semibold text-cyan-900 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-cyan-700" />
                                {prescription.follow_up_date ? (
                                    <span>Please visit again on <strong>{new Date(prescription.follow_up_date).toLocaleDateString()}</strong></span>
                                ) : (
                                    <span>Review as needed or if symptoms persist.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Signature Block */}
                    <div className="mt-16 pt-8 flex justify-between items-end">
                        <div className="text-[11px] text-slate-400">
                            Generated by ApexCare Healthcare SaaS System • Electronic Prescription
                        </div>

                        <div className="text-center w-56">
                            <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
                            <span className="text-xs font-bold text-slate-900 block">Dr. {prescription.doctor.user.name}</span>
                            <span className="text-[10px] text-slate-400">Authorized Physician Signature</span>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
