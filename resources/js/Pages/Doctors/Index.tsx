import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    Stethoscope, Plus, Search, Filter, Calendar, Clock,
    DollarSign, Video, ShieldCheck, UserCheck, X, ChevronRight,
    Building, Award, CheckCircle2
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface Doctor {
    id: string;
    license_number: string;
    qualification: string;
    specialization: string;
    consultation_fee: string;
    follow_up_fee: string;
    emergency_fee: string;
    bio: string | null;
    is_available_for_teleconsult: boolean;
    status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
    };
    department: {
        id: string;
        name: string;
        code: string;
    };
    schedules: Array<{
        id: string;
        day_of_week: number;
        day_name?: string;
        start_time: string;
        end_time: string;
        slot_duration_minutes: number;
        max_patients: number;
        is_active: boolean;
        branch: {
            id: string;
            name: string;
        };
    }>;
}

interface DoctorsIndexProps {
    doctors: {
        data: Doctor[];
        total: number;
    };
    departments: Array<{ id: string; name: string; code: string }>;
    branches: Array<{ id: string; name: string }>;
    eligibleUsers: Array<{ id: string; name: string; email: string }>;
    filters: {
        search?: string;
        department_id?: string;
        status?: string;
    };
    statuses: string[];
}

export default function DoctorsIndex({
    doctors,
    departments,
    branches,
    eligibleUsers,
    filters,
    statuses,
}: DoctorsIndexProps) {
    const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
    const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<Doctor | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [departmentFilter, setDepartmentFilter] = useState(filters.department_id || '');

    // Form: Create Doctor Profile
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: '',
        department_id: '',
        license_number: '',
        qualification: '',
        specialization: '',
        consultation_fee: '50.00',
        follow_up_fee: '35.00',
        emergency_fee: '80.00',
        bio: '',
        is_available_for_teleconsult: false,
    });

    // Form: Weekly Schedules Configurator
    const scheduleForm = useForm({
        schedules: [
            { branch_id: branches[0]?.id || '', day_of_week: 1, start_time: '09:00', end_time: '13:00', slot_duration_minutes: 15, max_patients: 16, is_active: true },
            { branch_id: branches[0]?.id || '', day_of_week: 2, start_time: '09:00', end_time: '13:00', slot_duration_minutes: 15, max_patients: 16, is_active: true },
            { branch_id: branches[0]?.id || '', day_of_week: 3, start_time: '09:00', end_time: '13:00', slot_duration_minutes: 15, max_patients: 16, is_active: true },
            { branch_id: branches[0]?.id || '', day_of_week: 4, start_time: '09:00', end_time: '13:00', slot_duration_minutes: 15, max_patients: 16, is_active: true },
            { branch_id: branches[0]?.id || '', day_of_week: 5, start_time: '09:00', end_time: '13:00', slot_duration_minutes: 15, max_patients: 16, is_active: true },
        ],
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/doctors', {
            search: search || undefined,
            department_id: departmentFilter || undefined,
        }, { preserveState: true });
    };

    const handleCreateDoctor = (e: React.FormEvent) => {
        e.preventDefault();
        post('/doctors', {
            onSuccess: () => {
                setIsAddDoctorModalOpen(false);
                reset();
            },
        });
    };

    const handleOpenScheduleModal = (doctor: Doctor) => {
        setSelectedDoctorForSchedule(doctor);
        if (doctor.schedules && doctor.schedules.length > 0) {
            scheduleForm.setData('schedules', doctor.schedules.map(s => ({
                branch_id: s.branch.id,
                day_of_week: s.day_of_week,
                start_time: s.start_time.substring(0, 5),
                end_time: s.end_time.substring(0, 5),
                slot_duration_minutes: s.slot_duration_minutes,
                max_patients: s.max_patients,
                is_active: s.is_active,
            })));
        }
    };

    const handleSaveSchedules = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDoctorForSchedule) return;

        scheduleForm.post(`/doctors/${selectedDoctorForSchedule.id}/schedules`, {
            onSuccess: () => {
                setSelectedDoctorForSchedule(null);
            },
        });
    };

    const daysMap = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <AppLayout title="Doctors & Clinical Schedules">
            <div className="space-y-6">
                {/* Header & Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Doctors & Clinical Schedules</h1>
                            <Badge variant="cyan" className="font-semibold">{doctors.total} Physicians</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Specialist directory, consultation fees, and weekly slot booking configurations.
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => setIsAddDoctorModalOpen(true)}
                        className="shadow-sm shadow-cyan-600/30"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Doctor Profile
                    </Button>
                </div>

                {/* Filter and Search */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by Doctor Name, Specialization, License Number..."
                                    className="pl-10"
                                />
                            </div>

                            <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700"
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                ))}
                            </select>

                            <Button type="submit" variant="secondary">
                                <Filter className="w-4 h-4 mr-1.5" /> Filter
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Doctors Directory Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {doctors.data.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                            <Stethoscope className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-700">No doctor profiles found</p>
                            <p className="text-xs text-slate-400 mt-1">Click "Create Doctor Profile" to link a staff account.</p>
                        </div>
                    ) : (
                        doctors.data.map((doctor) => (
                            <Card key={doctor.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white font-bold flex items-center justify-center text-sm shadow-sm shadow-cyan-600/30 shrink-0">
                                            Dr
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-base">{doctor.user.name}</h3>
                                            <p className="text-xs text-cyan-700 font-semibold">{doctor.specialization}</p>
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                                <Award className="w-3 h-3 text-slate-400" />
                                                <span>{doctor.qualification}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Badge variant={doctor.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">
                                        {doctor.status}
                                    </Badge>
                                </div>

                                <CardContent className="p-5 space-y-4">
                                    {/* Department & License */}
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <div>
                                            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Department</span>
                                            <span className="font-semibold text-slate-800">{doctor.department.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px] font-semibold uppercase">License No.</span>
                                            <span className="font-mono font-semibold text-slate-700">{doctor.license_number}</span>
                                        </div>
                                    </div>

                                    {/* Fee Structure */}
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Consultation Fees</span>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200/60">
                                                <div className="text-[10px] text-slate-400">Regular</div>
                                                <div className="text-xs font-bold text-slate-900">${doctor.consultation_fee}</div>
                                            </div>
                                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200/60">
                                                <div className="text-[10px] text-slate-400">Follow-up</div>
                                                <div className="text-xs font-bold text-slate-900">${doctor.follow_up_fee}</div>
                                            </div>
                                            <div className="p-1.5 bg-slate-50 rounded border border-slate-200/60">
                                                <div className="text-[10px] text-slate-400">Emergency</div>
                                                <div className="text-xs font-bold text-rose-700">${doctor.emergency_fee}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Weekly Schedule Preview */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Weekly Schedule</span>
                                            <button
                                                onClick={() => handleOpenScheduleModal(doctor)}
                                                className="text-xs font-semibold text-cyan-600 hover:text-cyan-800"
                                            >
                                                Configure
                                            </button>
                                        </div>

                                        {doctor.schedules && doctor.schedules.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {doctor.schedules.filter(s => s.is_active).map((sch) => (
                                                    <span key={sch.id} className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-cyan-600" />
                                                        {daysMap[sch.day_of_week]?.substring(0, 3)}: {sch.start_time.substring(0, 5)}-{sch.end_time.substring(0, 5)}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No schedules set. Click "Configure" to define slots.</p>
                                        )}
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        {doctor.is_available_for_teleconsult && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                                                <Video className="w-3 h-3" /> Teleconsult Ready
                                            </span>
                                        )}
                                        <div className="ml-auto">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenScheduleModal(doctor)}
                                            >
                                                <Calendar className="w-3.5 h-3.5 mr-1" /> Set Hours
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Modal: Create Doctor Profile */}
            {isAddDoctorModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Create Doctor Profile</h2>
                                <p className="text-xs text-slate-500">Link an existing hospital staff user account to a clinical doctor profile.</p>
                            </div>
                            <button onClick={() => setIsAddDoctorModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDoctor} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Staff Account *</label>
                                <select
                                    value={data.user_id}
                                    onChange={(e) => setData('user_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                    required
                                >
                                    <option value="">-- Choose User --</option>
                                    {eligibleUsers.map((u) => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                                {errors.user_id && <p className="text-xs text-rose-500 mt-1">{errors.user_id}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                                    <select
                                        value={data.department_id}
                                        onChange={(e) => setData('department_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                        required
                                    >
                                        <option value="">-- Choose Department --</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                        ))}
                                    </select>
                                    {errors.department_id && <p className="text-xs text-rose-500 mt-1">{errors.department_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Medical License Number *</label>
                                    <Input
                                        value={data.license_number}
                                        onChange={(e) => setData('license_number', e.target.value)}
                                        placeholder="e.g. MD-LIC-84920"
                                        required
                                    />
                                    {errors.license_number && <p className="text-xs text-rose-500 mt-1">{errors.license_number}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification *</label>
                                    <Input
                                        value={data.qualification}
                                        onChange={(e) => setData('qualification', e.target.value)}
                                        placeholder="e.g. MBBS, MD (Cardiology), FRCS"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Specialization *</label>
                                    <Input
                                        value={data.specialization}
                                        onChange={(e) => setData('specialization', e.target.value)}
                                        placeholder="e.g. Interventional Cardiology"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Regular Consultation Fee ($) *</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={data.consultation_fee}
                                        onChange={(e) => setData('consultation_fee', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Consultation Fee ($)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={data.follow_up_fee}
                                        onChange={(e) => setData('follow_up_fee', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Biography / Summary</label>
                                <textarea
                                    value={data.bio}
                                    onChange={(e) => setData('bio', e.target.value)}
                                    rows={2}
                                    placeholder="Brief background and clinical expertise..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800"
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={data.is_available_for_teleconsult}
                                    onChange={(e) => setData('is_available_for_teleconsult', e.target.checked)}
                                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="text-xs font-medium text-slate-700">Available for Teleconsultation / Video Visits</span>
                            </label>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsAddDoctorModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={processing}>
                                    {processing ? 'Saving...' : 'Register Doctor Profile'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Weekly Schedule Configurator */}
            {selectedDoctorForSchedule && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Configure Hours: Dr. {selectedDoctorForSchedule.user.name}
                                </h2>
                                <p className="text-xs text-slate-500">Define weekly schedule slots and appointment limits.</p>
                            </div>
                            <button onClick={() => setSelectedDoctorForSchedule(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSchedules} className="space-y-4 pt-4">
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {[1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
                                    const schedIndex = scheduleForm.data.schedules.findIndex(s => s.day_of_week === dayNumber);
                                    const sched = schedIndex !== -1 ? scheduleForm.data.schedules[schedIndex] : null;
                                    const isDayActive = !!sched?.is_active;

                                    return (
                                        <div key={dayNumber} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            isDayActive ? 'bg-cyan-50/40 border-cyan-200' : 'bg-slate-50 border-slate-200 opacity-60'
                                        }`}>
                                            <div className="flex items-center gap-3 w-36">
                                                <input
                                                    type="checkbox"
                                                    checked={isDayActive}
                                                    onChange={(e) => {
                                                        const active = e.target.checked;
                                                        let newSchedules = [...scheduleForm.data.schedules];
                                                        if (schedIndex !== -1) {
                                                            newSchedules[schedIndex].is_active = active;
                                                        } else {
                                                            newSchedules.push({
                                                                branch_id: branches[0]?.id || '',
                                                                day_of_week: dayNumber,
                                                                start_time: '09:00',
                                                                end_time: '13:00',
                                                                slot_duration_minutes: 15,
                                                                max_patients: 16,
                                                                is_active: active,
                                                            });
                                                        }
                                                        scheduleForm.setData('schedules', newSchedules);
                                                    }}
                                                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                                />
                                                <span className="font-bold text-xs text-slate-800">{daysMap[dayNumber]}</span>
                                            </div>

                                            {isDayActive && sched && (
                                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400">Hours:</span>
                                                        <input
                                                            type="time"
                                                            value={sched.start_time}
                                                            onChange={(e) => {
                                                                const updated = [...scheduleForm.data.schedules];
                                                                updated[schedIndex].start_time = e.target.value;
                                                                scheduleForm.setData('schedules', updated);
                                                            }}
                                                            className="px-2 py-1 border border-slate-200 rounded text-xs"
                                                            required
                                                        />
                                                        <span>to</span>
                                                        <input
                                                            type="time"
                                                            value={sched.end_time}
                                                            onChange={(e) => {
                                                                const updated = [...scheduleForm.data.schedules];
                                                                updated[schedIndex].end_time = e.target.value;
                                                                scheduleForm.setData('schedules', updated);
                                                            }}
                                                            className="px-2 py-1 border border-slate-200 rounded text-xs"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400">Slot:</span>
                                                        <select
                                                            value={sched.slot_duration_minutes}
                                                            onChange={(e) => {
                                                                const updated = [...scheduleForm.data.schedules];
                                                                updated[schedIndex].slot_duration_minutes = parseInt(e.target.value);
                                                                scheduleForm.setData('schedules', updated);
                                                            }}
                                                            className="px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                                                        >
                                                            <option value={10}>10 min</option>
                                                            <option value={15}>15 min</option>
                                                            <option value={20}>20 min</option>
                                                            <option value={30}>30 min</option>
                                                            <option value={45}>45 min</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <span className="text-slate-400">Max:</span>
                                                        <input
                                                            type="number"
                                                            value={sched.max_patients}
                                                            onChange={(e) => {
                                                                const updated = [...scheduleForm.data.schedules];
                                                                updated[schedIndex].max_patients = parseInt(e.target.value) || 1;
                                                                scheduleForm.setData('schedules', updated);
                                                            }}
                                                            className="w-16 px-2 py-1 border border-slate-200 rounded text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setSelectedDoctorForSchedule(null)}>Cancel</Button>
                                <Button type="submit" variant="primary" disabled={scheduleForm.processing}>
                                    {scheduleForm.processing ? 'Saving...' : 'Save Weekly Schedules'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
