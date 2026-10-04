import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    ShieldCheck, Plus, Shield, Users, Key,
    Edit, Trash2, X, Check, Lock
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface PermissionItem {
    id: string;
    name: string;
    slug: string;
    description: string | null;
}

interface PermissionGroup {
    module: string;
    module_label: string;
    permissions: PermissionItem[];
}

interface RoleData {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_system: boolean;
    users_count: number;
    permissions_count: number;
    permissions: PermissionItem[];
}

interface RolesProps {
    roles: RoleData[];
    groupedPermissions: PermissionGroup[];
}

export default function RolesIndex({ roles, groupedPermissions }: RolesProps) {
    const [editingRole, setEditingRole] = useState<RoleData | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const createForm = useForm({
        name: '',
        description: '',
        permissions: [] as string[],
    });

    const editForm = useForm({
        name: '',
        description: '',
        permissions: [] as string[],
    });

    const openEditModal = (role: RoleData) => {
        setEditingRole(role);
        editForm.setData({
            name: role.name,
            description: role.description || '',
            permissions: role.permissions.map((p) => p.id),
        });
    };

    const handleDeleteRole = (role: RoleData) => {
        if (confirm(`Are you sure you want to delete custom role [${role.name}]?`)) {
            router.delete(`/roles/${role.id}`, { preserveScroll: true });
        }
    };

    const togglePermission = (form: typeof createForm | typeof editForm, permId: string) => {
        const current = form.data.permissions;
        if (current.includes(permId)) {
            form.setData('permissions', current.filter((id) => id !== permId));
        } else {
            form.setData('permissions', [...current, permId]);
        }
    };

    const toggleModuleAll = (form: typeof createForm | typeof editForm, modulePermissions: PermissionItem[]) => {
        const moduleIds = modulePermissions.map((p) => p.id);
        const hasAll = moduleIds.every((id) => form.data.permissions.includes(id));

        if (hasAll) {
            form.setData('permissions', form.data.permissions.filter((id) => !moduleIds.includes(id)));
        } else {
            const combined = Array.from(new Set([...form.data.permissions, ...moduleIds]));
            form.setData('permissions', combined);
        }
    };

    return (
        <AppLayout title="Roles & Permissions (RBAC)">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Role-Based Access Control (RBAC)</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Define fine-grained clinical, operational, and financial permissions for hospital personnel.
                        </p>
                    </div>

                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-1.5" />
                        Create Custom Role
                    </Button>
                </div>

                {/* Roles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map((role) => (
                        <Card key={role.id} className="flex flex-col justify-between hover:border-cyan-300 transition-all">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <Badge variant={role.is_system ? 'purple' : 'cyan'} className="font-semibold text-[10px]">
                                        {role.is_system ? 'System Protected' : 'Custom Role'}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-slate-400">slug: {role.slug}</span>
                                </div>
                                <CardTitle className="text-base mt-2 flex items-center gap-2">
                                    {role.is_system ? <Lock className="w-4 h-4 text-purple-600" /> : <Shield className="w-4 h-4 text-cyan-600" />}
                                    {role.name}
                                </CardTitle>
                                {role.description && (
                                    <CardDescription className="line-clamp-2 mt-1">
                                        {role.description}
                                    </CardDescription>
                                )}
                            </CardHeader>

                            <CardContent className="pt-0 pb-4 text-xs text-slate-600">
                                <div className="py-2.5 border-t border-slate-100 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-slate-400" />
                                        Assigned Staff:
                                    </span>
                                    <span className="font-bold text-slate-900">{role.users_count} Members</span>
                                </div>
                                <div className="py-2.5 border-t border-slate-100 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Key className="w-3.5 h-3.5 text-slate-400" />
                                        Active Permissions:
                                    </span>
                                    <span className="font-bold text-cyan-700">{role.permissions_count} Capabilities</span>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openEditModal(role)}>
                                        <Edit className="w-3.5 h-3.5 mr-1" />
                                        Configure Permissions
                                    </Button>
                                    {!role.is_system && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-rose-600 hover:bg-rose-50"
                                            onClick={() => handleDeleteRole(role)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Modal: Create Role */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h4 className="font-bold text-slate-900 text-sm">Create Custom Hospital Role</h4>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                createForm.post('/roles', {
                                    onSuccess: () => {
                                        setShowCreateModal(false);
                                        createForm.reset();
                                    },
                                });
                            }}
                            className="space-y-4"
                        >
                            <Input
                                label="Role Name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                error={createForm.errors.name}
                                placeholder="e.g. Senior Triage Nurse"
                                required
                            />

                            <Input
                                label="Description"
                                value={createForm.data.description}
                                onChange={(e) => createForm.setData('description', e.target.value)}
                                error={createForm.errors.description}
                                placeholder="Operational scope and privileges..."
                            />

                            {/* Permissions Matrix */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                                    Grant Granular Module Permissions ({createForm.data.permissions.length} selected)
                                </label>

                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    {groupedPermissions.map((group) => (
                                        <div key={group.module} className="rounded-xl border border-slate-200/80 p-3.5 bg-slate-50/50">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                                                <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                                                    {group.module_label}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleModuleAll(createForm, group.permissions)}
                                                    className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700"
                                                >
                                                    Toggle All
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {group.permissions.map((p) => (
                                                    <label key={p.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-white transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={createForm.data.permissions.includes(p.id)}
                                                            onChange={() => togglePermission(createForm, p.id)}
                                                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 mt-0.5"
                                                        />
                                                        <div>
                                                            <div className="font-semibold text-slate-800">{p.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{p.slug}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" isLoading={createForm.processing}>
                                    Save Role
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Role & Configure Permissions */}
            {editingRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h4 className="font-bold text-slate-900 text-sm">
                                Configure Permissions: {editingRole.name}
                            </h4>
                            <button onClick={() => setEditingRole(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                editForm.put(`/roles/${editingRole.id}`, {
                                    onSuccess: () => {
                                        setEditingRole(null);
                                    },
                                });
                            }}
                            className="space-y-4"
                        >
                            <Input
                                label="Role Name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                error={editForm.errors.name}
                                required
                            />

                            <Input
                                label="Description"
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                                error={editForm.errors.description}
                            />

                            {/* Permissions Matrix */}
                            <div className="space-y-3">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                                    Assigned Capabilities ({editForm.data.permissions.length} selected)
                                </label>

                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    {groupedPermissions.map((group) => (
                                        <div key={group.module} className="rounded-xl border border-slate-200/80 p-3.5 bg-slate-50/50">
                                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                                                <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                                                    {group.module_label}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleModuleAll(editForm, group.permissions)}
                                                    className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700"
                                                >
                                                    Toggle All
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {group.permissions.map((p) => (
                                                    <label key={p.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-white transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.data.permissions.includes(p.id)}
                                                            onChange={() => togglePermission(editForm, p.id)}
                                                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 mt-0.5"
                                                        />
                                                        <div>
                                                            <div className="font-semibold text-slate-800">{p.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{p.slug}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRole(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" isLoading={editForm.processing}>
                                    Update Role Permissions
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
