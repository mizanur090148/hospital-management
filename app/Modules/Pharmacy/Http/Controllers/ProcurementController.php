<?php

namespace App\Modules\Pharmacy\Http\Controllers;

use App\Core\Enums\PoStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacy\Models\GoodsReceiptNote;
use App\Modules\Pharmacy\Models\Medicine;
use App\Modules\Pharmacy\Models\PurchaseOrder;
use App\Modules\Pharmacy\Models\PurchaseOrderItem;
use App\Modules\Pharmacy\Models\Supplier;
use App\Modules\Pharmacy\Models\Warehouse;
use App\Modules\Pharmacy\Services\FefoDispensingService;
use App\Modules\Tenancy\Models\Branch;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProcurementController extends Controller
{
    public function __construct(
        protected FefoDispensingService $fefoService
    ) {}

    /**
     * Display Procurement workstation: Purchase Orders, GRNs, and Suppliers.
     */
    public function index(Request $request): Response
    {
        $tab = $request->input('tab', 'purchase_orders');

        $purchaseOrders = PurchaseOrder::with([
            'supplier',
            'warehouse',
            'branch',
            'items.medicine',
        ])->latest()->paginate(10, ['*'], 'po_page');

        $goodsReceiptNotes = GoodsReceiptNote::with([
            'supplier',
            'warehouse',
            'purchaseOrder',
            'receivedByUser',
            'items.medicine',
        ])->latest()->paginate(10, ['*'], 'grn_page');

        $suppliers = Supplier::where('is_active', true)->latest()->get();
        $warehouses = Warehouse::where('is_active', true)->get(['id', 'name', 'code', 'warehouse_type']);
        $branches = Branch::where('is_active', true)->get(['id', 'name', 'code']);
        $medicines = Medicine::where('is_active', true)->get(['id', 'brand_name', 'generic_name', 'strength', 'uom']);

        return Inertia::render('Pharmacy/ProcurementIndex', [
            'purchaseOrders' => $purchaseOrders,
            'goodsReceiptNotes' => $goodsReceiptNotes,
            'suppliers' => $suppliers,
            'warehouses' => $warehouses,
            'branches' => $branches,
            'medicines' => $medicines,
            'activeTab' => $tab,
        ]);
    }

    /**
     * Store a new pharmaceutical supplier/vendor.
     */
    public function storeSupplier(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'contact_person' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:50'],
            'tax_number' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['tenant_id'] = $tenantId;
        $validated['address'] = $validated['address'] ? ['street' => $validated['address']] : null;

        Supplier::create($validated);

        return back()->with('success', "Supplier {$validated['name']} registered successfully.");
    }

    /**
     * Store a Purchase Order with line items.
     */
    public function storePurchaseOrder(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'branch_id' => ['required', 'uuid'],
            'warehouse_id' => ['required', 'uuid'],
            'supplier_id' => ['required', 'uuid'],
            'order_date' => ['required', 'date'],
            'expected_delivery_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.medicine_id' => ['required', 'uuid'],
            'items.*.quantity_ordered' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($tenantId, $validated) {
            $poNumber = SequenceGenerator::generatePoNumber($tenantId);
            $totalAmount = 0.00;

            foreach ($validated['items'] as $item) {
                $totalAmount += round($item['quantity_ordered'] * $item['unit_cost'], 2);
            }

            $po = PurchaseOrder::create([
                'tenant_id' => $tenantId,
                'branch_id' => $validated['branch_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'supplier_id' => $validated['supplier_id'],
                'po_number' => $poNumber,
                'order_date' => $validated['order_date'],
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                'total_amount' => $totalAmount,
                'status' => PoStatus::Issued,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseOrderItem::create([
                    'tenant_id' => $tenantId,
                    'purchase_order_id' => $po->id,
                    'medicine_id' => $item['medicine_id'],
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_cost' => $item['unit_cost'],
                    'total_cost' => round($item['quantity_ordered'] * $item['unit_cost'], 2),
                ]);
            }
        });

        return back()->with('success', 'Purchase order issued successfully.');
    }

    /**
     * Process Goods Receipt Note (GRN) inward stock delivery.
     */
    public function storeGoodsReceiptNote(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'branch_id' => ['required', 'uuid'],
            'warehouse_id' => ['required', 'uuid'],
            'supplier_id' => ['required', 'uuid'],
            'purchase_order_id' => ['nullable', 'uuid'],
            'received_date' => ['required', 'date'],
            'invoice_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.medicine_id' => ['required', 'uuid'],
            'items.*.batch_number' => ['required', 'string', 'max:80'],
            'items.*.expiry_date' => ['required', 'date', 'after:today'],
            'items.*.quantity_received' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'items.*.selling_price' => ['required', 'numeric', 'min:0'],
            'items.*.po_item_id' => ['nullable', 'uuid'],
        ]);

        try {
            $grn = $this->fefoService->receiveGoods(
                tenantId: $tenantId,
                branchId: $validated['branch_id'],
                warehouseId: $validated['warehouse_id'],
                supplierId: $validated['supplier_id'],
                receivedByUserId: $request->user()->id,
                receivedDate: $validated['received_date'],
                invoiceNumber: $validated['invoice_number'] ?? null,
                purchaseOrderId: $validated['purchase_order_id'] ?? null,
                items: $validated['items'],
                notes: $validated['notes'] ?? null
            );

            return back()->with('success', "GRN #{$grn->grn_number} stock received and batches updated successfully.");
        } catch (Exception $e) {
            return back()->withErrors(['grn' => $e->getMessage()]);
        }
    }
}
