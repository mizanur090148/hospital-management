<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 8: Hospital HR, Staff Rostering, Attendance & Payroll.
     */
    public function up(): void
    {
        // 1. Shift Templates
        Schema::create('shift_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('code', 50);
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('break_minutes')->default(60);
            $table->string('color', 30)->default('cyan');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
        });

        // 2. Staff Duty Rosters
        Schema::create('staff_rosters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('shift_template_id')->constrained('shift_templates')->cascadeOnDelete();
            $table->date('duty_date');
            $table->string('role_title', 100)->default('Staff Member');
            $table->string('status', 30)->default('SCHEDULED');
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'duty_date']);
            $table->index(['tenant_id', 'department_id', 'duty_date']);
            $table->index(['tenant_id', 'user_id', 'duty_date']);
        });

        // 3. Staff Attendance Logs
        Schema::create('staff_attendances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('attendance_date');
            $table->dateTime('clock_in')->nullable();
            $table->dateTime('clock_out')->nullable();
            $table->decimal('total_hours', 5, 2)->default(0.00);
            $table->decimal('overtime_hours', 5, 2)->default(0.00);
            $table->string('status', 30)->default('PRESENT');
            $table->string('verification_method', 30)->default('WEB');
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'user_id', 'attendance_date']);
            $table->index(['tenant_id', 'attendance_date']);
            $table->index(['tenant_id', 'status']);
        });

        // 4. Staff Leave Requests
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('leave_type', 30); // ANNUAL, SICK, CASUAL, MATERNITY, UNPAID
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedSmallInteger('total_days')->default(1);
            $table->text('reason');
            $table->string('status', 30)->default('PENDING'); // PENDING, APPROVED, REJECTED
            $table->foreignUuid('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->string('rejection_reason', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'start_date', 'end_date']);
        });

        // 5. Staff Salary Structures
        Schema::create('salary_structures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('currency', 10)->default('USD');
            $table->decimal('base_salary', 12, 2);
            $table->decimal('housing_allowance', 12, 2)->default(0.00);
            $table->decimal('transport_allowance', 12, 2)->default(0.00);
            $table->decimal('medical_allowance', 12, 2)->default(0.00);
            $table->decimal('special_allowance', 12, 2)->default(0.00);
            $table->decimal('tax_deduction_percent', 5, 2)->default(0.00);
            $table->decimal('provident_fund_deduction', 12, 2)->default(0.00);
            $table->decimal('insurance_deduction', 12, 2)->default(0.00);
            $table->string('payment_method', 30)->default('BANK_TRANSFER');
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account_number', 100)->nullable();
            $table->date('effective_from');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'is_active']);
        });

        // 6. Monthly Payrolls & Payslips
        Schema::create('payrolls', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('payslip_number', 50);
            $table->string('salary_month', 20); // e.g. "2026-10"
            $table->decimal('base_salary', 12, 2);
            $table->decimal('total_allowances', 12, 2)->default(0.00);
            $table->decimal('overtime_pay', 12, 2)->default(0.00);
            $table->decimal('gross_salary', 12, 2);
            $table->decimal('total_deductions', 12, 2)->default(0.00);
            $table->decimal('tax_deduction', 12, 2)->default(0.00);
            $table->decimal('net_salary', 12, 2);
            $table->string('status', 30)->default('DRAFT'); // DRAFT, APPROVED, PAID, CANCELLED
            $table->string('payment_method', 30)->default('BANK_TRANSFER');
            $table->dateTime('paid_at')->nullable();
            $table->foreignUuid('journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
            $table->string('remarks', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'payslip_number']);
            $table->unique(['tenant_id', 'user_id', 'salary_month']);
            $table->index(['tenant_id', 'salary_month']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payrolls');
        Schema::dropIfExists('salary_structures');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('staff_attendances');
        Schema::dropIfExists('staff_rosters');
        Schema::dropIfExists('shift_templates');
    }
};
