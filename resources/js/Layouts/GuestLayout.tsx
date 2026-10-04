import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { Link } from '@inertiajs/react';

export const GuestLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
                <Link href="/" className="inline-flex items-center gap-3 group">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform duration-200">
                        <Activity className="w-7 h-7 text-white stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none">ApexCare</h1>
                        <p className="text-xs font-semibold text-cyan-400 tracking-widest uppercase mt-0.5">Enterprise Hospital SaaS</p>
                    </div>
                </Link>

                {title && (
                    <h2 className="mt-6 text-xl font-bold text-white tracking-tight">
                        {title}
                    </h2>
                )}
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
                <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-white/20">
                    {children}
                </div>

                <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>HIPAA Compliant Architecture • Isolated Multi-Tenancy • End-to-End Audited</span>
                </div>
            </div>
        </div>
    );
};
