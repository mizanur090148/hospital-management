import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { 
    Calendar, Clock, HeartPulse, Pill, FlaskConical, Receipt, 
    ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, UserCheck, 
    Phone, Mail, Droplet, Stethoscope, Video
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';

interface Patient {
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
    email: string;
    allergies: string[] | null;
    chronic_conditions: string[] | null;
}

interface Appointment {
    id: string;
    appointment_number: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    type: string;
    status: string;
    reason_for_visit?: string;
    doctor?: {
        id: string;
        user?: { name: string };
        department?: { name: string };
    };
    branch?: { name: string };
}

interface PrescriptionItem {
    id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration_days: number;
    instructions?: string;
}

interface Prescription {
    id: string;
    prescription_number: string;
    created_at: string;
    advice?: string;
    items?: PrescriptionItem[];
    doctor?: {
        user?: { name: string };
        department?: { name: string };
    };
}

interface LabOrderItem {
    id: string;
    test_name: string;
    status: string;
    results?: Array<{
        parameter_name: string;
        observed_value: string;
        unit?: string;
        is_abnormal: boolean;
        is_panic_critical: boolean;
    }>;
}

interface LabOrder {
    id: string;
    order_number: string;
    ordered_at: string;
    status: string;
    items?: LabOrderItem[];
    ordering_doctor?: { user?: { name: string } };
}

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: number;
    patient_payable_amount: number;
    paid_amount: number;
    status: string;
}

interface Props {
    patient: Patient;
    upcomingAppointments: Appointment[];
    recentPrescriptions: Prescription[];
    recentLabOrders: LabOrder[];
    recentInvoices: Invoice[];
    outstandingBalance: number;
}

export default function Dashboard({
    patient,
    upcomingAppointments,
    recentPrescriptions,
    recentLabOrders,
    recentInvoices,
    outstandingBalance,
}: Props) {
    const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

    return (
        <AppLayout title="Patient Self-Service Portal">
            <Head title="Patient Portal - St. Jude Medical" />

            <div className="space-y-6">
                {/* Hero Welcome Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-teal-700 via-teal-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                                <span>Verified Patient Dossier</span>
                                <span className="opacity-60">•</span>
                                <span className="font-mono text-cyan-200">MRN: {patient.mrn}</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                Welcome, {patient.full_name}
                            </h1>
                            <p className="text-sm text-teal-100 max-w-xl">
                                Access your electronic prescriptions, verified diagnostic results, doctor appointments, and hospital invoices in real-time.
                            </p>
                            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-teal-100">
                                <span className="inline-flex items-center gap-1">
                                    <Droplet className="w-3.5 h-3.5 text-rose-300" />
                                    Blood: <strong className="text-white">{patient.blood_group || 'O+'}</strong>
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <UserCheck className="w-3.5 h-3.5 text-cyan-200" />
                                    Age: <strong className="text-white">{patient.age ? `${patient.age} yrs` : 'Adult'}</strong> ({patient.gender})
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5 text-emerald-300" />
                                    {patient.phone}
                                </span>
                            </div>
                        </div>

                        {/* Quick Action Tiles in Hero */}
                        <div className="flex flex-wrap md:flex-col gap-3 shrink-0">
                            <Link href="/portal/patient/appointments">
                                <Button className="w-full bg-white text-teal-800 hover:bg-teal-50 font-semibold shadow-md flex items-center justify-center gap-2">
                                    <Calendar className="w-4 h-4 text-teal-700" />
                                    Book New Appointment
                                </Button>
                            </Link>
                            <Link href="/portal/patient/billing">
                                <Button variant="secondary" className="w-full bg-teal-900/40 hover:bg-teal-900/60 text-white border border-white/20 flex items-center justify-center gap-2">
                                    <Receipt className="w-4 h-4 text-cyan-300" />
                                    Pay Hospital Bills
                                    {outstandingBalance > 0 && (
                                        <span className="ml-1 rounded-full bg-rose-500 px-2 py-0.5 text-2xs font-bold text-white">
                                            ${outstandingBalance.toFixed(2)}
                                        </span>
                                    )}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Patient Portal Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 rounded-xl shadow-xs overflow-x-auto">
                    <Link
                        href="/portal/patient"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 shadow-xs"
                    >
                        <HeartPulse className="w-4 h-4 text-teal-600" />
                        Dashboard
                    </Link>
                    <Link
                        href="/portal/patient/appointments"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <Calendar className="w-4 h-4 text-slate-500" />
                        Appointments ({upcomingAppointments.length})
                    </Link>
                    <Link
                        href="/portal/patient/medical-records"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                        <Pill className="w-4 h-4 text-slate-500" />
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

                {/* Quick Info & Next Appointment Ribbon */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Next Appointment Card */}
                    <Card className="border-teal-200/80 bg-teal-50/40">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-teal-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-teal-600" />
                                    Next Consultation
                                </CardTitle>
                                {nextAppointment && (
                                    <Badge variant="outline" className="bg-teal-100/80 text-teal-800 border-teal-300">
                                        {nextAppointment.type}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {nextAppointment ? (
                                <div className="space-y-3">
                                    <div>
                                        <div className="font-bold text-slate-900 text-base">
                                            Dr. {nextAppointment.doctor?.user?.name ?? 'Specialist'}
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            {nextAppointment.doctor?.department?.name ?? 'Clinical Department'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-teal-100">
                                        <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span>
                                            <strong>{nextAppointment.appointment_date}</strong> at{' '}
                                            <strong>{nextAppointment.start_time}</strong>
                                        </span>
                                    </div>
                                    <div className="flex justify-end">
                                        <Link href="/portal/patient/appointments">
                                            <Button variant="outline" size="sm" className="text-teal-700 border-teal-300 hover:bg-teal-100">
                                                Manage Booking
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-xs text-slate-500 mb-3">No upcoming appointments scheduled.</p>
                                    <Link href="/portal/patient/appointments">
                                        <Button size="sm" className="bg-teal-700 hover:bg-teal-800 text-white">
                                            Schedule Consultation
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Allergies & Clinical Alerts */}
                    <Card className="border-amber-200/80 bg-amber-50/40">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                Allergies & Precautions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {patient.allergies && patient.allergies.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {patient.allergies.map((allergy, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                                            ⚠️ {allergy}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-600">No known allergies on record.</p>
                            )}

                            <div className="mt-4 pt-3 border-t border-amber-200/60">
                                <span className="text-2xs uppercase tracking-wider font-semibold text-slate-500">Chronic Conditions:</span>
                                {patient.chronic_conditions && patient.chronic_conditions.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {patient.chronic_conditions.map((cond, idx) => (
                                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-800">
                                                {cond}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 mt-0.5">None documented.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Billing Balance Due */}
                    <Card className="border-cyan-200/80 bg-cyan-50/40">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-cyan-900 flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-cyan-700" />
                                    Billing & Statements
                                </CardTitle>
                                <span className="text-xs font-medium text-slate-500">Self-Pay / Co-Pay</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="text-2xs text-slate-500 uppercase font-semibold">Total Outstanding Due:</div>
                                <div className="text-3xl font-extrabold text-slate-900">
                                    ${outstandingBalance.toFixed(2)}
                                </div>
                                <p className="text-xs text-slate-600">
                                    {outstandingBalance > 0
                                        ? 'Please settle your patient balance to prevent service delays.'
                                        : 'All current hospital invoices are fully settled. Thank you!'}
                                </p>
                                <div className="pt-2">
                                    <Link href="/portal/patient/billing">
                                        <Button size="sm" className="w-full bg-cyan-700 hover:bg-cyan-800 text-white font-medium">
                                            View Invoices & Pay Online
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Two-Column Layout: Prescriptions & Diagnostic Lab Reports */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Prescriptions */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Pill className="w-4 h-4 text-emerald-600" />
                                    Active Prescriptions
                                </CardTitle>
                                <p className="text-xs text-slate-500">Authorized medical formulations prescribed by physicians</p>
                            </div>
                            <Link href="/portal/patient/medical-records" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                                View All <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {recentPrescriptions.length > 0 ? (
                                <div className="space-y-3">
                                    {recentPrescriptions.map((rx) => (
                                        <div key={rx.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                                    #{rx.prescription_number}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    Dr. {rx.doctor?.user?.name ?? 'Attending Doctor'}
                                                </span>
                                            </div>
                                            {rx.items && rx.items.length > 0 && (
                                                <ul className="text-xs text-slate-700 divide-y divide-slate-100">
                                                    {rx.items.slice(0, 3).map((item) => (
                                                        <li key={item.id} className="py-1.5 flex items-center justify-between">
                                                            <span className="font-medium text-slate-900">{item.medicine_name}</span>
                                                            <span className="text-slate-500 text-2xs">
                                                                {item.dosage} • {item.frequency} ({item.duration_days} days)
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {rx.advice && (
                                                <div className="text-xs italic text-slate-600 bg-white p-2 rounded border border-slate-100">
                                                    " {rx.advice} "
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-xs text-slate-500">
                                    No prescriptions on file yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Diagnostic Lab Reports */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FlaskConical className="w-4 h-4 text-purple-600" />
                                    Laboratory & Pathology Reports
                                </CardTitle>
                                <p className="text-xs text-slate-500">Diagnostic investigation results with verified clinical findings</p>
                            </div>
                            <Link href="/portal/patient/medical-records" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                                View Dossier <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {recentLabOrders.length > 0 ? (
                                <div className="space-y-3">
                                    {recentLabOrders.map((order) => (
                                        <div key={order.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                                        #{order.order_number}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-800">
                                                        {order.items?.map(i => i.test_name).join(', ') || 'Laboratory Panel'}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-2xs">
                                                    {order.status}
                                                </Badge>
                                            </div>

                                            {/* Results overview */}
                                            {order.items?.flatMap(i => i.results || []).length ? (
                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    {order.items?.flatMap(i => i.results || []).slice(0, 4).map((res, ridx) => (
                                                        <div key={ridx} className={`text-2xs p-2 rounded border ${res.is_panic_critical || res.is_abnormal ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-slate-200 text-slate-800'}`}>
                                                            <div className="font-medium truncate">{res.parameter_name}</div>
                                                            <div className="font-bold text-sm">
                                                                {res.observed_value} {res.unit}
                                                                {res.is_abnormal && <span className="ml-1 text-rose-600 font-bold">⚠️ High</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500">Specimen processing at clinical pathology laboratory.</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-xs text-slate-500">
                                    No laboratory reports requested yet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
