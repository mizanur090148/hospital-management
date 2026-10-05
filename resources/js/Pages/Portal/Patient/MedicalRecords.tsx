import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { 
    Calendar, HeartPulse, Pill, FlaskConical, Receipt, 
    ScanLine, BedDouble, FileText, Printer, CheckCircle2, 
    AlertTriangle, ShieldCheck, UserCheck, X, Eye, Stethoscope, Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';

interface PrescriptionItem {
    id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    route?: string;
    duration_days: number;
    instructions?: string;
}

interface Prescription {
    id: string;
    prescription_number: string;
    created_at: string;
    advice?: string;
    follow_up_date?: string;
    items?: PrescriptionItem[];
    doctor?: {
        qualification?: string;
        specialization?: string;
        user?: { name: string; email: string };
        department?: { name: string };
    };
}

interface LabResult {
    id: string;
    parameter_name: string;
    observed_value: string;
    unit?: string;
    reference_range?: string;
    is_abnormal: boolean;
    is_panic_critical: boolean;
    interpretation?: string;
}

interface LabOrderItem {
    id: string;
    test_name: string;
    status: string;
    template?: { category?: string };
    results?: LabResult[];
}

interface LabOrder {
    id: string;
    order_number: string;
    ordered_at: string;
    priority: string;
    status: string;
    clinical_notes?: string;
    items?: LabOrderItem[];
    ordering_doctor?: { user?: { name: string } };
}

interface RadiologyOrder {
    id: string;
    order_number: string;
    ordered_at: string;
    priority: string;
    clinical_indication?: string;
    findings?: string;
    impression?: string;
    radiologist_notes?: string;
    dicom_preview_url?: string;
    verified_at?: string;
    status: string;
    template?: {
        name: string;
        modality: string;
    };
    ordering_doctor?: { user?: { name: string } };
    reporting_doctor?: { user?: { name: string } };
}

interface Admission {
    id: string;
    ipd_number: string;
    admitted_at: string;
    discharged_at?: string;
    admission_type: string;
    admitting_diagnosis: string;
    discharge_summary?: string;
    status: string;
    attending_doctor?: { user?: { name: string } };
    admitting_department?: { name: string };
}

interface Props {
    patient: {
        id: string;
        mrn: string;
        full_name: string;
        age: number | null;
        gender: string;
        blood_group: string;
        phone: string;
    };
    prescriptions: Prescription[];
    labOrders: LabOrder[];
    radiologyOrders: RadiologyOrder[];
    admissions: Admission[];
}

export default function MedicalRecords({
    patient,
    prescriptions,
    labOrders,
    radiologyOrders,
    admissions,
}: Props) {
    const [activeTab, setActiveTab] = useState<'rx' | 'lab' | 'rad' | 'ipd'>('rx');
    const [viewRxModal, setViewRxModal] = useState<Prescription | null>(null);

    return (
        <AppLayout title="Medical Dossier & Clinical History">
            <Head title="Clinical Records - Patient Portal" />

            <div className="space-y-6">
                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 rounded-xl shadow-xs overflow-x-auto">
                    <Link
                        href="/portal/patient"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <HeartPulse className="w-4 h-4 text-slate-500" />
                        Dashboard
                    </Link>
                    <Link
                        href="/portal/patient/appointments"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <Calendar className="w-4 h-4 text-slate-500" />
                        Appointments
                    </Link>
                    <Link
                        href="/portal/patient/medical-records"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 shadow-xs"
                    >
                        <Pill className="w-4 h-4 text-teal-600" />
                        Prescriptions & Lab Reports
                    </Link>
                    <Link
                        href="/portal/patient/billing"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <Receipt className="w-4 h-4 text-slate-500" />
                        Invoices & Receipts
                    </Link>
                </div>

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Personal Health Dossier</h1>
                        <p className="text-sm text-slate-500">
                            Immutable electronic medical records, diagnostic laboratory results, and imaging scans.
                        </p>
                    </div>
                </div>

                {/* Segmented Category Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setActiveTab('rx')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            activeTab === 'rx'
                                ? 'bg-emerald-600 text-white shadow-emerald-200'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <Pill className="w-4 h-4" />
                        Electronic Prescriptions ({prescriptions.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('lab')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            activeTab === 'lab'
                                ? 'bg-purple-600 text-white shadow-purple-200'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <FlaskConical className="w-4 h-4" />
                        Laboratory & Pathology ({labOrders.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('rad')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            activeTab === 'rad'
                                ? 'bg-cyan-600 text-white shadow-cyan-200'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <ScanLine className="w-4 h-4" />
                        Radiology & Imaging ({radiologyOrders.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('ipd')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            activeTab === 'ipd'
                                ? 'bg-indigo-600 text-white shadow-indigo-200'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <BedDouble className="w-4 h-4" />
                        Hospital Inpatient Stays ({admissions.length})
                    </button>
                </div>

                {/* TAB 1: Electronic Prescriptions */}
                {activeTab === 'rx' && (
                    <div className="space-y-4">
                        {prescriptions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {prescriptions.map((rx) => (
                                    <Card key={rx.id} className="border-emerald-200/80 hover:shadow-md transition-all">
                                        <CardHeader className="border-b border-slate-100 pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                        #{rx.prescription_number}
                                                    </span>
                                                    <span className="text-2xs text-slate-500">
                                                        {new Date(rx.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setViewRxModal(rx)}
                                                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs py-1 px-2.5 flex items-center gap-1"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> View Rx Slip
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-3">
                                            <div className="flex items-center gap-2 text-xs text-slate-700">
                                                <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <span>
                                                    Prescribed by <strong>Dr. {rx.doctor?.user?.name ?? 'Specialist'}</strong> ({rx.doctor?.department?.name})
                                                </span>
                                            </div>

                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                                <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Medications Prescribed ({rx.items?.length || 0}):
                                                </div>
                                                <ul className="text-xs space-y-1.5 divide-y divide-slate-100">
                                                    {rx.items?.map((item) => (
                                                        <li key={item.id} className="pt-1.5 first:pt-0 flex items-start justify-between">
                                                            <div>
                                                                <span className="font-bold text-slate-900">{item.medicine_name}</span>
                                                                <div className="text-2xs text-slate-500">
                                                                    {item.dosage} • {item.frequency} • {item.duration_days} days
                                                                </div>
                                                            </div>
                                                            {item.instructions && (
                                                                <span className="text-2xs italic text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                                                    {item.instructions}
                                                                </span>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {rx.advice && (
                                                <div className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                                                    <strong>Physician Advice:</strong> {rx.advice}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="p-8 text-center text-xs text-slate-500">
                                No electronic prescriptions available in your record.
                            </Card>
                        )}
                    </div>
                )}

                {/* TAB 2: Laboratory & Pathology Reports */}
                {activeTab === 'lab' && (
                    <div className="space-y-4">
                        {labOrders.length > 0 ? (
                            <div className="space-y-4">
                                {labOrders.map((order) => (
                                    <Card key={order.id} className="border-purple-200/80">
                                        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                                                    #{order.order_number}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">
                                                        {order.items?.map(i => i.test_name).join(', ')}
                                                    </div>
                                                    <div className="text-2xs text-slate-500">
                                                        Ordered by Dr. {order.ordering_doctor?.user?.name ?? 'Attending Doctor'} on {new Date(order.ordered_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                                {order.status}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            {order.items?.map((item) => (
                                                <div key={item.id} className="space-y-3">
                                                    {item.results && item.results.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-slate-50 text-2xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                                                    <tr>
                                                                        <th className="py-2 px-3">Test Parameter</th>
                                                                        <th className="py-2 px-3">Observed Value</th>
                                                                        <th className="py-2 px-3">Reference Range</th>
                                                                        <th className="py-2 px-3">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {item.results.map((res) => (
                                                                        <tr key={res.id} className={res.is_panic_critical || res.is_abnormal ? 'bg-rose-50/50' : ''}>
                                                                            <td className="py-2 px-3 font-medium text-slate-800">
                                                                                {res.parameter_name}
                                                                            </td>
                                                                            <td className="py-2 px-3 font-bold text-slate-900">
                                                                                {res.observed_value} <span className="text-2xs text-slate-500 font-normal">{res.unit}</span>
                                                                            </td>
                                                                            <td className="py-2 px-3 text-slate-600 font-mono text-2xs">
                                                                                {res.reference_range || 'Normal Adult'}
                                                                            </td>
                                                                            <td className="py-2 px-3">
                                                                                {res.is_panic_critical ? (
                                                                                    <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-2xs">
                                                                                        🚨 Critical Panic
                                                                                    </span>
                                                                                ) : res.is_abnormal ? (
                                                                                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-2xs">
                                                                                        ⚠️ Abnormal
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-2xs font-semibold">
                                                                                        ✓ Within Limits
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-500 italic py-2">
                                                            Pathology laboratory sample processed. Formal values pending validation.
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="p-8 text-center text-xs text-slate-500">
                                No diagnostic laboratory orders found.
                            </Card>
                        )}
                    </div>
                )}

                {/* TAB 3: Radiology & Imaging Reports */}
                {activeTab === 'rad' && (
                    <div className="space-y-4">
                        {radiologyOrders.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {radiologyOrders.map((scan) => (
                                    <Card key={scan.id} className="border-cyan-200/80">
                                        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                                        #{scan.order_number}
                                                    </span>
                                                    <Badge variant="outline" className="text-2xs bg-slate-50">
                                                        {scan.template?.modality || 'Imaging'}
                                                    </Badge>
                                                </div>
                                                <h3 className="font-bold text-slate-900 text-sm mt-1">
                                                    {scan.template?.name || 'Diagnostic Radiology Scan'}
                                                </h3>
                                            </div>
                                            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 text-xs">
                                                {scan.status}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-3 text-xs">
                                            {scan.clinical_indication && (
                                                <div className="text-slate-600">
                                                    <span className="font-semibold text-slate-700">Indication:</span> {scan.clinical_indication}
                                                </div>
                                            )}

                                            {scan.findings && (
                                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                    <div className="font-semibold text-slate-800 mb-0.5">Radiologist Findings:</div>
                                                    <p className="text-slate-700 leading-relaxed">{scan.findings}</p>
                                                </div>
                                            )}

                                            {scan.impression && (
                                                <div className="bg-cyan-50/60 p-2.5 rounded-lg border border-cyan-200/60">
                                                    <div className="font-semibold text-cyan-900 mb-0.5">Impression:</div>
                                                    <p className="text-cyan-800 font-medium">{scan.impression}</p>
                                                </div>
                                            )}

                                            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-2xs text-slate-500">
                                                <span>Verified by: Dr. {scan.reporting_doctor?.user?.name ?? 'Radiologist'}</span>
                                                {scan.dicom_preview_url && (
                                                    <a
                                                        href={scan.dicom_preview_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
                                                    >
                                                        <ScanLine className="w-3.5 h-3.5" /> DICOM PACS Viewer
                                                    </a>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="p-8 text-center text-xs text-slate-500">
                                No radiology imaging studies requested.
                            </Card>
                        )}
                    </div>
                )}

                {/* TAB 4: Inpatient Hospital Stays (IPD) */}
                {activeTab === 'ipd' && (
                    <div className="space-y-4">
                        {admissions.length > 0 ? (
                            <div className="space-y-4">
                                {admissions.map((adm) => (
                                    <Card key={adm.id} className="border-indigo-200/80">
                                        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                                                    #{adm.ipd_number}
                                                </span>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">
                                                        {adm.admitting_department?.name || 'Inpatient Pavilion'}
                                                    </div>
                                                    <div className="text-2xs text-slate-500">
                                                        Attending: Dr. {adm.attending_doctor?.user?.name ?? 'Lead Physician'}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                                                {adm.status}
                                            </Badge>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-2 text-xs">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                                <div>
                                                    <span className="text-2xs text-slate-500 uppercase">Admitted On:</span>
                                                    <div className="font-medium text-slate-900">{new Date(adm.admitted_at).toLocaleDateString()}</div>
                                                </div>
                                                <div>
                                                    <span className="text-2xs text-slate-500 uppercase">Discharged On:</span>
                                                    <div className="font-medium text-slate-900">
                                                        {adm.discharged_at ? new Date(adm.discharged_at).toLocaleDateString() : 'Active Inpatient'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-2xs text-slate-500 uppercase">Admission Type:</span>
                                                    <div className="font-medium text-slate-900">{adm.admission_type}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <span className="font-semibold text-slate-700">Admitting Diagnosis:</span> {adm.admitting_diagnosis}
                                            </div>

                                            {adm.discharge_summary && (
                                                <div className="bg-white p-3 rounded-lg border border-slate-200 mt-2">
                                                    <div className="font-semibold text-slate-900 mb-1">Formal Discharge Summary:</div>
                                                    <p className="text-slate-700 whitespace-pre-line text-xs">{adm.discharge_summary}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="p-8 text-center text-xs text-slate-500">
                                No previous inpatient hospital admissions on record.
                            </Card>
                        )}
                    </div>
                )}

                {/* Printable Prescription Modal Dialog */}
                {viewRxModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
                        <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
                            {/* Prescription Header */}
                            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                                <div className="space-y-1">
                                    <div className="text-xs uppercase font-extrabold tracking-wider text-teal-700">
                                        St. Jude Healthcare Global • Medical Center
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900">Electronic Prescription Slip</h2>
                                    <div className="font-mono text-xs text-slate-500">
                                        Prescription #: {viewRxModal.prescription_number} • Date: {new Date(viewRxModal.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setViewRxModal(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Patient & Doctor Dossier Banner */}
                            <div className="grid grid-cols-2 gap-4 bg-teal-50/60 p-3.5 rounded-xl border border-teal-100 text-xs">
                                <div>
                                    <div className="text-2xs uppercase text-teal-800 font-semibold">Patient Information:</div>
                                    <div className="font-bold text-slate-900 text-sm">{patient.full_name}</div>
                                    <div className="text-slate-600">MRN: {patient.mrn} • Age: {patient.age ?? 'Adult'} • Blood: {patient.blood_group}</div>
                                </div>
                                <div>
                                    <div className="text-2xs uppercase text-teal-800 font-semibold">Prescribing Physician:</div>
                                    <div className="font-bold text-slate-900 text-sm">Dr. {viewRxModal.doctor?.user?.name}</div>
                                    <div className="text-slate-600">{viewRxModal.doctor?.department?.name} • {viewRxModal.doctor?.specialization}</div>
                                </div>
                            </div>

                            {/* Medications Table */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                                    <Pill className="w-4 h-4 text-emerald-600" /> Prescribed Medications (Rx)
                                </div>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-2xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="py-2.5 px-3">Medicine</th>
                                                <th className="py-2.5 px-3">Dosage & Frequency</th>
                                                <th className="py-2.5 px-3">Duration</th>
                                                <th className="py-2.5 px-3">Instructions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {viewRxModal.items?.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                    <td className="py-2.5 px-3 font-bold text-slate-900">
                                                        {item.medicine_name}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-700">
                                                        {item.dosage} • {item.frequency}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                                                        {item.duration_days} days
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-600 text-2xs italic">
                                                        {item.instructions || 'As advised'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Advice & Follow Up */}
                            {viewRxModal.advice && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                                    <span className="font-semibold text-slate-800">Special Instructions & Advice:</span>
                                    <p className="text-slate-700 mt-0.5">{viewRxModal.advice}</p>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                <span className="text-2xs text-slate-400 font-mono">
                                    Digitally signed with cryptographic audit stamp
                                </span>
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => window.print()}
                                        className="text-xs flex items-center gap-1.5"
                                    >
                                        <Printer className="w-3.5 h-3.5" /> Print Rx Slip
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setViewRxModal(null)}
                                        className="bg-teal-700 hover:bg-teal-800 text-white text-xs"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
