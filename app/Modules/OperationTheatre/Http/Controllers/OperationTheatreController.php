<?php

namespace App\Modules\OperationTheatre\Http\Controllers;

use App\Core\Enums\AnesthesiaType;
use App\Core\Enums\OtRoomStatus;
use App\Core\Enums\SurgeryStatus;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\OperationTheatre\Models\OperationTheatre;
use App\Modules\OperationTheatre\Models\Surgery;
use App\Modules\Patient\Models\Patient;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OperationTheatreController extends Controller
{
    /**
     * Display Operation Theatre schedule dashboard, rooms board, and surgeries.
     */
    public function index(Request $request): Response
    {
        $date = $request->input('date', date('Y-m-d'));
        $otId = $request->input('operation_theatre_id');
        $status = $request->input('status');

        $theatres = OperationTheatre::where('is_active', true)
            ->with(['branch', 'surgeries' => function ($q) use ($date) {
                $q->where('scheduled_date', $date)
                    ->whereIn('status', ['SCHEDULED', 'PRE_OP', 'IN_PROGRESS', 'POST_OP'])
                    ->with(['patient', 'primarySurgeon.user']);
            }])
            ->get();

        $surgeryQuery = Surgery::with([
            'patient',
            'primarySurgeon.user',
            'anesthesiologist.user',
            'operationTheatre',
            'branch',
        ])->where('scheduled_date', $date)->orderBy('scheduled_start_time');

        if ($otId) {
            $surgeryQuery->where('operation_theatre_id', $otId);
        }

        if ($status && $status !== 'ALL') {
            $surgeryQuery->where('status', $status);
        }

        $surgeries = $surgeryQuery->paginate(20)->withQueryString();

        $doctors = Doctor::with(['user', 'department'])->where('status', 'ACTIVE')->get();
        $patients = Patient::where('status', 'ACTIVE')->orderBy('first_name')->limit(50)->get();
        $branches = Branch::where('is_active', true)->get();

        $metrics = [
            'in_progress' => Surgery::where('scheduled_date', $date)->where('status', SurgeryStatus::InProgress->value)->count(),
            'scheduled_today' => Surgery::where('scheduled_date', $date)->count(),
            'completed_today' => Surgery::where('scheduled_date', $date)->where('status', SurgeryStatus::Completed->value)->count(),
            'available_rooms' => OperationTheatre::where('status', OtRoomStatus::Available->value)->count(),
        ];

        return Inertia::render('OperationTheatre/Index', [
            'theatres' => $theatres,
            'surgeries' => $surgeries,
            'doctors' => $doctors,
            'patients' => $patients,
            'branches' => $branches,
            'metrics' => $metrics,
            'filters' => [
                'date' => $date,
                'operation_theatre_id' => $otId,
                'status' => $status,
            ],
            'anesthesiaTypes' => array_column(AnesthesiaType::cases(), 'value'),
            'statuses' => array_column(SurgeryStatus::cases(), 'value'),
            'otRoomStatuses' => array_column(OtRoomStatus::cases(), 'value'),
        ]);
    }

    /**
     * Create or register a new Operation Theatre room.
     */
    public function storeTheatre(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:150'],
            'theatre_type' => ['required', 'string', 'max:100'],
            'floor' => ['nullable', 'string', 'max:50'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        OperationTheatre::create([
            'tenant_id' => $tenantId,
            'branch_id' => $validated['branch_id'],
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'theatre_type' => $validated['theatre_type'],
            'floor' => $validated['floor'] ?? null,
            'status' => OtRoomStatus::Available,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', "Operation Theatre {$validated['name']} registered.");
    }

    /**
     * Schedule a surgical procedure with OT Room & Surgeon conflict detection.
     */
    public function scheduleSurgery(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'patient_id' => ['required', 'uuid', 'exists:patients,id'],
            'primary_surgeon_id' => ['required', 'uuid', 'exists:doctors,id'],
            'anesthesiologist_id' => ['nullable', 'uuid', 'exists:doctors,id'],
            'operation_theatre_id' => ['required', 'uuid', 'exists:operation_theatres,id'],
            'procedure_name' => ['required', 'string', 'max:255'],
            'anesthesia_type' => ['required', 'string', 'in:GENERAL,SPINAL,EPIDURAL,LOCAL,SEDATION,NONE'],
            'scheduled_date' => ['required', 'date'],
            'scheduled_start_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'scheduled_end_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/', 'after:scheduled_start_time'],
            'pre_op_diagnosis' => ['nullable', 'string', 'max:1000'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $request->user()?->tenant_id;

        // 1. Conflict Check: OT Room Overlap
        $otConflict = Surgery::where('tenant_id', $tenantId)
            ->where('operation_theatre_id', $validated['operation_theatre_id'])
            ->where('scheduled_date', $validated['scheduled_date'])
            ->whereNotIn('status', [SurgeryStatus::Cancelled->value, SurgeryStatus::Completed->value])
            ->where(function ($q) use ($validated) {
                $q->whereBetween('scheduled_start_time', [$validated['scheduled_start_time'], $validated['scheduled_end_time']])
                    ->orWhereBetween('scheduled_end_time', [$validated['scheduled_start_time'], $validated['scheduled_end_time']])
                    ->orWhere(function ($sub) use ($validated) {
                        $sub->where('scheduled_start_time', '<=', $validated['scheduled_start_time'])
                            ->where('scheduled_end_time', '>=', $validated['scheduled_end_time']);
                    });
            })
            ->exists();

        if ($otConflict) {
            throw ValidationException::withMessages([
                'operation_theatre_id' => 'The selected Operation Theatre is already booked during this time window.',
            ]);
        }

        // 2. Conflict Check: Primary Surgeon Overlap
        $surgeonConflict = Surgery::where('tenant_id', $tenantId)
            ->where('primary_surgeon_id', $validated['primary_surgeon_id'])
            ->where('scheduled_date', $validated['scheduled_date'])
            ->whereNotIn('status', [SurgeryStatus::Cancelled->value, SurgeryStatus::Completed->value])
            ->where(function ($q) use ($validated) {
                $q->whereBetween('scheduled_start_time', [$validated['scheduled_start_time'], $validated['scheduled_end_time']])
                    ->orWhereBetween('scheduled_end_time', [$validated['scheduled_start_time'], $validated['scheduled_end_time']])
                    ->orWhere(function ($sub) use ($validated) {
                        $sub->where('scheduled_start_time', '<=', $validated['scheduled_start_time'])
                            ->where('scheduled_end_time', '>=', $validated['scheduled_end_time']);
                    });
            })
            ->exists();

        if ($surgeonConflict) {
            throw ValidationException::withMessages([
                'primary_surgeon_id' => 'The primary surgeon is already assigned to another surgical procedure during this time window.',
            ]);
        }

        $surgery = Surgery::create([
            'tenant_id' => $tenantId,
            'branch_id' => $validated['branch_id'],
            'surgery_number' => SequenceGenerator::generateSurgeryNumber($tenantId),
            'patient_id' => $validated['patient_id'],
            'primary_surgeon_id' => $validated['primary_surgeon_id'],
            'anesthesiologist_id' => $validated['anesthesiologist_id'] ?? null,
            'operation_theatre_id' => $validated['operation_theatre_id'],
            'procedure_name' => $validated['procedure_name'],
            'anesthesia_type' => $validated['anesthesia_type'],
            'scheduled_date' => $validated['scheduled_date'],
            'scheduled_start_time' => $validated['scheduled_start_time'],
            'scheduled_end_time' => $validated['scheduled_end_time'],
            'pre_op_diagnosis' => $validated['pre_op_diagnosis'] ?? null,
            'status' => SurgeryStatus::Scheduled,
        ]);

        return redirect()->back()->with('success', "Surgery {$surgery->surgery_number} scheduled successfully.");
    }

    /**
     * Transition surgical lifecycle status and synchronize OT Room availability.
     */
    public function updateStatus(Request $request, string $surgeryId): RedirectResponse
    {
        $surgery = Surgery::with('operationTheatre')->findOrFail($surgeryId);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:SCHEDULED,PRE_OP,IN_PROGRESS,POST_OP,COMPLETED,CANCELLED'],
            'post_op_diagnosis' => ['nullable', 'string', 'max:1000'],
            'surgical_notes' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($surgery, $validated) {
            $newStatus = $validated['status'];

            $updateData = [
                'status' => $newStatus,
            ];

            if ($validated['post_op_diagnosis'] ?? null) {
                $updateData['post_op_diagnosis'] = $validated['post_op_diagnosis'];
            }

            if ($validated['surgical_notes'] ?? null) {
                $updateData['surgical_notes'] = $validated['surgical_notes'];
            }

            if ($newStatus === SurgeryStatus::InProgress->value) {
                $updateData['actual_start_at'] = now();
                $surgery->operationTheatre->update(['status' => OtRoomStatus::Occupied]);
            } elseif ($newStatus === SurgeryStatus::Completed->value) {
                $updateData['actual_end_at'] = now();
                // Send OT Room to cleaning cycle
                $surgery->operationTheatre->update(['status' => OtRoomStatus::Cleaning]);
            } elseif ($newStatus === SurgeryStatus::Cancelled->value) {
                // If cancelled while occupied, return room to available
                if ($surgery->operationTheatre->status === OtRoomStatus::Occupied) {
                    $surgery->operationTheatre->update(['status' => OtRoomStatus::Available]);
                }
            }

            $surgery->update($updateData);
        });

        return redirect()->back()->with('success', "Surgery updated to {$validated['status']}.");
    }

    /**
     * Save WHO Surgical Safety Checklist (Sign-In, Time-Out, Sign-Out).
     */
    public function saveChecklist(Request $request, string $surgeryId): RedirectResponse
    {
        $surgery = Surgery::findOrFail($surgeryId);

        $validated = $request->validate([
            'safety_checklist' => ['required', 'array'],
            'safety_checklist.sign_in' => ['nullable', 'array'],
            'safety_checklist.time_out' => ['nullable', 'array'],
            'safety_checklist.sign_out' => ['nullable', 'array'],
        ]);

        $surgery->update([
            'safety_checklist' => $validated['safety_checklist'],
        ]);

        return redirect()->back()->with('success', 'WHO Surgical Safety Checklist verified.');
    }
}
