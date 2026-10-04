<?php

namespace App\Modules\Emergency\Http\Controllers;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AdmissionType;
use App\Core\Enums\BedStatus;
use App\Core\Enums\EmergencyStatus;
use App\Core\Enums\TriageLevel;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Emergency\Models\EmergencyAdmission;
use App\Modules\Facility\Models\Bed;
use App\Modules\IPD\Models\Admission;
use App\Modules\IPD\Models\BedAssignment;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class EmergencyController extends Controller
{
    /**
     * Display the Emergency Triage & Trauma Board.
     */
    public function index(Request $request): Response
    {
        $status = $request->input('status', 'ACTIVE'); // ACTIVE = TRIAGED or IN_TREATMENT
        $triageLevel = $request->input('triage_level');

        $query = EmergencyAdmission::with(['patient', 'assignedDoctor.user', 'branch'])
            ->latest('admitted_at');

        if ($status === 'ACTIVE') {
            $query->whereIn('status', [EmergencyStatus::Triaged->value, EmergencyStatus::InTreatment->value]);
        } elseif ($status && $status !== 'ALL') {
            $query->where('status', $status);
        }

        if ($triageLevel) {
            $query->where('triage_level', $triageLevel);
        }

        $emergencyCases = $query->paginate(20)->withQueryString();

        $doctors = Doctor::with(['user', 'department'])->where('status', 'ACTIVE')->get();
        $branches = Branch::where('is_active', true)->get();
        $patients = Patient::where('status', 'ACTIVE')->orderBy('first_name')->limit(50)->get();
        $availableBeds = Bed::with(['room.ward'])
            ->where('status', BedStatus::Available)
            ->where('is_active', true)
            ->get();

        // Triage metrics counts
        $metrics = [
            'esi1' => EmergencyAdmission::where('triage_level', 'ESI_1')->whereIn('status', ['TRIAGED', 'IN_TREATMENT'])->count(),
            'esi2' => EmergencyAdmission::where('triage_level', 'ESI_2')->whereIn('status', ['TRIAGED', 'IN_TREATMENT'])->count(),
            'esi3' => EmergencyAdmission::where('triage_level', 'ESI_3')->whereIn('status', ['TRIAGED', 'IN_TREATMENT'])->count(),
            'totalActive' => EmergencyAdmission::whereIn('status', ['TRIAGED', 'IN_TREATMENT'])->count(),
        ];

        return Inertia::render('Emergency/Index', [
            'emergencyCases' => $emergencyCases,
            'doctors' => $doctors,
            'branches' => $branches,
            'patients' => $patients,
            'availableBeds' => $availableBeds,
            'metrics' => $metrics,
            'filters' => [
                'status' => $status,
                'triage_level' => $triageLevel,
            ],
            'triageLevels' => array_column(TriageLevel::cases(), 'value'),
            'statuses' => array_column(EmergencyStatus::cases(), 'value'),
        ]);
    }

    /**
     * Rapid Emergency Triage Registration.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'patient_id' => ['nullable', 'uuid', 'exists:patients,id'],
            'anonymous_patient_name' => ['nullable', 'string', 'max:150'],
            'triage_level' => ['required', 'string', 'in:ESI_1,ESI_2,ESI_3,ESI_4,ESI_5'],
            'chief_complaint' => ['required', 'string', 'max:500'],
            'arrival_mode' => ['required', 'string', 'in:AMBULANCE,WALK_IN,POLICE,HELICOPTER'],
            'trauma_type' => ['required', 'string', 'in:BLUNT,PENETRATING,BURN,MEDICAL,PSYCHIATRIC,NONE'],
            'vitals' => ['nullable', 'array'],
            'triage_notes' => ['nullable', 'string'],
            'assigned_doctor_id' => ['nullable', 'uuid', 'exists:doctors,id'],
        ]);

        if (empty($validated['patient_id']) && empty($validated['anonymous_patient_name'])) {
            $validated['anonymous_patient_name'] = 'Unknown Emergency Trauma Patient #'.rand(100, 999);
        }

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $validated['tenant_id'] = $tenantId;
        $validated['er_number'] = SequenceGenerator::generateErNumber($tenantId);
        $validated['status'] = EmergencyStatus::Triaged;
        $validated['admitted_at'] = now();

        $erCase = EmergencyAdmission::create($validated);

        return redirect()->route('emergency.index')
            ->with('success', "Emergency case {$erCase->er_number} triaged under {$validated['triage_level']}.");
    }

    /**
     * Transition ER status (e.g. In Treatment, Discharged).
     */
    public function updateStatus(Request $request, string $id): RedirectResponse
    {
        $case = EmergencyAdmission::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:TRIAGED,IN_TREATMENT,DISCHARGED,DECEASED'],
            'assigned_doctor_id' => ['nullable', 'uuid', 'exists:doctors,id'],
        ]);

        if (in_array($validated['status'], ['DISCHARGED', 'DECEASED'])) {
            $validated['discharged_at'] = now();
        }

        $case->update($validated);

        return redirect()->back()->with('success', "ER case updated to {$validated['status']}.");
    }

    /**
     * Admit an Emergency patient into an IPD Inpatient bed.
     */
    public function admitToIpd(Request $request, string $id): RedirectResponse
    {
        $case = EmergencyAdmission::findOrFail($id);

        $validated = $request->validate([
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'bed_id' => ['required', 'uuid', 'exists:beds,id'],
            'attending_doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'admitting_diagnosis' => ['required', 'string', 'max:1000'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $admission = DB::transaction(function () use ($case, $validated, $tenantId) {
            $bed = Bed::where('id', $validated['bed_id'])->lockForUpdate()->first();
            if ($bed->status !== BedStatus::Available) {
                throw ValidationException::withMessages([
                    'bed_id' => 'The selected bed is no longer available.',
                ]);
            }

            // 1. Create IPD Admission
            $admission = Admission::create([
                'tenant_id' => $tenantId,
                'branch_id' => $case->branch_id,
                'patient_id' => $validated['patient_id'],
                'attending_doctor_id' => $validated['attending_doctor_id'],
                'ipd_number' => SequenceGenerator::generateIpdNumber($tenantId),
                'admission_type' => AdmissionType::Emergency,
                'admitting_diagnosis' => $validated['admitting_diagnosis'],
                'admitted_at' => now(),
                'status' => AdmissionStatus::Admitted,
            ]);

            // 2. Allocate Bed & Mark Occupied
            BedAssignment::create([
                'tenant_id' => $tenantId,
                'admission_id' => $admission->id,
                'bed_id' => $bed->id,
                'assigned_at' => now(),
                'is_active' => true,
            ]);
            $bed->update(['status' => BedStatus::Occupied]);

            // 3. Update ER Case Status
            $case->update([
                'status' => EmergencyStatus::AdmittedToIpd,
                'discharged_at' => now(),
                'patient_id' => $validated['patient_id'],
            ]);

            return $admission;
        });

        return redirect()->route('admissions.show', $admission->id)
            ->with('success', "Patient transferred to IPD Admission {$admission->ipd_number}.");
    }
}
