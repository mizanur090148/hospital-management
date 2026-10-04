import React, { useState } from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import {
    BedDouble, Plus, Search, Filter, Calendar, Clock,
    User, Stethoscope, Building, ArrowRight, CheckCircle2,
    X, AlertCircle, ShieldAlert, DoorOpen, Users
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface Admission {
    id: string;
    ipd_number: string;
    admission_type: string;
    admitting_diagnosis: string;
    initial_deposit: string;
    admitted_at: string;
    discharged_at: string | null;
    status: 'ADMITTED' | 'DISCHARGED' | 'CANCELLED';
    patient: {
        id: string;
        mrn: string;
        full_name: string;
        age: number | null;
        gender: string;
        blood_group: string;
        phone: string;
    };
    attendingDoctor: {
        id: string;
        user: { name: string };
        department: { name: string };
    };
    currentBedAssignment: {
        id: string;
        bed: {
            id: string;
            bed_number: string;
            bed_type: string;
            room: {
                room_number: string;
                ward: {
                    name: string;
                    code: string;
                };
            };
        };
    } | null;
    branch: {
        name: string;
    };
}

interface IPDIndexProps {
    admissions: {
        data: Admission[];
        total: number;
    };
    doctors: Array<{ id: string; user: { name: string }; department: { name: string } }>;
    departments: Array<{ id: string; name: string; code: string }>;
    branches: Array<{ id: string; name: string }>;
    patients: Array<{ id: string; full_name: string; mrn: string }>;
    availableBeds: Array<{
        id: string;
        bed_number: string;
        bed_type: string;
        daily_rate: string;
        room: {
            room_number: string;
            ward: {
                name: string;
                code: string;
            };
        };
    }>;
    filters: {
        status?: string;
        search?: string;
        department_id?: string;
    };
    admissionTypes: string[];
}

export default function IPDIndex({
    admissions,
    doctors,
    departments,
    branches,
    patients,
    availableBeds,
    filters,
    admissionTypes,
}: IPDIndexProps) {
    const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'ADMITTED');
    const [deptFilter, setDeptFilter] = useState(filters.department_id || '');

    // Form: Admit Patient
    const { data, setData, post, processing, errors, reset } = useForm({
        branch_id: branches[0]?.id || '',
        patient_id: '',
        attending_doctor_id: '',
        admitting_department_id: '',
        bed_id: '',
        admission_type: 'ELECTIVE',
        admitting_diagnosis: '',
        initial_deposit: '500.00',
    });

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/ipd', {
            status: statusFilter || undefined,
            search: search || undefined,
            department_id: deptFilter || undefined,
        }, { preserveState: true });
    };

    const handleAdmitSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/ipd/admissions', {
            onSuccess: () => {
                setIsAdmitModalOpen(false);
                reset();
            },
        });
    };

    return (
        <AppLayout title="Inpatient Department (IPD) & Admissions">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">IPD Inpatient Admissions</h1>
                            <Badge variant="cyan" className="font-semibold">{admissions.total} Inpatients</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Patient admission workflow, live ward/bed allocation, transfers, and discharge summaries.
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => setIsAdmitModalOpen(true)}
                        className="shadow-sm shadow-cyan-600/30"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Admit Inpatient
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[240px]">
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by IPD # (e.g. IPD-2026-000001), Patient Name, MRN..."
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
                            >
                                <option value="ADMITTED">Admitted (Current Inpatients)</option>
                                <option value="DISCHARGED">Discharged Patients</option>
                                <option value="ALL">All Statuses</option>
                            </select>

                            <select
                                value={deptFilter}
                                onChange={(e) => setDeptFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
                            >
                                <option value="">All Departments</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>

                            <Button type="submit" variant="secondary">
                                <Filter className="w-4 h-4 mr-1.5" /> Filter
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Admissions List */}
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5">IPD # & Date</th>
                                    <th className="px-6 py-3.5">Patient Details</th>
                                    <th className="px-6 py-3.5">Assigned Ward & Bed</th>
                                    <th className="px-6 py-3.5">Attending Physician</th>
                                    <th className="px-6 py-3.5">Admitting Diagnosis</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {admissions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                            <BedDouble className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                                            <p className="font-semibold text-slate-700">No inpatient admissions found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    admissions.data.map((adm) => (
                                        <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-xs text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200/60 inline-block">
                                                    {adm.ipd_number}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {new Date(adm.admitted_at).toLocaleDateString()}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <Link href={`/patients/${adm.patient.id}`} className="font-semibold text-slate-900 hover:text-cyan-700">
                                                    {adm.patient.full_name}
                                                </Link>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {adm.patient.mrn} • {adm.patient.age}y • {adm.patient.blood_group}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                {adm.currentBedAssignment ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                                            <BedDouble className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs text-slate-900">
                                                                {adm.currentBedAssignment.bed.bed_number}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400">
                                                                {adm.currentBedAssignment.bed.room.ward.name} ({adm.currentBedAssignment.bed.room.room_number})
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No bed assigned</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">Dr. {adm.attendingDoctor.user.name}</div>
                                                <div className="text-xs text-slate-400">{adm.attendingDoctor.department.name}</div>
                                            </td>

                                            <td className="px-6 py-4 max-w-[200px]">
                                                <p className="text-xs text-slate-700 truncate" title={adm.admitting_diagnosis}>
                                                    {adm.admitting_diagnosis}
                                                </p>
                                                <span className="text-[10px] text-slate-400">{adm.admission_type}</span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <Badge variant={adm.status === 'ADMITTED' ? 'success' : 'secondary'} className="text-[11px]">
                                                    {adm.status}
                                                </Badge>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/ipd/admissions/${adm.id}`}>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs">
                                                        Inpatient Dossier <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal: Admit Inpatient */}
            {isAdmitModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Inpatient Admission (IPD)</h2>
                                <p className="text-xs text-slate-500">Assigns next IPD sequence and allocates an available hospital bed.</p>
                            </div>
                            <button onClick={() => setIsAdmitModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAdmitSubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Attending Physician *</label>
                                    <select
                                        value={data.attending_doctor_id}
                                        onChange={(e) => setData('attending_doctor_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="">-- Choose Doctor --</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>Dr. {d.user.name} ({d.department.name})</option>
                                        ))}
                                    </select>
                                    {errors.attending_doctor_id && <p className="text-xs text-rose-500 mt-1">{errors.attending_doctor_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Admitting Department</label>
                                    <select
                                        value={data.admitting_department_id}
                                        onChange={(e) => setData('admitting_department_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    >
                                        <option value="">-- Select Department --</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Type *</label>
                                    <select
                                        value={data.admission_type}
                                        onChange={(e) => setData('admission_type', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="ELECTIVE">Elective / Scheduled</option>
                                        <option value="EMERGENCY">Emergency Admission</option>
                                        <option value="TRANSFER">Transfer from Facility</option>
                                        <option value="NEWBORN">Newborn</option>
                                    </select>
                                </div>
                            </div>

                            {/* Bed Allocation Selector */}
                            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
                                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1.5 flex items-center gap-1.5">
                                    <BedDouble className="w-4 h-4 text-emerald-700" /> Allocate Available Bed *
                                </label>

                                {availableBeds.length === 0 ? (
                                    <p className="text-xs text-rose-600 font-semibold">
                                        No available beds currently found in any ward. Please clean or discharge existing beds first.
                                    </p>
                                ) : (
                                    <select
                                        value={data.bed_id}
                                        onChange={(e) => setData('bed_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="">-- Select Available Inpatient Bed --</option>
                                        {availableBeds.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.room.ward.name} • Room {b.room.room_number} • Bed {b.bed_number} ({b.bed_type} - ${b.daily_rate}/day)
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {errors.bed_id && <p className="text-xs text-rose-500 mt-1">{errors.bed_id}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Admitting Diagnosis & Clinical Reason *</label>
                                    <textarea
                                        rows={3}
                                        value={data.admitting_diagnosis}
                                        onChange={(e) => setData('admitting_diagnosis', e.target.value)}
                                        placeholder="Detailed admission diagnosis, preliminary management plan..."
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    />
                                    {errors.admitting_diagnosis && <p className="text-xs text-rose-500 mt-1">{errors.admitting_diagnosis}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Admission Deposit ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={data.initial_deposit}
                                        onChange={(e) => setData('initial_deposit', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsAdmitModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={processing || !data.bed_id}>
                                    {processing ? 'Admitting...' : 'Complete Inpatient Admission'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
