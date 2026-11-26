<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\VinnetService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VinnetMerchantKeyTest extends TestCase
{
    private string $envDir;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('password');
            $table->boolean('is_active')->default(true);
            $table->boolean('must_change_password')->default(false);
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });
        Schema::create('user_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id');
            $table->foreignId('role_id');
            $table->timestamps();
        });

        DB::table('roles')->insert(['id' => 1, 'name' => 'Admin']);
        $user = User::create(['name' => 'Nhan Ho', 'email' => 'admin@example.com', 'password' => 'not-used']);
        DB::table('user_details')->insert(['user_id' => $user->id, 'role_id' => 1]);
        Sanctum::actingAs($user);

        // ENVObject reads the merchant settings from base_path('.env'); point it at a throwaway copy.
        $this->envDir = sys_get_temp_dir() . '/vinnet-env-' . uniqid();
        mkdir($this->envDir);
        file_put_contents($this->envDir . '/.env', implode("\n", [
            'VINNET_ENV=staging',
            'VINNET_URL_STAGING="https://vinnet.example"',
            'VINNET_MERCHANT_CODE_STAGING="IPSOS01"',
            'VINNET_MERCHANT_KEY_STAGING="a1b2c3d4e5f6g7h8"',
            'GOTIT_ENV=staging',
            'GOTIT_URL_STAGING=',
            'GOTIT_API_KEY_STAGING=',
            'GOTIT_TRANSACTIONREFID_PREFIX_STAGING=',
            'CMC_TELECOM_ENV=staging',
            'CMC_TELECOM_URL_STAGING=',
            'CMC_TELECOM_USERNAME_STAGING=',
            'CMC_TELECOM_PASS_STAGING=',
        ]) . "\n");
        $this->app->setBasePath($this->envDir);
    }

    protected function tearDown(): void
    {
        @unlink($this->envDir . '/.env');
        @rmdir($this->envDir);

        parent::tearDown();
    }

    public function test_the_merchant_key_is_shown_masked(): void
    {
        $this->getJson('/api/transaction-management/vinnet/merchant/view')
            ->assertOk()
            ->assertJson(['data' => [
                'VINNET_MERCHANT_CODE' => 'IPSOS01',
                'VINNET_MERCHANT_KEY' => '********g7h8',
            ]]);
    }

    public function test_a_refused_key_change_is_reported_and_keeps_the_old_key(): void
    {
        $this->mock(VinnetService::class, fn ($mock) => $mock->shouldReceive('change_merchant_key')
            ->once()
            ->andThrow(new \Exception('Vinnet refused the key change: Sai chữ ký')));

        $this->postJson('/api/transaction-management/vinnet/change-key')
            ->assertStatus(400)
            ->assertJson(['message' => 'Changing the merchant key failed: Vinnet refused the key change: Sai chữ ký']);

        $this->assertStringContainsString('VINNET_MERCHANT_KEY_STAGING="a1b2c3d4e5f6g7h8"', file_get_contents($this->envDir . '/.env'));
    }
}
