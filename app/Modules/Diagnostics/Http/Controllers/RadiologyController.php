<?php

namespace App\Modules\Diagnostics\Http\Controllers;

use App\Core\Enums\DiagnosticPriority;
use App\Core\Enums\RadiologyModality;
use App\Core\Enums\RadiologyOrderStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\Diagnostics\Models\RadiologyTemplate;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RadiologyController extends Controller
{
    /**
     * Display Radiology imaging requisition queue and reporting station.
     */
    public function index(Request $request): Response
    {
        $status = $request->input('status');
        $modality = $request->input('modality');
        $priority = $request->input('priority');
        $search = $request->input('search');

        $query = RadiologyOrder::with([
            'patient',
            'orderingDoctor.user',
            'reportingDoctor.user',
            'template',
            'branch',
        ])->latest('ordered_at');

        if ($status && $status !== 'ALL') {
            $query->where('status', $status);
        }

        if ($modality) {
            $query->whereHas('template', function ($tq) use ($modality) {
                $tq->where('modality', $modality);
            });
        }

        if ($priority) {
            $query->where('priority', $priority);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'ilike', "%{$search}%")
                    ->orWhere('dicom_study_uid', 'ilike', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('mrn', 'ilike', "%{$search}%");
                    });
            });
        }

        $radiologyOrders = $query->paginate(20)->withQueryString();

        $templates = RadiologyTemplate::where('is_active', true)->orderBy('modality')->orderBy('name')->get();
        $doctors = Doctor::with(['user', 'department'])->where('status', 'ACTIVE')->get();
        $patients = Patient::where('status', 'ACTIVE')->orderBy('first_name')->limit(50)->get();
        $branches = Branch::where('is_active', true)->get();

        $metrics = [
            'total_pending' => RadiologyOrder::whereIn('status', [RadiologyOrderStatus::Ordered->value, RadiologyOrderStatus::Scheduled->value])->count(),
            'captured' => RadiologyOrder::where('status', RadiologyOrderStatus::Captured->value)->count(),
            'reported' => RadiologyOrder::where('status', RadiologyOrderStatus::Reported->value)->count(),
            'stat_urgent' => RadiologyOrder::whereIn('priority', [DiagnosticPriority::Urgent->value, DiagnosticPriority::Stat->value])
                ->where('status', '!=', RadiologyOrderStatus::Verified->value)
                ->count(),
        ];

        return Inertia::render('Diagnostics/RadiologyIndex', [
            'radiologyOrders' => $radiologyOrders,
            'templates' => $templates,
            'doctors' => $doctors,
            'patients' => $patients,
            'branches' => $branches,
            'metrics' => $metrics,
            'filters' => [
                'status' => $status,
                'modality' => $modality,
                'priority' => $priority,
                'search' => $search,
            ],
            'modalities' => array_column(RadiologyModality::cases(), 'value'),
            'statuses' => array_column(RadiologyOrderStatus::cases(), 'value'),
            'priorities' => array_column(DiagnosticPriority::cases(), 'value'),
        ]);
    }

    /**
     * Requisition a new Radiology Imaging scan.
     */
    public function storeOrder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'ordering_doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'template_id' => ['required', 'uuid', 'exists:radiology_templates,id'],
            'priority' => ['required', 'string', 'in:ROUTINE,URGENT,STAT'],
            'clinical_indication' => ['required', 'string', 'max:1000'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $order = RadiologyOrder::create([
            'tenant_id' => $tenantId,
            'branch_id' => $validated['branch_id'],
            'order_number' => SequenceGenerator::generateRadiologyOrderNumber($tenantId),
            'patient_id' => $validated['patient_id'],
            'ordering_doctor_id' => $validated['ordering_doctor_id'],
            'template_id' => $validated['template_id'],
            'priority' => $validated['priority'],
            'clinical_indication' => $validated['clinical_indication'],
            'status' => RadiologyOrderStatus::Ordered,
            'ordered_at' => now(),
        ]);

        return redirect()->back()->with('success', "Radiology order {$order->order_number} requisitioned.");
    }

    /**
     * Mark imaging scan as captured with DICOM study metadata.
     */
    public function captureScan(Request $request, string $orderId): RedirectResponse
    {
        $order = RadiologyOrder::findOrFail($orderId);

        $validated = $request->validate([
            'dicom_study_uid' => ['nullable', 'string', 'max:100'],
            'dicom_preview_url' => ['nullable', 'string', 'max:500'],
        ]);

        $order->update([
            'dicom_study_uid' => $validated['dicom_study_uid'] ?? '1.2.840.113619.2.55.'.time(),
            'dicom_preview_url' => $validated['dicom_preview_url'] ?? null,
            'status' => RadiologyOrderStatus::Captured,
        ]);

        return redirect()->back()->with('success', 'Imaging series captured and linked to PACS.');
    }

    /**
     * Radiologist formulating formal findings and diagnostic impression.
     */
    public function reportOrder(Request $request, string $orderId): RedirectResponse
    {
        $order = RadiologyOrder::findOrFail($orderId);

        $validated = $request->validate([
            'reporting_doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'findings' => ['required', 'string'],
            'impression' => ['required', 'string'],
            'radiologist_notes' => ['nullable', 'string', 'max:500'],
            'dicom_study_uid' => ['nullable', 'string', 'max:100'],
            'dicom_preview_url' => ['nullable', 'string', 'max:500'],
        ]);

        $order->update([
            'reporting_doctor_id' => $validated['reporting_doctor_id'],
            'findings' => $validated['findings'],
            'impression' => $validated['impression'],
            'radiologist_notes' => $validated['radiologist_notes'] ?? null,
            'dicom_study_uid' => $validated['dicom_study_uid'] ?? $order->dicom_study_uid,
            'dicom_preview_url' => $validated['dicom_preview_url'] ?? $order->dicom_preview_url,
            'status' => RadiologyOrderStatus::Reported,
        ]);

        return redirect()->back()->with('success', "Radiology report drafted for {$order->order_number}.");
    }

    /**
     * Verify and release the signed radiology report.
     */
    public function verifyReport(Request $request, string $orderId): RedirectResponse
    {
        $order = RadiologyOrder::findOrFail($orderId);

        $order->update([
            'status' => RadiologyOrderStatus::Verified,
            'verified_at' => now(),
        ]);

        return redirect()->back()->with('success', "Radiology report {$order->order_number} signed and verified.");
    }
}
