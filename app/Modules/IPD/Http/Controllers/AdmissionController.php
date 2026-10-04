<?php

namespace App\Modules\IPD\Http\Controllers;

use App\Core\Enums\AdmissionStatus;
use App\Core\Enums\AdmissionType;
use App\Core\Enums\BedStatus;
use App\Core\Enums\DischargeDisposition;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Facility\Models\Bed;
use App\Modules\Facility\Models\Department;
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

class AdmissionController extends Controller
{
    /**
     * Display a listing of inpatient admissions.
     */
    public function index(Request $request): Response
    {
        $status = $request->input('status', 'ADMITTED');
        $search = $request->input('search');
        $departmentId = $request->input('department_id');

        $query = Admission::with([
            'patient',
            'attendingDoctor.user',
            'admittingDepartment',
            'currentBedAssignment.bed.room.ward',
            'branch',
        ])->latest('admitted_at');

        if ($status) {
            $query->where('status', $status);
        }

        if ($departmentId) {
            $query->where('admitting_department_id', $departmentId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('ipd_number', 'ilike', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('mrn', 'ilike', "%{$search}%");
                    });
            });
        }

        $admissions = $query->paginate(20)->withQueryString();

        $doctors = Doctor::with(['user', 'department'])->where('status', 'ACTIVE')->get();
        $departments = Department::where('is_active', true)->get();
        $branches = Branch::where('is_active', true)->get();
        $patients = Patient::where('status', 'ACTIVE')->orderBy('first_name')->limit(50)->get();

        // Available beds for new admissions
        $availableBeds = Bed::with(['room.ward'])
            ->where('status', BedStatus::Available)
            ->where('is_active', true)
            ->get();

        return Inertia::render('IPD/Index', [
            'admissions' => $admissions,
            'doctors' => $doctors,
            'departments' => $departments,
            'branches' => $branches,
            'patients' => $patients,
            'availableBeds' => $availableBeds,
            'filters' => [
                'status' => $status,
                'search' => $search,
                'department_id' => $departmentId,
            ],
            'admissionTypes' => array_column(AdmissionType::cases(), 'value'),
            'dispositionOptions' => array_column(DischargeDisposition::cases(), 'value'),
        ]);
    }

    /**
     * Store a newly admitted inpatient and allocate a bed.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'attending_doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'admitting_department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'bed_id' => ['required', 'uuid', 'exists:beds,id'],
            'admission_type' => ['required', 'string', 'in:ELECTIVE,EMERGENCY,TRANSFER,NEWBORN'],
            'admitting_diagnosis' => ['required', 'string', 'max:1000'],
            'initial_deposit' => ['nullable', 'numeric', 'min:0'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        $admission = DB::transaction(function () use ($validated, $tenantId) {
            // Pessimistic lock on the bed
            $bed = Bed::where('id', $validated['bed_id'])->lockForUpdate()->first();
            if ($bed->status !== BedStatus::Available) {
                throw ValidationException::withMessages([
                    'bed_id' => 'The selected bed is no longer available. Please select another bed.',
                ]);
            }

            // 1. Create IPD Admission
            $validated['tenant_id'] = $tenantId;
            $validated['ipd_number'] = SequenceGenerator::generateIpdNumber($tenantId);
            $validated['status'] = AdmissionStatus::Admitted;
            $validated['admitted_at'] = now();
            $validated['initial_deposit'] = $validated['initial_deposit'] ?? 0.00;

            $created = Admission::create($validated);

            // 2. Allocate Bed & Update Bed Status to Occupied
            BedAssignment::create([
                'tenant_id' => $tenantId,
                'admission_id' => $created->id,
                'bed_id' => $bed->id,
                'assigned_at' => now(),
                'is_active' => true,
            ]);

            $bed->update(['status' => BedStatus::Occupied]);

            return $created;
        });

        return redirect()->route('admissions.show', $admission->id)
            ->with('success', "Patient admitted under {$admission->ipd_number}.");
    }

    /**
     * Display the 360-degree Inpatient Dossier.
     */
    public function show(string $id): Response
    {
        $admission = Admission::with([
            'patient',
            'attendingDoctor.user',
            'admittingDepartment',
            'branch',
            'currentBedAssignment.bed.room.ward',
            'bedAssignments.bed.room.ward',
            'nursingNotes.nurse',
            'medicationAdministrations.administeredBy',
            'medicationAdministrations.prescriptionItem',
        ])->findOrFail($id);

        $availableBeds = Bed::with(['room.ward'])
            ->where('status', BedStatus::Available)
            ->where('is_active', true)
            ->get();

        return Inertia::render('IPD/Show', [
            'admission' => $admission,
            'availableBeds' => $availableBeds,
            'dispositionOptions' => array_column(DischargeDisposition::cases(), 'value'),
        ]);
    }

    /**
     * Transfer patient to a different bed/room/ward.
     */
    public function transferBed(Request $request, string $id): RedirectResponse
    {
        $admission = Admission::findOrFail($id);

        $validated = $request->validate([
            'new_bed_id' => ['required', 'uuid', 'exists:beds,id'],
            'transfer_reason' => ['required', 'string', 'max:255'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        DB::transaction(function () use ($admission, $validated, $tenantId) {
            $newBed = Bed::where('id', $validated['new_bed_id'])->lockForUpdate()->first();
            if ($newBed->status !== BedStatus::Available) {
                throw ValidationException::withMessages([
                    'new_bed_id' => 'The selected target bed is not available.',
                ]);
            }

            // Release old active bed
            $currentAssignment = BedAssignment::where('admission_id', $admission->id)
                ->where('is_active', true)
                ->first();

            if ($currentAssignment) {
                $currentAssignment->update([
                    'is_active' => false,
                    'released_at' => now(),
                ]);

                // Previous bed enters cleaning cycle
                Bed::where('id', $currentAssignment->bed_id)->update(['status' => BedStatus::Cleaning]);
            }

            // Assign new bed & mark occupied
            BedAssignment::create([
                'tenant_id' => $tenantId,
                'admission_id' => $admission->id,
                'bed_id' => $newBed->id,
                'assigned_at' => now(),
                'transfer_reason' => $validated['transfer_reason'],
                'is_active' => true,
            ]);

            $newBed->update(['status' => BedStatus::Occupied]);
        });

        return redirect()->back()->with('success', 'Patient transferred to new bed successfully.');
    }

    /**
     * Discharge inpatient and release bed.
     */
    public function discharge(Request $request, string $id): RedirectResponse
    {
        $admission = Admission::findOrFail($id);

        $validated = $request->validate([
            'discharge_disposition' => ['required', 'string', 'in:HOME,TRANSFERRED,AGAINST_MEDICAL_ADVICE,EXPIRED'],
            'discharge_summary' => ['required', 'string'],
        ]);

        DB::transaction(function () use ($admission, $validated) {
            // Release active bed assignment
            $currentAssignment = BedAssignment::where('admission_id', $admission->id)
                ->where('is_active', true)
                ->first();

            if ($currentAssignment) {
                $currentAssignment->update([
                    'is_active' => false,
                    'released_at' => now(),
                ]);

                // Bed set to cleaning
                Bed::where('id', $currentAssignment->bed_id)->update(['status' => BedStatus::Cleaning]);
            }

            $admission->update([
                'status' => AdmissionStatus::Discharged,
                'discharged_at' => now(),
                'discharge_disposition' => $validated['discharge_disposition'],
                'discharge_summary' => $validated['discharge_summary'],
            ]);
        });

        return redirect()->back()->with('success', "Patient {$admission->ipd_number} discharged successfully.");
    }
}
