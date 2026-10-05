import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    Activity, Building2, ChevronDown, LogOut,
    LayoutDashboard, Users, Calendar, Stethoscope,
    BedDouble, Siren, Pill, FlaskConical, ScanLine, Scissors,
    Receipt, Shield, Menu, X, Check,
    Building, Clock, CalendarRange, Banknote, TrendingUp
} from 'lucide-react';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/Badge';
import { Alert } from '@/Components/ui/Alert';

export const AppLayout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
    const { auth, tenantContext, flash } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    const handleSwitchBranch = (branchId: string) => {
        router.post(`/switch-branch/${branchId}`, {}, {
            preserveScroll: true,
            onSuccess: () => setBranchDropdownOpen(false),
        });
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    const navItems = [
        { label: 'Overview Dashboard', href: '/dashboard', icon: LayoutDashboard, current: route().current('dashboard') || route().current('home') },
        { header: 'Clinical Care' },
        { label: 'Patient Directory', href: '/patients', icon: Users, current: route().current('patients.*') },
        { label: 'Doctors & Schedules', href: '/doctors', icon: Stethoscope, current: route().current('doctors.*') },
        { label: 'Appointments & Booking', href: '/appointments', icon: Calendar, current: route().current('appointments.*') },
        { label: 'OPD Workstation', href: '/opd', icon: Activity, current: route().current('opd.*'), badge: 'Live Queue' },
        { label: 'Patient Admission & Beds', href: '/ipd', icon: BedDouble, current: route().current('admissions.*'), badge: 'IPD' },
        { label: 'Emergency & Triage', href: '/emergency', icon: Siren, current: route().current('emergency.*'), badge: 'ESI 1-5' },
        { label: 'Nursing Station & MAR', href: '/nursing', icon: Activity, current: route().current('nursing.*') },
        { header: 'Diagnostics & Surgery' },
        { label: 'Laboratory Services', href: '/laboratory', icon: FlaskConical, current: route().current('laboratory.*') },
        { label: 'Radiology & DICOM', href: '/radiology', icon: ScanLine, current: route().current('radiology.*'), badge: 'PACS' },
        { label: 'Operation Theatre (OT)', href: '/operation-theatres', icon: Scissors, current: route().current('operation_theatres.*') },
        { header: 'Pharmacy & Supply Chain' },
        { label: 'Medicines & FEFO Batches', href: '/pharmacy/medicines', icon: Pill, current: route().current('pharmacy.medicines.*') },
        { label: 'Prescription Dispensing', href: '/pharmacy/dispense', icon: Activity, current: route().current('pharmacy.dispense.*'), badge: 'FEFO' },
        { header: 'Billing & Accounting' },
        { label: 'Invoices & Cashier POS', href: '/billing/invoices', icon: Receipt, current: route().current('billing.invoices.*') },
        { label: 'Insurance & Claims', href: '/billing/insurance', icon: Shield, current: route().current('billing.insurance.*'), badge: 'TPA' },
        { label: 'General Ledger & COA', href: '/accounting/general-ledger', icon: Building2, current: route().current('accounting.*'), badge: 'Balanced' },
        { header: 'Hospital HR & Workforce' },
        { label: 'Staff Duty Rosters', href: '/hr/rosters', icon: CalendarRange, current: route().current('hr.rosters.*') },
        { label: 'Attendance & Leaves', href: '/hr/attendance', icon: Clock, current: route().current('hr.attendance.*') },
        { label: 'Payroll & Compensation', href: '/hr/payroll', icon: Banknote, current: route().current('hr.payroll.*'), badge: 'GL Sync' },
        { header: 'Executive Intelligence' },
        { label: 'Hospital KPI Analytics', href: '/analytics/executive', icon: TrendingUp, current: route().current('analytics.executive*'), badge: 'Realtime' },
        { header: 'Hospital & Governance' },
        { label: 'Buildings, Cabins & Wards', href: '/facility', icon: Building, current: route().current('facility.*') },
        { label: 'Staff Directory', href: '/users', icon: Users, current: route().current('users.*') },
        { label: 'Roles & RBAC', href: '/roles', icon: Shield, current: route().current('roles.*') },
    ];

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
                <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    {/* Brand & Mobile Hamburger */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <Link href="/dashboard" className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-600/30">
                                <Activity className="w-5 h-5 text-white stroke-[2.5]" />
                            </div>
                            <div className="hidden sm:block">
                                <span className="font-extrabold text-slate-900 text-lg tracking-tight leading-none block">ApexCare</span>
                                <span className="text-[10px] font-semibold text-cyan-700 tracking-wider uppercase block">Hospital Management</span>
                            </div>
                        </Link>

                        {/* Active Tenant Badge */}
                        {tenantContext.tenant && (
                            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
                                <span className="text-xs font-semibold text-slate-500">Tenant:</span>
                                <Badge variant="cyan" className="font-semibold text-xs py-1">
                                    <Building2 className="w-3.5 h-3.5 mr-1" />
                                    {tenantContext.tenant.trade_name}
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Right Tools: Branch Switcher & User Profile */}
                    <div className="flex items-center gap-3">
                        {/* Branch Switcher Dropdown */}
                        {tenantContext.branches && tenantContext.branches.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                                >
                                    <Building className="w-3.5 h-3.5 text-cyan-600" />
                                    <span className="max-w-[140px] truncate">
                                        {tenantContext.branch ? tenantContext.branch.name : 'Select Branch'}
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                </button>

                                {branchDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-50 animate-fadeIn">
                                        <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                                            Hospital Branches
                                        </div>
                                        {tenantContext.branches.map((b) => (
                                            <button
                                                key={b.id}
                                                onClick={() => handleSwitchBranch(b.id)}
                                                className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-cyan-50/60 transition-colors"
                                            >
                                                <div>
                                                    <div className="font-semibold text-slate-800">{b.name}</div>
                                                    <div className="text-[10px] text-slate-400">Code: {b.code} {b.is_main ? '• (Main HQ)' : ''}</div>
                                                </div>
                                                {tenantContext.branch?.id === b.id && (
                                                    <Check className="w-4 h-4 text-cyan-600" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* User Profile Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                                    {auth.user?.name.charAt(0)}
                                </div>
                                <div className="hidden lg:block text-left leading-tight">
                                    <div className="text-xs font-semibold text-slate-900">{auth.user?.name}</div>
                                    <div className="text-[10px] text-cyan-600 font-medium">{auth.user?.user_type_label}</div>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {userDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200/80 py-2 z-50 animate-fadeIn">
                                    <div className="px-4 py-2 border-b border-slate-100">
                                        <p className="text-xs font-semibold text-slate-900 truncate">{auth.user?.name}</p>
                                        <p className="text-[11px] text-slate-500 truncate">{auth.user?.email}</p>
                                        <Badge variant="purple" className="mt-1 text-[10px]">
                                            {auth.user?.user_type_label}
                                        </Badge>
                                    </div>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out Session
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Application Container */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Navigation */}
                <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-0 hidden lg:block'}`}>
                    <div className="h-full flex flex-col justify-between py-4 px-3 overflow-y-auto">
                        <nav className="space-y-1">
                            {navItems.map((item, idx) => {
                                if (item.header) {
                                    return (
                                        <div key={idx} className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            {item.header}
                                        </div>
                                    );
                                }

                                const Icon = item.icon!;
                                return (
                                    <Link
                                        key={idx}
                                        href={item.disabled ? '#' : item.href!}
                                        className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${item.current ? 'bg-cyan-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon className={`w-4 h-4 ${item.current ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'}`} />
                                            <span>{item.label}</span>
                                        </div>
                                        {item.badge && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${item.badge.includes('Active') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Sidebar Footer: System Status */}
                        <div className="pt-4 border-t border-slate-800 px-3 text-[11px] text-slate-400 space-y-1">
                            <div className="flex items-center justify-between">
                                <span>Engine:</span>
                                <span className="font-mono text-cyan-400">PHP 8.4</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Database:</span>
                                <span className="font-mono text-emerald-400">Postgres 18</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Architecture:</span>
                                <span className="font-mono text-indigo-400">Multi-Tenant</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {/* Flash Alerts */}
                    {flash.success && (
                        <div className="mb-6">
                            <Alert variant="success" title="Success">
                                {flash.success}
                            </Alert>
                        </div>
                    )}
                    {flash.error && (
                        <div className="mb-6">
                            <Alert variant="destructive" title="Error">
                                {flash.error}
                            </Alert>
                        </div>
                    )}

                    {children}
                </main>
            </div>
        </div>
    );
};
