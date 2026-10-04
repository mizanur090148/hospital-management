<?php

namespace App\Core\RBAC\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if (! $user->hasPermission($permission)) {
            abort(403, "You do not have the required permission [{$permission}] to perform this action.");
        }

        return $next($request);
    }
}
