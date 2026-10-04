<?php

namespace App\Modules\Nursing\Http\Controllers;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\MarStatus;
use App\Core\Enums\NursingShift;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Facility\Models\Ward;
use App\Modules\IPD\Models\Admission;
use App\Modules\Nursing\Models\MedicationAdministration;
use App\Modules\Nursing\Models\NursingNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NursingController extends Controller
{
    /**
     * Display the Inpatient Nursing Station & Care Overview.
     */
    public function index(Request $request): Response
    {
        $wardId = $request->input('ward_id');

        $query = Admission::with([
            'patient',
            'attendingDoctor.user',
            'currentBedAssignment.bed.room.ward',
            'nursingNotes' => function ($q) {
                $q->latest()->limit(3);
            },
            'medicationAdministrations' => function ($q) {
                $q->latest('administered_at')->limit(5);
            },
        ])->where('status', AdmissionStatus::Admitted->value);

        if ($wardId) {
            $query->whereHas('currentBedAssignment.bed.room', function ($rq) use ($wardId) {
                $rq->where('ward_id', $wardId);
            });
        }

        $activeInpatients = $query->get();
        $wards = Ward::where('is_active', true)->with('branch')->get();

        return Inertia::render('Nursing/Index', [
            'activeInpatients' => $activeInpatients,
            'wards' => $wards,
            'selectedWardId' => $wardId,
            'shifts' => array_column(NursingShift::cases(), 'value'),
            'marStatuses' => array_column(MarStatus::cases(), 'value'),
        ]);
    }

    /**
     * Record a Nursing Shift Handover & Care Note.
     */
    public function storeNote(Request $request, string $admissionId): RedirectResponse
    {
        $admission = Admission::findOrFail($admissionId);

        $validated = $request->validate([
            'shift' => ['required', 'string', 'in:MORNING,EVENING,NIGHT'],
            'notes' => ['required', 'string'],
            'vitals' => ['nullable', 'array'],
            'vitals.systolic' => ['nullable', 'numeric'],
            'vitals.diastolic' => ['nullable', 'numeric'],
            'vitals.pulse_rate' => ['nullable', 'numeric'],
            'vitals.temperature' => ['nullable', 'numeric'],
            'vitals.spo2' => ['nullable', 'numeric'],
            'intake_output' => ['nullable', 'array'],
            'intake_output.oral_intake_ml' => ['nullable', 'numeric'],
            'intake_output.iv_fluid_ml' => ['nullable', 'numeric'],
            'intake_output.urine_output_ml' => ['nullable', 'numeric'],
            'intake_output.drain_output_ml' => ['nullable', 'numeric'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        NursingNote::create([
            'tenant_id' => $tenantId,
            'admission_id' => $admission->id,
            'nurse_user_id' => $request->user()->id,
            'shift' => $validated['shift'],
            'notes' => $validated['notes'],
            'vitals' => $validated['vitals'] ?? null,
            'intake_output' => $validated['intake_output'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Nursing care note recorded.');
    }

    /**
     * Record a Medication Administration Entry (MAR).
     */
    public function recordMar(Request $request, string $admissionId): RedirectResponse
    {
        $admission = Admission::findOrFail($admissionId);

        $validated = $request->validate([
            'prescription_item_id' => ['nullable', 'uuid', 'exists:prescription_items,id'],
            'medicine_name' => ['required', 'string', 'max:255'],
            'dose_given' => ['required', 'string', 'max:100'],
            'route' => ['required', 'string', 'max:50'],
            'status' => ['required', 'string', 'in:GIVEN,REFUSED,HELD,MISSED'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        MedicationAdministration::create([
            'tenant_id' => $tenantId,
            'admission_id' => $admission->id,
            'prescription_item_id' => $validated['prescription_item_id'] ?? null,
            'medicine_name' => $validated['medicine_name'],
            'dose_given' => $validated['dose_given'],
            'route' => $validated['route'],
            'administered_by_user_id' => $request->user()->id,
            'administered_at' => now(),
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->back()->with('success', "Medication {$validated['medicine_name']} marked as {$validated['status']}.");
    }
}
