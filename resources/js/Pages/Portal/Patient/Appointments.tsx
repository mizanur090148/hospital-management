import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { 
    Calendar, Clock, HeartPulse, Pill, Receipt, Video, 
    Stethoscope, Building2, Search, X, Check, AlertCircle, 
    ChevronRight, MapPin, User, ShieldCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface DoctorSchedule {
    day_of_week: number;
    start_time: string;
    end_time: string;
}

interface Doctor {
    id: string;
    license_number: string;
    qualification: string;
    specialization: string;
    consultation_fee: number;
    is_available_for_teleconsult: boolean;
    user?: {
        id: string;
        name: string;
        email: string;
    };
    department?: {
        id: string;
        name: string;
    };
    schedules?: DoctorSchedule[];
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
    consultation_fee: number;
    doctor?: {
        id: string;
        qualification?: string;
        specialization?: string;
        user?: { name: string };
        department?: { name: string };
    };
    branch?: { name: string };
}

interface Department {
    id: string;
    name: string;
}

interface Branch {
    id: string;
    name: string;
}

interface Props {
    patient: {
        id: string;
        mrn: string;
        full_name: string;
        phone: string;
        email: string;
    };
    myAppointments: Appointment[];
    doctors: Doctor[];
    departments: Department[];
    branches: Branch[];
}

export default function Appointments({
    patient,
    myAppointments,
    doctors,
    departments,
    branches,
}: Props) {
    const [selectedDept, setSelectedDept] = useState<string>('ALL');
    const [searchDoctor, setSearchDoctor] = useState<string>('');
    const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);

    // Booking form
    const { data, setData, post, processing, errors, reset } = useForm({
        doctor_id: '',
        branch_id: branches[0]?.id || '',
        appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '10:30',
        type: 'OPD',
        reason_for_visit: '',
    });

    const handleOpenBooking = (doc: Doctor) => {
        setBookingDoctor(doc);
        setData({
            doctor_id: doc.id,
            branch_id: branches[0]?.id || '',
            appointment_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            start_time: '10:00',
            end_time: '10:30',
            type: doc.is_available_for_teleconsult ? 'TELECONSULTATION' : 'OPD',
            reason_for_visit: '',
        });
    };

    const handleCloseBooking = () => {
        setBookingDoctor(null);
        reset();
    };

    const handleSubmitBooking = (e: React.FormEvent) => {
        e.preventDefault();
        post('/portal/patient/appointments', {
            onSuccess: () => {
                handleCloseBooking();
            },
        });
    };

    const handleCancelAppointment = (aptId: string) => {
        if (confirm('Are you sure you want to cancel this scheduled appointment?')) {
            router.delete(`/portal/patient/appointments/${aptId}`, {
                preserveScroll: true,
            });
        }
    };

    // Filter doctors
    const filteredDoctors = doctors.filter((doc) => {
        const matchesDept = selectedDept === 'ALL' || doc.department?.id === selectedDept;
        const matchesSearch =
            !searchDoctor ||
            doc.user?.name.toLowerCase().includes(searchDoctor.toLowerCase()) ||
            doc.specialization.toLowerCase().includes(searchDoctor.toLowerCase());
        return matchesDept && matchesSearch;
    });

    const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    return (
        <AppLayout title="Appointments - Patient Portal">
            <Head title="Appointments - Patient Portal" />

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
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 shadow-xs"
                    >
                        <Calendar className="w-4 h-4 text-teal-600" />
                        Appointments ({myAppointments.length})
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

                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Hospital Consultation Booking</h1>
                        <p className="text-sm text-slate-500">
                            Schedule appointments with specialist physicians across clinical departments or book teleconsultations.
                        </p>
                    </div>
                </div>

                {/* My Scheduled Appointments */}
                <Card className="border-teal-200/80 shadow-xs">
                    <CardHeader className="border-b border-slate-100 pb-3">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4.5 h-4.5 text-teal-600" />
                                My Booked Appointments ({myAppointments.length})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {myAppointments.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-700">
                                    <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3">Appt #</th>
                                            <th className="py-2.5 px-3">Doctor & Specialty</th>
                                            <th className="py-2.5 px-3">Date & Time</th>
                                            <th className="py-2.5 px-3">Type</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {myAppointments.map((apt) => (
                                            <tr key={apt.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3 px-3 font-mono text-xs font-bold text-teal-700">
                                                    #{apt.appointment_number}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="font-semibold text-slate-900">
                                                        Dr. {apt.doctor?.user?.name ?? 'Specialist'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {apt.doctor?.department?.name} • {apt.doctor?.specialization}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="font-medium text-slate-900">{apt.appointment_date}</div>
                                                    <div className="text-2xs text-slate-500">
                                                        {apt.start_time} - {apt.end_time}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Badge variant="outline" className={`text-2xs ${apt.type === 'TELECONSULTATION' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700'}`}>
                                                        {apt.type === 'TELECONSULTATION' && <Video className="w-3 h-3 mr-1 inline" />}
                                                        {apt.type}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Badge 
                                                        variant="outline"
                                                        className={`text-2xs ${
                                                            apt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                                            apt.status === 'CANCELLED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                                            'bg-teal-50 text-teal-800 border-teal-200'
                                                        }`}
                                                    >
                                                        {apt.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {apt.type === 'TELECONSULTATION' && apt.status !== 'CANCELLED' && (
                                                            <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-xs py-1 px-2.5">
                                                                <Video className="w-3.5 h-3.5 mr-1" /> Join Room
                                                            </Button>
                                                        )}
                                                        {apt.status === 'SCHEDULED' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleCancelAppointment(apt.id)}
                                                                className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-1 px-2.5"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-xs text-slate-500">
                                You have not booked any appointments yet. Select a physician below to schedule your visit.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Available Doctors Directory */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Stethoscope className="w-5 h-5 text-teal-600" />
                            Find a Specialist & Book Consultation
                        </h2>

                        {/* Search & Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-64">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <Input
                                    value={searchDoctor}
                                    onChange={(e) => setSearchDoctor(e.target.value)}
                                    placeholder="Search doctor or specialty..."
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 focus:border-teal-500 focus:outline-hidden"
                            >
                                <option value="ALL">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Doctors Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredDoctors.map((doc) => (
                            <Card key={doc.id} className="hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg shrink-0">
                                            {doc.user?.name.charAt(0) ?? 'D'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 text-sm truncate">
                                                Dr. {doc.user?.name}
                                            </h3>
                                            <div className="text-xs text-teal-700 font-medium">
                                                {doc.specialization}
                                            </div>
                                            <div className="text-2xs text-slate-500 truncate">
                                                {doc.qualification}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Department:</span>
                                            <span className="font-medium text-slate-800">{doc.department?.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Consultation Fee:</span>
                                            <span className="font-bold text-slate-900">${Number(doc.consultation_fee).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Teleconsultation:</span>
                                            <span>
                                                {doc.is_available_for_teleconsult ? (
                                                    <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                                                        <Video className="w-3 h-3" /> Available
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">In-Person Only</span>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleOpenBooking(doc)}
                                        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                                    >
                                        <Calendar className="w-3.5 h-3.5" /> Book Consultation
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Booking Modal Dialog */}
                {bookingDoctor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
                        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Book Appointment with Dr. {bookingDoctor.user?.name}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {bookingDoctor.department?.name} • {bookingDoctor.specialization}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseBooking}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitBooking} className="space-y-4">
                                {/* Consultation Type */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Consultation Mode
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setData('type', 'OPD')}
                                            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                                                data.type === 'OPD'
                                                    ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20 text-teal-900'
                                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            <Building2 className="w-5 h-5 text-teal-600" />
                                            <div>
                                                <div className="text-xs font-bold">In-Person OPD</div>
                                                <div className="text-2xs text-slate-500">At hospital clinic</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setData('type', 'TELECONSULTATION')}
                                            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                                                data.type === 'TELECONSULTATION'
                                                    ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20 text-teal-900'
                                                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            <Video className="w-5 h-5 text-teal-600" />
                                            <div>
                                                <div className="text-xs font-bold">Teleconsultation</div>
                                                <div className="text-2xs text-slate-500">Virtual video room</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Hospital Branch */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Medical Facility / Branch
                                    </label>
                                    <select
                                        value={data.branch_id}
                                        onChange={(e) => setData('branch_id', e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date & Time */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Appointment Date
                                        </label>
                                        <Input
                                            type="date"
                                            value={data.appointment_date}
                                            onChange={(e) => setData('appointment_date', e.target.value)}
                                            className="text-xs"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                        {errors.appointment_date && (
                                            <p className="text-2xs text-rose-600 mt-1">{errors.appointment_date}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Time Slot
                                        </label>
                                        <select
                                            value={data.start_time}
                                            onChange={(e) => {
                                                const slot = e.target.value;
                                                const [h, m] = slot.split(':').map(Number);
                                                const endM = (m + 30) % 60;
                                                const endH = m + 30 >= 60 ? h + 1 : h;
                                                const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                                setData({
                                                    ...data,
                                                    start_time: slot,
                                                    end_time: endStr,
                                                });
                                            }}
                                            className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                                        >
                                            {timeSlots.map((slot) => (
                                                <option key={slot} value={slot}>
                                                    {slot}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.start_time && (
                                            <p className="text-2xs text-rose-600 mt-1">{errors.start_time}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Reason for Visit */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Reason for Consultation / Symptoms
                                    </label>
                                    <textarea
                                        value={data.reason_for_visit}
                                        onChange={(e) => setData('reason_for_visit', e.target.value)}
                                        rows={2}
                                        placeholder="Describe symptoms or reasons for appointment (e.g. Chest pain, follow up, migraine)..."
                                        className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800"
                                    />
                                </div>

                                {/* Fee Summary Card */}
                                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs">
                                    <div>
                                        <div className="text-teal-900 font-semibold">Standard Consultation Fee:</div>
                                        <div className="text-2xs text-teal-700">Payable at cashier or online</div>
                                    </div>
                                    <div className="text-base font-extrabold text-teal-900">
                                        ${Number(bookingDoctor.consultation_fee).toFixed(2)}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCloseBooking}
                                        className="text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs"
                                    >
                                        {processing ? 'Reserving Slot...' : 'Confirm Appointment'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
