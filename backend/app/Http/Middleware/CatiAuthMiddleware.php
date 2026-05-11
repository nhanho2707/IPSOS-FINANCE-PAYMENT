<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class CatiAuthMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if(!$token){
            return response()->json([
                'status_code' => 401,
                'error' => 'Unauthorized!'
            ]);
        }

        $loginInfo = Cache::get("cati_token_$token");
        
        if(!$loginInfo){
            return response()->json([
                'status_code' => 401,
                'error' => 'Invalid or expired token!'
            ]);
        }

        $request->attributes->set('auth', $loginInfo);

        return $next($request);
    }
}
