<?php

namespace App\Modules\Diagnostics\Http\Controllers;

use App\Core\Enums\DiagnosticPriority;
use App\Core\Enums\LabOrderStatus;
use App\Core\Enums\LabSampleStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\LabOrderItem;
use App\Modules\Diagnostics\Models\LabResult;
use App\Modules\Diagnostics\Models\LabSample;
use App\Modules\Diagnostics\Models\LabTestTemplate;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LaboratoryController extends Controller
{
    /**
     * Display Laboratory diagnostic workstation and requisitions queue.
     */
    public function index(Request $request): Response
    {
        $status = $request->input('status');
        $priority = $request->input('priority');
        $search = $request->input('search');

        $query = LabOrder::with([
            'patient',
            'orderingDoctor.user',
            'items.template',
            'items.results.verifiedBy',
            'samples.collectedBy',
            'branch',
        ])->latest('ordered_at');

        if ($status && $status !== 'ALL') {
            $query->where('status', $status);
        }

        if ($priority) {
            $query->where('priority', $priority);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'ilike', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('mrn', 'ilike', "%{$search}%");
                    })
                    ->orWhereHas('samples', function ($sq) use ($search) {
                        $sq->where('sample_barcode', 'ilike', "%{$search}%");
                    });
            });
        }

        $labOrders = $query->paginate(20)->withQueryString();

        $templates = LabTestTemplate::where('is_active', true)->orderBy('category')->orderBy('name')->get();
        $doctors = Doctor::with(['user', 'department'])->where('status', 'ACTIVE')->get();
        $patients = Patient::where('status', 'ACTIVE')->orderBy('first_name')->limit(50)->get();
        $branches = Branch::where('is_active', true)->get();

        $metrics = [
            'total_pending' => LabOrder::whereIn('status', [LabOrderStatus::Ordered->value, LabOrderStatus::SampleCollected->value])->count(),
            'in_analysis' => LabOrder::where('status', LabOrderStatus::InAnalysis->value)->count(),
            'stat_orders' => LabOrder::where('priority', DiagnosticPriority::Stat->value)->where('status', '!=', LabOrderStatus::Verified->value)->count(),
            'samples_pending' => LabSample::where('status', LabSampleStatus::Pending->value)->count(),
        ];

        return Inertia::render('Diagnostics/LabIndex', [
            'labOrders' => $labOrders,
            'templates' => $templates,
            'doctors' => $doctors,
            'patients' => $patients,
            'branches' => $branches,
            'metrics' => $metrics,
            'filters' => [
                'status' => $status,
                'priority' => $priority,
                'search' => $search,
            ],
            'statuses' => array_column(LabOrderStatus::cases(), 'value'),
            'priorities' => array_column(DiagnosticPriority::cases(), 'value'),
        ]);
    }

    /**
     * Requisition a new Laboratory Order with items and sample barcodes.
     */
    public function storeOrder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'ordering_doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'priority' => ['required', 'string', 'in:ROUTINE,URGENT,STAT'],
            'clinical_notes' => ['nullable', 'string', 'max:1000'],
            'template_ids' => ['required', 'array', 'min:1'],
            'template_ids.*' => ['uuid', 'exists:lab_test_templates,id'],
            'encounter_type' => ['nullable', 'string', 'in:OPD,IPD,EMERGENCY,DIRECT'],
            'encounter_id' => ['nullable', 'uuid'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        DB::transaction(function () use ($validated, $tenantId) {
            $templates = LabTestTemplate::whereIn('id', $validated['template_ids'])->get();

            // 1. Create Order
            $order = LabOrder::create([
                'tenant_id' => $tenantId,
                'branch_id' => $validated['branch_id'],
                'order_number' => SequenceGenerator::generateLabOrderNumber($tenantId),
                'patient_id' => $validated['patient_id'],
                'ordering_doctor_id' => $validated['ordering_doctor_id'],
                'encounter_type' => $validated['encounter_type'] ?? 'DIRECT',
                'encounter_id' => $validated['encounter_id'] ?? null,
                'priority' => $validated['priority'],
                'clinical_notes' => $validated['clinical_notes'] ?? null,
                'status' => LabOrderStatus::Ordered,
                'ordered_at' => now(),
            ]);

            // 2. Create Order Items
            $sampleTypes = [];
            foreach ($templates as $tmpl) {
                LabOrderItem::create([
                    'tenant_id' => $tenantId,
                    'lab_order_id' => $order->id,
                    'template_id' => $tmpl->id,
                    'test_name' => $tmpl->name,
                    'price' => $tmpl->price,
                    'status' => 'ORDERED',
                ]);

                if (! in_array($tmpl->sample_type, $sampleTypes)) {
                    $sampleTypes[] = $tmpl->sample_type;
                }
            }

            // 3. Create Sample barcodes for each unique specimen type
            foreach ($sampleTypes as $sampleType) {
                LabSample::create([
                    'tenant_id' => $tenantId,
                    'lab_order_id' => $order->id,
                    'sample_barcode' => SequenceGenerator::generateSampleBarcode($tenantId),
                    'sample_type' => $sampleType,
                    'status' => LabSampleStatus::Pending,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Lab requisition created and sample barcodes generated.');
    }

    /**
     * Mark specimen as collected or rejected.
     */
    public function collectSample(Request $request, string $sampleId): RedirectResponse
    {
        $sample = LabSample::findOrFail($sampleId);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:COLLECTED,REJECTED'],
            'rejection_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $sample->update([
            'status' => $validated['status'],
            'rejection_reason' => $validated['rejection_reason'] ?? null,
            'collected_by_user_id' => $request->user()->id,
            'collected_at' => now(),
        ]);

        // If sample collected, transition lab order to SAMPLE_COLLECTED
        if ($validated['status'] === LabSampleStatus::Collected->value) {
            $sample->order->update([
                'status' => LabOrderStatus::SampleCollected,
            ]);
        }

        return redirect()->back()->with('success', "Sample {$sample->sample_barcode} marked as {$validated['status']}.");
    }

    /**
     * Enter observed test parameters and reference ranges.
     */
    public function enterResults(Request $request, string $orderItemId): RedirectResponse
    {
        $item = LabOrderItem::with('order')->findOrFail($orderItemId);

        $validated = $request->validate([
            'results' => ['required', 'array', 'min:1'],
            'results.*.parameter_name' => ['required', 'string', 'max:150'],
            'results.*.observed_value' => ['required', 'string', 'max:200'],
            'results.*.reference_range' => ['nullable', 'string', 'max:100'],
            'results.*.unit' => ['nullable', 'string', 'max:50'],
            'results.*.is_abnormal' => ['boolean'],
            'results.*.critical_flag' => ['boolean'],
            'results.*.pathologist_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        DB::transaction(function () use ($item, $validated, $tenantId) {
            foreach ($validated['results'] as $resData) {
                LabResult::create([
                    'tenant_id' => $tenantId,
                    'lab_order_item_id' => $item->id,
                    'parameter_name' => $resData['parameter_name'],
                    'observed_value' => $resData['observed_value'],
                    'reference_range' => $resData['reference_range'] ?? null,
                    'unit' => $resData['unit'] ?? null,
                    'is_abnormal' => $resData['is_abnormal'] ?? false,
                    'critical_flag' => $resData['critical_flag'] ?? false,
                    'pathologist_notes' => $resData['pathologist_notes'] ?? null,
                    'status' => 'DRAFT',
                ]);
            }

            $item->update(['status' => 'IN_ANALYSIS']);
            $item->order->update(['status' => LabOrderStatus::InAnalysis]);
        });

        return redirect()->back()->with('success', "Results recorded for {$item->test_name}.");
    }

    /**
     * Pathologist review and verification sign-off.
     */
    public function verifyResults(Request $request, string $orderId): RedirectResponse
    {
        $order = LabOrder::with('items.results')->findOrFail($orderId);

        DB::transaction(function () use ($order, $request) {
            foreach ($order->items as $item) {
                foreach ($item->results as $result) {
                    $result->update([
                        'status' => 'VERIFIED',
                        'verified_by_user_id' => $request->user()->id,
                        'verified_at' => now(),
                    ]);
                }
                $item->update(['status' => 'VERIFIED']);
            }

            $order->update(['status' => LabOrderStatus::Verified]);
        });

        return redirect()->back()->with('success', "Lab order {$order->order_number} verified and released.");
    }
}
