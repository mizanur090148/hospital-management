import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    Users, Plus, Search, Filter, ShieldCheck,
    CheckCircle2, Ban, Edit, X, Lock, Building,
    Stethoscope, Pill, FlaskConical, Radio, Shield
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface UserData {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    user_type: string;
    user_type_label: string;
    status: string;
    status_label: string;
    branch: { id: string; name: string; code: string } | null;
    department: { id: string; name: string; code: string } | null;
    roles: Array<{ id: string; name: string; slug: string }>;
    last_login_at: string | null;
}

interface UsersProps {
    users: {
        data: UserData[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
    filters: {
        search?: string;
        branch_id?: string;
        department_id?: string;
        user_type?: string;
        status?: string;
    };
    branches: Array<{ id: string; name: string; code: string }>;
    departments: Array<{ id: string; name: string; code: string }>;
    roles: Array<{ id: string; name: string; slug: string }>;
    userTypes: Array<{ value: string; label: string }>;
    userStatuses: Array<{ value: string; label: string }>;
}

export default function UsersIndex({
    users,
    filters,
    branches,
    departments,
    roles,
    userTypes,
    userStatuses,
}: UsersProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    const createForm = useForm({
        name: '',
        email: '',
        phone: '',
        user_type: 'doctor',
        branch_id: branches[0]?.id || '',
        department_id: departments[0]?.id || '',
        password: 'password123',
        roles: [] as string[],
    });

    const editForm = useForm({
        name: '',
        email: '',
        phone: '',
        user_type: '',
        branch_id: '',
        department_id: '',
        status: '',
        password: '',
        roles: [] as string[],
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/users', { ...filters, search: searchTerm }, { preserveState: true });
    };

    const handleFilterChange = (key: string, value: string) => {
        router.get('/users', { ...filters, [key]: value }, { preserveState: true });
    };

    const handleToggleStatus = (userId: string) => {
        router.patch(`/users/${userId}/toggle-status`, {}, { preserveScroll: true });
    };

    const openEditModal = (user: UserData) => {
        setEditingUser(user);
        editForm.setData({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            user_type: user.user_type,
            branch_id: user.branch?.id || '',
            department_id: user.department?.id || '',
            status: user.status,
            password: '',
            roles: user.roles.map((r) => r.id),
        });
    };

    return (
        <AppLayout title="Hospital Staff Directory">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Staff Directory & User Management</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage hospital personnel, doctors, nursing staff, clinical roles, and account security.
                        </p>
                    </div>

                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-1.5" />
                        Provision Staff Account
                    </Button>
                </div>

                {/* Filters Bar */}
                <Card className="p-4">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="lg:col-span-2">
                            <Input
                                placeholder="Search by name, email, or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                leftIcon={<Search className="w-4 h-4" />}
                            />
                        </div>

                        <select
                            value={filters.branch_id || ''}
                            onChange={(e) => handleFilterChange('branch_id', e.target.value)}
                            className="text-xs rounded-lg border border-slate-200 p-2.5 bg-white text-slate-700"
                        >
                            <option value="">All Branches</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>

                        <select
                            value={filters.department_id || ''}
                            onChange={(e) => handleFilterChange('department_id', e.target.value)}
                            className="text-xs rounded-lg border border-slate-200 p-2.5 bg-white text-slate-700"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>

                        <select
                            value={filters.user_type || ''}
                            onChange={(e) => handleFilterChange('user_type', e.target.value)}
                            className="text-xs rounded-lg border border-slate-200 p-2.5 bg-white text-slate-700"
                        >
                            <option value="">All Roles / Types</option>
                            {userTypes.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </form>
                </Card>

                {/* Users Table */}
                <Card className="overflow-hidden border border-slate-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="py-3 px-4">Staff Member</th>
                                    <th className="py-3 px-4">Role & User Type</th>
                                    <th className="py-3 px-4">Facility & Department</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Last Activity</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.data.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 font-bold flex items-center justify-center text-xs uppercase border border-cyan-100">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{user.name}</div>
                                                    <div className="text-[11px] text-slate-500">{user.email}</div>
                                                    {user.phone && <div className="text-[10px] text-slate-400">{user.phone}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Badge variant="cyan" className="font-semibold text-[10px]">
                                                {user.user_type_label}
                                            </Badge>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {user.roles.map((r) => (
                                                    <span key={r.id} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                        {r.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-medium text-slate-800">
                                                {user.branch ? user.branch.name : 'All Facilities'}
                                            </div>
                                            <div className="text-[11px] text-slate-500">
                                                {user.department ? user.department.name : 'Unassigned Dept'}
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <Badge variant={user.status === 'active' ? 'success' : 'destructive'} className="text-[10px]">
                                                {user.status_label}
                                            </Badge>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500">
                                            {user.last_login_at || 'Never'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 hover:text-slate-900"
                                                    title="Edit User & Roles"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(user.id)}
                                                    className={`p-1.5 rounded-md ${user.status === 'active' ? 'hover:bg-rose-50 text-slate-400 hover:text-rose-600' : 'hover:bg-emerald-50 text-rose-500 hover:text-emerald-600'}`}
                                                    title={user.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                                                >
                                                    {user.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal: Provision Staff Member */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h4 className="font-bold text-slate-900 text-sm">Provision New Hospital Staff Account</h4>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                createForm.post('/users', {
                                    onSuccess: () => {
                                        setShowCreateModal(false);
                                        createForm.reset();
                                    },
                                });
                            }}
                            className="space-y-3"
                        >
                            <Input
                                label="Full Name & Title"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                error={createForm.errors.name}
                                placeholder="Dr. Jonathan Doe, MD"
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Work Email"
                                    type="email"
                                    value={createForm.data.email}
                                    onChange={(e) => createForm.setData('email', e.target.value)}
                                    error={createForm.errors.email}
                                    placeholder="j.doe@hospital.org"
                                    required
                                />

                                <Input
                                    label="Phone Number"
                                    value={createForm.data.phone}
                                    onChange={(e) => createForm.setData('phone', e.target.value)}
                                    error={createForm.errors.phone}
                                    placeholder="+1-555-019-9000"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Staff Category</label>
                                    <select
                                        value={createForm.data.user_type}
                                        onChange={(e) => createForm.setData('user_type', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        {userTypes.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Facility Branch</label>
                                    <select
                                        value={createForm.data.branch_id}
                                        onChange={(e) => createForm.setData('branch_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Department</label>
                                <select
                                    value={createForm.data.department_id}
                                    onChange={(e) => createForm.setData('department_id', e.target.value)}
                                    className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                >
                                    <option value="">Unassigned</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Temporary Password"
                                type="password"
                                value={createForm.data.password}
                                onChange={(e) => createForm.setData('password', e.target.value)}
                                error={createForm.errors.password}
                                required
                            />

                            {/* Role Checkboxes */}
                            <div className="space-y-2 pt-2 border-t">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    Assign RBAC Security Roles
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                                    {roles.map((r) => (
                                        <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={createForm.data.roles.includes(r.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    createForm.setData('roles', checked
                                                        ? [...createForm.data.roles, r.id]
                                                        : createForm.data.roles.filter((id) => id !== r.id)
                                                    );
                                                }}
                                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                            />
                                            <span>{r.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" isLoading={createForm.processing}>
                                    Provision Account
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Staff Member */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h4 className="font-bold text-slate-900 text-sm">Edit Staff Account: {editingUser.name}</h4>
                            <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                editForm.put(`/users/${editingUser.id}`, {
                                    onSuccess: () => {
                                        setEditingUser(null);
                                    },
                                });
                            }}
                            className="space-y-3"
                        >
                            <Input
                                label="Full Name & Title"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                error={editForm.errors.name}
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Work Email"
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(e) => editForm.setData('email', e.target.value)}
                                    error={editForm.errors.email}
                                    required
                                />

                                <Input
                                    label="Phone Number"
                                    value={editForm.data.phone}
                                    onChange={(e) => editForm.setData('phone', e.target.value)}
                                    error={editForm.errors.phone}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Staff Category</label>
                                    <select
                                        value={editForm.data.user_type}
                                        onChange={(e) => editForm.setData('user_type', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        {userTypes.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Account Status</label>
                                    <select
                                        value={editForm.data.status}
                                        onChange={(e) => editForm.setData('status', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        {userStatuses.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Facility Branch</label>
                                    <select
                                        value={editForm.data.branch_id}
                                        onChange={(e) => editForm.setData('branch_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        <option value="">All Branches</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Department</label>
                                    <select
                                        value={editForm.data.department_id}
                                        onChange={(e) => editForm.setData('department_id', e.target.value)}
                                        className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white"
                                    >
                                        <option value="">Unassigned</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <Input
                                label="Reset Password (leave empty to keep current)"
                                type="password"
                                value={editForm.data.password}
                                onChange={(e) => editForm.setData('password', e.target.value)}
                                error={editForm.errors.password}
                                placeholder="••••••••••••"
                            />

                            {/* Role Checkboxes */}
                            <div className="space-y-2 pt-2 border-t">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    Assigned Roles
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                                    {roles.map((r) => (
                                        <label key={r.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editForm.data.roles.includes(r.id)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    editForm.setData('roles', checked
                                                        ? [...editForm.data.roles, r.id]
                                                        : editForm.data.roles.filter((id) => id !== r.id)
                                                    );
                                                }}
                                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                            />
                                            <span>{r.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" isLoading={editForm.processing}>
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
