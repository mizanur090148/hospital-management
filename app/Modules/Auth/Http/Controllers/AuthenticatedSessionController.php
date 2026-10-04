<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Core\Enums\AuditAction;
use App\Core\Enums\UserStatus;
use App\Core\Enums\UserType;
use App\Core\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use App\Modules\Audit\Models\AuditLog;
use App\Modules\Audit\Models\LoginHistory;
use App\Modules\Auth\Models\User;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(Request $request, TenantContext $context): Response
    {
        $tenants = Tenant::where('status', 'active')
            ->select('id', 'slug', 'trade_name', 'legal_name')
            ->get();

        return Inertia::render('Auth/Login', [
            'status' => session('status'),
            'currentTenant' => $context->getTenant(),
            'availableTenants' => $tenants,
        ]);
    }

    public function store(Request $request, TenantContext $context): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['boolean'],
            'tenant_slug' => ['nullable', 'string'],
        ]);

        $email = Str::lower($request->input('email'));
        $throttleKey = Str::transliterate($email.'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => trans('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => ceil($seconds / 60),
                ]),
            ]);
        }

        // If tenant_slug passed explicitly, resolve and bind
        if ($tenantSlug = $request->input('tenant_slug')) {
            $tenant = Tenant::where('slug', $tenantSlug)->first();
            if ($tenant) {
                $context->setTenant($tenant);
                session(['active_tenant_id' => $tenant->id]);
            }
        }

        // Find user: scoped to tenant if tenant active, or check superadmin
        $query = User::withoutGlobalScopes()->where('email', $email);
        if ($context->getTenantId()) {
            $query->where(function ($q) use ($context) {
                $q->where('tenant_id', $context->getTenantId())
                    ->orWhere('user_type', UserType::SuperAdmin->value);
            });
        }
        $user = $query->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            RateLimiter::hit($throttleKey);

            LoginHistory::create([
                'tenant_id' => $context->getTenantId(),
                'user_id' => $user?->id,
                'email' => $email,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'status' => 'failed',
                'failure_reason' => $user ? 'Invalid password' : 'User not found in tenant',
                'created_at' => now(),
            ]);

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        // Check if locked
        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'email' => 'Your account is temporarily locked due to multiple failed login attempts.',
            ]);
        }

        // Check status
        if ($user->status !== UserStatus::Active) {
            throw ValidationException::withMessages([
                'email' => 'Your account is currently inactive or suspended. Please contact your hospital administrator.',
            ]);
        }

        RateLimiter::clear($throttleKey);

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        // Update login stats
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);

        // If user belongs to a tenant and context had none, set session
        if ($user->tenant_id) {
            session(['active_tenant_id' => $user->tenant_id]);
            if ($user->branch_id) {
                session(['active_branch_id' => $user->branch_id]);
            }
        }

        LoginHistory::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'email' => $email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'status' => 'success',
            'created_at' => now(),
        ]);

        AuditLog::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'action' => AuditAction::Login,
            'entity_type' => User::class,
            'entity_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user) {
            AuditLog::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'action' => AuditAction::Logout,
                'entity_type' => User::class,
                'entity_id' => $user->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
            ]);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
