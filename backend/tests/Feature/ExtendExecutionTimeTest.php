<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ExtendExecutionTimeTest extends TestCase
{
    protected function tearDown(): void
    {
        // PHPUnit runs without a time limit; do not leave one behind for the rest of the suite.
        set_time_limit(0);

        parent::tearDown();
    }

    public function test_the_middleware_raises_the_time_limit_for_the_request(): void
    {
        Route::post('/_test/time-limit', fn () => response()->json(['limit' => (int) ini_get('max_execution_time')]))
            ->middleware('extendExecutionTime');
        Route::post('/_test/time-limit-120', fn () => response()->json(['limit' => (int) ini_get('max_execution_time')]))
            ->middleware('extendExecutionTime:120');

        $this->postJson('/_test/time-limit')->assertOk()->assertJsonPath('limit', 180);
        $this->postJson('/_test/time-limit-120')->assertOk()->assertJsonPath('limit', 120);
    }

    public function test_routes_that_call_providers_or_import_files_get_the_longer_limit(): void
    {
        $expected = [
            'POST api/project-management/vinnet/transaction',
            'POST api/project-management/vinnet/check-transaction',
            'POST api/project-management/gotit/transaction',
            'POST api/project-management/gotit/check-transaction',
            'GET api/transaction-management/vinnet/merchantinfo',
            'POST api/transaction-management/vinnet/change-key',
            'POST api/project-management/projects/{projectId}/offline/respondents/store',
            'POST api/project-management/projects/{projectId}/provinces/prices/import',
            'POST api/project-management/projects/{projectId}/mini-cati/batch/import',
            'POST api/trade-union/recipient-lists/import',
            'POST api/trade-union/recipient-lists/{id}/send-email',
        ];

        foreach ($expected as $route) {
            [$method, $uri] = explode(' ', $route);
            $match = collect(Route::getRoutes()->getRoutes())
                ->first(fn ($r) => $r->uri() === $uri && in_array($method, $r->methods(), true));

            $this->assertNotNull($match, "{$route} is not registered");
            $this->assertContains('extendExecutionTime', $match->gatherMiddleware(), "{$route} keeps PHP's 30 second limit");
        }
    }
}
