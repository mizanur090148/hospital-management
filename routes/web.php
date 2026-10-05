<?php

use App\Modules\Accounting\Http\Controllers\AccountingController;
use App\Modules\AI\Http\Controllers\ClinicalScribeController;
use App\Modules\AI\Http\Controllers\ClinicalSummaryController;
use App\Modules\AI\Http\Controllers\MedicalRagController;
use App\Modules\Analytics\Http\Controllers\ExecutiveAnalyticsController;
use App\Modules\Appointment\Http\Controllers\AppointmentController;
use App\Modules\Audit\Http\Controllers\AuditComplianceController;
use App\Modules\Auth\Http\Controllers\AuthenticatedSessionController;
use App\Modules\Auth\Http\Controllers\TenantOnboardingController;
use App\Modules\Auth\Http\Controllers\UserController;
use App\Modules\Billing\Http\Controllers\BillingController;
use App\Modules\Billing\Http\Controllers\InsuranceController;
use App\Modules\Clinical\Http\Controllers\DoctorController;
use App\Modules\Dashboard\Http\Controllers\DashboardController;
use App\Modules\Diagnostics\Http\Controllers\LaboratoryController;
use App\Modules\Diagnostics\Http\Controllers\RadiologyController;
use App\Modules\Emergency\Http\Controllers\EmergencyController;
use App\Modules\Facility\Http\Controllers\FacilityController;
use App\Modules\HR\Http\Controllers\AttendanceController;
use App\Modules\HR\Http\Controllers\PayrollController;
use App\Modules\HR\Http\Controllers\RosterController;
use App\Modules\IPD\Http\Controllers\AdmissionController;
use App\Modules\Notification\Http\Controllers\NotificationController;
use App\Modules\Nursing\Http\Controllers\NursingController;
use App\Modules\Opd\Http\Controllers\OpdVisitController;
use App\Modules\Opd\Http\Controllers\PrescriptionController;
use App\Modules\OperationTheatre\Http\Controllers\OperationTheatreController;
use App\Modules\Patient\Http\Controllers\PatientController;
use App\Modules\Pharmacy\Http\Controllers\DispensingController;
use App\Modules\Pharmacy\Http\Controllers\MedicineController;
use App\Modules\Pharmacy\Http\Controllers\ProcurementController;
use App\Modules\Portal\Http\Controllers\DoctorWorkstationController;
use App\Modules\Portal\Http\Controllers\PatientPortalController;
use App\Modules\RBAC\Http\Controllers\RoleController;
use App\Modules\Storage\Http\Controllers\DocumentStorageController;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Guest Authentication & Hospital Onboarding
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);

    Route::get('/register-hospital', [TenantOnboardingController::class, 'create'])->name('hospital.register');
    Route::post('/register-hospital', [TenantOnboardingController::class, 'store']);
});

// Authenticated Clinical & Hospital Management
Route::middleware('auth')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('home');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    // Branch Switcher
    Route::post('/switch-branch/{branch}', function (Request $request, Branch $branch) {
        $user = $request->user();
        if ($user->tenant_id && $branch->tenant_id !== $user->tenant_id && ! $user->isSuperAdmin()) {
            abort(403, 'Unauthorized branch access.');
        }

        session(['active_branch_id' => $branch->id]);

        return back()->with('success', "Switched active branch to {$branch->name}.");
    })->name('branch.switch');

    // Tenant Switcher (for SuperAdmin testing & management)
    Route::post('/switch-tenant/{tenant}', function (Request $request, Tenant $tenant) {
        $user = $request->user();
        if (! $user->isSuperAdmin()) {
            abort(403, 'Unauthorized tenant switch.');
        }

        session(['active_tenant_id' => $tenant->id]);
        session()->forget('active_branch_id');

        return back()->with('success', "Switched active tenant to {$tenant->trade_name}.");
    })->name('tenant.switch');

    // Phase 2: Facilities, Wards & Beds
    Route::get('/facility', [FacilityController::class, 'index'])->name('facility.index');
    Route::post('/facility/branches', [FacilityController::class, 'storeBranch'])->name('facility.branches.store');
    Route::post('/facility/departments', [FacilityController::class, 'storeDepartment'])->name('facility.departments.store');
    Route::post('/facility/wards', [FacilityController::class, 'storeWard'])->name('facility.wards.store');
    Route::post('/facility/rooms', [FacilityController::class, 'storeRoom'])->name('facility.rooms.store');
    Route::post('/facility/beds', [FacilityController::class, 'storeBed'])->name('facility.beds.store');
    Route::patch('/facility/beds/{bed}/status', [FacilityController::class, 'updateBedStatus'])->name('facility.beds.status');

    // Phase 2: Staff & User Management
    Route::get('/users', [UserController::class, 'index'])->name('users.index');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::patch('/users/{user}/toggle-status', [UserController::class, 'toggleStatus'])->name('users.toggle_status');

    // Phase 2: Roles & Permissions (RBAC)
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');

    // Phase 3: Patient Master Registry
    Route::get('/patients', [PatientController::class, 'index'])->name('patients.index');
    Route::post('/patients', [PatientController::class, 'store'])->name('patients.store');
    Route::get('/patients/{id}', [PatientController::class, 'show'])->name('patients.show');
    Route::put('/patients/{id}', [PatientController::class, 'update'])->name('patients.update');

    // Phase 3: Doctor Profiles & Scheduling
    Route::get('/doctors', [DoctorController::class, 'index'])->name('doctors.index');
    Route::post('/doctors', [DoctorController::class, 'store'])->name('doctors.store');
    Route::post('/doctors/{doctor}/schedules', [DoctorController::class, 'saveSchedules'])->name('doctors.schedules.save');
    Route::get('/doctors/{doctor}/available-slots', [DoctorController::class, 'availableSlots'])->name('doctors.slots');

    // Phase 3: Appointment Booking Engine
    Route::get('/appointments', [AppointmentController::class, 'index'])->name('appointments.index');
    Route::post('/appointments', [AppointmentController::class, 'store'])->name('appointments.store');
    Route::patch('/appointments/{appointment}/status', [AppointmentController::class, 'updateStatus'])->name('appointments.status');

    // Phase 3: OPD Doctor Clinical Workstation
    Route::get('/opd', [OpdVisitController::class, 'index'])->name('opd.workstation');
    Route::post('/opd/encounters', [OpdVisitController::class, 'store'])->name('opd.encounters.store');
    Route::post('/opd/encounters/{id}/complete', [OpdVisitController::class, 'complete'])->name('opd.encounters.complete');

    // Phase 3: Prescriptions Pad
    Route::get('/prescriptions', [PrescriptionController::class, 'index'])->name('prescriptions.index');
    Route::get('/prescriptions/{id}', [PrescriptionController::class, 'show'])->name('prescriptions.show');

    // Phase 4: IPD Inpatient Admissions & Bed Transfers
    Route::get('/ipd', [AdmissionController::class, 'index'])->name('admissions.index');
    Route::post('/ipd/admissions', [AdmissionController::class, 'store'])->name('admissions.store');
    Route::get('/ipd/admissions/{id}', [AdmissionController::class, 'show'])->name('admissions.show');
    Route::post('/ipd/admissions/{id}/transfer-bed', [AdmissionController::class, 'transferBed'])->name('admissions.transfer_bed');
    Route::post('/ipd/admissions/{id}/discharge', [AdmissionController::class, 'discharge'])->name('admissions.discharge');

    // Phase 4: Emergency Triage & Trauma Bay
    Route::get('/emergency', [EmergencyController::class, 'index'])->name('emergency.index');
    Route::post('/emergency/triage', [EmergencyController::class, 'store'])->name('emergency.store');
    Route::patch('/emergency/{id}/status', [EmergencyController::class, 'updateStatus'])->name('emergency.status');
    Route::post('/emergency/{id}/admit-to-ipd', [EmergencyController::class, 'admitToIpd'])->name('emergency.admit_ipd');

    // Phase 4: Nursing Station, Care Plans & MAR
    Route::get('/nursing', [NursingController::class, 'index'])->name('nursing.index');
    Route::post('/nursing/{admission}/notes', [NursingController::class, 'storeNote'])->name('nursing.notes.store');
    Route::post('/nursing/{admission}/mar', [NursingController::class, 'recordMar'])->name('nursing.mar.record');

    // Phase 5: Laboratory Diagnostics
    Route::get('/laboratory', [LaboratoryController::class, 'index'])->name('laboratory.index');
    Route::post('/laboratory/orders', [LaboratoryController::class, 'storeOrder'])->name('laboratory.orders.store');
    Route::post('/laboratory/samples/{sample}/collect', [LaboratoryController::class, 'collectSample'])->name('laboratory.samples.collect');
    Route::post('/laboratory/items/{item}/results', [LaboratoryController::class, 'enterResults'])->name('laboratory.results.store');
    Route::post('/laboratory/orders/{order}/verify', [LaboratoryController::class, 'verifyResults'])->name('laboratory.orders.verify');

    // Phase 5: Radiology & DICOM Imaging
    Route::get('/radiology', [RadiologyController::class, 'index'])->name('radiology.index');
    Route::post('/radiology/orders', [RadiologyController::class, 'storeOrder'])->name('radiology.orders.store');
    Route::post('/radiology/orders/{order}/capture', [RadiologyController::class, 'captureScan'])->name('radiology.orders.capture');
    Route::post('/radiology/orders/{order}/report', [RadiologyController::class, 'reportOrder'])->name('radiology.orders.report');
    Route::post('/radiology/orders/{order}/verify', [RadiologyController::class, 'verifyReport'])->name('radiology.orders.verify');

    // Phase 5: Operation Theatre (OT) Scheduling & WHO Surgical Safety Checklist
    Route::get('/operation-theatres', [OperationTheatreController::class, 'index'])->name('operation_theatres.index');
    Route::post('/operation-theatres', [OperationTheatreController::class, 'storeTheatre'])->name('operation_theatres.store');
    Route::post('/operation-theatres/surgeries', [OperationTheatreController::class, 'scheduleSurgery'])->name('operation_theatres.surgeries.schedule');
    Route::patch('/operation-theatres/surgeries/{surgery}/status', [OperationTheatreController::class, 'updateStatus'])->name('operation_theatres.surgeries.status');
    Route::post('/operation-theatres/surgeries/{surgery}/checklist', [OperationTheatreController::class, 'saveChecklist'])->name('operation_theatres.surgeries.checklist');

    // Phase 6: Pharmacy Medicine Catalog & FEFO Stock
    Route::get('/pharmacy/medicines', [MedicineController::class, 'index'])->name('pharmacy.medicines.index');
    Route::post('/pharmacy/medicines', [MedicineController::class, 'store'])->name('pharmacy.medicines.store');
    Route::put('/pharmacy/medicines/{medicine}', [MedicineController::class, 'update'])->name('pharmacy.medicines.update');
    Route::post('/pharmacy/batches/{batch}/adjust', [MedicineController::class, 'adjustStock'])->name('pharmacy.batches.adjust');

    // Phase 6: Pharmacy FEFO Dispensing Workstation
    Route::get('/pharmacy/dispense', [DispensingController::class, 'index'])->name('pharmacy.dispense.index');
    Route::post('/pharmacy/dispense/preview', [DispensingController::class, 'previewFefo'])->name('pharmacy.dispense.preview');
    Route::post('/pharmacy/dispense', [DispensingController::class, 'store'])->name('pharmacy.dispense.store');

    // Phase 6: Supply Chain & Procurement (PO, GRN, Suppliers)
    Route::get('/pharmacy/procurement', [ProcurementController::class, 'index'])->name('pharmacy.procurement.index');
    Route::post('/pharmacy/procurement/suppliers', [ProcurementController::class, 'storeSupplier'])->name('pharmacy.suppliers.store');
    Route::post('/pharmacy/procurement/purchase-orders', [ProcurementController::class, 'storePurchaseOrder'])->name('pharmacy.purchase_orders.store');
    Route::post('/pharmacy/procurement/goods-receipt-notes', [ProcurementController::class, 'storeGoodsReceiptNote'])->name('pharmacy.goods_receipt_notes.store');

    // Phase 7: Centralized Billing & Invoicing
    Route::get('/billing/invoices', [BillingController::class, 'index'])->name('billing.invoices.index');
    Route::post('/billing/invoices', [BillingController::class, 'store'])->name('billing.invoices.store');
    Route::post('/billing/invoices/{invoice}/payments', [BillingController::class, 'storePayment'])->name('billing.payments.store');
    Route::post('/billing/invoices/{invoice}/pay', [BillingController::class, 'storePayment'])->name('billing.invoices.pay');

    // Phase 7: Insurance Providers, Policies & Claims Adjudication
    Route::get('/billing/insurance', [InsuranceController::class, 'index'])->name('billing.insurance.index');
    Route::post('/billing/insurance/providers', [InsuranceController::class, 'storeProvider'])->name('billing.insurance.providers.store');
    Route::post('/billing/insurance/policies', [InsuranceController::class, 'storePolicy'])->name('billing.insurance.policies.store');
    Route::post('/billing/insurance/claims/{claim}/adjudicate', [InsuranceController::class, 'adjudicateClaim'])->name('billing.insurance.claims.adjudicate');

    // Phase 7: Double-Entry General Ledger, Chart of Accounts & Financial Reports
    Route::get('/accounting/general-ledger', [AccountingController::class, 'index'])->name('accounting.ledger.index');
    Route::post('/accounting/accounts', [AccountingController::class, 'storeAccount'])->name('accounting.accounts.store');
    Route::post('/accounting/journal-entries', [AccountingController::class, 'storeJournalEntry'])->name('accounting.journal_entries.store');

    // Phase 8: Hospital HR & Staff Shift Rostering
    Route::get('/hr/rosters', [RosterController::class, 'index'])->name('hr.rosters.index');
    Route::post('/hr/rosters/templates', [RosterController::class, 'storeTemplate'])->name('hr.rosters.templates.store');
    Route::post('/hr/rosters', [RosterController::class, 'storeRoster'])->name('hr.rosters.store');
    Route::patch('/hr/rosters/{roster}/status', [RosterController::class, 'updateStatus'])->name('hr.rosters.status');

    // Phase 8: Staff Attendance & Leave Management
    Route::get('/hr/attendance', [AttendanceController::class, 'index'])->name('hr.attendance.index');
    Route::post('/hr/attendance/clock-in', [AttendanceController::class, 'clockIn'])->name('hr.attendance.clock_in');
    Route::post('/hr/attendance/{attendance}/clock-out', [AttendanceController::class, 'clockOut'])->name('hr.attendance.clock_out');
    Route::post('/hr/leaves', [AttendanceController::class, 'storeLeave'])->name('hr.leaves.store');
    Route::patch('/hr/leaves/{leave}/review', [AttendanceController::class, 'reviewLeave'])->name('hr.leaves.review');

    // Phase 8: Staff Salary Structures & Monthly Payroll Engine
    Route::get('/hr/payroll', [PayrollController::class, 'index'])->name('hr.payroll.index');
    Route::post('/hr/payroll/structures', [PayrollController::class, 'storeStructure'])->name('hr.payroll.structures.store');
    Route::post('/hr/payroll/generate', [PayrollController::class, 'generateMonthlyPayroll'])->name('hr.payroll.generate');
    Route::patch('/hr/payroll/{payroll}/approve', [PayrollController::class, 'approve'])->name('hr.payroll.approve');
    Route::post('/hr/payroll/{payroll}/disburse', [PayrollController::class, 'disburse'])->name('hr.payroll.disburse');

    // Phase 8: Executive C-Suite Hospital Analytics & Real-Time Intelligence
    Route::get('/analytics/executive', [ExecutiveAnalyticsController::class, 'index'])->name('analytics.executive');

    // Phase 9: Patient Self-Service Portal
    Route::get('/portal/patient', [PatientPortalController::class, 'dashboard'])->name('portal.patient.dashboard');
    Route::get('/portal/patient/appointments', [PatientPortalController::class, 'appointments'])->name('portal.patient.appointments');
    Route::post('/portal/patient/appointments', [PatientPortalController::class, 'bookAppointment'])->name('portal.patient.appointments.store');
    Route::delete('/portal/patient/appointments/{appointment}', [PatientPortalController::class, 'cancelAppointment'])->name('portal.patient.appointments.cancel');
    Route::get('/portal/patient/medical-records', [PatientPortalController::class, 'medicalRecords'])->name('portal.patient.records');
    Route::get('/portal/patient/billing', [PatientPortalController::class, 'billing'])->name('portal.patient.billing');
    Route::post('/portal/patient/billing/{invoice}/pay', [PatientPortalController::class, 'payInvoice'])->name('portal.patient.billing.pay');

    // Phase 9: Doctor Clinical Workstation (Single-Screen Rapid Charting & CPOE)
    Route::get('/doctor/workstation', [DoctorWorkstationController::class, 'index'])->name('doctor.workstation.index');
    Route::post('/doctor/workstation/consultation', [DoctorWorkstationController::class, 'completeConsultation'])->name('doctor.workstation.complete');
    Route::post('/doctor/workstation/templates', [DoctorWorkstationController::class, 'storeOrderTemplate'])->name('doctor.workstation.templates.store');

    // Phase 10: Multi-Channel Notifications & Clinical Alerts
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/mark-read/{id}', [NotificationController::class, 'markAsRead'])->name('notifications.mark_read');
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead'])->name('notifications.mark_all_read');
    Route::post('/notifications/dispatch', [NotificationController::class, 'dispatchAlert'])->name('notifications.dispatch');

    // Phase 10: Cryptographic Audit Trail & Break-Glass Protocol
    Route::get('/audit/compliance', [AuditComplianceController::class, 'index'])->name('audit.compliance.index');
    Route::post('/audit/compliance/verify', [AuditComplianceController::class, 'verifyChain'])->name('audit.compliance.verify');
    Route::post('/audit/compliance/break-glass', [AuditComplianceController::class, 'breakGlass'])->name('audit.compliance.break_glass');

    // Phase 10: Secure Document & Medical Attachment Storage
    Route::get('/documents', [DocumentStorageController::class, 'index'])->name('documents.index');
    Route::post('/documents', [DocumentStorageController::class, 'store'])->name('documents.store');
    Route::get('/documents/{document}/download', [DocumentStorageController::class, 'download'])->name('documents.download');
    Route::get('/documents/{document}/secure-download', [DocumentStorageController::class, 'download'])->name('documents.secure-download');
    Route::post('/documents/{document}/temporary-url', [DocumentStorageController::class, 'temporaryUrl'])->name('documents.temporary_url');
    Route::post('/documents/{document}/verify-checksum', [DocumentStorageController::class, 'verifyChecksum'])->name('documents.verify_checksum');

    // Phase 11: Ambient Clinical Scribe & Dictation Structuring
    Route::get('/ai/scribe', [ClinicalScribeController::class, 'index'])->name('ai.scribe.index');
    Route::post('/ai/scribe/sessions', [ClinicalScribeController::class, 'startSession'])->name('ai.scribe.sessions.store');
    Route::post('/ai/scribe/sessions/{session}/process', [ClinicalScribeController::class, 'processTranscript'])->name('ai.scribe.sessions.process');
    Route::post('/ai/scribe/sessions/{session}/commit', [ClinicalScribeController::class, 'commitSoap'])->name('ai.scribe.sessions.commit');

    // Phase 11: Medical Domain RAG & Clinical Knowledge Base
    Route::get('/ai/knowledge-base', [MedicalRagController::class, 'index'])->name('ai.knowledge_base.index');
    Route::post('/ai/knowledge-base', [MedicalRagController::class, 'store'])->name('ai.knowledge_base.store');
    Route::post('/ai/knowledge-base/search', [MedicalRagController::class, 'search'])->name('ai.knowledge_base.search');
    Route::post('/ai/knowledge-base/check-interactions', [MedicalRagController::class, 'checkInteractions'])->name('ai.knowledge_base.interactions');

    // Phase 11: Automated Clinical & Discharge Summaries
    Route::get('/ai/discharge-summaries', [ClinicalSummaryController::class, 'index'])->name('ai.summaries.index');
    Route::post('/ai/discharge-summaries/admission/{admission}', [ClinicalSummaryController::class, 'synthesize'])->name('ai.summaries.synthesize');
    Route::patch('/ai/discharge-summaries/{summary}/approve', [ClinicalSummaryController::class, 'approve'])->name('ai.summaries.approve');
});
