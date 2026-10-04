<?php

namespace App\Modules\Opd\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Opd\Models\Prescription;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrescriptionController extends Controller
{
    /**
     * Display a listing of prescriptions.
     */
    public function index(Request $request): Response
    {
        $search = $request->input('search');

        $query = Prescription::with(['patient', 'doctor.user', 'doctor.department', 'items'])
            ->latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('prescription_number', 'ilike', "%{$search}%")
                    ->orWhereHas('patient', function ($pq) use ($search) {
                        $pq->where('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('mrn', 'ilike', "%{$search}%");
                    });
            });
        }

        $prescriptions = $query->paginate(20)->withQueryString();

        return Inertia::render('Prescriptions/Index', [
            'prescriptions' => $prescriptions,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Show / print view of a single prescription.
     */
    public function show(string $id): Response
    {
        $prescription = Prescription::with([
            'tenant',
            'patient',
            'doctor.user',
            'doctor.department',
            'opdVisit',
            'items',
        ])->findOrFail($id);

        return Inertia::render('Prescriptions/Show', [
            'prescription' => $prescription,
        ]);
    }
}
