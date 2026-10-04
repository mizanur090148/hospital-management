import React, { useState, useEffect } from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import {
    Calendar, Plus, Search, Filter, Clock, Stethoscope,
    Users, UserCheck, AlertCircle, CheckCircle2, XCircle,
    ChevronRight, X, ArrowRight, DollarSign, Activity
} from 'lucide-react';
import axios from 'axios';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface Appointment {
    id: string;
    appointment_number: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    type: string;
    status: string;
    reason_for_visit: string | null;
    consultation_fee: string;
    notes: string | null;
    doctor: {
        id: string;
        user: { name: string; email: string };
        department: { name: string };
    };
    patient: {
        id: string;
        mrn: string;
        full_name: string;
        phone: string;
        blood_group: string;
    };
    branch: {
        id: string;
        name: string;
    };
}

interface AppointmentsIndexProps {
    appointments: {
        data: Appointment[];
        total: number;
    };
    doctors: Array<{
        id: string;
        user: { name: string };
        department: { name: string };
        consultation_fee: string;
    }>;
    patients: Array<{
        id: string;
        mrn: string;
        full_name: string;
        phone: string;
    }>;
    branches: Array<{
        id: string;
        name: string;
    }>;
    filters: {
        date?: string;
        doctor_id?: string;
        status?: string;
        search?: string;
    };
    types: string[];
    statuses: string[];
}

export default function AppointmentsIndex({
    appointments,
    doctors,
    patients,
    branches,
    filters,
    types,
    statuses,
}: AppointmentsIndexProps) {
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [filterDate, setFilterDate] = useState(filters.date || new Date().toISOString().split('T')[0]);
    const [filterDoctor, setFilterDoctor] = useState(filters.doctor_id || '');
    const [filterStatus, setFilterStatus] = useState(filters.status || '');
    const [search, setSearch] = useState(filters.search || '');

    // Slot fetching state in Modal
    const [availableSlots, setAvailableSlots] = useState<Array<{ start_time: string; end_time: string; is_available: boolean }>>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Form: Book New Appointment
    const { data, setData, post, processing, errors, reset } = useForm({
        branch_id: branches[0]?.id || '',
        doctor_id: '',
        patient_id: '',
        appointment_date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        type: 'OPD',
        reason_for_visit: '',
        notes: '',
    });

    // When doctor or date changes in booking modal, fetch live calculated slots
    useEffect(() => {
        if (data.doctor_id && data.appointment_date) {
            setLoadingSlots(true);
            axios.get(`/doctors/${data.doctor_id}/available-slots`, {
                params: { date: data.appointment_date }
            }).then((res) => {
                setAvailableSlots(res.data.slots || []);
                setLoadingSlots(false);
            }).catch(() => {
                setAvailableSlots([]);
                setLoadingSlots(false);
            });
        }
    }, [data.doctor_id, data.appointment_date]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/appointments', {
            date: filterDate || undefined,
            doctor_id: filterDoctor || undefined,
            status: filterStatus || undefined,
            search: search || undefined,
        }, { preserveState: true });
    };

    const handleBookAppointment = (e: React.FormEvent) => {
        e.preventDefault();
        post('/appointments', {
            onSuccess: () => {
                setIsBookModalOpen(false);
                reset();
            },
        });
    };

    const handleUpdateStatus = (appointmentId: string, newStatus: string) => {
        router.patch(`/appointments/${appointmentId}/status`, {
            status: newStatus,
        }, { preserveScroll: true });
    };

    return (
        <AppLayout title="Appointments & Slot Engine">
            <div className="space-y-6">
                {/* Header & Quick Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointment Center</h1>
                            <Badge variant="cyan" className="font-semibold">{appointments.total} Total</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            High-concurrency booking engine with real-time slot locking and patient queue check-in.
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => setIsBookModalOpen(true)}
                        className="shadow-sm shadow-cyan-600/30"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Book Appointment Slot
                    </Button>
                </div>

                {/* Filter and Date Ribbon */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-slate-600">Date:</label>
                                <Input
                                    type="date"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    className="w-40 py-1.5 text-sm"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const today = new Date().toISOString().split('T')[0];
                                        setFilterDate(today);
                                        router.get('/appointments', { date: today });
                                    }}
                                >
                                    Today
                                </Button>
                            </div>

                            <select
                                value={filterDoctor}
                                onChange={(e) => setFilterDoctor(e.target.value)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
                            >
                                <option value="">All Doctors</option>
                                {doctors.map((d) => (
                                    <option key={d.id} value={d.id}>Dr. {d.user.name} ({d.department.name})</option>
                                ))}
                            </select>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
                            >
                                <option value="">All Statuses</option>
                                {statuses.map((st) => (
                                    <option key={st} value={st}>{st}</option>
                                ))}
                            </select>

                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search patient name, MRN, phone..."
                                className="w-56 py-1.5 text-sm"
                            />

                            <Button type="submit" variant="secondary" size="sm">
                                <Filter className="w-3.5 h-3.5 mr-1" /> Filter
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Appointments List / Grid */}
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5">Time & Appt #</th>
                                    <th className="px-6 py-3.5">Patient Details</th>
                                    <th className="px-6 py-3.5">Attending Doctor</th>
                                    <th className="px-6 py-3.5">Type & Fee</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Queue Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {appointments.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                                            <p className="font-semibold text-slate-700">No appointments scheduled for this date</p>
                                            <p className="text-xs text-slate-400 mt-1">Select another date or click "Book Appointment Slot" to schedule one.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    appointments.data.map((apt) => (
                                        <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-cyan-600 shrink-0" />
                                                    <span className="font-bold text-slate-900 text-sm">
                                                        {apt.start_time.substring(0, 5)} - {apt.end_time.substring(0, 5)}
                                                    </span>
                                                </div>
                                                <span className="font-mono text-[11px] font-semibold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200/60 mt-1 inline-block">
                                                    {apt.appointment_number}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <Link href={`/patients/${apt.patient.id}`} className="font-semibold text-slate-900 hover:text-cyan-700">
                                                    {apt.patient.full_name}
                                                </Link>
                                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <span className="font-mono">{apt.patient.mrn}</span>
                                                    <span>•</span>
                                                    <span>{apt.patient.phone}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">Dr. {apt.doctor.user.name}</div>
                                                <div className="text-xs text-slate-400">{apt.doctor.department.name}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {apt.type}
                                                </Badge>
                                                <div className="text-xs font-bold text-slate-700 mt-1">${apt.consultation_fee}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    apt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                                    apt.status === 'IN_CONSULTATION' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                                                    apt.status === 'CHECKED_IN' ? 'bg-amber-100 text-amber-800' :
                                                    apt.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                                                    'bg-cyan-100 text-cyan-800'
                                                }`}>
                                                    {apt.status}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {apt.status === 'SCHEDULED' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleUpdateStatus(apt.id, 'CHECKED_IN')}
                                                            className="text-xs h-7 text-amber-700 border-amber-300 hover:bg-amber-50"
                                                        >
                                                            <UserCheck className="w-3.5 h-3.5 mr-1" /> Check-In
                                                        </Button>
                                                    )}

                                                    {apt.status === 'CHECKED_IN' && (
                                                        <Link href={`/opd?doctor_id=${apt.doctor.id}&patient_id=${apt.patient.id}&appointment_id=${apt.id}`}>
                                                            <Button size="sm" variant="primary" className="text-xs h-7">
                                                                <Activity className="w-3.5 h-3.5 mr-1" /> Call Patient
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    {apt.status === 'IN_CONSULTATION' && (
                                                        <Link href={`/opd?doctor_id=${apt.doctor.id}&patient_id=${apt.patient.id}&appointment_id=${apt.id}`}>
                                                            <Button size="sm" variant="secondary" className="text-xs h-7 bg-indigo-600 text-white hover:bg-indigo-700">
                                                                In Workstation
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(apt.id, 'CANCELLED')}
                                                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                                            title="Cancel Appointment"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal: Book New Appointment */}
            {isBookModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Schedule Patient Appointment</h2>
                                <p className="text-xs text-slate-500">Atomic slot reservation with pessimistic double-booking lock.</p>
                            </div>
                            <button onClick={() => setIsBookModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleBookAppointment} className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor *</label>
                                    <select
                                        value={data.doctor_id}
                                        onChange={(e) => setData('doctor_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="">-- Choose Doctor --</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>Dr. {d.user.name} ({d.department.name})</option>
                                        ))}
                                    </select>
                                    {errors.doctor_id && <p className="text-xs text-rose-500 mt-1">{errors.doctor_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Patient *</label>
                                    <select
                                        value={data.patient_id}
                                        onChange={(e) => setData('patient_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="">-- Choose Patient --</option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.full_name} ({p.mrn})</option>
                                        ))}
                                    </select>
                                    {errors.patient_id && <p className="text-xs text-rose-500 mt-1">{errors.patient_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Appointment Date *</label>
                                    <Input
                                        type="date"
                                        value={data.appointment_date}
                                        onChange={(e) => setData('appointment_date', e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                    {errors.appointment_date && <p className="text-xs text-rose-500 mt-1">{errors.appointment_date}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Type *</label>
                                    <select
                                        value={data.type}
                                        onChange={(e) => setData('type', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="OPD">OPD Consultation</option>
                                        <option value="FOLLOW_UP">Follow-up Visit</option>
                                        <option value="EMERGENCY">Emergency Assessment</option>
                                        <option value="TELECONSULTATION">Teleconsultation / Video</option>
                                    </select>
                                </div>
                            </div>

                            {/* Live Slot Engine Ribbon */}
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                                    Available Time Slots for Selected Date:
                                </label>

                                {!data.doctor_id ? (
                                    <p className="text-xs text-slate-400 italic">Please select a doctor to calculate schedule slots.</p>
                                ) : loadingSlots ? (
                                    <p className="text-xs text-cyan-600 animate-pulse">Calculating available slots from physician roster...</p>
                                ) : availableSlots.length === 0 ? (
                                    <p className="text-xs text-amber-600">No scheduled hours found for this doctor on this day. Please check schedule configurations.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                                        {availableSlots.map((slot, idx) => {
                                            const isSelected = data.start_time === slot.start_time;
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    disabled={!slot.is_available}
                                                    onClick={() => {
                                                        setData('start_time', slot.start_time);
                                                        setData('end_time', slot.end_time);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                        !slot.is_available
                                                            ? 'bg-slate-200 text-slate-400 line-through cursor-not-allowed'
                                                            : isSelected
                                                            ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                                                            : 'bg-white hover:bg-cyan-50 text-slate-700 border border-slate-200'
                                                    }`}
                                                >
                                                    {slot.start_time}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {errors.start_time && <p className="text-xs text-rose-500 mt-1">{errors.start_time}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Reason for Visit</label>
                                <textarea
                                    value={data.reason_for_visit}
                                    onChange={(e) => setData('reason_for_visit', e.target.value)}
                                    rows={2}
                                    placeholder="Patient's primary symptom or purpose of visit..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsBookModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={processing || !data.start_time}>
                                    {processing ? 'Reserving...' : 'Confirm Appointment'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
