import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    Building2, Layers, BedDouble, Plus, CheckCircle2,
    AlertCircle, Sparkles, Wrench, RefreshCw,
    Users, ChevronRight, X, Phone, Mail, MapPin
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface FacilityProps {
    branches: Array<{
        id: string;
        name: string;
        code: string;
        phone: string | null;
        email: string | null;
        is_main: boolean;
        departments_count: number;
        wards_count: number;
    }>;
    departments: Array<{
        id: string;
        name: string;
        code: string;
        department_type: string;
        description: string | null;
        branch: { id: string; name: string; code: string } | null;
        head_user: { id: string; name: string; email: string } | null;
        wards_count: number;
        users_count: number;
    }>;
    wards: Array<{
        id: string;
        name: string;
        code: string;
        ward_type: string;
        gender_allowed: string;
        floor: string | null;
        branch: { id: string; name: string; code: string };
        department: { id: string; name: string; code: string } | null;
        rooms: Array<{
            id: string;
            room_number: string;
            room_type: string;
            beds: Array<{
                id: string;
                bed_number: string;
                bed_type: string;
                daily_rate: string;
                status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
                is_active: boolean;
            }>;
        }>;
    }>;
    metrics: {
        totalBeds: number;
        availableBeds: number;
        occupiedBeds: number;
        cleaningBeds: number;
        maintenanceBeds: number;
        occupancyRate: number;
    };
    departmentTypes: Array<{ value: string; label: string }>;
    bedStatuses: Array<{ value: string; label: string; variant: string }>;
}

export default function FacilityIndex({
    branches,
    departments,
    wards,
    metrics,
    departmentTypes,
}: FacilityProps) {
    const [activeTab, setActiveTab] = useState<'beds' | 'departments' | 'branches'>('beds');

    // Modals state
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showWardModal, setShowWardModal] = useState(false);
    const [showBedModal, setShowBedModal] = useState<string | null>(null); // roomId

    // Forms
    const branchForm = useForm({
        name: '',
        code: '',
        phone: '',
        email: '',
        is_main: false,
    });

    const deptForm = useForm({
        name: '',
        code: '',
        branch_id: branches[0]?.id || '',
        department_type: 'clinical',
        description: '',
    });

    const wardForm = useForm({
        branch_id: branches[0]?.id || '',
        department_id: departments[0]?.id || '',
        name: '',
        code: '',
        ward_type: 'general',
        gender_allowed: 'any',
        floor: '',
    });

    const bedForm = useForm({
        room_id: '',
        bed_number: '',
        bed_type: 'standard',
        daily_rate: '250.00',
    });

    const handleUpdateBedStatus = (bedId: string, newStatus: string) => {
        router.patch(`/facility/beds/${bedId}/status`, { status: newStatus }, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout title="Facility & Hospital Topology">
            <div className="space-y-6">
                {/* Header & Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Facility & Ward Topology</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage hospital branches, clinical departments, inpatient wards, and real-time bed allocation.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('beds')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'beds' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <span className="flex items-center gap-1.5">
                                <BedDouble className="w-3.5 h-3.5" />
                                Wards & Beds ({metrics.totalBeds})
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('departments')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'departments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <span className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5" />
                                Departments ({departments.length})
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('branches')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'branches' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" />
                                Branches ({branches.length})
                            </span>
                        </button>
                    </div>
                </div>

                {/* Real-time Inpatient Bed Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Card className="border-l-4 border-l-slate-800">
                        <CardContent className="p-3.5">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Beds</span>
                            <div className="text-xl font-bold text-slate-900 mt-0.5">{metrics.totalBeds}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500">
                        <CardContent className="p-3.5">
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Available</span>
                            <div className="text-xl font-bold text-emerald-700 mt-0.5">{metrics.availableBeds}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-rose-500">
                        <CardContent className="p-3.5">
                            <span className="text-[11px] font-semibold text-rose-600 uppercase">Occupied</span>
                            <div className="text-xl font-bold text-rose-700 mt-0.5">{metrics.occupiedBeds}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-cyan-500">
                        <CardContent className="p-3.5">
                            <span className="text-[11px] font-semibold text-cyan-600 uppercase">Cleaning</span>
                            <div className="text-xl font-bold text-cyan-700 mt-0.5">{metrics.cleaningBeds}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500">
                        <CardContent className="p-3.5">
                            <span className="text-[11px] font-semibold text-amber-600 uppercase">Maintenance</span>
                            <div className="text-xl font-bold text-amber-700 mt-0.5">{metrics.maintenanceBeds}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-indigo-500">
                        <CardContent className="p-3.5">
                            <span className="text-[11px] font-semibold text-indigo-600 uppercase">Occupancy</span>
                            <div className="text-xl font-bold text-indigo-700 mt-0.5">{metrics.occupancyRate}%</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tab 1: Wards & Bed Grid */}
                {activeTab === 'beds' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <BedDouble className="w-5 h-5 text-cyan-600" />
                                Inpatient Wards & Real-Time Bed Matrix
                            </h3>
                            <Button size="sm" onClick={() => setShowWardModal(true)}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add Inpatient Ward
                            </Button>
                        </div>

                        {wards.length === 0 ? (
                            <Card>
                                <CardContent className="text-center py-12">
                                    <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <h4 className="text-sm font-semibold text-slate-800">No Wards Configured</h4>
                                    <p className="text-xs text-slate-500 mt-1">Get started by creating your first hospital ward and inpatient beds.</p>
                                    <Button size="sm" className="mt-4" onClick={() => setShowWardModal(true)}>
                                        Create Ward
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            wards.map((ward) => (
                                <Card key={ward.id} className="overflow-hidden border border-slate-200">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 text-sm">{ward.name}</h4>
                                                <Badge variant="cyan" className="font-mono text-[10px]">
                                                    {ward.code}
                                                </Badge>
                                                <Badge variant="default" className="text-[10px] capitalize">
                                                    Type: {ward.ward_type}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                                                <span>Branch: {ward.branch.name}</span>
                                                {ward.floor && <span>• Floor: {ward.floor}</span>}
                                                {ward.department && <span>• Department: {ward.department.name}</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const roomNum = prompt(`Enter new Room Number for ${ward.name}:`, 'RM-');
                                                    if (roomNum) {
                                                        router.post('/facility/rooms', {
                                                            ward_id: ward.id,
                                                            room_number: roomNum,
                                                            room_type: 'standard',
                                                        }, { preserveScroll: true });
                                                    }
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add Room
                                            </Button>
                                        </div>
                                    </div>

                                    <CardContent className="p-4 space-y-4">
                                        {ward.rooms.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No rooms provisioned in this ward yet. Click "Add Room" to create one.</p>
                                        ) : (
                                            ward.rooms.map((room) => (
                                                <div key={room.id} className="bg-slate-50/60 rounded-xl p-3 border border-slate-100">
                                                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/60">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-xs text-slate-800">Room {room.room_number}</span>
                                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">({room.room_type})</span>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-[11px] h-7 px-2"
                                                            onClick={() => {
                                                                bedForm.setData('room_id', room.id);
                                                                setShowBedModal(room.id);
                                                            }}
                                                        >
                                                            <Plus className="w-3 h-3 mr-1" />
                                                            Add Bed
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                        {room.beds.map((bed) => {
                                                            const statusBadges = {
                                                                available: { variant: 'success' as const, label: 'Available', bg: 'bg-emerald-50/40 border-emerald-200' },
                                                                occupied: { variant: 'destructive' as const, label: 'Occupied', bg: 'bg-rose-50/40 border-rose-200' },
                                                                reserved: { variant: 'warning' as const, label: 'Reserved', bg: 'bg-amber-50/40 border-amber-200' },
                                                                cleaning: { variant: 'cyan' as const, label: 'Cleaning', bg: 'bg-cyan-50/40 border-cyan-200' },
                                                                maintenance: { variant: 'default' as const, label: 'Maintenance', bg: 'bg-slate-100 border-slate-200' },
                                                            };
                                                            const currentBadge = statusBadges[bed.status] || statusBadges.available;

                                                            return (
                                                                <div
                                                                    key={bed.id}
                                                                    className={`rounded-lg border p-3 flex flex-col justify-between transition-all ${currentBadge.bg}`}
                                                                >
                                                                    <div>
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-bold text-xs text-slate-900">{bed.bed_number}</span>
                                                                            <Badge variant={currentBadge.variant} className="text-[10px] py-0 px-2">
                                                                                {currentBadge.label}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500 mt-1 capitalize">
                                                                            {bed.bed_type.replace('_', ' ')} • ${bed.daily_rate}/day
                                                                        </div>
                                                                    </div>

                                                                    {/* Quick Status Toggles */}
                                                                    <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px]">
                                                                        <span className="text-slate-400">Status Action:</span>
                                                                        <div className="flex gap-1">
                                                                            {bed.status !== 'available' && (
                                                                                <button
                                                                                    onClick={() => handleUpdateBedStatus(bed.id, 'available')}
                                                                                    title="Set Available"
                                                                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-100 border border-slate-200 text-emerald-700 font-semibold cursor-pointer"
                                                                                >
                                                                                    Avail
                                                                                </button>
                                                                            )}
                                                                            {bed.status === 'available' && (
                                                                                <button
                                                                                    onClick={() => handleUpdateBedStatus(bed.id, 'cleaning')}
                                                                                    title="Mark Under Cleaning"
                                                                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-cyan-100 border border-slate-200 text-cyan-700 font-semibold cursor-pointer"
                                                                                >
                                                                                    Clean
                                                                                </button>
                                                                            )}
                                                                            {bed.status !== 'maintenance' && (
                                                                                <button
                                                                                    onClick={() => handleUpdateBedStatus(bed.id, 'maintenance')}
                                                                                    title="Mark Under Maintenance"
                                                                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                                                                                >
                                                                                    Maint
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* Tab 2: Departments Directory */}
                {activeTab === 'departments' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Layers className="w-5 h-5 text-cyan-600" />
                                Hospital Clinical & Support Departments
                            </h3>
                            <Button size="sm" onClick={() => setShowDeptModal(true)}>
                                <Plus className="w-4 h-4 mr-1" />
                                New Department
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {departments.map((dept) => (
                                <Card key={dept.id} className="hover:border-cyan-300 transition-all flex flex-col justify-between">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="cyan" className="font-mono text-[10px]">
                                                {dept.code}
                                            </Badge>
                                            <Badge variant="default" className="text-[10px] capitalize">
                                                {dept.department_type}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-sm mt-2">{dept.name}</CardTitle>
                                        {dept.description && (
                                            <CardDescription className="line-clamp-2 mt-1">
                                                {dept.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="pt-0 pb-4 text-xs text-slate-500 space-y-1.5">
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <span>Branch Scope:</span>
                                            <span className="font-semibold text-slate-700">{dept.branch ? dept.branch.name : 'All Branches'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Assigned Staff:</span>
                                            <span className="font-bold text-cyan-700">{dept.users_count} Members</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Inpatient Wards:</span>
                                            <span className="font-bold text-slate-700">{dept.wards_count} Wards</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab 3: Branches */}
                {activeTab === 'branches' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-cyan-600" />
                                Hospital Branches & Specialty Centers
                            </h3>
                            <Button size="sm" onClick={() => setShowBranchModal(true)}>
                                <Plus className="w-4 h-4 mr-1" />
                                Provision New Branch
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {branches.map((branch) => (
                                <Card key={branch.id} className="p-5 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 text-base">{branch.name}</h4>
                                                <Badge variant="cyan" className="font-mono text-xs">
                                                    {branch.code}
                                                </Badge>
                                            </div>
                                            {branch.is_main && (
                                                <Badge variant="purple" className="text-xs">
                                                    Primary HQ
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="mt-4 space-y-2 text-xs text-slate-600">
                                            {branch.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{branch.phone}</span>
                                                </div>
                                            )}
                                            {branch.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{branch.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                        <span>Topology: {branch.departments_count} Departments</span>
                                        <span>{branch.wards_count} Inpatient Wards</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: New Department */}
            {showDeptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h4 className="font-bold text-slate-900 text-sm">Add Clinical or Support Department</h4>
                            <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                deptForm.post('/facility/departments', {
                                    onSuccess: () => {
                                        setShowDeptModal(false);
                                        deptForm.reset();
                                    },
                                });
                            }}
                            className="space-y-3"
                        >
                            <Input
                                label="Department Name"
                                value={deptForm.data.name}
                                onChange={(e) => deptForm.setData('name', e.target.value)}
                                error={deptForm.errors.name}
                                placeholder="e.g. Neurology & Neurosurgery"
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Code"
                                    value={deptForm.data.code}
                                    onChange={(e) => deptForm.setData('code', e.target.value.toUpperCase())}
                                    error={deptForm.errors.code}
                                    placeholder="NEURO"
                                    required
                                />

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Type</label>
                                    <select
                                        value={deptForm.data.department_type}
                                        onChange={(e) => deptForm.setData('department_type', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        {departmentTypes.map((dt) => (
                                            <option key={dt.value} value={dt.value}>{dt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Branch Scope</label>
                                <select
                                    value={deptForm.data.branch_id}
                                    onChange={(e) => deptForm.setData('branch_id', e.target.value)}
                                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                >
                                    <option value="">All Branches (Global)</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Description"
                                value={deptForm.data.description}
                                onChange={(e) => deptForm.setData('description', e.target.value)}
                                error={deptForm.errors.description}
                                placeholder="Clinical scope and responsibilities..."
                            />

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowDeptModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" isLoading={deptForm.processing}>
                                    Save Department
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: New Ward */}
            {showWardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h4 className="font-bold text-slate-900 text-sm">Add Hospital Ward</h4>
                            <button onClick={() => setShowWardModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                wardForm.post('/facility/wards', {
                                    onSuccess: () => {
                                        setShowWardModal(false);
                                        wardForm.reset();
                                    },
                                });
                            }}
                            className="space-y-3"
                        >
                            <Input
                                label="Ward Name"
                                value={wardForm.data.name}
                                onChange={(e) => wardForm.setData('name', e.target.value)}
                                error={wardForm.errors.name}
                                placeholder="e.g. Pediatric Care Unit (Ward B)"
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Ward Code"
                                    value={wardForm.data.code}
                                    onChange={(e) => wardForm.setData('code', e.target.value.toUpperCase())}
                                    error={wardForm.errors.code}
                                    placeholder="PED-B"
                                    required
                                />

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Type</label>
                                    <select
                                        value={wardForm.data.ward_type}
                                        onChange={(e) => wardForm.setData('ward_type', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        <option value="general">General</option>
                                        <option value="semi_private">Semi-Private</option>
                                        <option value="private">Private</option>
                                        <option value="icu">ICU / CCU</option>
                                        <option value="emergency">Emergency</option>
                                        <option value="recovery">Recovery</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Branch</label>
                                    <select
                                        value={wardForm.data.branch_id}
                                        onChange={(e) => wardForm.setData('branch_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Gender Allowed</label>
                                    <select
                                        value={wardForm.data.gender_allowed}
                                        onChange={(e) => wardForm.setData('gender_allowed', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        <option value="any">Any / Mixed</option>
                                        <option value="male">Male Only</option>
                                        <option value="female">Female Only</option>
                                    </select>
                                </div>
                            </div>

                            <Input
                                label="Floor / Location"
                                value={wardForm.data.floor}
                                onChange={(e) => wardForm.setData('floor', e.target.value)}
                                error={wardForm.errors.floor}
                                placeholder="e.g. 4th Floor - South Wing"
                            />

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowWardModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" isLoading={wardForm.processing}>
                                    Save Ward
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Bed */}
            {showBedModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h4 className="font-bold text-slate-900 text-sm">Provision Bed</h4>
                            <button onClick={() => setShowBedModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                bedForm.post('/facility/beds', {
                                    onSuccess: () => {
                                        setShowBedModal(null);
                                        bedForm.reset();
                                    },
                                });
                            }}
                            className="space-y-3"
                        >
                            <Input
                                label="Bed Number / Label"
                                value={bedForm.data.bed_number}
                                onChange={(e) => bedForm.setData('bed_number', e.target.value.toUpperCase())}
                                error={bedForm.errors.bed_number}
                                placeholder="e.g. BED-101A"
                                required
                            />

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Bed Type</label>
                                <select
                                    value={bedForm.data.bed_type}
                                    onChange={(e) => bedForm.setData('bed_type', e.target.value)}
                                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                >
                                    <option value="standard">Standard Hospital Bed</option>
                                    <option value="electric">Electric Adjustable Bed</option>
                                    <option value="fowler">Fowler Bed</option>
                                    <option value="icu_ventilated">ICU Ventilated Bed</option>
                                    <option value="crib">Pediatric Crib</option>
                                </select>
                            </div>

                            <Input
                                label="Daily Charge Rate ($)"
                                type="number"
                                step="0.01"
                                value={bedForm.data.daily_rate}
                                onChange={(e) => bedForm.setData('daily_rate', e.target.value)}
                                error={bedForm.errors.daily_rate}
                                required
                            />

                            <div className="flex justify-end gap-2 pt-3 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowBedModal(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" isLoading={bedForm.processing}>
                                    Save Bed
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
