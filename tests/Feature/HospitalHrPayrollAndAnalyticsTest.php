<?php

namespace Tests\Feature;

use App\Core\Enums\AttendanceStatus;
use App\Core\Enums\DepartmentType;
use App\Core\Enums\LeaveStatus;
use App\Core\Enums\LeaveType;
use App\Core\Enums\PayrollStatus;
use App\Core\Enums\RosterStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Modules\Accounting\Models\JournalEntry;
use App\Modules\Accounting\Services\DoubleEntryAccountingService;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Department;
use App\Modules\HR\Models\LeaveRequest;
use App\Modules\HR\Models\Payroll;
use App\Modules\HR\Models\SalaryStructure;
use App\Modules\HR\Models\ShiftTemplate;
use App\Modules\HR\Models\StaffAttendance;
use App\Modules\HR\Models\StaffRoster;
use App\Modules\RBAC\Models\Role;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HospitalHrPayrollAndAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected Department $department;

    protected User $adminUser;

    protected User $doctorUser;

    protected User $nurseUser;

    protected DoubleEntryAccountingService $accountingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'st-jude-hr-test',
            'legal_name' => 'St. Jude Healthcare Global',
            'trade_name' => 'St. Jude Medical Center',
            'status' => TenantStatus::Active,
            'plan' => 'enterprise',
        ]);

        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN-01',
            'name' => 'St. Jude Main Medical Pavilion',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->department = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'EMERG-DEPT',
            'name' => 'Emergency & Trauma Care',
            'department_type' => DepartmentType::Clinical,
            'is_active' => true,
        ]);

        $this->adminUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'user_type' => UserType::HospitalAdmin,
            'name' => 'Chief Operations Officer',
            'email' => 'coo.admin@st-jude.test',
            'phone' => '+15551112222',
            'password' => Hash::make('Secret123!'),
            'status' => UserStatus::Active,
        ]);

        $adminRole = Role::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Hospital Administrator',
            'slug' => 'hospital_admin',
            'guard_name' => 'web',
            'is_system' => true,
        ]);
        $this->adminUser->assignRole($adminRole);

        $this->doctorUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'user_type' => UserType::Doctor,
            'name' => 'Dr. Gregory House',
            'email' => 'dr.house@st-jude.test',
            'phone' => '+15553334444',
            'password' => Hash::make('Secret123!'),
            'status' => UserStatus::Active,
        ]);

        $this->nurseUser = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'user_type' => UserType::Nurse,
            'name' => 'Nurse Jackie Peyton',
            'email' => 'nurse.jackie@st-jude.test',
            'phone' => '+15555556666',
            'password' => Hash::make('Secret123!'),
            'status' => UserStatus::Active,
        ]);

        // Seed default Double-Entry Chart of Accounts
        $this->accountingService = app(DoubleEntryAccountingService::class);
        $this->accountingService->ensureStandardChartOfAccounts($this->tenant->id);

        // Bind tenant in tenancy context
        app(TenantContext::class)->setTenant($this->tenant);
        app(TenantContext::class)->setBranch($this->branch);
    }

    public function test_can_render_duty_roster_workstation_and_create_shift_template(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->get('/hr/rosters');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('HR/RosterIndex')
            ->has('rosters')
            ->has('shiftTemplates')
            ->has('departments')
            ->has('branches')
            ->has('staffMembers')
        );

        // Create a new Shift Template (e.g. Night Emergency Rotation)
        $createResponse = $this->actingAs($this->adminUser)
            ->post('/hr/rosters/templates', [
                'name' => 'Emergency Night Shift',
                'code' => 'NIGHT-ER',
                'start_time' => '22:00',
                'end_time' => '06:00',
                'duration_hours' => 8.0,
                'color' => '#7c3aed',
            ]);

        $createResponse->assertRedirect();
        $this->assertDatabaseHas('shift_templates', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Emergency Night Shift',
            'code' => 'NIGHT-ER',
            'color' => '#7c3aed',
        ]);
    }

    public function test_can_assign_duty_shift_to_staff_member_and_update_status(): void
    {
        $template = ShiftTemplate::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Morning Trauma Rotation',
            'code' => 'MORN-TRAUMA',
            'start_time' => '07:00:00',
            'end_time' => '15:00:00',
            'duration_hours' => 8.0,
            'color' => '#0891b2',
            'is_active' => true,
        ]);

        $dutyDate = now()->addDay()->toDateString();

        // Assign shift
        $response = $this->actingAs($this->adminUser)
            ->post('/hr/rosters', [
                'user_id' => $this->doctorUser->id,
                'shift_template_id' => $template->id,
                'department_id' => $this->department->id,
                'duty_date' => $dutyDate,
                'room_or_station' => 'Resuscitation Bay 1',
                'notes' => 'Attending physician in charge',
            ]);

        $response->assertRedirect();

        $roster = StaffRoster::where('user_id', $this->doctorUser->id)
            ->where('duty_date', $dutyDate)
            ->first();

        $this->assertNotNull($roster);
        $this->assertEquals(RosterStatus::Scheduled, $roster->status);
        $this->assertEquals('Resuscitation Bay 1', $roster->room_or_station);

        // Update status to COMPLETED
        $updateResponse = $this->actingAs($this->adminUser)
            ->patch("/hr/rosters/{$roster->id}/status", [
                'status' => 'COMPLETED',
            ]);

        $updateResponse->assertRedirect();
        $this->assertEquals(RosterStatus::Completed, $roster->fresh()->status);
    }

    public function test_can_clock_in_clock_out_and_track_working_hours(): void
    {
        // 1. Clock in
        $clockInResponse = $this->actingAs($this->adminUser)
            ->post('/hr/attendance/clock-in', [
                'user_id' => $this->nurseUser->id,
                'clock_in' => '07:00',
                'notes' => 'Started morning nursing rounds',
            ]);

        $clockInResponse->assertRedirect();

        $attendance = StaffAttendance::where('user_id', $this->nurseUser->id)
            ->where('attendance_date', now()->toDateString())
            ->first();

        $this->assertNotNull($attendance);
        $this->assertEquals(AttendanceStatus::Present, $attendance->status);
        $this->assertNull($attendance->clock_out);

        // 2. Clock out after 8 hours
        $clockOutResponse = $this->actingAs($this->adminUser)
            ->post("/hr/attendance/{$attendance->id}/clock-out", [
                'clock_out' => '15:30',
            ]);

        $clockOutResponse->assertRedirect();
        $freshAttendance = $attendance->fresh();
        $this->assertNotNull($freshAttendance->clock_out);
        $this->assertGreaterThan(8.0, (float) $freshAttendance->working_hours);
    }

    public function test_can_submit_and_review_staff_leave_requests(): void
    {
        // Submit sick leave
        $leaveResponse = $this->actingAs($this->doctorUser)
            ->post('/hr/leaves', [
                'user_id' => $this->doctorUser->id,
                'leave_type' => 'SICK',
                'start_date' => now()->addDays(2)->toDateString(),
                'end_date' => now()->addDays(4)->toDateString(),
                'reason' => 'Acute respiratory infection with medical certificate',
            ]);

        $leaveResponse->assertRedirect();

        $leave = LeaveRequest::where('user_id', $this->doctorUser->id)->first();
        $this->assertNotNull($leave);
        $this->assertEquals(LeaveType::Sick, $leave->leave_type);
        $this->assertEquals(LeaveStatus::Pending, $leave->status);
        $this->assertEquals(3, $leave->total_days);

        // Supervisor review and approval
        $reviewResponse = $this->actingAs($this->adminUser)
            ->patch("/hr/leaves/{$leave->id}/review", [
                'status' => 'APPROVED',
                'approver_notes' => 'Medical certificate verified. Approved.',
            ]);

        $reviewResponse->assertRedirect();
        $freshLeave = $leave->fresh();
        $this->assertEquals(LeaveStatus::Approved, $freshLeave->status);
        $this->assertEquals($this->adminUser->id, $freshLeave->approved_by);
    }

    public function test_can_configure_salary_structure_and_generate_monthly_payroll_run(): void
    {
        // Configure salary structure for doctor
        $structResponse = $this->actingAs($this->adminUser)
            ->post('/hr/payroll/structures', [
                'user_id' => $this->doctorUser->id,
                'base_salary' => 80000.00,
                'medical_allowance' => 10000.00,
                'housing_allowance' => 15000.00,
                'transport_allowance' => 5000.00,
                'hazard_allowance' => 5000.00,
                'tax_deduction' => 8000.00,
                'provident_fund' => 7000.00,
                'health_insurance_deduction' => 2000.00,
                'notes' => 'Senior Attending Physician Compensation Plan',
            ]);

        $structResponse->assertRedirect();

        $structure = SalaryStructure::where('user_id', $this->doctorUser->id)->first();
        $this->assertNotNull($structure);
        $this->assertEquals(80000.00, (float) $structure->base_salary);
        $this->assertEquals(115000.00, (float) $structure->gross_salary);
        $this->assertEquals(17004.00, (float) $structure->total_deductions);
        $this->assertEquals(97996.00, (float) $structure->estimated_net_salary);

        // Generate batch monthly payroll run
        $salaryMonth = now()->format('Y-m');
        $generateResponse = $this->actingAs($this->adminUser)
            ->post('/hr/payroll/generate', [
                'salary_month' => $salaryMonth,
            ]);

        $generateResponse->assertRedirect();

        $payroll = Payroll::where('user_id', $this->doctorUser->id)
            ->where('salary_month', $salaryMonth)
            ->first();

        $this->assertNotNull($payroll);
        $this->assertStringStartsWith('PAY-', $payroll->payslip_number);
        $this->assertEquals(PayrollStatus::Draft, $payroll->status);
        $this->assertEquals(115000.00, (float) $payroll->gross_salary);
        $this->assertEquals(17004.00, (float) $payroll->total_deductions);
        $this->assertEquals(97996.00, (float) $payroll->net_salary);
    }

    public function test_can_approve_and_disburse_payroll_with_automated_double_entry_general_ledger_posting(): void
    {
        // 1. Setup salary structure & generate payroll
        SalaryStructure::create([
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'user_id' => $this->nurseUser->id,
            'base_salary' => 40000.00,
            'medical_allowance' => 4000.00,
            'housing_allowance' => 6000.00,
            'transport_allowance' => 2000.00,
            'special_allowance' => 3000.00,
            'tax_deduction_percent' => 5.45,
            'provident_fund_deduction' => 3000.00,
            'insurance_deduction' => 1000.00,
            'is_active' => true,
        ]);

        $salaryMonth = now()->format('Y-m');
        $this->actingAs($this->adminUser)
            ->post('/hr/payroll/generate', ['salary_month' => $salaryMonth]);

        $payroll = Payroll::where('user_id', $this->nurseUser->id)
            ->where('salary_month', $salaryMonth)
            ->first();

        $this->assertNotNull($payroll);

        // 2. Approve payroll
        $approveResponse = $this->actingAs($this->adminUser)
            ->patch("/hr/payroll/{$payroll->id}/approve");

        $approveResponse->assertRedirect();
        $this->assertEquals(PayrollStatus::Approved, $payroll->fresh()->status);

        // 3. Disburse payroll & sync with Double-Entry General Ledger
        $disburseResponse = $this->actingAs($this->adminUser)
            ->post("/hr/payroll/{$payroll->id}/disburse", [
                'payment_method' => 'BANK_TRANSFER',
                'notes' => 'EFT transfer to registered staff bank account',
            ]);

        $disburseResponse->assertRedirect();

        $freshPayroll = $payroll->fresh();
        $this->assertEquals(PayrollStatus::Paid, $freshPayroll->status);
        $this->assertNotNull($freshPayroll->disbursed_at);
        $this->assertNotNull($freshPayroll->journal_entry_id);

        // Verify General Ledger Journal Entry
        $journalEntry = JournalEntry::with('items.account')->find($freshPayroll->journal_entry_id);
        $this->assertNotNull($journalEntry);
        $this->assertTrue($journalEntry->is_posted);
        $this->assertEquals('Payroll', $journalEntry->reference_type);
        $this->assertEquals($freshPayroll->id, $journalEntry->reference_id);

        // Assert Double-Entry balanced: total debit == total credit
        $debitSum = $journalEntry->items->where('entry_type', 'DEBIT')->sum('amount');
        $creditSum = $journalEntry->items->where('entry_type', 'CREDIT')->sum('amount');

        $this->assertEquals(55000.00, (float) $debitSum, 'Gross payroll expense debit must equal gross salary');
        $this->assertEquals(55000.00, (float) $creditSum, 'Credit withholdings + net payout must balance debit');
    }

    public function test_can_render_c_suite_executive_analytics_kpi_dashboard(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->get('/analytics/executive?timeframe=30_days');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Analytics/ExecutiveDashboard')
            ->where('timeframe', '30_days')
            ->has('kpis.bed_occupancy_rate')
            ->has('kpis.total_beds')
            ->has('kpis.occupied_beds')
            ->has('kpis.available_beds')
            ->has('kpis.cleaning_beds')
            ->has('kpis.active_inpatients')
            ->has('kpis.alos_days')
            ->has('kpis.opd_visits_count')
            ->has('kpis.emergency_visits_count')
            ->has('kpis.emergency_triage_breakdown')
            ->has('kpis.surgeries_total')
            ->has('kpis.surgeries_completed')
            ->has('kpis.lab_orders_total')
            ->has('kpis.lab_orders_completed')
            ->has('kpis.radiology_scans_total')
            ->has('kpis.radiology_completed')
            ->has('kpis.active_batches_count')
            ->has('kpis.expiring_batches_count')
            ->has('kpis.out_of_stock_count')
            ->has('kpis.total_invoiced')
            ->has('kpis.total_collected')
            ->has('kpis.payroll_disbursed')
            ->has('kpis.operating_surplus')
            ->has('kpis.income_statement')
        );
    }
}
