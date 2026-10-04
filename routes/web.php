<?php

use App\Modules\Appointment\Http\Controllers\AppointmentController;
use App\Modules\Auth\Http\Controllers\AuthenticatedSessionController;
use App\Modules\Auth\Http\Controllers\TenantOnboardingController;
use App\Modules\Auth\Http\Controllers\UserController;
use App\Modules\Clinical\Http\Controllers\DoctorController;
use App\Modules\Dashboard\Http\Controllers\DashboardController;
use App\Modules\Emergency\Http\Controllers\EmergencyController;
use App\Modules\Facility\Http\Controllers\FacilityController;
use App\Modules\IPD\Http\Controllers\AdmissionController;
use App\Modules\Nursing\Http\Controllers\NursingController;
use App\Modules\Opd\Http\Controllers\OpdVisitController;
use App\Modules\Opd\Http\Controllers\PrescriptionController;
use App\Modules\Patient\Http\Controllers\PatientController;
use App\Modules\RBAC\Http\Controllers\RoleController;
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
});
