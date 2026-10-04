import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Activity, Pill, Search, CheckCircle2, Clock,
    Printer, AlertCircle, ShoppingCart, User,
    Warehouse as WarehouseIcon, Layers, X, Plus, Trash2, ArrowRight
} from 'lucide-react';

interface PrescriptionItem {
    id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration_days: number;
    total_quantity: number;
    instructions?: string;
}

interface Prescription {
    id: string;
    prescription_number: string;
    created_at: string;
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        mrn: string;
        gender: string;
        dob: string;
    };
    doctor?: {
        id: string;
        user?: { name: string };
    };
    items: PrescriptionItem[];
}

interface DispensingItem {
    id: string;
    quantity: number;
    unit_price: string;
    subtotal: string;
    medicine?: {
        brand_name: string;
        generic_name: string;
        strength: string;
        uom: string;
    };
    medicineBatch?: {
        batch_number: string;
        expiry_date: string;
    };
}

interface PharmacyDispensing {
    id: string;
    dispense_number: string;
    dispensed_at: string;
    total_amount: string;
    status: string;
    patient: {
        first_name: string;
        last_name: string;
        mrn: string;
    };
    warehouse?: {
        name: string;
        code: string;
    };
    dispensedByUser?: {
        name: string;
    };
    items: DispensingItem[];
}

interface Warehouse {
    id: string;
    name: string;
    code: string;
    warehouse_type: string;
}

interface Medicine {
    id: string;
    brand_name: string;
    generic_name: string;
    strength: string;
    dosage_form: string;
    uom: string;
}

interface Patient {
    id: string;
    mrn: string;
    first_name: string;
    last_name: string;
    phone?: string;
}

interface Branch {
    id: string;
    name: string;
    code: string;
}

interface Props {
    prescriptions: Prescription[];
    dispensings: {
        data: PharmacyDispensing[];
        links: any[];
        total: number;
    };
    warehouses: Warehouse[];
    medicines: Medicine[];
    patients: Patient[];
    branches: Branch[];
    filters: {
        search?: string;
    };
}

export default function DispenseIndex({ prescriptions, dispensings, warehouses, medicines, patients, branches, filters }: Props) {
    const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [selectedDispensing, setSelectedDispensing] = useState<PharmacyDispensing | null>(null);
    const [isDirectDispenseOpen, setIsDirectDispenseOpen] = useState(false);

    // Selected warehouse for dispensing
    const [warehouseId, setWarehouseId] = useState<string>(warehouses[0]?.id || '');
    const [branchId, setBranchId] = useState<string>(branches[0]?.id || '');

    // Dispense Prescription Form
    const [dispenseItems, setDispenseItems] = useState<Array<{
        medicine_id: string;
        prescription_item_id?: string;
        medicine_label: string;
        quantity: number;
        allocations?: any[];
        allocating?: boolean;
        error?: string;
    }>>([]);

    const openPrescriptionDispense = (rx: Prescription) => {
        setSelectedPrescription(rx);

        // Prepopulate items from prescription
        const initial = rx.items.map((pi) => {
            // Find closest matching catalog medicine by generic or brand
            const match = medicines.find(
                (m) => m.brand_name.toLowerCase().includes(pi.medicine_name.toLowerCase()) ||
                    pi.medicine_name.toLowerCase().includes(m.brand_name.toLowerCase()) ||
                    m.generic_name.toLowerCase().includes(pi.medicine_name.toLowerCase())
            );

            return {
                medicine_id: match ? match.id : (medicines[0]?.id || ''),
                prescription_item_id: pi.id,
                medicine_label: pi.medicine_name,
                quantity: pi.total_quantity || 1,
            };
        });

        setDispenseItems(initial);
    };

    // Trigger FEFO preview for an item
    const fetchFefoPreview = async (index: number) => {
        const item = dispenseItems[index];
        if (!item.medicine_id || !warehouseId) return;

        const updated = [...dispenseItems];
        updated[index].allocating = true;
        updated[index].error = undefined;
        setDispenseItems(updated);

        try {
            const res = await fetch('/pharmacy/dispense/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    warehouse_id: warehouseId,
                    medicine_id: item.medicine_id,
                    quantity: item.quantity,
                }),
            });

            const data = await res.json();
            const copy = [...dispenseItems];
            copy[index].allocating = false;

            if (data.success) {
                copy[index].allocations = data.allocations;
            } else {
                copy[index].error = data.message || 'FEFO allocation failed.';
            }
            setDispenseItems(copy);
        } catch (e: any) {
            const copy = [...dispenseItems];
            copy[index].allocating = false;
            copy[index].error = 'Server error during allocation check.';
            setDispenseItems(copy);
        }
    };

    // Execute Dispense
    const handleExecuteDispense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPrescription) return;

        router.post('/pharmacy/dispense', {
            branch_id: branchId,
            warehouse_id: warehouseId,
            patient_id: selectedPrescription.patient.id,
            prescription_id: selectedPrescription.id,
            items: dispenseItems.map((item) => ({
                medicine_id: item.medicine_id,
                quantity: item.quantity,
                prescription_item_id: item.prescription_item_id,
            })),
        }, {
            onSuccess: () => {
                setSelectedPrescription(null);
                setDispenseItems([]);
                setActiveTab('history');
            },
        });
    };

    // Direct / OTC Dispense State
    const [directPatientId, setDirectPatientId] = useState(patients[0]?.id || '');
    const [directItems, setDirectItems] = useState<Array<{ medicine_id: string; quantity: number }>>([
        { medicine_id: medicines[0]?.id || '', quantity: 1 }
    ]);

    const handleExecuteDirectDispense = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/pharmacy/dispense', {
            branch_id: branchId,
            warehouse_id: warehouseId,
            patient_id: directPatientId,
            items: directItems,
        }, {
            onSuccess: () => {
                setIsDirectDispenseOpen(false);
                setActiveTab('history');
            },
        });
    };

    return (
        <AppLayout title="Pharmacy - Prescription Dispensing">
            <Head title="Pharmacy Dispensing & FEFO Counter" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-cyan-900 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Phase 6: Counter Dispensing
                            </span>
                            <span className="text-xs text-slate-400">Strict FEFO Batch Enforcement</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2.5">
                            <ShoppingCart className="w-7 h-7 text-cyan-400" />
                            Prescription Dispensing & Counter Sales
                        </h1>
                        <p className="text-slate-300 text-sm mt-1">
                            Execute automated batch deductions for OPD prescriptions with zero negative stock guarantee.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsDirectDispenseOpen(true)}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
                        >
                            <Plus className="w-4 h-4 mr-2 stroke-[2.5]" />
                            Direct / OTC Sale
                        </Button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-3 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('queue')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'queue' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Clock className="w-4 h-4" />
                        OPD Prescriptions Awaiting Dispense ({prescriptions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'history' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Dispense Invoices & History ({dispensings.total})
                    </button>
                </div>

                {/* Queue Tab Content */}
                {activeTab === 'queue' && (
                    <div className="space-y-4">
                        {prescriptions.length === 0 ? (
                            <Card className="p-12 text-center text-slate-500 bg-white">
                                <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                <h3 className="font-bold text-slate-700 text-base">Prescription Queue Clean</h3>
                                <p className="text-xs text-slate-400 mt-1">No doctor prescriptions pending fulfillment.</p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {prescriptions.map((rx) => (
                                    <Card key={rx.id} className="p-5 bg-white border border-slate-200 hover:border-teal-400 transition-all shadow-xs flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                                                    {rx.prescription_number}
                                                </span>
                                                <Badge variant="cyan" className="text-[10px]">Ready</Badge>
                                            </div>

                                            <div className="mt-3">
                                                <div className="font-bold text-slate-900 text-base">
                                                    {rx.patient?.first_name} {rx.patient?.last_name}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">
                                                    MRN: {rx.patient?.mrn} • Dr. {rx.doctor?.user?.name || 'Assigned Physician'}
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-100">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Prescribed Items ({rx.items.length})</p>
                                                <ul className="space-y-1 text-xs text-slate-700">
                                                    {rx.items.map((item, idx) => (
                                                        <li key={idx} className="flex items-center justify-between">
                                                            <span className="font-medium text-slate-800 truncate max-w-[180px]">
                                                                {item.medicine_name}
                                                            </span>
                                                            <span className="font-mono text-teal-700 font-bold">
                                                                {item.total_quantity || 1} units
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-3 border-t border-slate-100">
                                            <Button
                                                onClick={() => openPrescriptionDispense(rx)}
                                                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2 shadow-xs"
                                            >
                                                <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                                                Review & Dispense FEFO
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* History Tab Content */}
                {activeTab === 'history' && (
                    <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-slate-800 text-base">Fulfilled Dispensings & Receipts</h2>
                                <p className="text-xs text-slate-500">Audit trail of all dispensed prescriptions and counter invoices</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Dispense #</th>
                                        <th className="py-3 px-4">Patient</th>
                                        <th className="py-3 px-4">Warehouse</th>
                                        <th className="py-3 px-4">Dispensed By</th>
                                        <th className="py-3 px-4">Timestamp</th>
                                        <th className="py-3 px-4">Total Amount</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dispensings.data.map((disp) => (
                                        <tr key={disp.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-teal-700 text-xs">
                                                {disp.dispense_number}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900">
                                                    {disp.patient?.first_name} {disp.patient?.last_name}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">
                                                    MRN: {disp.patient?.mrn}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                                                {disp.warehouse?.name || 'Central Pharmacy'}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-600">
                                                {disp.dispensedByUser?.name || 'Staff Pharmacist'}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                                                {disp.dispensed_at}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                                                ${Number(disp.total_amount).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => setSelectedDispensing(disp)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    Receipt
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Modal: Interactive FEFO Dispense for Prescription */}
            {selectedPrescription && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-2xl w-full p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">
                                    Dispense Prescription #{selectedPrescription.prescription_number}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Patient: {selectedPrescription.patient?.first_name} {selectedPrescription.patient?.last_name} (MRN: {selectedPrescription.patient?.mrn})
                                </p>
                            </div>
                            <button onClick={() => setSelectedPrescription(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleExecuteDispense} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dispensing Pharmacy Store *</label>
                                    <select
                                        value={warehouseId}
                                        onChange={(e) => setWarehouseId(e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name} ({w.warehouse_type})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch *</label>
                                    <select
                                        value={branchId}
                                        onChange={(e) => setBranchId(e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prescription Items & FEFO Batches</h4>
                                <div className="space-y-3">
                                    {dispenseItems.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-800">{item.medicine_label}</span>
                                                    <div className="text-[11px] text-slate-500">Prescribed Quantity: {item.quantity}</div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={item.medicine_id}
                                                        onChange={(e) => {
                                                            const copy = [...dispenseItems];
                                                            copy[idx].medicine_id = e.target.value;
                                                            copy[idx].allocations = undefined;
                                                            setDispenseItems(copy);
                                                        }}
                                                        className="py-1.5 px-2 rounded-lg border border-slate-200 text-xs bg-white w-48"
                                                    >
                                                        {medicines.map((m) => (
                                                            <option key={m.id} value={m.id}>{m.brand_name} ({m.strength})</option>
                                                        ))}
                                                    </select>

                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const copy = [...dispenseItems];
                                                            copy[idx].quantity = parseInt(e.target.value) || 1;
                                                            copy[idx].allocations = undefined;
                                                            setDispenseItems(copy);
                                                        }}
                                                        className="w-16 py-1.5 px-2 rounded-lg border border-slate-200 text-xs text-center font-bold"
                                                    />

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => fetchFefoPreview(idx)}
                                                        disabled={item.allocating}
                                                        className="text-xs py-1 px-2.5"
                                                    >
                                                        {item.allocating ? 'Checking...' : 'Check FEFO'}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Allocation Results */}
                                            {item.allocations && (
                                                <div className="mt-2.5 pt-2 border-t border-slate-200 text-xs">
                                                    <span className="font-semibold text-emerald-700">FEFO Allocated Batches:</span>
                                                    <ul className="mt-1 space-y-1">
                                                        {item.allocations.map((alloc: any, aIdx: number) => (
                                                            <li key={aIdx} className="flex items-center justify-between text-slate-600 bg-white p-1.5 rounded border border-slate-100">
                                                                <span>Batch <strong>#{alloc.batch_number}</strong> (Exp: {alloc.expiry_date})</span>
                                                                <span>Qty: <strong>{alloc.allocated_qty}</strong> × ${alloc.unit_price} = <strong>${alloc.subtotal}</strong></span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {item.error && (
                                                <div className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    {item.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setSelectedPrescription(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-teal-600 text-white hover:bg-teal-500 font-bold">
                                    Execute FEFO Dispense
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Direct / OTC Sale */}
            {isDirectDispenseOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-xl w-full p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Direct / OTC Dispense</h3>
                                <p className="text-xs text-slate-500">Counter walk-in dispensing with automatic FEFO batch selection</p>
                            </div>
                            <button onClick={() => setIsDirectDispenseOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleExecuteDirectDispense} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient *</label>
                                <select
                                    value={directPatientId}
                                    onChange={(e) => setDirectPatientId(e.target.value)}
                                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    {patients.map((p) => (
                                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.mrn})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse *</label>
                                    <select
                                        value={warehouseId}
                                        onChange={(e) => setWarehouseId(e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch *</label>
                                    <select
                                        value={branchId}
                                        onChange={(e) => setBranchId(e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700">Medicines</label>
                                    <button
                                        type="button"
                                        onClick={() => setDirectItems([...directItems, { medicine_id: medicines[0]?.id || '', quantity: 1 }])}
                                        className="text-xs text-teal-600 font-semibold hover:underline"
                                    >
                                        + Add Item
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {directItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <select
                                                value={item.medicine_id}
                                                onChange={(e) => {
                                                    const copy = [...directItems];
                                                    copy[idx].medicine_id = e.target.value;
                                                    setDirectItems(copy);
                                                }}
                                                className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 text-xs"
                                            >
                                                {medicines.map((m) => (
                                                    <option key={m.id} value={m.id}>{m.brand_name} ({m.strength})</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const copy = [...directItems];
                                                    copy[idx].quantity = parseInt(e.target.value) || 1;
                                                    setDirectItems(copy);
                                                }}
                                                className="w-20 py-1.5 px-2 rounded-xl border border-slate-200 text-xs text-center font-bold"
                                            />
                                            {directItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDirectItems(directItems.filter((_, i) => i !== idx))}
                                                    className="text-rose-500 hover:text-rose-700 p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsDirectDispenseOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-cyan-600 text-white hover:bg-cyan-500 font-bold">
                                    Complete Counter Sale
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: View Printable Receipt */}
            {selectedDispensing && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-lg w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Printer className="w-5 h-5 text-teal-600" />
                                <h3 className="font-bold text-slate-900 text-base">Pharmacy Dispense Receipt</h3>
                            </div>
                            <button onClick={() => setSelectedDispensing(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mt-4 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50 font-mono text-xs text-slate-800 space-y-3">
                            <div className="text-center pb-2 border-b border-slate-200">
                                <div className="font-bold text-sm">APEXCARE HOSPITAL PHARMACY</div>
                                <div className="text-[10px] text-slate-500">Dispense #{selectedDispensing.dispense_number}</div>
                                <div className="text-[10px] text-slate-500">{selectedDispensing.dispensed_at}</div>
                            </div>

                            <div className="flex justify-between text-[11px]">
                                <span>Patient: {selectedDispensing.patient?.first_name} {selectedDispensing.patient?.last_name}</span>
                                <span>MRN: {selectedDispensing.patient?.mrn}</span>
                            </div>

                            <div className="border-t border-b border-slate-200 py-2">
                                <div className="grid grid-cols-12 font-bold mb-1">
                                    <div className="col-span-6">Item (Batch)</div>
                                    <div className="col-span-2 text-center">Qty</div>
                                    <div className="col-span-2 text-right">Price</div>
                                    <div className="col-span-2 text-right">Total</div>
                                </div>
                                {selectedDispensing.items.map((it, idx) => (
                                    <div key={idx} className="grid grid-cols-12 py-1 text-[11px]">
                                        <div className="col-span-6 truncate">
                                            {it.medicine?.brand_name}
                                            <span className="text-[9px] text-slate-500 block">
                                                (Batch: {it.medicineBatch?.batch_number}, Exp: {it.medicineBatch?.expiry_date})
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-center">{it.quantity}</div>
                                        <div className="col-span-2 text-right">${Number(it.unit_price).toFixed(2)}</div>
                                        <div className="col-span-2 text-right font-bold">${Number(it.subtotal).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center text-sm font-bold pt-1">
                                <span>NET TOTAL:</span>
                                <span className="text-teal-700">${Number(selectedDispensing.total_amount).toFixed(2)}</span>
                            </div>

                            <div className="text-center pt-2 text-[10px] text-slate-500">
                                Dispensed by: {selectedDispensing.dispensedByUser?.name || 'Pharmacist'}
                                <br />
                                Keep medicines safely stored.
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <Button onClick={() => window.print()} className="bg-slate-900 text-white hover:bg-slate-800 text-xs">
                                <Printer className="w-3.5 h-3.5 mr-1.5" />
                                Print Receipt
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
