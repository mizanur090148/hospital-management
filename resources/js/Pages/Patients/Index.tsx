import React, { useState } from 'react';
import { useForm, router, Link } from '@inertiajs/react';
import {
    Users, Plus, Search, Filter, ShieldAlert, HeartPulse,
    Calendar, Phone, Mail, MapPin, ChevronRight, X, UserCheck,
    AlertTriangle, FileText, Activity
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface Patient {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    full_name: string;
    dob: string;
    age: number | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    blood_group: string;
    phone: string;
    email: string | null;
    national_id: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'DECEASED';
    allergies: Array<{ substance: string; severity: string; reaction?: string }> | null;
    chronic_conditions: Array<{ condition: string; diagnosed_year?: number; notes?: string }> | null;
    emergency_contact: { name?: string; relationship?: string; phone?: string } | null;
    address: { city?: string; state?: string } | null;
    created_at: string;
}

interface PatientsIndexProps {
    patients: {
        data: Patient[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
        blood_group?: string;
        status?: string;
    };
    bloodGroups: string[];
    genders: string[];
    statuses: string[];
}

export default function PatientsIndex({ patients, filters, bloodGroups, genders, statuses }: PatientsIndexProps) {
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [bloodGroupFilter, setBloodGroupFilter] = useState(filters.blood_group || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    // Form for new patient registration
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        dob: '',
        gender: 'MALE',
        blood_group: 'UNKNOWN',
        phone: '',
        email: '',
        national_id: '',
        emergency_contact: {
            name: '',
            relationship: '',
            phone: '',
        },
        address: {
            street: '',
            city: '',
            state: '',
            postal_code: '',
            country: '',
        },
        allergies: [] as Array<{ substance: string; severity: string; reaction: string }>,
        chronic_conditions: [] as Array<{ condition: string; diagnosed_year: string; notes: string }>,
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/patients', {
            search: search || undefined,
            blood_group: bloodGroupFilter || undefined,
            status: statusFilter || undefined,
        }, { preserveState: true });
    };

    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/patients', {
            onSuccess: () => {
                setIsRegisterModalOpen(false);
                reset();
            },
        });
    };

    const addAllergy = () => {
        setData('allergies', [
            ...data.allergies,
            { substance: '', severity: 'Moderate', reaction: '' },
        ]);
    };

    const removeAllergy = (index: number) => {
        setData('allergies', data.allergies.filter((_, i) => i !== index));
    };

    const addChronicCondition = () => {
        setData('chronic_conditions', [
            ...data.chronic_conditions,
            { condition: '', diagnosed_year: new Date().getFullYear().toString(), notes: '' },
        ]);
    };

    const removeChronicCondition = (index: number) => {
        setData('chronic_conditions', data.chronic_conditions.filter((_, i) => i !== index));
    };

    return (
        <AppLayout title="Patient Master Registry">
            <div className="space-y-6">
                {/* Header & Registration Trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Master Registry</h1>
                            <Badge variant="cyan" className="font-semibold">{patients.total} Patients Enrolled</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Enterprise Master Patient Index (EMPI) with sequential MRN generation, blood profiles, and alert badges.
                        </p>
                    </div>

                    <Link href="/patients/create">
                        <Button
                            variant="primary"
                            className="shadow-sm shadow-cyan-600/30 self-start sm:self-auto"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Register New Patient
                        </Button>
                    </Link>
                </div>

                {/* Filter and Search Bar */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by Patient Name, MRN (e.g. MRN-2026-000001), Phone, or National ID..."
                                    className="pl-10"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={bloodGroupFilter}
                                    onChange={(e) => setBloodGroupFilter(e.target.value)}
                                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="">All Blood Groups</option>
                                    {bloodGroups.map((bg) => (
                                        <option key={bg} value={bg}>{bg}</option>
                                    ))}
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="">All Statuses</option>
                                    {statuses.map((st) => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>

                                <Button type="submit" variant="secondary" className="px-4">
                                    <Filter className="w-4 h-4 mr-1.5" />
                                    Filter
                                </Button>

                                {(search || bloodGroupFilter || statusFilter) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setSearch('');
                                            setBloodGroupFilter('');
                                            setStatusFilter('');
                                            router.get('/patients');
                                        }}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Patient Directory Table */}
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5">MRN & Patient Name</th>
                                    <th className="px-6 py-3.5">Age & Gender</th>
                                    <th className="px-6 py-3.5">Blood Group</th>
                                    <th className="px-6 py-3.5">Contact Details</th>
                                    <th className="px-6 py-3.5">Clinical Alerts</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {patients.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                            <Users className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                                            <p className="font-medium text-slate-600">No patient records found</p>
                                            <p className="text-xs text-slate-400 mt-1">Try modifying your search or enroll a new patient into the registry.</p>
                                            <Link href="/patients/create">
                                                <Button variant="outline" size="sm" className="mt-3">
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Register New Patient
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ) : (
                                    patients.data.map((patient) => (
                                        <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                                        {patient.first_name[0]}{patient.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <Link href={`/patients/${patient.id}`} className="font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">
                                                            {patient.full_name}
                                                        </Link>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="font-mono text-xs font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200/60">
                                                                {patient.mrn}
                                                            </span>
                                                            {patient.national_id && (
                                                                <span className="text-[11px] text-slate-400">ID: {patient.national_id}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">{patient.age !== null ? `${patient.age} yrs` : 'N/A'}</div>
                                                <div className="text-xs text-slate-400 capitalize">{patient.gender.toLowerCase()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full border ${
                                                    patient.blood_group === 'UNKNOWN' 
                                                        ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                    <HeartPulse className="w-3 h-3 text-rose-500" />
                                                    {patient.blood_group}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    {patient.phone}
                                                </div>
                                                {patient.email && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                        {patient.email}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[240px]">
                                                    {patient.allergies && patient.allergies.length > 0 ? (
                                                        patient.allergies.slice(0, 2).map((al, idx) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                                                {al.substance}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-slate-400">No known allergies</span>
                                                    )}
                                                    {patient.allergies && patient.allergies.length > 2 && (
                                                        <span className="text-[10px] text-slate-400 self-center">+{patient.allergies.length - 2} more</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={patient.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[11px]">
                                                    {patient.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/patients/${patient.id}`}
                                                        className="px-2.5 py-1 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-md transition-colors"
                                                    >
                                                        360 Dossier
                                                    </Link>
                                                    <Link
                                                        href={`/appointments?patient_id=${patient.id}`}
                                                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                                                        title="Schedule Appointment"
                                                    >
                                                        <Calendar className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {patients.last_page > 1 && (
                        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                            <div>
                                Page {patients.current_page} of {patients.last_page} ({patients.total} records)
                            </div>
                            <div className="flex gap-1">
                                {patients.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => link.url && router.get(link.url)}
                                        disabled={!link.url}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded text-xs font-medium ${
                                            link.active
                                                ? 'bg-cyan-600 text-white'
                                                : link.url
                                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                : 'text-slate-300 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Modal: Register New Patient */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Patient Registration</h2>
                                <p className="text-xs text-slate-500">Assigns next sequential MRN under current tenant automatically.</p>
                            </div>
                            <button onClick={() => setIsRegisterModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRegisterSubmit} className="p-6 space-y-6">
                            {/* Personal Demographics */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-700 mb-3 flex items-center gap-1.5">
                                    <UserCheck className="w-4 h-4" /> Demographics & Identity
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                                        <Input
                                            value={data.first_name}
                                            onChange={(e) => setData('first_name', e.target.value)}
                                            required
                                            placeholder="e.g. John"
                                        />
                                        {errors.first_name && <p className="text-xs text-rose-500 mt-1">{errors.first_name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                                        <Input
                                            value={data.last_name}
                                            onChange={(e) => setData('last_name', e.target.value)}
                                            required
                                            placeholder="e.g. Doe"
                                        />
                                        {errors.last_name && <p className="text-xs text-rose-500 mt-1">{errors.last_name}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                                        <Input
                                            type="date"
                                            value={data.dob}
                                            onChange={(e) => setData('dob', e.target.value)}
                                            required
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                        {errors.dob && <p className="text-xs text-rose-500 mt-1">{errors.dob}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                                        <select
                                            value={data.gender}
                                            onChange={(e) => setData('gender', e.target.value as any)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            required
                                        >
                                            <option value="MALE">Male</option>
                                            <option value="FEMALE">Female</option>
                                            <option value="OTHER">Other / Non-Binary</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                                        <select
                                            value={data.blood_group}
                                            onChange={(e) => setData('blood_group', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        >
                                            {bloodGroups.map((bg) => (
                                                <option key={bg} value={bg}>{bg}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">National ID / Passport</label>
                                        <Input
                                            value={data.national_id}
                                            onChange={(e) => setData('national_id', e.target.value)}
                                            placeholder="e.g. NID-987654321"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-700 mb-3 flex items-center gap-1.5">
                                    <Phone className="w-4 h-4" /> Contact Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                                        <Input
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            required
                                            placeholder="+1 (555) 234-5678"
                                        />
                                        {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                                        <Input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="patient@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-700 mb-3 flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4" /> Emergency Contact
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
                                        <Input
                                            value={data.emergency_contact.name}
                                            onChange={(e) => setData('emergency_contact', { ...data.emergency_contact, name: e.target.value })}
                                            placeholder="e.g. Jane Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                                        <Input
                                            value={data.emergency_contact.relationship}
                                            onChange={(e) => setData('emergency_contact', { ...data.emergency_contact, relationship: e.target.value })}
                                            placeholder="e.g. Spouse / Parent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                                        <Input
                                            value={data.emergency_contact.phone}
                                            onChange={(e) => setData('emergency_contact', { ...data.emergency_contact, phone: e.target.value })}
                                            placeholder="+1 (555) 999-8888"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Allergies Builder */}
                            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Known Allergies
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addAllergy}
                                        className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Allergy
                                    </button>
                                </div>

                                {data.allergies.length === 0 ? (
                                    <p className="text-xs text-amber-700/80 italic">No allergies recorded. Click "+ Add Allergy" if applicable.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {data.allergies.map((allergy, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Substance (e.g. Penicillin, Peanuts)"
                                                    value={allergy.substance}
                                                    onChange={(e) => {
                                                        const updated = [...data.allergies];
                                                        updated[index].substance = e.target.value;
                                                        setData('allergies', updated);
                                                    }}
                                                    className="flex-1 bg-white"
                                                    required
                                                />
                                                <select
                                                    value={allergy.severity}
                                                    onChange={(e) => {
                                                        const updated = [...data.allergies];
                                                        updated[index].severity = e.target.value;
                                                        setData('allergies', updated);
                                                    }}
                                                    className="px-2.5 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800"
                                                >
                                                    <option value="Mild">Mild</option>
                                                    <option value="Moderate">Moderate</option>
                                                    <option value="Severe / Anaphylactic">Severe / Anaphylactic</option>
                                                </select>
                                                <Input
                                                    placeholder="Reaction (e.g. Hives, Rash)"
                                                    value={allergy.reaction}
                                                    onChange={(e) => {
                                                        const updated = [...data.allergies];
                                                        updated[index].reaction = e.target.value;
                                                        setData('allergies', updated);
                                                    }}
                                                    className="flex-1 bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeAllergy(index)}
                                                    className="p-2 text-rose-500 hover:text-rose-700"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chronic Conditions Builder */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <HeartPulse className="w-4 h-4 text-cyan-600" /> Chronic Medical Conditions
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addChronicCondition}
                                        className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Condition
                                    </button>
                                </div>

                                {data.chronic_conditions.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">No chronic medical history recorded.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {data.chronic_conditions.map((condition, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Condition (e.g. Hypertension, Type 2 Diabetes)"
                                                    value={condition.condition}
                                                    onChange={(e) => {
                                                        const updated = [...data.chronic_conditions];
                                                        updated[index].condition = e.target.value;
                                                        setData('chronic_conditions', updated);
                                                    }}
                                                    className="flex-2 bg-white"
                                                    required
                                                />
                                                <Input
                                                    placeholder="Diagnosed Year (e.g. 2021)"
                                                    value={condition.diagnosed_year}
                                                    onChange={(e) => {
                                                        const updated = [...data.chronic_conditions];
                                                        updated[index].diagnosed_year = e.target.value;
                                                        setData('chronic_conditions', updated);
                                                    }}
                                                    className="w-32 bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeChronicCondition(index)}
                                                    className="p-2 text-rose-500 hover:text-rose-700"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsRegisterModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={processing}
                                >
                                    {processing ? 'Registering Patient...' : 'Complete Registration'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
