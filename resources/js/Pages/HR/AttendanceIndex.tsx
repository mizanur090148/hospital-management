import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Clock, Calendar, CheckCircle2, XCircle, AlertCircle,
    Users, Plus, Search, Filter, ArrowRight, UserCheck,
    FileText, Check, X, ShieldAlert, LogIn, LogOut
} from 'lucide-react';

interface StaffMember {
    id: string;
    name: string;
    email: string;
    user_type: string;
    branch_id?: string;
}

interface StaffAttendance {
    id: string;
    user_id: string;
    branch_id?: string;
    attendance_date: string;
    clock_in: string;
    clock_out?: string;
    working_hours?: number;
    status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE';
    notes?: string;
    user?: StaffMember;
    branch?: { id: string; name: string };
}

interface LeaveRequest {
    id: string;
    user_id: string;
    leave_type: 'ANNUAL' | 'SICK' | 'CASUAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID';
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    approver_notes?: string;
    created_at: string;
    user?: StaffMember;
    approver?: { id: string; name: string };
}

interface Props {
    attendances: StaffAttendance[];
    leaveRequests: LeaveRequest[];
    branches: Array<{ id: string; name: string }>;
    staffMembers: StaffMember[];
    stats: {
        total_staff: number;
        present_count: number;
        late_count: number;
        pending_leaves: number;
    };
    filters: {
        date: string;
        branch_id?: string;
    };
    leaveTypes: string[];
    attendanceStatuses: string[];
}

export default function AttendanceIndex({
    attendances,
    leaveRequests,
    branches,
    staffMembers,
    stats,
    filters,
    leaveTypes,
    attendanceStatuses,
}: Props) {
    const [activeTab, setActiveTab] = useState<'attendance' | 'leaves'>('attendance');
    const [searchQuery, setSearchQuery] = useState('');
    const [clockInModalOpen, setClockInModalOpen] = useState(false);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [reviewModalLeave, setReviewModalLeave] = useState<LeaveRequest | null>(null);

    // Clock In Form
    const clockInForm = useForm({
        user_id: staffMembers[0]?.id || '',
        clock_in: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        notes: '',
    });

    // Leave Form
    const leaveForm = useForm({
        user_id: staffMembers[0]?.id || '',
        leave_type: 'SICK',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
    });

    // Review Leave Form
    const reviewForm = useForm({
        status: 'APPROVED',
        approver_notes: '',
    });

    const handleClockIn = (e: React.FormEvent) => {
        e.preventDefault();
        clockInForm.post('/hr/attendance/clock-in', {
            preserveScroll: true,
            onSuccess: () => {
                setClockInModalOpen(false);
                clockInForm.reset();
            },
        });
    };

    const handleClockOut = (attendanceId: string) => {
        const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        router.post(`/hr/attendance/${attendanceId}/clock-out`, {
            clock_out: timeNow,
        }, { preserveScroll: true });
    };

    const handleSubmitLeave = (e: React.FormEvent) => {
        e.preventDefault();
        leaveForm.post('/hr/leaves', {
            preserveScroll: true,
            onSuccess: () => {
                setLeaveModalOpen(false);
                leaveForm.reset();
            },
        });
    };

    const handleReviewLeave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewModalLeave) return;
        reviewForm.patch(`/hr/leaves/${reviewModalLeave.id}/review`, {
            preserveScroll: true,
            onSuccess: () => {
                setReviewModalLeave(null);
                reviewForm.reset();
            },
        });
    };

    const handleFilterDate = (newDate: string) => {
        router.get('/hr/attendance', {
            ...filters,
            date: newDate,
        }, { preserveState: true });
    };

    const filteredAttendances = attendances.filter((att) => {
        const name = att.user?.name || '';
        const email = att.user?.email || '';
        return !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()) || email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const filteredLeaves = leaveRequests.filter((l) => {
        const name = l.user?.name || '';
        return !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase()) || l.reason.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const getAttendanceBadge = (status: string) => {
        switch (status) {
            case 'PRESENT':
                return <Badge variant="success">Present</Badge>;
            case 'LATE':
                return <Badge variant="warning">Late Arrival</Badge>;
            case 'HALF_DAY':
                return <Badge variant="purple">Half Day</Badge>;
            case 'ON_LEAVE':
                return <Badge variant="info">On Approved Leave</Badge>;
            case 'ABSENT':
                return <Badge variant="destructive">Absent</Badge>;
            default:
                return <Badge variant="default">{status}</Badge>;
        }
    };

    const getLeaveStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge variant="success">Approved</Badge>;
            case 'PENDING':
                return <Badge variant="warning">Pending Review</Badge>;
            case 'REJECTED':
                return <Badge variant="destructive">Rejected</Badge>;
            case 'CANCELLED':
                return <Badge variant="default">Cancelled</Badge>;
            default:
                return <Badge variant="default">{status}</Badge>;
        }
    };

    return (
        <AppLayout title="Staff Attendance & Leave Tracking">
            <Head title="Staff Attendance & Leaves - ApexCare Hospital" />

            <div className="space-y-6">
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                                <Clock className="w-5 h-5 stroke-[2.5]" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Attendance & Leave Management</h1>
                                <p className="text-xs text-slate-500 font-medium">Live shift clock-in/out records, punctuality tracking, and leave workflow</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <Button
                            variant="secondary"
                            onClick={() => setLeaveModalOpen(true)}
                            className="text-xs flex items-center gap-1.5"
                        >
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            Apply for Leave
                        </Button>
                        <Button
                            onClick={() => setClockInModalOpen(true)}
                            className="text-xs flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                        >
                            <LogIn className="w-3.5 h-3.5" />
                            Record Clock-In
                        </Button>
                    </div>
                </div>

                {/* Key Metrics Ribbon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 bg-white border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Active Staff</div>
                                <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_staff}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">Clinical & operational personnel</div>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Present Today</div>
                                <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.present_count}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <UserCheck className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">Clocked in on active duty</div>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Late Arrivals</div>
                                <div className="text-2xl font-bold text-amber-700 mt-1">{stats.late_count}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">Past scheduled shift grace period</div>
                    </Card>

                    <Card className="p-4 bg-white border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Pending Leaves</div>
                                <div className="text-2xl font-bold text-purple-700 mt-1">{stats.pending_leaves}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">Awaiting supervisor review</div>
                    </Card>
                </div>

                {/* Tabs & Filter Bar */}
                <Card className="p-4 bg-white border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'attendance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Daily Clock Records ({attendances.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('leaves')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'leaves' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Leave Applications ({leaveRequests.length})
                            </button>
                        </div>

                        {/* Date Picker & Search */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">Date:</span>
                                <Input
                                    type="date"
                                    value={filters.date}
                                    onChange={(e) => handleFilterDate(e.target.value)}
                                    className="text-xs py-1.5 w-36"
                                />
                            </div>

                            <div className="relative w-full md:w-56">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Search staff name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 text-xs py-1.5"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Tab 1: Attendance Table */}
                {activeTab === 'attendance' && (
                    <Card className="overflow-hidden border-slate-200 shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-4">Staff Member</th>
                                        <th className="py-3 px-4">Role & Unit</th>
                                        <th className="py-3 px-4">Clock In</th>
                                        <th className="py-3 px-4">Clock Out</th>
                                        <th className="py-3 px-4">Total Hours</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAttendances.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400">
                                                <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                                                <p className="font-medium text-slate-600">No attendance records logged for {filters.date}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Click &ldquo;Record Clock-In&rdquo; to start tracking staff attendance</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAttendances.map((att) => {
                                            const staff = att.user;
                                            return (
                                                <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                                                                {staff?.name?.charAt(0) || 'U'}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-slate-900">{staff?.name}</div>
                                                                <div className="text-[10px] text-slate-400">{staff?.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="capitalize font-medium text-slate-700">
                                                            {staff?.user_type?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                                                        {att.clock_in ? att.clock_in.slice(0, 5) : '--:--'}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-slate-600">
                                                        {att.clock_out ? att.clock_out.slice(0, 5) : (
                                                            <span className="text-teal-600 font-semibold animate-pulse">On Duty</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-slate-700">
                                                        {att.working_hours ? `${att.working_hours} hrs` : '--'}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {getAttendanceBadge(att.status)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        {!att.clock_out && (
                                                            <button
                                                                onClick={() => handleClockOut(att.id)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold transition-colors"
                                                            >
                                                                <LogOut className="w-3 h-3" />
                                                                Clock Out
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab 2: Leaves Table */}
                {activeTab === 'leaves' && (
                    <Card className="overflow-hidden border-slate-200 shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-4">Staff Member</th>
                                        <th className="py-3 px-4">Leave Type</th>
                                        <th className="py-3 px-4">Date Range</th>
                                        <th className="py-3 px-4">Days</th>
                                        <th className="py-3 px-4">Reason / Notes</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLeaves.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400">
                                                <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                                                <p className="font-medium text-slate-600">No leave applications submitted</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Staff leave requests will appear here for supervisor review</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLeaves.map((leave) => {
                                            const staff = leave.user;
                                            return (
                                                <tr key={leave.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-semibold text-slate-900">{staff?.name}</div>
                                                        <div className="text-[10px] text-slate-400">{staff?.email}</div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <Badge variant="cyan" className="font-semibold">
                                                            {leave.leave_type}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                                                        {leave.start_date} <span className="text-slate-400">to</span> {leave.end_date}
                                                    </td>
                                                    <td className="py-3 px-4 font-bold text-slate-800">
                                                        {leave.total_days} {leave.total_days === 1 ? 'day' : 'days'}
                                                    </td>
                                                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                                                        {leave.reason}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {getLeaveStatusBadge(leave.status)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        {leave.status === 'PENDING' ? (
                                                            <button
                                                                onClick={() => {
                                                                    setReviewModalLeave(leave);
                                                                    reviewForm.setData({ status: 'APPROVED', approver_notes: '' });
                                                                }}
                                                                className="px-2.5 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold text-[11px] transition-colors"
                                                            >
                                                                Review / Decision
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400">
                                                                {leave.approver ? `by ${leave.approver.name}` : 'Processed'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Modal: Record Clock-In */}
            {clockInModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Record Staff Clock-In</h3>
                            <button onClick={() => setClockInModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleClockIn} className="space-y-4 mt-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Select Healthcare Staff *</label>
                                <select
                                    required
                                    value={clockInForm.data.user_id}
                                    onChange={(e) => clockInForm.setData('user_id', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                >
                                    {staffMembers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.user_type.replace('_', ' ')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Clock-In Time</label>
                                <Input
                                    type="time"
                                    required
                                    value={clockInForm.data.clock_in}
                                    onChange={(e) => clockInForm.setData('clock_in', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Station / Check-in Notes</label>
                                <Input
                                    type="text"
                                    placeholder="e.g. On-time start at Trauma Ward"
                                    value={clockInForm.data.notes}
                                    onChange={(e) => clockInForm.setData('notes', e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setClockInModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={clockInForm.processing} className="bg-teal-600 hover:bg-teal-700 text-white">
                                    Confirm Clock-In
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Apply for Leave */}
            {leaveModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Submit Leave Application</h3>
                            <button onClick={() => setLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitLeave} className="space-y-4 mt-4 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Select Healthcare Staff *</label>
                                <select
                                    required
                                    value={leaveForm.data.user_id}
                                    onChange={(e) => leaveForm.setData('user_id', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                >
                                    {staffMembers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.user_type.replace('_', ' ')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Leave Classification *</label>
                                <select
                                    required
                                    value={leaveForm.data.leave_type}
                                    onChange={(e) => leaveForm.setData('leave_type', e.target.value as any)}
                                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                >
                                    {leaveTypes.map((type) => (
                                        <option key={type} value={type}>{type} LEAVE</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                                    <Input
                                        type="date"
                                        required
                                        value={leaveForm.data.start_date}
                                        onChange={(e) => leaveForm.setData('start_date', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                                    <Input
                                        type="date"
                                        required
                                        value={leaveForm.data.end_date}
                                        onChange={(e) => leaveForm.setData('end_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Reason for Leave *</label>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Provide detailed clinical or personal reason..."
                                    value={leaveForm.data.reason}
                                    onChange={(e) => leaveForm.setData('reason', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-800"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setLeaveModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={leaveForm.processing} className="bg-teal-600 hover:bg-teal-700 text-white">
                                    Submit Application
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Review / Decision on Leave Request */}
            {reviewModalLeave && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Review Leave Application</h3>
                            <button onClick={() => setReviewModalLeave(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="my-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                            <div className="font-semibold text-slate-800">{reviewModalLeave.user?.name}</div>
                            <div className="text-slate-500">
                                {reviewModalLeave.leave_type} Leave ({reviewModalLeave.total_days} days): {reviewModalLeave.start_date} to {reviewModalLeave.end_date}
                            </div>
                            <div className="text-slate-600 italic mt-1">&ldquo;{reviewModalLeave.reason}&rdquo;</div>
                        </div>

                        <form onSubmit={handleReviewLeave} className="space-y-4 mt-2 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Supervisor Decision *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => reviewForm.setData('status', 'APPROVED')}
                                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${reviewForm.data.status === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve Leave
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => reviewForm.setData('status', 'REJECTED')}
                                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${reviewForm.data.status === 'REJECTED' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200'}`}
                                    >
                                        <X className="w-4 h-4" />
                                        Reject Leave
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Supervisor Remarks / Notes</label>
                                <Input
                                    type="text"
                                    placeholder="Optional approval or rejection remarks..."
                                    value={reviewForm.data.approver_notes}
                                    onChange={(e) => reviewForm.setData('approver_notes', e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="secondary" onClick={() => setReviewModalLeave(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={reviewForm.processing} className="bg-slate-900 hover:bg-slate-800 text-white">
                                    Confirm Decision
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
