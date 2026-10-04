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
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug', 64)->unique();
            $table->string('legal_name', 255);
            $table->string('trade_name', 255);
            $table->string('domain', 255)->nullable()->unique();
            $table->string('status', 32)->default('active'); // active, suspended, trial, cancelled
            $table->string('plan', 32)->default('enterprise'); // starter, pro, enterprise
            $table->jsonb('settings')->default('{}');
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });

        Schema::create('branches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('code', 32);
            $table->string('name', 255);
            $table->string('phone', 32)->nullable();
            $table->string('email', 255)->nullable();
            $table->jsonb('address')->default('{}');
            $table->boolean('is_main')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('branches');
        Schema::dropIfExists('tenants');
    }
};
