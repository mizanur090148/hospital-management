import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import {
    Building2, Truck, FileText, Plus, Search,
    PackageCheck, CheckCircle2, Clock, Trash2,
    Calendar, DollarSign, X, Layers, AlertCircle
} from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    tax_number?: string;
    is_active: boolean;
}

interface PurchaseOrderItem {
    id: string;
    quantity_ordered: number;
    quantity_received: number;
    unit_cost: string;
    total_cost: string;
    medicine?: {
        brand_name: string;
        generic_name: string;
        strength: string;
    };
}

interface PurchaseOrder {
    id: string;
    po_number: string;
    order_date: string;
    expected_delivery_date?: string;
    total_amount: string;
    status: string;
    notes?: string;
    supplier?: Supplier;
    warehouse?: {
        name: string;
    };
    branch?: {
        name: string;
    };
    items?: PurchaseOrderItem[];
}

interface GoodsReceiptNoteItem {
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity_received: number;
    unit_cost: string;
    selling_price: string;
    medicine?: {
        brand_name: string;
        generic_name: string;
    };
}

interface GoodsReceiptNote {
    id: string;
    grn_number: string;
    received_date: string;
    invoice_number?: string;
    notes?: string;
    supplier?: Supplier;
    warehouse?: {
        name: string;
    };
    purchaseOrder?: {
        po_number: string;
    };
    receivedByUser?: {
        name: string;
    };
    items?: GoodsReceiptNoteItem[];
}

interface Warehouse {
    id: string;
    name: string;
    code: string;
    warehouse_type: string;
}

interface Branch {
    id: string;
    name: string;
    code: string;
}

interface Medicine {
    id: string;
    brand_name: string;
    generic_name: string;
    strength: string;
    uom: string;
}

interface Props {
    purchaseOrders: {
        data: PurchaseOrder[];
        links: any[];
        total: number;
    };
    goodsReceiptNotes: {
        data: GoodsReceiptNote[];
        links: any[];
        total: number;
    };
    suppliers: Supplier[];
    warehouses: Warehouse[];
    branches: Branch[];
    medicines: Medicine[];
    activeTab: string;
}

export default function ProcurementIndex({
    purchaseOrders,
    goodsReceiptNotes,
    suppliers,
    warehouses,
    branches,
    medicines,
    activeTab: initialTab,
}: Props) {
    const [activeTab, setActiveTab] = useState<'pos' | 'grns' | 'suppliers'>(
        initialTab === 'suppliers' ? 'suppliers' : initialTab === 'grns' ? 'grns' : 'pos'
    );

    const [isCreatePoOpen, setIsCreatePoOpen] = useState(false);
    const [isCreateGrnOpen, setIsCreateGrnOpen] = useState(false);
    const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);

    // Form: Create Supplier
    const {
        data: supplierData,
        setData: setSupplierData,
        post: postSupplier,
        processing: supplierProcessing,
        reset: resetSupplier,
    } = useForm({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        tax_number: '',
        address: '',
    });

    const handleSupplierSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postSupplier('/pharmacy/procurement/suppliers', {
            onSuccess: () => {
                setIsCreateSupplierOpen(false);
                resetSupplier();
            },
        });
    };

    // Form: Create Purchase Order
    const [poItems, setPoItems] = useState<Array<{ medicine_id: string; quantity_ordered: number; unit_cost: number }>>([
        { medicine_id: medicines[0]?.id || '', quantity_ordered: 100, unit_cost: 5.00 }
    ]);

    const {
        data: poData,
        setData: setPoData,
        post: postPo,
        processing: poProcessing,
        reset: resetPo,
    } = useForm({
        branch_id: branches[0]?.id || '',
        warehouse_id: warehouses[0]?.id || '',
        supplier_id: suppliers[0]?.id || '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        notes: '',
        items: [] as any[],
    });

    const handlePoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        poData.items = poItems;
        postPo('/pharmacy/procurement/purchase-orders', {
            onSuccess: () => {
                setIsCreatePoOpen(false);
                resetPo();
            },
        });
    };

    // Form: Receive Goods Receipt Note (GRN)
    const [grnItems, setGrnItems] = useState<Array<{
        medicine_id: string;
        batch_number: string;
        expiry_date: string;
        quantity_received: number;
        unit_cost: number;
        selling_price: number;
    }>>([
        {
            medicine_id: medicines[0]?.id || '',
            batch_number: 'B-' + Math.floor(100000 + Math.random() * 900000),
            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            quantity_received: 100,
            unit_cost: 5.00,
            selling_price: 8.50,
        }
    ]);

    const {
        data: grnData,
        setData: setGrnData,
        post: postGrn,
        processing: grnProcessing,
        reset: resetGrn,
    } = useForm({
        branch_id: branches[0]?.id || '',
        warehouse_id: warehouses[0]?.id || '',
        supplier_id: suppliers[0]?.id || '',
        purchase_order_id: '',
        received_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        notes: '',
        items: [] as any[],
    });

    const handleGrnSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        grnData.items = grnItems;
        postGrn('/pharmacy/procurement/goods-receipt-notes', {
            onSuccess: () => {
                setIsCreateGrnOpen(false);
                resetGrn();
                setActiveTab('grns');
            },
        });
    };

    return (
        <AppLayout title="Pharmacy - Procurement & Supply Chain">
            <Head title="Pharmacy Procurement & Supply Chain" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Phase 6: Supply Chain Engine
                            </span>
                            <span className="text-xs text-slate-400">PO, GRN & Inward Batches</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2.5">
                            <Truck className="w-7 h-7 text-indigo-400" />
                            Procurement, Inward GRN & Vendors
                        </h1>
                        <p className="text-slate-300 text-sm mt-1">
                            Issue vendor purchase orders, receive batch deliveries with expiry dates, and manage pharmaceutical suppliers.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsCreateSupplierOpen(true)}
                            variant="outline"
                            className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700 text-xs"
                        >
                            <Building2 className="w-4 h-4 mr-1.5" />
                            Add Vendor
                        </Button>
                        <Button
                            onClick={() => setIsCreatePoOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                        >
                            <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                            Issue PO
                        </Button>
                        <Button
                            onClick={() => setIsCreateGrnOpen(true)}
                            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20"
                        >
                            <PackageCheck className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                            Inward GRN
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-3 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('pos')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'pos' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <FileText className="w-4 h-4" />
                        Purchase Orders ({purchaseOrders.total})
                    </button>
                    <button
                        onClick={() => setActiveTab('grns')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'grns' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <PackageCheck className="w-4 h-4" />
                        Goods Receipt Notes ({goodsReceiptNotes.total})
                    </button>
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'suppliers' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Building2 className="w-4 h-4" />
                        Suppliers & Vendors ({suppliers.length})
                    </button>
                </div>

                {/* Tab: Purchase Orders */}
                {activeTab === 'pos' && (
                    <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 text-base">Procurement Purchase Orders</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">PO #</th>
                                        <th className="py-3 px-4">Supplier</th>
                                        <th className="py-3 px-4">Destination Store</th>
                                        <th className="py-3 px-4">Order Date</th>
                                        <th className="py-3 px-4">Delivery Due</th>
                                        <th className="py-3 px-4">Items Count</th>
                                        <th className="py-3 px-4">Total Amount</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {purchaseOrders.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                                                No purchase orders recorded yet. Click "Issue PO" to generate one.
                                            </td>
                                        </tr>
                                    ) : (
                                        purchaseOrders.data.map((po) => (
                                            <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 text-xs">
                                                    {po.po_number}
                                                </td>
                                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                                    {po.supplier?.name}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs text-slate-700">
                                                    {po.warehouse?.name}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                                                    {po.order_date}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                                                    {po.expected_delivery_date || '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-700">
                                                    {po.items?.length || 0} Lines
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                                    ${Number(po.total_amount).toFixed(2)}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {po.status === 'Received' ? (
                                                        <Badge variant="success" className="text-[10px]">Received</Badge>
                                                    ) : po.status === 'PartiallyReceived' ? (
                                                        <Badge variant="amber" className="text-[10px]">Partially Received</Badge>
                                                    ) : (
                                                        <Badge variant="cyan" className="text-[10px]">Issued</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab: Goods Receipt Notes (GRN) */}
                {activeTab === 'grns' && (
                    <Card className="bg-white border border-slate-200 overflow-hidden shadow-xs">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 text-base">Inward Goods Receipt Notes (Stock Batches Inward)</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">GRN #</th>
                                        <th className="py-3 px-4">Supplier</th>
                                        <th className="py-3 px-4">Warehouse</th>
                                        <th className="py-3 px-4">Invoice #</th>
                                        <th className="py-3 px-4">Received Date</th>
                                        <th className="py-3 px-4">Received By</th>
                                        <th className="py-3 px-4">Batches Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {goodsReceiptNotes.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                                                No Goods Receipt Notes received yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        goodsReceiptNotes.data.map((grn) => (
                                            <tr key={grn.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-bold text-teal-700 text-xs">
                                                    {grn.grn_number}
                                                </td>
                                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                                    {grn.supplier?.name}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs text-slate-700">
                                                    {grn.warehouse?.name}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                                                    {grn.invoice_number || '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                                                    {grn.received_date}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs text-slate-700">
                                                    {grn.receivedByUser?.name || 'Store Pharmacist'}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs font-mono font-bold text-teal-700">
                                                    {grn.items?.length || 0} Batches
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab: Suppliers */}
                {activeTab === 'suppliers' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suppliers.map((s) => (
                            <Card key={s.id} className="p-5 bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                            {s.name.charAt(0)}
                                        </div>
                                        <Badge variant={s.is_active ? 'success' : 'slate'} className="text-[10px]">
                                            {s.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-base mt-3">{s.name}</h3>
                                    <div className="text-xs text-slate-500 mt-0.5">Contact: {s.contact_person || 'N/A'}</div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Email:</span>
                                            <span className="font-medium text-slate-800">{s.email || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Phone:</span>
                                            <span className="font-medium text-slate-800">{s.phone || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Tax ID:</span>
                                            <span className="font-mono text-slate-800">{s.tax_number || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Register Supplier */}
            {isCreateSupplierOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-md w-full p-6 shadow-2xl rounded-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Register Pharmaceutical Vendor</h3>
                            <button onClick={() => setIsCreateSupplierOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSupplierSubmit} className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Vendor Name *</label>
                                <Input
                                    value={supplierData.name}
                                    onChange={(e) => setSupplierData('name', e.target.value)}
                                    placeholder="e.g. Apex Pharma Distributors Ltd"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                                <Input
                                    value={supplierData.contact_person}
                                    onChange={(e) => setSupplierData('contact_person', e.target.value)}
                                    placeholder="e.g. Dr. Robert Vance"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                                    <Input
                                        type="email"
                                        value={supplierData.email}
                                        onChange={(e) => setSupplierData('email', e.target.value)}
                                        placeholder="sales@vendor.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                                    <Input
                                        value={supplierData.phone}
                                        onChange={(e) => setSupplierData('phone', e.target.value)}
                                        placeholder="+1 555-0192"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Tax / VAT ID</label>
                                <Input
                                    value={supplierData.tax_number}
                                    onChange={(e) => setSupplierData('tax_number', e.target.value)}
                                    placeholder="e.g. TAX-994821"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                                <Input
                                    value={supplierData.address}
                                    onChange={(e) => setSupplierData('address', e.target.value)}
                                    placeholder="Street, City, State"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsCreateSupplierOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={supplierProcessing} className="bg-indigo-600 text-white hover:bg-indigo-500 font-bold">
                                    Save Supplier
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Create Purchase Order */}
            {isCreatePoOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-2xl w-full p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-900 text-base">Issue Purchase Order (PO)</h3>
                            <button onClick={() => setIsCreatePoOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePoSubmit} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                                    <select
                                        value={poData.supplier_id}
                                        onChange={(e) => setPoData('supplier_id', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Store *</label>
                                    <select
                                        value={poData.warehouse_id}
                                        onChange={(e) => setPoData('warehouse_id', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch *</label>
                                    <select
                                        value={poData.branch_id}
                                        onChange={(e) => setPoData('branch_id', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date *</label>
                                    <Input
                                        type="date"
                                        value={poData.order_date}
                                        onChange={(e) => setPoData('order_date', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                                    <Input
                                        type="date"
                                        value={poData.expected_delivery_date}
                                        onChange={(e) => setPoData('expected_delivery_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700">Order Items</label>
                                    <button
                                        type="button"
                                        onClick={() => setPoItems([...poItems, { medicine_id: medicines[0]?.id || '', quantity_ordered: 50, unit_cost: 4.00 }])}
                                        className="text-xs text-indigo-600 font-semibold hover:underline"
                                    >
                                        + Add Item
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {poItems.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <select
                                                value={item.medicine_id}
                                                onChange={(e) => {
                                                    const copy = [...poItems];
                                                    copy[idx].medicine_id = e.target.value;
                                                    setPoItems(copy);
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
                                                value={item.quantity_ordered}
                                                onChange={(e) => {
                                                    const copy = [...poItems];
                                                    copy[idx].quantity_ordered = parseInt(e.target.value) || 1;
                                                    setPoItems(copy);
                                                }}
                                                placeholder="Qty"
                                                className="w-20 py-1.5 px-2 rounded-xl border border-slate-200 text-xs text-center font-bold"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={item.unit_cost}
                                                onChange={(e) => {
                                                    const copy = [...poItems];
                                                    copy[idx].unit_cost = parseFloat(e.target.value) || 0;
                                                    setPoItems(copy);
                                                }}
                                                placeholder="Unit Cost"
                                                className="w-24 py-1.5 px-2 rounded-xl border border-slate-200 text-xs text-center font-mono font-bold"
                                            />
                                            {poItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
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
                                <Button type="button" variant="outline" onClick={() => setIsCreatePoOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={poProcessing} className="bg-indigo-600 text-white hover:bg-indigo-500 font-bold">
                                    Issue Purchase Order
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Receive Goods Receipt Note (GRN) */}
            {isCreateGrnOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <Card className="bg-white max-w-3xl w-full p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Inward Goods Receipt Note (GRN)</h3>
                                <p className="text-xs text-slate-500">Capture batch numbers, expiration dates, and increment stock balances</p>
                            </div>
                            <button onClick={() => setIsCreateGrnOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleGrnSubmit} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                                    <select
                                        value={grnData.supplier_id}
                                        onChange={(e) => setGrnData('supplier_id', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                                    >
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Store *</label>
                                    <select
                                        value={grnData.warehouse_id}
                                        onChange={(e) => setGrnData('warehouse_id', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                                    >
                                        {warehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Branch *</label>
                                    <select
                                        value={grnData.branch_id}
                                        onChange={(e) => setGrnData('branch_id', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                                    >
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Received Date *</label>
                                    <Input
                                        type="date"
                                        value={grnData.received_date}
                                        onChange={(e) => setGrnData('received_date', e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Invoice #</label>
                                    <Input
                                        value={grnData.invoice_number}
                                        onChange={(e) => setGrnData('invoice_number', e.target.value)}
                                        placeholder="e.g. INV-9921"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Linked PO (Optional)</label>
                                    <select
                                        value={grnData.purchase_order_id}
                                        onChange={(e) => setGrnData('purchase_order_id', e.target.value)}
                                        className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="">None (Ad-hoc Delivery)</option>
                                        {purchaseOrders.data.map((po) => (
                                            <option key={po.id} value={po.id}>{po.po_number}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Line Items with Batch and Expiry */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700">Received Batches & Quantities</label>
                                    <button
                                        type="button"
                                        onClick={() => setGrnItems([...grnItems, {
                                            medicine_id: medicines[0]?.id || '',
                                            batch_number: 'B-' + Math.floor(100000 + Math.random() * 900000),
                                            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                            quantity_received: 100,
                                            unit_cost: 5.00,
                                            selling_price: 8.50,
                                        }])}
                                        className="text-xs text-teal-600 font-semibold hover:underline"
                                    >
                                        + Add Batch Line
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {grnItems.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={item.medicine_id}
                                                    onChange={(e) => {
                                                        const copy = [...grnItems];
                                                        copy[idx].medicine_id = e.target.value;
                                                        setGrnItems(copy);
                                                    }}
                                                    className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 text-xs bg-white"
                                                >
                                                    {medicines.map((m) => (
                                                        <option key={m.id} value={m.id}>{m.brand_name} ({m.strength})</option>
                                                    ))}
                                                </select>
                                                {grnItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setGrnItems(grnItems.filter((_, i) => i !== idx))}
                                                        className="text-rose-500 hover:text-rose-700 p-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-4 gap-2">
                                                <div>
                                                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Batch #</span>
                                                    <input
                                                        type="text"
                                                        value={item.batch_number}
                                                        onChange={(e) => {
                                                            const copy = [...grnItems];
                                                            copy[idx].batch_number = e.target.value;
                                                            setGrnItems(copy);
                                                        }}
                                                        className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs font-mono font-bold bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Expiry Date</span>
                                                    <input
                                                        type="date"
                                                        value={item.expiry_date}
                                                        onChange={(e) => {
                                                            const copy = [...grnItems];
                                                            copy[idx].expiry_date = e.target.value;
                                                            setGrnItems(copy);
                                                        }}
                                                        className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Qty Received</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity_received}
                                                        onChange={(e) => {
                                                            const copy = [...grnItems];
                                                            copy[idx].quantity_received = parseInt(e.target.value) || 1;
                                                            setGrnItems(copy);
                                                        }}
                                                        className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs text-center font-bold bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">Sell Price</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.selling_price}
                                                        onChange={(e) => {
                                                            const copy = [...grnItems];
                                                            copy[idx].selling_price = parseFloat(e.target.value) || 0;
                                                            setGrnItems(copy);
                                                        }}
                                                        className="w-full py-1.5 px-2 rounded-lg border border-slate-200 text-xs text-center font-mono font-bold bg-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setIsCreateGrnOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={grnProcessing} className="bg-teal-600 text-white hover:bg-teal-500 font-bold">
                                    Receive GRN & Update FEFO Inventory
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </AppLayout>
    );
}
