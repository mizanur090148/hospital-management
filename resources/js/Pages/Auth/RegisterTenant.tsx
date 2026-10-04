import React from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Building2, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';
import { GuestLayout } from '@/Layouts/GuestLayout';
import { Input } from '@/Components/ui/Input';
import { Button } from '@/Components/ui/Button';

export default function RegisterTenant() {
    const { data, setData, post, processing, errors } = useForm({
        legal_name: '',
        trade_name: '',
        slug: '',
        domain: '',
        branch_name: 'Main Healthcare Campus',
        branch_code: 'HQ',
        branch_phone: '',
        admin_name: '',
        admin_email: '',
        password: '',
        password_confirmation: '',
    });

    const handleLegalNameChange = (val: string) => {
        const slug = val
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        setData((prev) => ({
            ...prev,
            legal_name: val,
            trade_name: prev.trade_name || val,
            slug: prev.slug || slug,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/register-hospital');
    };

    return (
        <GuestLayout title="Hospital Organization Onboarding">
            <p className="text-xs text-slate-500 text-center mb-6">
                Deploy an enterprise-grade, isolated clinical workspace for your hospital or medical center.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Hospital Profile */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <Building2 className="w-4 h-4 text-cyan-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">1. Hospital Profile</h4>
                    </div>

                    <Input
                        label="Legal Registered Name"
                        value={data.legal_name}
                        onChange={(e) => handleLegalNameChange(e.target.value)}
                        error={errors.legal_name}
                        placeholder="Memorial Health System LLC"
                        required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Trade / Display Name"
                            value={data.trade_name}
                            onChange={(e) => setData('trade_name', e.target.value)}
                            error={errors.trade_name}
                            placeholder="Memorial Hospital"
                            required
                        />

                        <Input
                            label="Tenant Subdomain Slug"
                            value={data.slug}
                            onChange={(e) => setData('slug', e.target.value)}
                            error={errors.slug}
                            placeholder="memorial"
                            helperText="Used for domain routing (e.g. memorial.hospital-mgt.test)"
                            required
                        />
                    </div>
                </div>

                {/* Section 2: Main Branch */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <Building2 className="w-4 h-4 text-teal-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">2. Primary Facility Branch</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <Input
                                label="Main Branch Name"
                                value={data.branch_name}
                                onChange={(e) => setData('branch_name', e.target.value)}
                                error={errors.branch_name}
                                placeholder="Central Hospital Campus"
                                required
                            />
                        </div>
                        <Input
                            label="Code"
                            value={data.branch_code}
                            onChange={(e) => setData('branch_code', e.target.value.toUpperCase())}
                            error={errors.branch_code}
                            placeholder="HQ"
                            required
                        />
                    </div>

                    <Input
                        label="Branch Emergency / Desk Phone"
                        value={data.branch_phone}
                        onChange={(e) => setData('branch_phone', e.target.value)}
                        error={errors.branch_phone}
                        placeholder="+1-800-555-0199"
                    />
                </div>

                {/* Section 3: Super Administrator */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <UserCheck className="w-4 h-4 text-purple-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">3. Hospital Administrator Account</h4>
                    </div>

                    <Input
                        label="Administrator Full Name"
                        value={data.admin_name}
                        onChange={(e) => setData('admin_name', e.target.value)}
                        error={errors.admin_name}
                        placeholder="Dr. Eleanor Vance"
                        required
                    />

                    <Input
                        label="Work Email"
                        type="email"
                        value={data.admin_email}
                        onChange={(e) => setData('admin_email', e.target.value)}
                        error={errors.admin_email}
                        placeholder="admin@memorial-health.org"
                        required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            label="Password"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={errors.password}
                            placeholder="••••••••••••"
                            required
                        />

                        <Input
                            label="Confirm Password"
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            error={errors.password_confirmation}
                            placeholder="••••••••••••"
                            required
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={processing}
                >
                    Deploy Hospital Workspace
                    <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                    Already an existing hospital tenant?{' '}
                    <Link href="/login" className="font-bold text-cyan-600 hover:text-cyan-700">
                        Back to Login
                    </Link>
                </p>
            </div>
        </GuestLayout>
    );
}
