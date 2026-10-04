<?php

namespace App\Modules\Pharmacy\Http\Controllers;

use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Opd\Models\Prescription;
use App\Modules\Patient\Models\Patient;
use App\Modules\Pharmacy\Models\Medicine;
use App\Modules\Pharmacy\Models\PharmacyDispensing;
use App\Modules\Pharmacy\Models\Warehouse;
use App\Modules\Pharmacy\Services\FefoDispensingService;
use App\Modules\Tenancy\Models\Branch;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DispensingController extends Controller
{
    public function __construct(
        protected FefoDispensingService $fefoService
    ) {}

    /**
     * Display Pharmacy dispensing counter, prescription queue, and dispensing log.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');

        // Prescriptions queue (recent 30 days)
        $prescriptionsQuery = Prescription::with(['patient', 'doctor.user', 'items'])
            ->latest();

        if ($search) {
            $prescriptionsQuery->where(function ($q) use ($search) {
                $q->where('prescription_number', 'ilike', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('mrn', 'ilike', "%{$search}%");
                    });
            });
        }

        $prescriptions = $prescriptionsQuery->limit(20)->get();

        // Recent dispensings
        $dispensings = PharmacyDispensing::with([
            'patient',
            'warehouse',
            'dispensedByUser',
            'items.medicine',
            'items.medicineBatch',
        ])->latest('dispensed_at')->paginate(15);

        $warehouses = Warehouse::where('is_active', true)->get(['id', 'name', 'code', 'warehouse_type']);
        $medicines = Medicine::where('is_active', true)->get(['id', 'brand_name', 'generic_name', 'strength', 'dosage_form', 'uom']);
        $patients = Patient::where('is_active', true)->limit(50)->get(['id', 'mrn', 'first_name', 'last_name', 'phone']);
        $branches = Branch::where('is_active', true)->get(['id', 'name', 'code']);

        return Inertia::render('Pharmacy/DispenseIndex', [
            'prescriptions' => $prescriptions,
            'dispensings' => $dispensings,
            'warehouses' => $warehouses,
            'medicines' => $medicines,
            'patients' => $patients,
            'branches' => $branches,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Preview FEFO allocation for a specific medicine, warehouse, and requested quantity.
     */
    public function previewFefo(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $request->validate([
            'warehouse_id' => ['required', 'uuid'],
            'medicine_id' => ['required', 'uuid'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $allocations = $this->fefoService->previewFefoAllocation(
                tenantId: $tenantId,
                warehouseId: $request->input('warehouse_id'),
                medicineId: $request->input('medicine_id'),
                quantityRequested: (int) $request->input('quantity')
            );

            return response()->json([
                'success' => true,
                'allocations' => $allocations,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Dispense medicines with FEFO batch allocation.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated = $request->validate([
            'branch_id' => ['required', 'uuid'],
            'warehouse_id' => ['required', 'uuid'],
            'patient_id' => ['required', 'uuid'],
            'prescription_id' => ['nullable', 'uuid'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.medicine_id' => ['required', 'uuid'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.prescription_item_id' => ['nullable', 'uuid'],
        ]);

        try {
            $dispensing = $this->fefoService->dispense(
                tenantId: $tenantId,
                branchId: $validated['branch_id'],
                warehouseId: $validated['warehouse_id'],
                patientId: $validated['patient_id'],
                dispensedByUserId: $request->user()->id,
                items: $validated['items'],
                prescriptionId: $validated['prescription_id'] ?? null
            );

            return back()->with('success', "Dispense #{$dispensing->dispense_number} processed successfully (Total: \${$dispensing->total_amount}).");
        } catch (Exception $e) {
            return back()->withErrors(['dispense' => $e->getMessage()]);
        }
    }
}
