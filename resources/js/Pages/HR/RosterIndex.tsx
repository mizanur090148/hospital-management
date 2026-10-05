import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    CalendarRange, Clock, Plus, Search, Filter,
    CheckCircle2, XCircle, AlertCircle, RefreshCw,
    Building2, Users, Printer, ChevronLeft, ChevronRight, X
} from 'lucide-react';

interface ShiftTemplate {
    id: string;
    name: string;
    code: string;
    start_time: string;
    end_time: string;
    duration_hours: number;
    color: string;
    is_night_shift: boolean;
}

interface Department {
    id: string;
    name: string;
}

interface Branch {
    id: string;
    name: string;
}

interface StaffMember {
    id: string;
    name: string;
    email: string;
    user_type: string;
    department_id?: string;
    branch_id?: string;
}

interface StaffRoster {
    id: string;
    user_id: string;
    shift_template_id: string;
    department_id?: string;
    branch_id?: string;
    duty_date: string;
    room_or_station?: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'ABSENT' | 'SWAPPED' | 'CANCELLED';
    notes?: string;
    user?: StaffMember;
    shift_template?: ShiftTemplate;
    shiftTemplate?: ShiftTemplate;
    department?: Department;
    branch?: Branch;
}

interface Props {
    rosters: StaffRoster[];
    shiftTemplates: ShiftTemplate[];
    departments: Department[];
    branches: Branch[];
    staffMembers: StaffMember[];
    filters: {
        start_date: string;
        end_date: string;
        department_id?: string;
        branch_id?: string;
    };
    rosterStatuses: string[];
}

export default function RosterIndex({
    rosters,
    shiftTemplates,
    departments,
    branches,
    staffMembers,
    filters,
    rosterStatuses,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);

    // Form for creating a new shift template
    const templateForm = useForm({
        name: '',
        code: '',
        start_time: '08:00',
        end_time: '16:00',
        duration_hours: 8.0,
        color: '#0891b2',
        is_night_shift: false,
    });

    // Form for assigning a duty shift
    const assignForm = useForm({
        user_id: staffMembers[0]?.id || '',
        shift_template_id: shiftTemplates[0]?.id || '',
        department_id: departments[0]?.id || '',
        branch_id: branches[0]?.id || '',
        duty_date: new Date().toISOString().split('T')[0],
        room_or_station: '',
        notes: '',
    });

    const handleCreateTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        templateForm.post('/hr/rosters/templates', {
            preserveScroll: true,
            onSuccess: () => {
                setTemplateModalOpen(false);
                templateForm.reset();
            },
        });
    };

    const handleAssignShift = (e: React.FormEvent) => {
        e.preventDefault();
        assignForm.post('/hr/rosters', {
            preserveScroll: true,
            onSuccess: () => {
                setAssignModalOpen(false);
                assignForm.reset();
            },
        });
    };

    const handleStatusUpdate = (rosterId: string, status: string) => {
        router.patch(`/hr/rosters/${rosterId}/status`, { status }, {
            preserveScroll: true,
        });
    };

    const handleFilterDate = (daysDelta: number) => {
        const start = new Date(filters.start_date);
        start.setDate(start.getDate() + daysDelta);
        const end = new Date(filters.end_date);
        end.setDate(end.getDate() + daysDelta);

        router.get('/hr/rosters', {
            ...filters,
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0],
        }, { preserveState: true });
    };

    // Filtered rosters based on search and status
    const filteredRosters = rosters.filter((roster) => {
        const staff = roster.user;
        const matchesSearch = !searchQuery ||
            staff?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            staff?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            roster.room_or_station?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus === 'ALL' || roster.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge variant="success">Completed</Badge>;
            case 'SCHEDULED':
                return <Badge variant="cyan">Scheduled</Badge>;
            case 'ABSENT':
                return <Badge variant="destructive">Absent</Badge>;
            case 'SWAPPED':
                return <Badge variant="warning">Swapped</Badge>;
            case 'CANCELLED':
                return <Badge variant="default">Cancelled</Badge>;
            default:
                return <Badge variant="default">{status}</Badge>;
        }
    };

    return (
        <AppLayout title="Staff Duty Rosters & Shifts">
            <Head title="Staff Duty Rosters - ApexCare Hospital" />

            <div className="space-y-6">
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600">
                                <CalendarRange className="w-5 h-5 stroke-[2.5]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Duty Rosters & Shift Planning</h1>
                                <p className="text-xs text-slate-500 font-medium">Coordinate 24/7 hospital rotations across clinical units and departments</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Print Sheet
                        </button>
                        <Button
                            variant="secondary"
                            onClick={() => setTemplateModalOpen(true)}
                            className="text-xs flex items-center gap-1.5"
                        >
                            <Clock className="w-3.5 h-3.5 text-cyan-600" />
                            Shift Templates ({shiftTemplates.length})
                        </Button>
                        <Button
                            onClick={() => setAssignModalOpen(true)}
                            className="text-xs flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Assign Duty Shift
                        </Button>
                    </div>
                </div>

                {/* Shift Template Quick Preview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {shiftTemplates.map((t) => (
                        <div
                            key={t.id}
                            className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden"
                            style={{ borderLeftWidth: '4px', borderLeftColor: t.color || '#0891b2' }}
                        >
                            <div className="font-semibold text-xs text-slate-800 truncate">{t.name}</div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                {t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                <span>{t.duration_hours}h duration</span>
                                {t.is_night_shift && <span className="text-purple-600 font-medium">Night</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters & Date Range Controls */}
                <Card className="p-4 bg-white border-slate-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Week navigation */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => handleFilterDate(-7)}
                                    className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
                                    title="Previous Week"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-semibold text-slate-700 px-2 font-mono">
                                    {filters.start_date} to {filters.end_date}
                                </span>
                                <button
                                    onClick={() => handleFilterDate(7)}
                                    className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
                                    title="Next Week"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Status Filter Pills */}
                            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
                                <button
                                    onClick={() => setSelectedStatus('ALL')}
                                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${selectedStatus === 'ALL' ? 'bg-cyan-600 text-white font-semibold shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                                >
                                    All Shifts ({rosters.length})
                                </button>
                                {rosterStatuses.map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setSelectedStatus(st)}
                                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${selectedStatus === st ? 'bg-cyan-600 text-white font-semibold shadow-2xs' : 'text-slate-600 hover:bg-slate-200/60'}`}
                                    >
                                        {st} ({rosters.filter(r => r.status === st).length})
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full lg:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search staff or station..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 text-xs"
                            />
                        </div>
                    </div>
                </Card>

                {/* Duty Roster Table */}
                <Card className="overflow-hidden border-slate-200 shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Healthcare Staff</th>
                                    <th className="py-3 px-4">Shift Details</th>
                                    <th className="py-3 px-4">Department & Station</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRosters.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            <CalendarRange className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                                            <p className="font-medium text-slate-600">No duty shifts scheduled for this period</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;Assign Duty Shift&rdquo; to schedule clinical staff</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRosters.map((roster) => {
                                        const shift = roster.shiftTemplate || roster.shift_template;
                                        const staff = roster.user;
                                        return (
                                            <tr key={roster.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-900 font-mono">
                                                        {roster.duty_date}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {new Date(roster.duty_date).toLocaleDateString('en-US', { weekday: 'short' })}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">
                                                            {staff?.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-800">{staff?.name}</div>
                                                            <div className="text-[10px] text-slate-400 capitalize">
                                                                {staff?.user_type?.replace('_', ' ')} • {staff?.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {shift ? (
                                                        <div>
                                                            <span
                                                                className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-white mr-1.5"
                                                                style={{ backgroundColor: shift.color || '#0891b2' }}
                                                            >
                                                                {shift.name}
                                                            </span>
                                                            <span className="font-mono text-slate-500 text-[11px]">
                                                                {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">General Shift</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="text-slate-700 font-medium">
                                                        {roster.department?.name || 'General Clinical'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {roster.room_or_station ? `Station: ${roster.room_or_station}` : 'Unassigned'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    {getStatusBadge(roster.status)}
                                                </td>
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {roster.status === 'SCHEDULED' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleStatusUpdate(roster.id, 'COMPLETED')}
                                                                    className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-[11px] transition-colors"
                                                                    title="Mark Shift Completed"
                                                                >
                                                                    Completed
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusUpdate(roster.id, 'ABSENT')}
                                                                    className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-medium text-[11px] transition-colors"
                                                                    title="Mark Absent"
                                                                >
                                                                    Absent
                                                                </button>
                                                            </>
                                                        )}
                                                        {roster.status !== 'CANCELLED' && roster.status !== 'COMPLETED' && (
                                                            <button
                                                                onClick={() => handleStatusUpdate(roster.id, 'CANCELLED')}
                                                                className="px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium text-[11px] transition-colors"
                                                                title="Cancel Shift"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal: New Shift Template */}
            {templateModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">New Shift Template</h3>
                            <button onClick={() => setTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTemplate} className="space-y-4 mt-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Shift Name</label>
                                <Input
                                    type="text"
                                    required
                                    placeholder="e.g. Morning Shift, Night ICU"
                                    value={templateForm.data.name}
                                    onChange={(e) => templateForm.setData('name', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                                    <Input
                                        type="time"
                                        required
                                        value={templateForm.data.start_time}
                                        onChange={(e) => templateForm.setData('start_time', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                                    <Input
                                        type="time"
                                        required
                                        value={templateForm.data.end_time}
                                        onChange={(e) => templateForm.setData('end_time', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Hours Duration</label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="1"
                                        value={templateForm.data.duration_hours}
                                        onChange={(e) => templateForm.setData('duration_hours', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Color Marker</label>
                                    <input
                                        type="color"
                                        className="h-9 w-full rounded-lg border border-slate-200 cursor-pointer p-1"
                                        value={templateForm.data.color}
                                        onChange={(e) => templateForm.setData('color', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="is_night_shift"
                                    checked={templateForm.data.is_night_shift}
                                    onChange={(e) => templateForm.setData('is_night_shift', e.target.checked)}
                                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <label htmlFor="is_night_shift" className="text-xs font-medium text-slate-700">
                                    Designate as Overnight / Night Shift
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setTemplateModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={templateForm.processing} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                                    Save Template
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Assign Duty Shift */}
            {assignModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-fadeIn">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Assign Duty Shift</h3>
                            <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignShift} className="space-y-4 mt-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Select Healthcare Staff *</label>
                                <select
                                    required
                                    value={assignForm.data.user_id}
                                    onChange={(e) => assignForm.setData('user_id', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                >
                                    {staffMembers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.user_type.replace('_', ' ')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Shift Template *</label>
                                    <select
                                        required
                                        value={assignForm.data.shift_template_id}
                                        onChange={(e) => assignForm.setData('shift_template_id', e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                    >
                                        {shiftTemplates.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Duty Date *</label>
                                    <Input
                                        type="date"
                                        required
                                        value={assignForm.data.duty_date}
                                        onChange={(e) => assignForm.setData('duty_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Department</label>
                                    <select
                                        value={assignForm.data.department_id}
                                        onChange={(e) => assignForm.setData('department_id', e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                    >
                                        <option value="">General Clinical</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Room or Station</label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. ICU Ward 3, Desk A"
                                        value={assignForm.data.room_or_station}
                                        onChange={(e) => assignForm.setData('room_or_station', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Duty Notes / Handover</label>
                                <textarea
                                    rows={2}
                                    placeholder="Optional notes or instructions..."
                                    value={assignForm.data.notes}
                                    onChange={(e) => assignForm.setData('notes', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setAssignModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={assignForm.processing} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                                    Confirm Shift Assignment
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
