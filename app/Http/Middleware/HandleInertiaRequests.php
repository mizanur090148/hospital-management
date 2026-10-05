<?php

namespace App\Http\Middleware;

use App\Core\Tenancy\TenantContext;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var TenantContext $context */
        $context = app(TenantContext::class);
        $user = $request->user();

        return [
            ...parent::share($request),
            'app' => [
                'name' => config('app.name', 'ApexCare HMS'),
                'env' => config('app.env'),
            ],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'user_type' => $user->user_type?->value ?? 'staff',
                    'user_type_label' => $user->user_type?->label() ?? 'Staff',
                    'status' => $user->status?->value ?? 'active',
                    'roles' => $user->roles->pluck('slug'),
                    'permissions' => $user->getAllPermissions()->pluck('slug'),
                    'has_2fa' => $user->two_factor_confirmed_at !== null,
                ] : null,
            ],
            'tenantContext' => [
                'tenant' => $context->getTenant() ? [
                    'id' => $context->getTenant()->id,
                    'slug' => $context->getTenant()->slug,
                    'trade_name' => $context->getTenant()->trade_name,
                    'legal_name' => $context->getTenant()->legal_name,
                    'status' => $context->getTenant()->status->value,
                    'plan' => $context->getTenant()->plan,
                ] : null,
                'branch' => $context->getBranch() ? [
                    'id' => $context->getBranch()->id,
                    'code' => $context->getBranch()->code,
                    'name' => $context->getBranch()->name,
                    'is_main' => $context->getBranch()->is_main,
                ] : null,
                'branches' => $context->getTenant()
                    ? $context->getTenant()->branches()->where('is_active', true)->select('id', 'code', 'name', 'is_main')->get()
                    : [],
                'isPlatformMode' => $context->isPlatformMode(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
        ];
    }
}
