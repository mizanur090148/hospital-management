<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 7: Billing, Insurance Claims & Double-Entry Accounting.
     */
    public function up(): void
    {
        // 1. Chart of Accounts (COA)
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->string('account_type', 50); // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
            $table->uuid('parent_id')->nullable()->index();
            $table->string('description', 255)->nullable();
            $table->boolean('is_system')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'account_type']);
        });

        // 2. Journal Entries (General Ledger Header)
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('entry_number', 50);
            $table->date('posting_date');
            $table->string('reference_type', 100)->nullable(); // Invoice, Payment, InsuranceClaim, ManualJournal
            $table->uuid('reference_id')->nullable();
            $table->text('description');
            $table->foreignUuid('posted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_posted')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'entry_number']);
            $table->index(['tenant_id', 'posting_date']);
        });

        // 3. Journal Entry Line Items (Balanced Debit / Credit debits == credits)
        Schema::create('journal_entry_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('journal_entry_id')->constrained('journal_entries')->cascadeOnDelete();
            $table->foreignUuid('account_id')->constrained('chart_of_accounts')->restrictOnDelete();
            $table->string('entry_type', 20); // DEBIT, CREDIT
            $table->decimal('amount', 14, 2);
            $table->string('narration', 255)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'account_id']);
            $table->index(['tenant_id', 'journal_entry_id']);
        });

        // 4. Insurance Providers & Third-Party Administrators (TPA)
        Schema::create('insurance_providers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name', 200);
            $table->string('code', 50);
            $table->string('contact_person', 150)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('phone', 50)->nullable();
            $table->jsonb('address')->nullable();
            $table->string('tax_id', 80)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
        });

        // 5. Patient Insurance Policies
        Schema::create('insurance_policies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignUuid('insurance_provider_id')->constrained('insurance_providers')->restrictOnDelete();
            $table->string('policy_number', 100);
            $table->string('group_number', 100)->nullable();
            $table->decimal('coverage_percentage', 5, 2)->default(80.00); // 80% covered by insurer
            $table->decimal('copay_amount', 10, 2)->default(0.00);
            $table->decimal('annual_limit', 12, 2)->default(50000.00);
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'patient_id', 'insurance_provider_id', 'policy_number']);
        });

        // 6. Invoices (Central Hospital Charge Capture)
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->string('invoice_number', 50);
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('insurance_covered_amount', 12, 2)->default(0.00);
            $table->decimal('patient_payable_amount', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->decimal('paid_amount', 12, 2)->default(0.00);
            $table->string('status', 50)->default('ISSUED'); // DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED, REFUNDED
            $table->foreignUuid('insurance_policy_id')->nullable()->constrained('insurance_policies')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'invoice_number']);
            $table->index(['tenant_id', 'patient_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'invoice_date']);
        });

        // 7. Invoice Line Items (Breakdown by Clinical Module / Department)
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('item_type', 50); // OPD_CONSULTATION, IPD_BED_CHARGES, EMERGENCY_FEE, LAB_TEST, RADIOLOGY_SCAN, OT_SURGERY, PHARMACY_DISPENSE, GENERAL_SERVICE
            $table->uuid('item_reference_id')->nullable();
            $table->string('description', 255);
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();

            $table->index(['tenant_id', 'invoice_id']);
        });

        // 8. Cashier Payments & Settlements
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('receipt_number', 50);
            $table->string('payment_method', 50); // CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, MOBILE_MONEY, INSURANCE_DIRECT
            $table->decimal('amount', 12, 2);
            $table->string('transaction_reference', 100)->nullable();
            $table->timestamp('payment_date');
            $table->foreignUuid('received_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'receipt_number']);
            $table->index(['tenant_id', 'invoice_id']);
            $table->index(['tenant_id', 'payment_date']);
        });

        // 9. Insurance Claims Adjudication Ledger
        Schema::create('insurance_claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('claim_number', 50);
            $table->foreignUuid('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignUuid('insurance_provider_id')->constrained('insurance_providers')->restrictOnDelete();
            $table->foreignUuid('insurance_policy_id')->constrained('insurance_policies')->restrictOnDelete();
            $table->foreignUuid('patient_id')->constrained('patients')->restrictOnDelete();
            $table->string('pre_auth_code', 100)->nullable();
            $table->decimal('claimed_amount', 12, 2);
            $table->decimal('approved_amount', 12, 2)->default(0.00);
            $table->decimal('disallowed_amount', 12, 2)->default(0.00);
            $table->string('status', 50)->default('SUBMITTED'); // SUBMITTED, IN_REVIEW, APPROVED, PARTIALLY_APPROVED, REJECTED, SETTLED
            $table->timestamp('submitted_at');
            $table->timestamp('adjudicated_at')->nullable();
            $table->text('adjudication_notes')->nullable();
            $table->foreignUuid('adjudicated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'claim_number']);
            $table->index(['tenant_id', 'insurance_provider_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('insurance_claims');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('insurance_policies');
        Schema::dropIfExists('insurance_providers');
        Schema::dropIfExists('journal_entry_items');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('chart_of_accounts');
    }
};
