<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class LoginTokenExpiryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            'sanctum.expiration' => 480,
        ]);
        DB::purge('sqlite');

        // The real migrations reuse index names, which SQLite rejects, so build only what login touches.
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->boolean('must_change_password')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('user_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->unsignedBigInteger('role_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->timestamps();
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        User::create([
            'name' => 'Nhan Ho',
            'email' => 'nhan.ho@example.com',
            'password' => 'secret123',
        ]);
    }

    public function test_login_stores_and_returns_the_token_expiry(): void
    {
        $this->freezeTime();

        $response = $this->postJson('/api/login', ['email' => 'nhan.ho@example.com', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('expires_in', 480 * 60)
            ->assertJsonPath('expires_at', now()->addMinutes(480)->toIso8601String());

        $token = PersonalAccessToken::findToken($response->json('token'));
        $this->assertNotNull($token);
        $this->assertSame(now()->addMinutes(480)->toIso8601String(), $token->expires_at->toIso8601String());
    }

    public function test_token_is_refused_once_it_expires(): void
    {
        $login = fn () => $this->postJson('/api/login', ['email' => 'nhan.ho@example.com', 'password' => 'secret123'])
            ->assertOk()
            ->json('token');
        $stillValid = $login();
        $expired = $login();

        $this->travel(479)->minutes();
        $this->asTokenOnlyClient();
        $this->withToken($stillValid)->postJson('/api/logout')->assertOk();

        $this->travel(2)->minutes();
        $this->asTokenOnlyClient();
        $this->withToken($expired)->postJson('/api/logout')->assertUnauthorized();
    }

    private function asTokenOnlyClient(): void
    {
        // Logging in also starts a web session, which Sanctum would accept instead of the token.
        $this->flushSession();
        $this->app['auth']->forgetGuards();
    }

    public function test_no_expiry_is_returned_when_tokens_never_expire(): void
    {
        config(['sanctum.expiration' => null]);

        $response = $this->postJson('/api/login', ['email' => 'nhan.ho@example.com', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('expires_at', null)
            ->assertJsonPath('expires_in', null);

        $this->assertNull(PersonalAccessToken::findToken($response->json('token'))->expires_at);
    }
}
