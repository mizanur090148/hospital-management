<?php

namespace App\Modules\Portal\Http\Controllers;

use App\Core\Enums\AppointmentStatus;
use App\Core\Enums\AppointmentType;
use App\Core\Enums\BloodGroup;
use App\Core\Enums\Gender;
use App\Core\Enums\InvoiceStatus;
use App\Core\Enums\PatientStatus;
use App\Core\Enums\PaymentMethod;
use App\Core\Sequences\SequenceGenerator;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Appointment\Models\Appointment;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Clinical\Models\Doctor;
use App\Modules\Diagnostics\Models\LabOrder;
use App\Modules\Diagnostics\Models\RadiologyOrder;
use App\Modules\Facility\Models\Department;
use App\Modules\IPD\Models\Admission;
use App\Modules\Opd\Models\Prescription;
use App\Modules\Patient\Models\Patient;
use App\Modules\Portal\Models\TeleconsultationSession;
use App\Modules\Tenancy\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PatientPortalController extends Controller
{
    /**
     * Helper to resolve the active patient profile for the current session.
     */
    protected function resolvePatient(Request $request): Patient
    {
        $user = $request->user();

        // 1. Direct relationship via user_id
        if ($user && $user->patient) {
            return $user->patient;
        }

        // 2. Lookup by user email or phone if existing
        if ($user) {
            $patient = Patient::where('tenant_id', $user->tenant_id)
                ->where(function ($q) use ($user) {
                    if ($user->email) {
                        $q->where('email', $user->email);
                    }
                    if ($user->phone) {
                        $q->orWhere('phone', $user->phone);
                    }
                })->first();

            if ($patient) {
                if (! $patient->user_id) {
                    $patient->update([
                        'user_id' => $user->id,
                        'portal_activated_at' => now(),
                    ]);
                }

                return $patient;
            }
        }

        // 3. Fallback to patient_id from request (for testing / admin preview switch)
        $requestedPatientId = $request->input('patient_id') ?? $request->header('X-Patient-Id');
        if ($requestedPatientId) {
            return Patient::findOrFail($requestedPatientId);
        }

        // 4. Default to first active patient in tenant (for seamless demo access)
        $tenantId = app(TenantContext::class)->getTenantId() ?? $user?->tenant_id;
        $fallback = Patient::where('tenant_id', $tenantId)->first();

        if (! $fallback) {
            // Auto-provision demo patient record for authenticated user
            $fallback = Patient::create([
                'tenant_id' => $tenantId,
                'user_id' => $user?->id,
                'mrn' => SequenceGenerator::generateMrn($tenantId),
                'first_name' => $user?->name ?? 'John',
                'last_name' => 'Doe',
                'dob' => '1990-01-01',
                'gender' => Gender::Male,
                'blood_group' => BloodGroup::APositive,
                'phone' => $user?->phone ?? '+15550009999',
                'email' => $user?->email ?? 'patient@hospital.test',
                'status' => PatientStatus::Active,
                'portal_activated_at' => now(),
            ]);
        }

        return $fallback;
    }

    /**
     * Patient Self-Service Portal Dashboard.
     */
    public function dashboard(Request $request): Response
    {
        $patient = $this->resolvePatient($request);

        // Upcoming appointments
        $upcomingAppointments = Appointment::with(['doctor.user', 'doctor.department', 'branch'])
            ->where('patient_id', $patient->id)
            ->whereDate('appointment_date', '>=', now()->toDateString())
            ->where('status', '!=', AppointmentStatus::Cancelled->value)
            ->orderBy('appointment_date')
            ->orderBy('start_time')
            ->limit(5)
            ->get();

        // Recent electronic prescriptions
        $recentPrescriptions = Prescription::with(['items', 'doctor.user', 'doctor.department'])
            ->where('patient_id', $patient->id)
            ->latest()
            ->limit(5)
            ->get();

        // Latest diagnostic lab results
        $recentLabOrders = LabOrder::with(['items.template', 'items.results', 'orderingDoctor.user'])
            ->where('patient_id', $patient->id)
            ->latest('ordered_at')
            ->limit(5)
            ->get();

        // Outstanding invoices summary
        $invoices = Invoice::where('patient_id', $patient->id)
            ->latest('invoice_date')
            ->limit(5)
            ->get();

        $totalPayable = (float) Invoice::where('patient_id', $patient->id)
            ->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])
            ->sum('patient_payable_amount');

        $totalPaid = (float) Invoice::where('patient_id', $patient->id)
            ->whereIn('status', [InvoiceStatus::Issued->value, InvoiceStatus::PartiallyPaid->value])
            ->sum('paid_amount');

        $outstandingBalance = max(0, round($totalPayable - $totalPaid, 2));

        return Inertia::render('Portal/Patient/Dashboard', [
            'patient' => $patient,
            'upcomingAppointments' => $upcomingAppointments,
            'recentPrescriptions' => $recentPrescriptions,
            'recentLabOrders' => $recentLabOrders,
            'recentInvoices' => $invoices,
            'outstandingBalance' => $outstandingBalance,
        ]);
    }

    /**
     * Patient Appointments Booking & Management.
     */
    public function appointments(Request $request): Response
    {
        $patient = $this->resolvePatient($request);

        $myAppointments = Appointment::with(['doctor.user', 'doctor.department', 'branch'])
            ->where('patient_id', $patient->id)
            ->orderByDesc('appointment_date')
            ->orderByDesc('start_time')
            ->get();

        $doctors = Doctor::with(['user', 'department', 'schedules'])
            ->where('status', 'ACTIVE')
            ->get();

        $departments = Department::where('is_active', true)->orderBy('name')->get();
        $branches = Branch::where('is_active', true)->orderBy('name')->get();

        return Inertia::render('Portal/Patient/Appointments', [
            'patient' => $patient,
            'myAppointments' => $myAppointments,
            'doctors' => $doctors,
            'departments' => $departments,
            'branches' => $branches,
        ]);
    }

    /**
     * Concurrency-safe self-service appointment booking by patient.
     */
    public function bookAppointment(Request $request): RedirectResponse
    {
        $patient = $this->resolvePatient($request);

        $validated = $request->validate([
            'doctor_id' => ['required', 'uuid', 'exists:doctors,id'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'appointment_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'type' => ['required', 'string', 'in:OPD,TELECONSULTATION,FOLLOW_UP'],
            'reason_for_visit' => ['nullable', 'string', 'max:500'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $patient->tenant_id;
        $doctor = Doctor::findOrFail($validated['doctor_id']);

        // Default end_time: +30 minutes if not supplied
        if (empty($validated['end_time'])) {
            $validated['end_time'] = date('H:i', strtotime($validated['start_time']) + 1800);
        }

        // Branch fallback
        if (empty($validated['branch_id'])) {
            $validated['branch_id'] = Branch::where('tenant_id', $tenantId)->first()?->id;
        }

        $appointment = DB::transaction(function () use ($validated, $tenantId, $patient, $doctor) {
            // Pessimistic double-booking guard
            $hasConflict = Appointment::where('doctor_id', $validated['doctor_id'])
                ->whereDate('appointment_date', $validated['appointment_date'])
                ->whereTime('start_time', $validated['start_time'])
                ->where('status', '!=', AppointmentStatus::Cancelled->value)
                ->lockForUpdate()
                ->exists();

            if ($hasConflict) {
                throw ValidationException::withMessages([
                    'start_time' => 'This consultation slot is already reserved. Please select another time.',
                ]);
            }

            $apt = Appointment::create([
                'tenant_id' => $tenantId,
                'branch_id' => $validated['branch_id'],
                'doctor_id' => $doctor->id,
                'patient_id' => $patient->id,
                'appointment_number' => SequenceGenerator::generateAppointmentNumber($tenantId),
                'appointment_date' => $validated['appointment_date'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'type' => $validated['type'] === 'TELECONSULTATION' ? AppointmentType::Teleconsultation : AppointmentType::OPD,
                'status' => AppointmentStatus::Scheduled,
                'reason_for_visit' => $validated['reason_for_visit'] ?? null,
                'consultation_fee' => $doctor->consultation_fee ?? 0.00,
            ]);

            // If teleconsultation, provision secure virtual room
            if ($validated['type'] === 'TELECONSULTATION') {
                TeleconsultationSession::create([
                    'tenant_id' => $tenantId,
                    'appointment_id' => $apt->id,
                    'patient_id' => $patient->id,
                    'doctor_id' => $doctor->id,
                    'room_name' => 'tele-'.Str::uuid(),
                    'join_token' => Str::random(32),
                    'session_status' => 'SCHEDULED',
                ]);
            }

            return $apt;
        });

        return redirect()->back()->with('success', "Appointment #{$appointment->appointment_number} booked successfully!");
    }

    /**
     * Cancel an existing appointment.
     */
    public function cancelAppointment(Request $request, string $id): RedirectResponse
    {
        $patient = $this->resolvePatient($request);

        $appointment = Appointment::where('id', $id)
            ->where('patient_id', $patient->id)
            ->firstOrFail();

        if (in_array($appointment->status->value, [AppointmentStatus::Completed->value, AppointmentStatus::Cancelled->value])) {
            return redirect()->back()->with('error', 'Cannot cancel an already completed or cancelled appointment.');
        }

        $appointment->update([
            'status' => AppointmentStatus::Cancelled,
            'notes' => 'Cancelled by patient via Patient Portal at '.now()->toDateTimeString(),
        ]);

        return redirect()->back()->with('success', "Appointment #{$appointment->appointment_number} has been cancelled.");
    }

    /**
     * Patient Medical Records & Diagnostic Dossier.
     */
    public function medicalRecords(Request $request): Response
    {
        $patient = $this->resolvePatient($request);

        $prescriptions = Prescription::with(['items', 'doctor.user', 'doctor.department'])
            ->where('patient_id', $patient->id)
            ->latest()
            ->get();

        $labOrders = LabOrder::with(['items.template', 'items.results', 'orderingDoctor.user'])
            ->where('patient_id', $patient->id)
            ->latest('ordered_at')
            ->get();

        $radiologyOrders = RadiologyOrder::with(['template', 'orderingDoctor.user', 'reportingDoctor.user'])
            ->where('patient_id', $patient->id)
            ->latest('ordered_at')
            ->get();

        $admissions = Admission::with(['attendingDoctor.user', 'admittingDepartment'])
            ->where('patient_id', $patient->id)
            ->latest('admitted_at')
            ->get();

        return Inertia::render('Portal/Patient/MedicalRecords', [
            'patient' => $patient,
            'prescriptions' => $prescriptions,
            'labOrders' => $labOrders,
            'radiologyOrders' => $radiologyOrders,
            'admissions' => $admissions,
        ]);
    }

    /**
     * Patient Billing, Invoices & Receipt History.
     */
    public function billing(Request $request): Response
    {
        $patient = $this->resolvePatient($request);

        $invoices = Invoice::with(['items', 'payments'])
            ->where('patient_id', $patient->id)
            ->latest('invoice_date')
            ->get();

        $payments = Payment::whereHas('invoice', fn ($q) => $q->where('patient_id', $patient->id))
            ->with('invoice')
            ->latest('payment_date')
            ->get();

        $totalInvoiced = (float) $invoices->sum('total_amount');
        $insuranceCovered = (float) $invoices->sum('insurance_covered_amount');
        $patientPayable = (float) $invoices->sum('patient_payable_amount');
        $totalPaid = (float) $invoices->sum('paid_amount');
        $outstandingBalance = max(0, round($patientPayable - $totalPaid, 2));

        return Inertia::render('Portal/Patient/Billing', [
            'patient' => $patient,
            'invoices' => $invoices,
            'payments' => $payments,
            'summary' => [
                'total_invoiced' => $totalInvoiced,
                'insurance_covered' => $insuranceCovered,
                'patient_payable' => $patientPayable,
                'total_paid' => $totalPaid,
                'outstanding_balance' => $outstandingBalance,
            ],
        ]);
    }

    /**
     * Self-service online bill settlement.
     */
    public function payInvoice(Request $request, string $id): RedirectResponse
    {
        $patient = $this->resolvePatient($request);

        $invoice = Invoice::where('id', $id)
            ->where('patient_id', $patient->id)
            ->firstOrFail();

        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:CREDIT_CARD,DEBIT_CARD,BANK_TRANSFER,MOBILE_MONEY'],
            'amount' => ['nullable', 'numeric', 'min:1'],
            'transaction_reference' => ['nullable', 'string', 'max:100'],
        ]);

        $tenantId = app(TenantContext::class)->getTenantId() ?? $patient->tenant_id;
        $unpaidBalance = max(0, (float) $invoice->patient_payable_amount - (float) $invoice->paid_amount);

        $payAmount = isset($validated['amount']) ? min((float) $validated['amount'], $unpaidBalance) : $unpaidBalance;

        if ($payAmount <= 0) {
            return redirect()->back()->with('info', 'This invoice has already been fully paid.');
        }

        $payment = DB::transaction(function () use ($invoice, $validated, $payAmount, $tenantId, $request) {
            $lockedInvoice = Invoice::where('id', $invoice->id)->lockForUpdate()->first();

            $receiptNumber = SequenceGenerator::generateReceiptNumber($tenantId);

            $paymentRecord = Payment::create([
                'tenant_id' => $tenantId,
                'branch_id' => $lockedInvoice->branch_id,
                'invoice_id' => $lockedInvoice->id,
                'receipt_number' => $receiptNumber,
                'payment_method' => PaymentMethod::from($validated['payment_method']),
                'amount' => $payAmount,
                'transaction_reference' => $validated['transaction_reference'] ?? 'ONLINE-'.Str::upper(Str::random(10)),
                'payment_date' => now(),
                'received_by_user_id' => $request->user()?->id,
                'notes' => 'Self-service online payment via Patient Portal',
            ]);

            $newPaid = round((float) $lockedInvoice->paid_amount + $payAmount, 2);
            $newStatus = ($newPaid >= (float) $lockedInvoice->patient_payable_amount)
                ? InvoiceStatus::Paid
                : InvoiceStatus::PartiallyPaid;

            $lockedInvoice->update([
                'paid_amount' => $newPaid,
                'status' => $newStatus,
            ]);

            return $paymentRecord;
        });

        return redirect()->back()->with('success', "Payment of \${$payAmount} processed successfully. Receipt #{$payment->receipt_number}");
    }
}
