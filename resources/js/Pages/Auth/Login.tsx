import React from 'react';
import { useForm, Link } from '@inertiajs/react';
import { Mail, Lock, LogIn, Hospital, Stethoscope, ShieldCheck } from 'lucide-react';
import { GuestLayout } from '@/Layouts/GuestLayout';
import { Input } from '@/Components/ui/Input';
import { Button } from '@/Components/ui/Button';

interface LoginProps {
    status?: string;
    currentTenant?: {
        trade_name: string;
        slug: string;
    } | null;
    availableTenants: Array<{
        id: string;
        slug: string;
        trade_name: string;
    }>;
}

export default function Login({ status, currentTenant }: LoginProps) {
    const { data, setData, post, processing, errors } = useForm({
        email: 'admin@apollo.test',
        password: 'password123',
        remember: true,
        tenant_slug: currentTenant?.slug || 'demo',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login');
    };

    const setQuickAccount = (email: string, slug?: string) => {
        setData((prev) => ({
            ...prev,
            email,
            password: 'password123',
            tenant_slug: slug || '',
        }));
    };

    return (
        <GuestLayout title="Sign In to Clinical Workspace">
            {status && (
                <div className="mb-4 text-xs font-semibold text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    {status}
                </div>
            )}

            {/* Quick Demo Credentials Switcher */}
            <div className="mb-6 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                    <span>Quick Demo Credentials</span>
                    <span className="text-cyan-600 font-medium">Click to Fill</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                    <button
                        type="button"
                        onClick={() => setQuickAccount('admin@apollo.test', 'demo')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-xs transition-colors flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <Hospital className="w-3.5 h-3.5 text-cyan-600" />
                            <span className="font-semibold text-slate-800">Hospital Admin</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">admin@apollo.test</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setQuickAccount('doctor@apollo.test', 'demo')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-xs transition-colors flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                            <span className="font-semibold text-slate-800">Doctor / Physician</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">doctor@apollo.test</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setQuickAccount('admin@apexcare.io', '')}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-xs transition-colors flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                            <span className="font-semibold text-slate-800">Platform Super Admin</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">admin@apexcare.io</span>
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Account Email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    error={errors.email}
                    placeholder="doctor@hospital.org"
                    leftIcon={<Mail className="w-4 h-4" />}
                    autoComplete="username"
                    required
                />

                <Input
                    label="Password"
                    type="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    error={errors.password}
                    placeholder="••••••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                    autoComplete="current-password"
                    required
                />

                <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>Keep me signed in</span>
                    </label>

                    <a href="#" className="font-medium text-cyan-600 hover:text-cyan-700">
                        Forgot password?
                    </a>
                </div>

                <Button
                    type="submit"
                    className="w-full mt-2"
                    size="lg"
                    isLoading={processing}
                >
                    <LogIn className="w-4 h-4 mr-1" />
                    Sign In to Dashboard
                </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                    Need to launch a new hospital organization?{' '}
                    <Link href="/register-hospital" className="font-bold text-cyan-600 hover:text-cyan-700">
                        Onboard Hospital SaaS
                    </Link>
                </p>
            </div>
        </GuestLayout>
    );
}
