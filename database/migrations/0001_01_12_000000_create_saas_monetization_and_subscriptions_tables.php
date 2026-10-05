<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. SaaS Plans Table
        Schema::create('saas_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100);
            $table->string('slug', 50)->unique();
            $table->unsignedSmallInteger('tier_level')->default(1);
            $table->text('description')->nullable();
            $table->decimal('monthly_price', 10, 2)->default(0.00);
            $table->decimal('annual_price', 10, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->unsignedInteger('trial_days')->default(14);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_popular')->default(false);
            $table->jsonb('limits')->default('{}');
            $table->jsonb('features')->default('[]');
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. SaaS Subscriptions Table
        Schema::create('saas_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('plan_id')->constrained('saas_plans')->restrictOnDelete();
            $table->string('subscription_number', 50)->index();
            $table->string('billing_cycle', 20)->default('MONTHLY');
            $table->decimal('price', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('status', 30)->default('ACTIVE')->index();
            $table->timestamp('starts_at');
            $table->timestamp('current_period_starts_at');
            $table->timestamp('current_period_ends_at')->index();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('grace_period_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason', 255)->nullable();
            $table->string('payment_method', 50)->default('CREDIT_CARD');
            $table->jsonb('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'subscription_number']);
            $table->index(['tenant_id', 'status']);
        });

        // 3. SaaS Subscription Invoices Table
        Schema::create('saas_subscription_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('subscription_id')->constrained('saas_subscriptions')->cascadeOnDelete();
            $table->string('invoice_number', 50)->index();
            $table->string('billing_reason', 50)->default('SUBSCRIPTION_CYCLE');
            $table->decimal('subtotal', 10, 2)->default(0.00);
            $table->decimal('tax_amount', 10, 2)->default(0.00);
            $table->decimal('discount_amount', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->string('status', 30)->default('PENDING')->index();
            $table->date('due_date');
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_reference', 100)->nullable();
            $table->jsonb('line_items')->default('[]');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'invoice_number']);
            $table->index(['tenant_id', 'status']);
        });

        // 4. SaaS Tenant Usages Table (Monthly and Realtime tracking)
        Schema::create('saas_tenant_usages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('metric', 50);
            $table->bigInteger('current_usage')->default(0);
            $table->bigInteger('quota_limit')->nullable();
            $table->string('period_month', 7)->index();
            $table->timestamp('last_calculated_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'metric', 'period_month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saas_tenant_usages');
        Schema::dropIfExists('saas_subscription_invoices');
        Schema::dropIfExists('saas_subscriptions');
        Schema::dropIfExists('saas_plans');
    }
};
