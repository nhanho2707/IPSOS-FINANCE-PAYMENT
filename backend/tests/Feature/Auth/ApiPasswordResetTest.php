<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class ApiPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_does_not_change_password_without_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
            'password' => 'hijacked123',
            'password_confirmation' => 'hijacked123',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_forgot_password_response_is_the_same_for_unknown_email(): void
    {
        Notification::fake();

        $known = User::factory()->create();

        $knownResponse = $this->postJson('/api/forgot-password', ['email' => $known->email]);
        $unknownResponse = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com']);

        $knownResponse->assertOk();
        $unknownResponse->assertOk();
        $this->assertSame($knownResponse->json(), $unknownResponse->json());
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        $user = User::factory()->create(['must_change_password' => true]);
        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertOk();
        $user->refresh();
        $this->assertTrue(Hash::check('new-password', $user->password));
        $this->assertFalse($user->must_change_password);
    }

    public function test_password_cannot_be_reset_with_invalid_token(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/reset-password', [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertStatus(422);
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }
}
