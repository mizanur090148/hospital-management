import React, { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import {
    Pill, Search, Filter, Calendar, User, Stethoscope,
    FileText, Printer, ArrowRight, CheckCircle2
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface Prescription {
    id: string;
    prescription_number: string;
    advice: string | null;
    follow_up_date: string | null;
    status: string;
    created_at: string;
    patient: {
        id: string;
        mrn: string;
        full_name: string;
        age: number | null;
        gender: string;
    };
    doctor: {
        id: string;
        user: { name: string };
        department: { name: string };
    };
    items: Array<{
        id: string;
        medicine_name: string;
        dosage: string;
        frequency: string;
    }>;
}

interface PrescriptionsIndexProps {
    prescriptions: {
        data: Prescription[];
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
    };
}

export default function PrescriptionsIndex({ prescriptions, filters }: PrescriptionsIndexProps) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/prescriptions', { search: search || undefined }, { preserveState: true });
    };

    return (
        <AppLayout title="Digital Prescriptions Pad (Rx)">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Prescriptions Registry</h1>
                            <Badge variant="cyan" className="font-semibold">{prescriptions.total} Issued</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Centralized repository of digital prescriptions ready for pharmacy dispensing or patient printing.
                        </p>
                    </div>

                    <Link href="/opd">
                        <Button variant="primary" className="shadow-sm shadow-cyan-600/30">
                            <Pill className="w-4 h-4 mr-1.5" />
                            Open OPD Workstation
                        </Button>
                    </Link>
                </div>

                {/* Search Bar */}
                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={handleSearch} className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by Prescription # (e.g. RX-2026-000001), Patient Name, or MRN..."
                                    className="pl-10"
                                />
                            </div>
                            <Button type="submit" variant="secondary">
                                <Filter className="w-4 h-4 mr-1.5" /> Search
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5">Rx Number & Date</th>
                                    <th className="px-6 py-3.5">Patient Details</th>
                                    <th className="px-6 py-3.5">Prescribing Doctor</th>
                                    <th className="px-6 py-3.5">Prescribed Medicines</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {prescriptions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <Pill className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                            <p className="font-semibold text-slate-700">No prescriptions recorded yet</p>
                                        </td>
                                    </tr>
                                ) : (
                                    prescriptions.data.map((rx) => (
                                        <tr key={rx.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-sm text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200/60 inline-block">
                                                    {rx.prescription_number}
                                                </div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(rx.created_at).toLocaleDateString()}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <Link href={`/patients/${rx.patient.id}`} className="font-semibold text-slate-900 hover:text-cyan-700">
                                                    {rx.patient.full_name}
                                                </Link>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {rx.patient.mrn} • {rx.patient.age}y
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">Dr. {rx.doctor.user.name}</div>
                                                <div className="text-xs text-slate-400">{rx.doctor.department.name}</div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[280px]">
                                                    {rx.items.slice(0, 3).map((item) => (
                                                        <span key={item.id} className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                                            {item.medicine_name} ({item.dosage})
                                                        </span>
                                                    ))}
                                                    {rx.items.length > 3 && (
                                                        <span className="text-[10px] text-slate-400 self-center">
                                                            +{rx.items.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <Badge variant={rx.status === 'FINALIZED' ? 'success' : 'secondary'} className="text-[11px]">
                                                    {rx.status}
                                                </Badge>
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/prescriptions/${rx.id}`}>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs">
                                                        <Printer className="w-3.5 h-3.5 mr-1" /> View / Print
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
