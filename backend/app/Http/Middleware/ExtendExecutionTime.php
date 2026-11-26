<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * On Windows (the XAMPP servers) max_execution_time counts wall-clock time, including the wait for
 * Vinnet, GotIt and the database. A gift goes through several provider calls in one request, so the
 * default 30 seconds can stop PHP halfway: cards paid, the transaction never recorded, and the
 * respondent's send lock left in place. Routes that call providers or import files get more time;
 * each provider call still has its own cURL timeout.
 */
class ExtendExecutionTime
{
    public function handle(Request $request, Closure $next, string $seconds = '180'): Response
    {
        set_time_limit((int) $seconds);

        return $next($request);
    }
}
