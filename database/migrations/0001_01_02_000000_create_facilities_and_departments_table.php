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
        // 1. Departments Table
        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('code', 32);
            $table->string('name', 255);
            $table->string('department_type', 32)->default('clinical'); // clinical, diagnostic, administrative, support
            $table->text('description')->nullable();
            $table->foreignUuid('head_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'branch_id', 'code']);
            $table->index(['tenant_id', 'department_type', 'is_active']);
        });

        // 2. Add department_id to Users Table
        Schema::table('users', function (Blueprint $table) {
            $table->foreignUuid('department_id')->nullable()->after('branch_id')->constrained('departments')->nullOnDelete();
        });

        // 3. Wards Table
        Schema::create('wards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignUuid('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('code', 32);
            $table->string('name', 255);
            $table->string('ward_type', 32)->default('general'); // general, semi_private, private, icu, nicu, ccu, emergency, recovery
            $table->string('gender_allowed', 16)->default('any'); // any, male, female
            $table->string('floor', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'branch_id', 'code']);
            $table->index(['tenant_id', 'branch_id', 'is_active']);
        });

        // 4. Rooms Table
        Schema::create('rooms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('ward_id')->constrained('wards')->cascadeOnDelete();
            $table->string('room_number', 32);
            $table->string('room_type', 32)->default('standard'); // standard, deluxe, vip, isolation, icu
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['ward_id', 'room_number']);
            $table->index(['tenant_id', 'is_active']);
        });

        // 5. Beds Table
        Schema::create('beds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('room_id')->constrained('rooms')->cascadeOnDelete();
            $table->string('bed_number', 32);
            $table->string('bed_type', 32)->default('standard'); // standard, electric, fowler, icu_ventilated, crib
            $table->decimal('daily_rate', 15, 2)->default(0.00);
            $table->string('status', 32)->default('available'); // available, occupied, reserved, cleaning, maintenance
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['room_id', 'bed_number']);
            $table->index(['tenant_id', 'status', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('beds');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('wards');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn('department_id');
        });

        Schema::dropIfExists('departments');
    }
};
