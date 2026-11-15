<?php

namespace Tests\Feature;

use App\Services\VinnetService;
use Illuminate\Support\Facades\Log;
use Mockery;
use Tests\TestCase;

class VinnetRetryTest extends TestCase
{
    private $server = null;

    protected function tearDown(): void
    {
        if ($this->server) {
            proc_terminate($this->server);
            proc_close($this->server);
        }

        parent::tearDown();
    }

    private function callVinnet(string $url): void
    {
        $method = new \ReflectionMethod(VinnetService::class, 'post_vinnet_request');
        $method->invoke(new VinnetService(), $url, null, ['reqUuid' => 'test']);
    }

    public function test_a_request_that_never_reached_vinnet_is_retried_once(): void
    {
        Log::spy();

        try {
            $this->callVinnet('http://127.0.0.1:1/payservice');
            $this->fail('Expected the request to fail');
        } catch (\Exception) {
        }

        Log::shouldHaveReceived('error')->with(Mockery::pattern('/^cURL error \(attempt 1, .*request sent: no\)/'))->once();
        Log::shouldHaveReceived('error')->with(Mockery::pattern('/^cURL error \(attempt 2, /'))->once();
    }

    public function test_a_request_vinnet_received_is_not_sent_again(): void
    {
        $router = tempnam(sys_get_temp_dir(), 'vinnet') . '.php';
        file_put_contents($router, '<?php http_response_code(500); echo "error";');
        $port = 18000 + random_int(0, 999);
        $this->server = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$port}", $router], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        for ($i = 0; $i < 50 && !@fsockopen('127.0.0.1', $port); $i++) {
            usleep(100_000);
        }

        Log::spy();

        try {
            $this->callVinnet("http://127.0.0.1:{$port}/payservice");
            $this->fail('Expected the request to fail');
        } catch (\Exception $e) {
            $this->assertStringContainsString('HTTP code 500', $e->getMessage());
        }

        Log::shouldHaveReceived('error')->with(Mockery::pattern('/^POST attempt 1 failed/'))->once();
        Log::shouldNotHaveReceived('warning');
    }
}
