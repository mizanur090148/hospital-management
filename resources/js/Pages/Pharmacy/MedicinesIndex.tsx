import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Pill, Search, Plus, Filter, AlertTriangle,
    Clock, CheckCircle2, ChevronDown, ChevronUp,
    ShieldAlert, DollarSign, Layers, Warehouse as WarehouseIcon,
    RefreshCw, X, Calendar
} from 'lucide-react';

interface MedicineBatch {
    id: string;
    warehouse_id: string;
    batch_number: string;
    expiry_date: string;
    purchase_cost: string;
    selling_price: string;
    quantity_on_hand: number;
    warehouse?: {
        id: string;
        name: string;
        code: string;
        warehouse_type: string;
    };
}

interface Medicine {
    id: string;
    code: string;
    generic_name: string;
    brand_name: string;
    dosage_form: string;
    strength: string;
    uom: string;
    manufacturer?: string;
    requires_prescription: boolean;
    reorder_level: number;
    is_active: boolean;
    batches_sum_quantity_on_hand?: number | null;
    batches?: MedicineBatch[];
}

interface Warehouse {
    id: string;
    name: string;
    code: string;
    warehouse_type: string;
}

interface Props {
    medicines: {
        data: Medicine[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    warehouses: Warehouse[];
    dosageForms: string[];
    filters: {
        search?: string;
        dosage_form?: string;
        low_stock?: boolean;
        expiring_soon?: boolean;
    };
    stats: {
        total_medicines: number;
        expiring_batches_count: number;
        expired_batches_count: number;
        total_inventory_value: number;
    };
}

export default function MedicinesIndex({ medicines, warehouses, dosageForms, filters, stats }: Props) {
    const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [adjustBatch, setAdjustBatch] = useState<{ batch: MedicineBatch; medicine: Medicine } | null>(null);

    // Filter states
    const [search, setSearch] = useState(filters.search || '');
    const [dosageForm, setDosageForm] = useState(filters.dosage_form || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/pharmacy/medicines', {
            search,
            dosage_form: dosageForm || undefined,
        }, { preserveState: true });
    };

    // New Medicine Form
    const { data: createData, setData: setCreateData, post: postCreate, processing: createProcessing, reset: resetCreate, errors: createErrors } = useForm({
        code: '',
        generic_name: '',
        brand_name: '',
        dosage_form: 'Tablet',
        strength: '',
        uom: 'Strip',
        manufacturer: '',
        reorder_level: 50,
        requires_prescription: true,
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postCreate('/pharmacy/medicines', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                resetCreate();
            },
        });
    };

    // Adjust Stock Form
    const { data: adjustData, setData: setAdjustData, post: postAdjust, processing: adjustProcessing, reset: resetAdjust } = useForm({
        new_quantity: 0,
        reason: 'Physical cycle count adjustment',
    });

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adjustBatch) return;

        postAdjust(`/pharmacy/batches/${adjustBatch.batch.id}/adjust`, {
            onSuccess: () => {
                setAdjustBatch(null);
                resetAdjust();
            },
        });
    };

    const getDaysUntilExpiry = (expiryDateStr: string) => {
        const expiry = new Date(expiryDateStr);
        const today = new Date();
        const diffTime = expiry.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    return (
        <AppLayout title="Pharmacy - Medicines & Batches">
            <Head title="Pharmacy Master Catalog & FEFO Batches" />

            <div className="space-y-6">
                {/* Header & Quick Action */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-teal-900 via-cyan-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                Phase 6: Pharmacy Core
                            </span>
                            <span className="text-xs text-slate-400">FEFO Engine Active</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2.5">
                            <Pill className="w-7 h-7 text-teal-400" />
                            Medicine Formulary & FEFO Inventory
                        </h1>
                        <p className="text-slate-300 text-sm mt-1">
                            Multi-warehouse batch management, First-Expiring First-Out automated stock control, and reorder alerts.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-lg shadow-teal-500/20"
                        >
                            <Plus className="w-4 h-4 mr-2 stroke-[2.5]" />
                            Catalog Medicine
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-5 border-l-4 border-l-teal-500 bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Formulary Drugs</p>
                                <p className="text-2xl font-black text-slate-800 mt-1">{stats.total_medicines}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Active catalogue items</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                <Pill className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 border-l-4 border-l-amber-500 bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiring in 90 Days</p>
                                <p className="text-2xl font-black text-amber-600 mt-1">{stats.expiring_batches_count}</p>
                                <p className="text-xs text-slate-400 mt-0.5">FEFO prioritized for dispensing</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Clock className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 border-l-4 border-l-rose-500 bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired Batches</p>
                                <p className="text-2xl font-black text-rose-600 mt-1">{stats.expired_batches_count}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Dispense locked / Quarantine</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <ShieldAlert className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-5 border-l-4 border-l-indigo-500 bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Valuation</p>
                                <p className="text-2xl font-black text-indigo-700 mt-1">
                                    ${Number(stats.total_inventory_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">Current acquisition cost</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <Card className="p-4 bg-white border border-slate-200">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by brand name, generic name, or item code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        <select
                            value={dosageForm}
                            onChange={(e) => setDosageForm(e.target.value)}
                            className="w-full md:w-52 py-2 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="">All Dosage Forms</option>
                            {dosageForms.map((df) => (
                                <option key={df} value={df}>{df}</option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 text-sm px-5 w-full md:w-auto">
                                Search
                            </Button>
                            {(filters.search || filters.dosage_form) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setSearch('');
                                        setDosageForm('');
                                        router.get('/pharmacy/medicines');
                                    }}
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>
                </Card>

                {/* Medicines List Table */}
                <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-slate-800 text-base">Pharmaceutical Master Catalog</h2>
                            <p className="text-xs text-slate-500">Showing {medicines.data.length} of {medicines.total} registered drugs</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Code</th>
                                    <th className="py-3 px-4">Brand & Generic Name</th>
                                    <th className="py-3 px-4">Form & Strength</th>
                                    <th className="py-3 px-4">UOM</th>
                                    <th className="py-3 px-4">Stock on Hand</th>
                                    <th className="py-3 px-4">Reorder Level</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Batches</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {medicines.data.map((med) => {
                                    const totalStock = med.batches_sum_quantity_on_hand ?? 0;
                                    const isLow = totalStock <= med.reorder_level;
                                    const isExpanded = expandedMedId === med.id;

                                    return (
                                        <React.Fragment key={med.id}>
                                            <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-teal-50/30' : ''}`}>
                                                <td className="py-3.5 px-4 font-mono font-semibold text-xs text-slate-700">
                                                    {med.code}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-900">{med.brand_name}</div>
                                                    <div className="text-xs text-slate-400 italic">{med.generic_name}</div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="font-medium text-slate-800">{med.dosage_form}</span>
                                                    <span className="text-xs text-slate-500 ml-1.5 font-mono">({med.strength})</span>
                                                </td>
                                                <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                                                    {med.uom}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className={`text-base font-bold font-mono ${totalStock === 0 ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'}`}>
                                                        {totalStock}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                                                    {med.reorder_level}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {totalStock === 0 ? (
                                                        <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
                                                    ) : isLow ? (
                                                        <Badge variant="amber" className="text-[10px]">Low Stock</Badge>
                                                    ) : (
                                                        <Badge variant="success" className="text-[10px]">Optimal</Badge>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <button
                                                        onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                                                    >
                                                        <span>{med.batches?.length || 0} Batches</span>
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expandable FEFO Batch Details */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50/70 border-b border-teal-100">
                                                    <td colSpan={8} className="p-4 sm:p-6">
                                                        <div className="bg-white rounded-xl p-4 border border-teal-200/80 shadow-xs">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Layers className="w-4 h-4 text-teal-600" />
                                                                    <h3 className="font-bold text-slate-900 text-sm">
                                                                        Active Batches in FEFO Dispensing Order (First Expiring, First Out)
                                                                    </h3>
                                                                </div>
                                                                <span className="text-xs text-slate-400">
                                                                    System automatically allocates batches near top of this list
                                                                </span>
                                                            </div>

                                                            {(!med.batches || med.batches.length === 0) ? (
                                                                <div className="py-6 text-center text-slate-400 text-xs">
                                                                    No active batches in inventory. Receive via Goods Receipt Note (GRN) in Procurement.
                                                                </div>
                                                            ) : (
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-xs">
                                                                        <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                                                                            <tr>
                                                                                <th className="py-2 px-3">Batch Number</th>
                                                                                <th className="py-2 px-3">Warehouse</th>
                                                                                <th className="py-2 px-3">Expiry Date</th>
                                                                                <th className="py-2 px-3">Days Left</th>
                                                                                <th className="py-2 px-3">Cost</th>
                                                                                <th className="py-2 px-3">Price</th>
                                                                                <th className="py-2 px-3">Qty On Hand</th>
                                                                                <th className="py-2 px-3 text-right">Actions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {med.batches.map((batch) => {
                                                                                const daysLeft = getDaysUntilExpiry(batch.expiry_date);
                                                                                const isExpired = daysLeft <= 0;
                                                                                const isNear = daysLeft > 0 && daysLeft <= 90;

                                                                                return (
                                                                                    <tr key={batch.id} className="hover:bg-teal-50/20">
                                                                                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                                                                            {batch.batch_number}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 text-slate-600">
                                                                                            <span className="inline-flex items-center gap-1 font-medium">
                                                                                                <WarehouseIcon className="w-3 h-3 text-slate-400" />
                                                                                                {batch.warehouse?.name || 'Central'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-2 px-3 font-mono">
                                                                                            {batch.expiry_date}
                                                                                        </td>
                                                                                        <td className="py-2 px-3">
                                                                                            {isExpired ? (
                                                                                                <Badge variant="destructive" className="text-[9px]">EXPIRED</Badge>
                                                                                            ) : isNear ? (
                                                                                                <Badge variant="amber" className="text-[9px]">{daysLeft} days left</Badge>
                                                                                            ) : (
                                                                                                <span className="text-emerald-600 font-semibold">{daysLeft} days</span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 font-mono text-slate-600">
                                                                                            ${Number(batch.purchase_cost).toFixed(2)}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                                                                            ${Number(batch.selling_price).toFixed(2)}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 font-mono font-bold text-teal-700 text-sm">
                                                                                            {batch.quantity_on_hand}
                                                                                        </td>
                                                                                        <td className="py-2 px-3 text-right">
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setAdjustBatch({ batch, medicine: med });
                                                                                                    setAdjustData('new_quantity', batch.quantity_on_hand);
                                                                                                }}
                                                                                                className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                                                                                            >
                                                                                                Adjust Count
                                                                                            </button>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Modal: Catalog New Medicine */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-xl w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                                    <Pill className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">Catalog New Medicine</h3>
                                    <p className="text-xs text-slate-500">Register active pharmaceutical ingredient / brand</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Item Code *</label>
                                    <Input
                                        value={createData.code}
                                        onChange={(e) => setCreateData('code', e.target.value)}
                                        placeholder="e.g. MED-PARA-500"
                                        required
                                    />
                                    {createErrors.code && <span className="text-xs text-rose-500">{createErrors.code}</span>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name *</label>
                                    <Input
                                        value={createData.brand_name}
                                        onChange={(e) => setCreateData('brand_name', e.target.value)}
                                        placeholder="e.g. Panadol Extra"
                                        required
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Generic / Chemical Name *</label>
                                    <Input
                                        value={createData.generic_name}
                                        onChange={(e) => setCreateData('generic_name', e.target.value)}
                                        placeholder="e.g. Paracetamol + Caffeine"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage Form *</label>
                                    <select
                                        value={createData.dosage_form}
                                        onChange={(e) => setCreateData('dosage_form', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        {dosageForms.map((df) => (
                                            <option key={df} value={df}>{df}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Strength *</label>
                                    <Input
                                        value={createData.strength}
                                        onChange={(e) => setCreateData('strength', e.target.value)}
                                        placeholder="e.g. 500mg, 10mg/5ml"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure (UOM) *</label>
                                    <select
                                        value={createData.uom}
                                        onChange={(e) => setCreateData('uom', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="Strip">Strip (10 Tablets)</option>
                                        <option value="Box">Box</option>
                                        <option value="Bottle">Bottle</option>
                                        <option value="Vial">Vial (Injection)</option>
                                        <option value="Ampoule">Ampoule</option>
                                        <option value="Tube">Tube (Ointment)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Alert Threshold *</label>
                                    <Input
                                        type="number"
                                        value={createData.reorder_level}
                                        onChange={(e) => setCreateData('reorder_level', parseInt(e.target.value) || 0)}
                                        required
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer / Pharma Company</label>
                                    <Input
                                        value={createData.manufacturer}
                                        onChange={(e) => setCreateData('manufacturer', e.target.value)}
                                        placeholder="e.g. GSK, Novartis, Pfizer, Square"
                                    />
                                </div>

                                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="rxReq"
                                        checked={createData.requires_prescription}
                                        onChange={(e) => setCreateData('requires_prescription', e.target.checked)}
                                        className="w-4 h-4 text-teal-600 rounded border-slate-300"
                                    />
                                    <label htmlFor="rxReq" className="text-xs text-slate-700 font-medium">
                                        Requires Doctor Prescription (Schedule H / Rx Only)
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createProcessing} className="bg-teal-600 text-white hover:bg-teal-500 font-bold">
                                    Save Formulary Item
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Adjust Stock Count */}
            {adjustBatch && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-md w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">Adjust Batch Stock Count</h3>
                                <p className="text-xs text-slate-500">
                                    Batch #{adjustBatch.batch.batch_number} - {adjustBatch.medicine.brand_name}
                                </p>
                            </div>
                            <button onClick={() => setAdjustBatch(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Quantity on Hand</label>
                                <div className="text-xl font-bold font-mono text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                    {adjustBatch.batch.quantity_on_hand}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">New Verified Quantity *</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={adjustData.new_quantity}
                                    onChange={(e) => setAdjustData('new_quantity', parseInt(e.target.value) || 0)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Reason / Notes *</label>
                                <Input
                                    value={adjustData.reason}
                                    onChange={(e) => setAdjustData('reason', e.target.value)}
                                    placeholder="e.g. Cycle physical count, Damaged bottle write-off"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setAdjustBatch(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={adjustProcessing} className="bg-indigo-600 text-white hover:bg-indigo-500 font-bold">
                                    Update Stock & Audit Ledger
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
