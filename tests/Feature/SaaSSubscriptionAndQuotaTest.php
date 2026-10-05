<?php

namespace Tests\Feature;

use App\Core\Enums\BedStatus;
use App\Core\Enums\TenantStatus;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Modules\Auth\Models\User;
use App\Modules\Facility\Models\Bed;
use App\Modules\Facility\Models\Department;
use App\Modules\Facility\Models\Room;
use App\Modules\Facility\Models\Ward;
use App\Modules\SaaS\Enums\BillingCycle;
use App\Modules\SaaS\Enums\SubscriptionInvoiceStatus;
use App\Modules\SaaS\Enums\SubscriptionStatus;
use App\Modules\SaaS\Exceptions\FeatureNotIncludedException;
use App\Modules\SaaS\Exceptions\SubscriptionLimitExceededException;
use App\Modules\SaaS\Models\Plan;
use App\Modules\SaaS\Models\Subscription;
use App\Modules\SaaS\Models\SubscriptionInvoice;
use App\Modules\SaaS\Services\PlanCatalogService;
use App\Modules\SaaS\Services\SubscriptionBillingService;
use App\Modules\SaaS\Services\TenantQuotaEnforcementService;
use App\Modules\Tenancy\Models\Branch;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SaaSSubscriptionAndQuotaTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Branch $branch;

    protected User $user;

    protected Department $department;

    protected Ward $ward;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Tenant
        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'apex-health',
            'legal_name' => 'Apex Health Systems Inc.',
            'trade_name' => 'ApexCare Hospital',
            'status' => TenantStatus::Active,
            'plan' => 'starter',
        ]);

        // 2. Create Branch
        $this->branch = Branch::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'code' => 'MAIN',
            'name' => 'Main Medical Campus',
            'is_main' => true,
        ]);

        // 3. Create Admin User
        $this->user = User::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'name' => 'Dr. Eleanor Vance',
            'email' => 'eleanor@apexcare.org',
            'password' => bcrypt('password123'),
            'user_type' => UserType::HospitalAdmin,
            'status' => UserStatus::Active,
            'is_active' => true,
        ]);

        // 4. Create Department and Ward
        $this->department = Department::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'code' => 'CARD',
            'name' => 'Cardiology',
        ]);

        $this->ward = Ward::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'branch_id' => $this->branch->id,
            'department_id' => $this->department->id,
            'code' => 'WARD-A',
            'name' => 'General Ward A',
            'gender' => 'MIXED',
            'total_beds' => 20,
        ]);
    }

    /**
     * 1. Plan catalog seeding and retrieval.
     */
    public function test_plan_catalog_seeding_and_retrieval(): void
    {
        $catalog = app(PlanCatalogService::class);
        $plans = $catalog->seedDefaultPlans();

        $this->assertCount(3, $plans);

        $starter = $catalog->getPlanBySlug('starter');
        $this->assertNotNull($starter);
        $this->assertEquals(1, $starter->tier_level);
        $this->assertEquals(20, $starter->getLimit('max_beds'));
        $this->assertEquals(5, $starter->getLimit('max_doctors'));
        $this->assertFalse($starter->hasFeature('ai_scribe_enabled'));

        $pro = $catalog->getPlanBySlug('professional');
        $this->assertNotNull($pro);
        $this->assertEquals(2, $pro->tier_level);
        $this->assertEquals(100, $pro->getLimit('max_beds'));
        $this->assertTrue($pro->hasFeature('ai_scribe_enabled'));
    }

    /**
     * 2. Tenant subscription creation and cycle pricing.
     */
    public function test_tenant_subscription_creation_and_cycle_pricing(): void
    {
        $catalog = app(PlanCatalogService::class);
        $catalog->seedDefaultPlans();
        $billing = app(SubscriptionBillingService::class);

        $proPlan = $catalog->getPlanBySlug('professional');

        // Subscribe Annual
        $subscription = $billing->subscribe(
            tenant: $this->tenant,
            plan: $proPlan,
            cycle: BillingCycle::Annual,
            paymentMethod: 'CREDIT_CARD'
        );

        $this->assertInstanceOf(Subscription::class, $subscription);
        $this->assertStringStartsWith('SUB-', $subscription->subscription_number);
        $this->assertEquals(SubscriptionStatus::Active, $subscription->status);
        $this->assertEquals(BillingCycle::Annual, $subscription->billing_cycle);
        $this->assertEquals((float) $proPlan->annual_price, (float) $subscription->price);
        $this->assertTrue($subscription->isValid());

        // Assert invoice generated
        $invoice = SubscriptionInvoice::where('subscription_id', $subscription->id)->first();
        $this->assertNotNull($invoice);
        $this->assertStringStartsWith('SINV-', $invoice->invoice_number);
        $this->assertEquals(SubscriptionInvoiceStatus::Paid, $invoice->status);
        $this->assertEquals((float) $proPlan->annual_price, (float) $invoice->total_amount);
    }

    /**
     * 3. Tenant quota enforcement blocks exceeding resource limits.
     */
    public function test_tenant_quota_enforcement_blocks_exceeding_capacity(): void
    {
        $catalog = app(PlanCatalogService::class);
        $catalog->seedDefaultPlans();
        $quota = app(TenantQuotaEnforcementService::class);

        $starterPlan = $catalog->getPlanBySlug('starter'); // max_beds: 20

        // Create Room
        $room = Room::create([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'ward_id' => $this->ward->id,
            'room_number' => 'R-101',
            'room_type' => 'standard',
        ]);

        // Create 20 beds (reaching capacity limit)
        for ($i = 1; $i <= 20; $i++) {
            Bed::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $this->tenant->id,
                'room_id' => $room->id,
                'bed_number' => "B-{$i}",
                'bed_type' => 'standard',
                'status' => BedStatus::Available,
            ]);
        }

        $this->assertEquals(20, $quota->getCurrentUsage($this->tenant, 'max_beds'));

        // Asserting 21st bed creation should throw SubscriptionLimitExceededException
        $this->expectException(SubscriptionLimitExceededException::class);
        $quota->assertCanCreateResource($this->tenant, 'beds', 1);
    }

    /**
     * 4. Feature gating blocks unauthorized tier features.
     */
    public function test_tenant_feature_gating_blocks_unauthorized_features(): void
    {
        $catalog = app(PlanCatalogService::class);
        $catalog->seedDefaultPlans();
        $quota = app(TenantQuotaEnforcementService::class);

        // Tenant is on Starter plan (ai_scribe_enabled is false)
        $this->assertFalse($quota->hasFeature($this->tenant, 'ai_scribe_enabled'));

        $this->expectException(FeatureNotIncludedException::class);
        $quota->assertFeatureEnabled($this->tenant, 'ai_scribe_enabled');
    }

    /**
     * 5. Mid-cycle plan upgrade with accurate financial proration.
     */
    public function test_subscription_mid_cycle_upgrade_with_accurate_proration(): void
    {
        $catalog = app(PlanCatalogService::class);
        $catalog->seedDefaultPlans();
        $billing = app(SubscriptionBillingService::class);

        $starter = $catalog->getPlanBySlug('starter'); // $199
        $pro = $catalog->getPlanBySlug('professional'); // $599

        // 1. Initial subscription
        $subscription = $billing->subscribe($this->tenant, $starter, BillingCycle::Monthly);

        // 2. Simulate 15 days consumed out of 30 days
        $subscription->update([
            'current_period_starts_at' => now()->subDays(15),
            'current_period_ends_at' => now()->addDays(15),
        ]);

        // 3. Upgrade to Professional
        $upgradeResult = $billing->changePlan($subscription, $pro, BillingCycle::Monthly);

        $this->assertArrayHasKey('proration', $upgradeResult);
        $proration = $upgradeResult['proration'];

        // With 15 days remaining out of 30, unused credit should be approx ~ $99.50
        $this->assertGreaterThan(90.0, $proration['unused_credit']);
        $this->assertLessThan(110.0, $proration['unused_credit']);

        // Net payable should be $599 - unusedCredit
        $this->assertGreaterThan(480.0, $proration['net_payable']);
        $this->assertLessThan(510.0, $proration['net_payable']);

        // Assert invoice generated for upgrade
        $upgradeInvoice = $upgradeResult['invoice'];
        $this->assertEquals('PLAN_UPGRADE', $upgradeInvoice->billing_reason);
        $this->assertEquals($proration['net_payable'], (float) $upgradeInvoice->total_amount);

        // Assert subscription updated to Professional
        $this->assertEquals($pro->id, $subscription->fresh()->plan_id);
    }

    /**
     * 6. Subscription invoice settlement and state transition.
     */
    public function test_subscription_invoice_payment_settlement(): void
    {
        $catalog = app(PlanCatalogService::class);
        $catalog->seedDefaultPlans();
        $billing = app(SubscriptionBillingService::class);

        $pro = $catalog->getPlanBySlug('professional');
        $subscription = $billing->subscribe($this->tenant, $pro, BillingCycle::Monthly);

        // Create a pending renewal invoice
        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $this->tenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'SINV-2026-999999',
            'billing_reason' => 'SUBSCRIPTION_CYCLE',
            'subtotal' => 599.00,
            'discount_amount' => 0.00,
            'tax_amount' => 0.00,
            'total_amount' => 599.00,
            'currency' => 'USD',
            'status' => SubscriptionInvoiceStatus::Pending,
            'due_date' => now()->toDateString(),
            'line_items' => [['description' => 'Renewal', 'amount' => 599.00]],
        ]);

        $this->assertFalse($invoice->isPaid());

        // Process payment
        $paid = $billing->processInvoicePayment($invoice, 'TXN-CONFIRM-8899');

        $this->assertTrue($paid->isPaid());
        $this->assertEquals('TXN-CONFIRM-8899', $paid->payment_reference);
        $this->assertNotNull($paid->paid_at);
        $this->assertEquals(SubscriptionStatus::Active, $subscription->fresh()->status);
    }

    /**
     * 7. Grace period and past-due suspension lifecycle.
     */
    public function test_grace_period_and_past_due_suspension_lifecycle(): void
    {
        $catalog = app(PlanCatalogService::class);
        $catalog->seedDefaultPlans();
        $billing = app(SubscriptionBillingService::class);

        $starter = $catalog->getPlanBySlug('starter');
        $subscription = $billing->subscribe($this->tenant, $starter, BillingCycle::Monthly);

        // Expire subscription
        $subscription->update([
            'current_period_ends_at' => now()->subDay(),
        ]);

        // Evaluate grace period -> Should transition to PAST_DUE
        $eval1 = $billing->evaluateTenantGracePeriods();
        $this->assertEquals(1, $eval1['past_due_count']);
        $this->assertEquals(SubscriptionStatus::PastDue, $subscription->fresh()->status);
        $this->assertNotNull($subscription->fresh()->grace_period_ends_at);

        // Expire grace period
        $subscription->update([
            'grace_period_ends_at' => now()->subDay(),
        ]);

        // Evaluate again -> Should transition to SUSPENDED and suspend tenant
        $eval2 = $billing->evaluateTenantGracePeriods();
        $this->assertEquals(1, $eval2['suspended_count']);
        $this->assertEquals(SubscriptionStatus::Suspended, $subscription->fresh()->status);
        $this->assertEquals(TenantStatus::Suspended, $this->tenant->fresh()->status);
    }

    /**
     * 8. SaaS Web Controllers and Inertia routes.
     */
    public function test_saas_web_routes_and_views(): void
    {
        $catalog = app(PlanCatalogService::class);
        $catalog->seedDefaultPlans();

        // Tenant Subscription Portal
        $response = $this->actingAs($this->user)
            ->get('/saas/subscription');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('SaaS/SubscriptionPortal')
            ->has('usageOverview')
            ->has('availablePlans')
            ->has('invoices')
        );

        // SuperAdmin SaaS Cockpit
        $adminResponse = $this->actingAs($this->user)
            ->get('/saas/admin/cockpit');

        $adminResponse->assertStatus(200);
        $adminResponse->assertInertia(fn ($page) => $page
            ->component('SaaS/SuperAdminSaaSCockpit')
            ->has('metrics')
            ->has('plans')
            ->has('recentInvoices')
        );
    }
}
