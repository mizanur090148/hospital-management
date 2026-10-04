<?php

namespace App\Modules\Pharmacy\Http\Controllers;

use App\Core\Enums\DosageForm;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Pharmacy\Models\Medicine;
use App\Modules\Pharmacy\Models\MedicineBatch;
use App\Modules\Pharmacy\Models\Warehouse;
use App\Modules\Pharmacy\Services\FefoDispensingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MedicineController extends Controller
{
    public function __construct(
        protected FefoDispensingService $dispensingService
    ) {}

    /**
     * Display Pharmacy medicine catalog, stock levels, and expiry alerts.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $dosageForm = $request->input('dosage_form');
        $lowStock = $request->boolean('low_stock');
        $expiringSoon = $request->boolean('expiring_soon');

        $query = Medicine::with([
            'batches' => function ($q) {
                $q->with('warehouse')->where('quantity_on_hand', '>', 0)->orderBy('expiry_date', 'asc');
            },
        ])->withSum('batches', 'quantity_on_hand');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('generic_name', 'ilike', "%{$search}%")
                    ->orWhere('brand_name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        if ($dosageForm) {
            $query->where('dosage_form', $dosageForm);
        }

        $medicines = $query->latest()->paginate(15)->withQueryString();

        // Calculate KPIs
        $totalMedicines = Medicine::count();
        $warehouses = Warehouse::where('is_active', true)->get(['id', 'name', 'code', 'warehouse_type']);

        $expiringBatchesCount = MedicineBatch::where('quantity_on_hand', '>', 0)
            ->where('expiry_date', '<=', now()->addDays(90))
            ->where('expiry_date', '>', now())
            ->count();

        $expiredBatchesCount = MedicineBatch::where('quantity_on_hand', '>', 0)
            ->where('expiry_date', '<=', now())
            ->count();

        $totalInventoryValue = MedicineBatch::where('quantity_on_hand', '>', 0)
            ->selectRaw('SUM(quantity_on_hand * purchase_cost) as total')
            ->value('total') ?? 0;

        return Inertia::render('Pharmacy/MedicinesIndex', [
            'medicines' => $medicines,
            'warehouses' => $warehouses,
            'dosageForms' => array_column(DosageForm::cases(), 'value'),
            'filters' => [
                'search' => $search,
                'dosage_form' => $dosageForm,
                'low_stock' => $lowStock,
                'expiring_soon' => $expiringSoon,
            ],
            'stats' => [
                'total_medicines' => $totalMedicines,
                'expiring_batches_count' => $expiringBatchesCount,
                'expired_batches_count' => $expiredBatchesCount,
                'total_inventory_value' => (float) $totalInventoryValue,
            ],
        ]);
    }

    /**
     * Store a newly created medicine.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'generic_name' => ['required', 'string', 'max:200'],
            'brand_name' => ['required', 'string', 'max:200'],
            'dosage_form' => ['required', 'string'],
            'strength' => ['required', 'string', 'max:100'],
            'uom' => ['required', 'string', 'max:50'],
            'manufacturer' => ['nullable', 'string', 'max:150'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'requires_prescription' => ['boolean'],
        ]);

        $dosage = strtoupper($validated['dosage_form']);
        $matched = DosageForm::Tablet->value;
        foreach (DosageForm::cases() as $case) {
            if (strtoupper($case->value) === $dosage || strtoupper($case->name) === $dosage) {
                $matched = $case->value;
                break;
            }
        }
        $validated['dosage_form'] = $matched;
        $validated['tenant_id'] = $tenantId;

        Medicine::create($validated);

        return back()->with('success', "Medicine {$validated['brand_name']} cataloged successfully.");
    }

    /**
     * Update medicine details.
     */
    public function update(Request $request, Medicine $medicine): RedirectResponse
    {
        $validated = $request->validate([
            'generic_name' => ['required', 'string', 'max:200'],
            'brand_name' => ['required', 'string', 'max:200'],
            'dosage_form' => ['required', 'string'],
            'strength' => ['required', 'string', 'max:100'],
            'uom' => ['required', 'string', 'max:50'],
            'manufacturer' => ['nullable', 'string', 'max:150'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'requires_prescription' => ['boolean'],
            'is_active' => ['boolean'],
        ]);

        $medicine->update($validated);

        return back()->with('success', "Medicine {$medicine->brand_name} updated successfully.");
    }

    /**
     * Adjust batch stock manually for inventory count reconciliations.
     */
    public function adjustStock(Request $request, MedicineBatch $batch): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'new_quantity' => ['required', 'integer', 'min:0'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $this->dispensingService->adjustStock(
            tenantId: $tenantId,
            warehouseId: $batch->warehouse_id,
            batchId: $batch->id,
            newQuantity: (int) $validated['new_quantity'],
            reason: $validated['reason'],
            performedByUserId: $request->user()->id
        );

        return back()->with('success', "Batch {$batch->batch_number} stock adjusted to {$validated['new_quantity']}.");
    }
}
