<?php

namespace App\Modules\Patient\Http\Controllers;

use App\Core\Enums\BloodGroup;
use App\Core\Enums\Gender;
use App\Core\Enums\PatientStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Patient\Models\Patient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    /**
     * Display a listing of patients.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $bloodGroup = $request->input('blood_group');
        $status = $request->input('status');

        $query = Patient::query()
            ->latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                    ->orWhere('last_name', 'ilike', "%{$search}%")
                    ->orWhere('mrn', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%")
                    ->orWhere('national_id', 'ilike', "%{$search}%");
            });
        }

        if ($bloodGroup) {
            $query->where('blood_group', $bloodGroup);
        }

        if ($status) {
            $query->where('status', $status);
        }

        $patients = $query->paginate(15)->withQueryString();

        return Inertia::render('Patients/Index', [
            'patients' => $patients,
            'filters' => [
                'search' => $search,
                'blood_group' => $bloodGroup,
                'status' => $status,
            ],
            'bloodGroups' => array_column(BloodGroup::cases(), 'value'),
            'genders' => array_column(Gender::cases(), 'value'),
            'statuses' => array_column(PatientStatus::cases(), 'value'),
        ]);
    }

    /**
     * Show the dedicated form for registering a new patient.
     */
    public function create(): Response
    {
        $tenantId = app(TenantContext::class)->getTenantId() ?? request()->user()?->tenant_id;
        $nextMrn = $tenantId ? SequenceGenerator::generateMrn($tenantId) : 'MRN-'.date('Y').'-000001';

        return Inertia::render('Patients/Create', [
            'bloodGroups' => array_column(BloodGroup::cases(), 'value'),
            'genders' => array_column(Gender::cases(), 'value'),
            'nextMrn' => $nextMrn,
        ]);
    }

    /**
     * Store a newly created patient with sequential MRN.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'dob' => ['required', 'date', 'before_or_equal:today'],
            'gender' => ['required', 'string', 'in:MALE,FEMALE,OTHER'],
            'blood_group' => ['nullable', 'string'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'national_id' => ['nullable', 'string', 'max:50'],
            'emergency_contact' => ['nullable', 'array'],
            'emergency_contact.name' => ['nullable', 'string', 'max:100'],
            'emergency_contact.relationship' => ['nullable', 'string', 'max:50'],
            'emergency_contact.phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'array'],
            'address.street' => ['nullable', 'string', 'max:255'],
            'address.city' => ['nullable', 'string', 'max:100'],
            'address.state' => ['nullable', 'string', 'max:100'],
            'address.postal_code' => ['nullable', 'string', 'max:20'],
            'address.country' => ['nullable', 'string', 'max:100'],
            'allergies' => ['nullable', 'array'],
            'allergies.*.substance' => ['required', 'string'],
            'allergies.*.severity' => ['required', 'string'],
            'allergies.*.reaction' => ['nullable', 'string'],
            'chronic_conditions' => ['nullable', 'array'],
            'chronic_conditions.*.condition' => ['required', 'string'],
            'chronic_conditions.*.diagnosed_year' => ['nullable', 'integer'],
            'chronic_conditions.*.notes' => ['nullable', 'string'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;
        $validated['tenant_id'] = $tenantId;
        $validated['mrn'] = SequenceGenerator::generateMrn($tenantId);
        $validated['status'] = PatientStatus::Active;

        $patient = Patient::create($validated);

        if ($request->boolean('redirect_to_dossier')) {
            return redirect()->route('patients.show', $patient->id)->with('success', "Patient registered successfully with MRN {$validated['mrn']}.");
        }

        return redirect()->route('patients.index')->with('success', "Patient registered successfully with MRN {$validated['mrn']}.");
    }

    /**
     * Display the comprehensive 360-degree patient dossier.
     */
    public function show(string $id): Response
    {
        $patient = Patient::with([
            'appointments.doctor.user',
            'appointments.doctor.department',
            'opdVisits.doctor.user',
            'opdVisits.prescriptions.items',
            'prescriptions.doctor.user',
            'prescriptions.items',
        ])->findOrFail($id);

        return Inertia::render('Patients/Show', [
            'patient' => $patient,
        ]);
    }

    /**
     * Update patient details.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $patient = Patient::findOrFail($id);

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'dob' => ['required', 'date', 'before_or_equal:today'],
            'gender' => ['required', 'string', 'in:MALE,FEMALE,OTHER'],
            'blood_group' => ['nullable', 'string'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'national_id' => ['nullable', 'string', 'max:50'],
            'emergency_contact' => ['nullable', 'array'],
            'emergency_contact.name' => ['nullable', 'string', 'max:100'],
            'emergency_contact.relationship' => ['nullable', 'string', 'max:50'],
            'emergency_contact.phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'array'],
            'allergies' => ['nullable', 'array'],
            'chronic_conditions' => ['nullable', 'array'],
            'status' => ['required', 'string', 'in:ACTIVE,INACTIVE,DECEASED'],
        ]);

        $patient->update($validated);

        return redirect()->back()->with('success', 'Patient record updated successfully.');
    }
}
