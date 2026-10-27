<?php

namespace Tests\Feature;

use App\Models\AccountAuditLog;
use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountManagementTest extends TestCase
{
    use RefreshDatabase;

    private Department $department;
    private Role $adminRole;
    private Role $financeRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::create(['name' => 'IT', 'title' => 'IT']);
        $this->adminRole = Role::create(['name' => 'Admin', 'department_id' => $this->department->id]);
        $this->financeRole = Role::create(['name' => 'Finance', 'department_id' => $this->department->id]);
    }

    private function makeUser(Role $role, array $attributes = [], string $firstName = 'Test'): User
    {
        $user = User::factory()->create($attributes);
        $user->userDetails()->create([
            'first_name' => $firstName,
            'last_name' => 'User',
            'role_id' => $role->id,
            'department_id' => $this->department->id,
        ]);

        return $user;
    }

    private function loginAsGuest(string $email)
    {
        // Sanctum::actingAs switches the default guard; login needs the session guard back.
        $this->app['auth']->forgetGuards();
        $this->app['auth']->shouldUse('web');

        return $this->postJson('/api/login', ['email' => $email, 'password' => 'password']);
    }

    public function test_non_admin_cannot_manage_accounts(): void
    {
        $finance = $this->makeUser($this->financeRole);
        $target = $this->makeUser($this->financeRole);
        Sanctum::actingAs($finance);

        $this->getJson('/api/users/show')->assertForbidden();
        $this->putJson("/api/users/{$target->id}/status", ['is_active' => false])->assertForbidden();
        $this->putJson("/api/users/{$target->id}/reset-password", [
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertForbidden();
        $this->getJson("/api/users/{$target->id}/audit-logs")->assertForbidden();
    }

    public function test_index_honours_per_page_search_and_status_filter(): void
    {
        $admin = $this->makeUser($this->adminRole);
        Sanctum::actingAs($admin);

        for ($i = 0; $i < 12; $i++) {
            $this->makeUser($this->financeRole);
        }
        $this->makeUser($this->financeRole, ['is_active' => false], 'Nguyen');

        $this->getJson('/api/users/show?per_page=25')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 25)
            ->assertJsonCount(14, 'data');

        $this->getJson('/api/users/show?searchTerm=Nguyen')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.first_name', 'Nguyen');

        $this->getJson('/api/users/show?status=inactive')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.is_active', false);
    }

    public function test_index_does_not_break_on_user_without_details(): void
    {
        $admin = $this->makeUser($this->adminRole);
        Sanctum::actingAs($admin);

        User::factory()->create();

        $this->getJson('/api/users/show')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_store_creates_user_and_audit_log(): void
    {
        $admin = $this->makeUser($this->adminRole);
        Sanctum::actingAs($admin);

        $this->postJson('/api/users', [
            'name' => 'newuser',
            'email' => 'new@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'role' => $this->financeRole->id,
            'department' => $this->department->id,
            'first_name' => 'New',
            'last_name' => 'User',
        ])->assertOk()->assertJsonPath('data.email', 'new@example.com');

        $created = User::where('email', 'new@example.com')->firstOrFail();
        $this->assertTrue($created->must_change_password);
        $this->assertDatabaseHas('account_audit_logs', [
            'actor_id' => $admin->id,
            'target_user_id' => $created->id,
            'action' => AccountAuditLog::ACTION_CREATED,
        ]);
    }

    public function test_admin_cannot_remove_own_admin_role(): void
    {
        $admin = $this->makeUser($this->adminRole);
        $this->makeUser($this->adminRole);
        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$admin->id}", [
            'role' => $this->financeRole->id,
            'department' => $this->department->id,
        ])->assertStatus(422);

        $this->assertSame($this->adminRole->id, $admin->fresh()->userDetails->role_id);
    }

    public function test_last_active_admin_cannot_be_demoted_or_deactivated(): void
    {
        // The acting admin is already inactive, so the target is the only active Admin left.
        $actor = $this->makeUser($this->adminRole, ['is_active' => false]);
        $lastAdmin = $this->makeUser($this->adminRole);
        Sanctum::actingAs($actor);

        $this->putJson("/api/users/{$lastAdmin->id}", [
            'role' => $this->financeRole->id,
            'department' => $this->department->id,
        ])->assertStatus(422);

        $this->putJson("/api/users/{$lastAdmin->id}/status", ['is_active' => false])
            ->assertStatus(422);

        $this->assertTrue($lastAdmin->fresh()->is_active);
        $this->assertSame($this->adminRole->id, $lastAdmin->fresh()->userDetails->role_id);
    }

    public function test_role_change_is_audited(): void
    {
        $admin = $this->makeUser($this->adminRole);
        $target = $this->makeUser($this->financeRole);
        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$target->id}", [
            'role' => $this->adminRole->id,
            'department' => $this->department->id,
        ])->assertOk();

        $log = AccountAuditLog::where('target_user_id', $target->id)->firstOrFail();
        $this->assertSame(AccountAuditLog::ACTION_UPDATED, $log->action);
        $this->assertSame(['from' => 'Finance', 'to' => 'Admin'], $log->changes['role']);
    }

    public function test_admin_cannot_deactivate_self(): void
    {
        $admin = $this->makeUser($this->adminRole);
        $this->makeUser($this->adminRole);
        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$admin->id}/status", ['is_active' => false])
            ->assertStatus(422);

        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_deactivated_user_is_signed_out_and_cannot_log_in(): void
    {
        $admin = $this->makeUser($this->adminRole);
        $target = $this->makeUser($this->financeRole);
        $target->createToken('session');
        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$target->id}/status", ['is_active' => false])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertSame(0, $target->tokens()->count());
        $this->assertDatabaseHas('account_audit_logs', [
            'target_user_id' => $target->id,
            'action' => AccountAuditLog::ACTION_DEACTIVATED,
        ]);

        $this->loginAsGuest($target->email)
            ->assertStatus(401)
            ->assertJsonMissingPath('token');

        Sanctum::actingAs($admin);
        $this->putJson("/api/users/{$target->id}/status", ['is_active' => true])->assertOk();

        $this->loginAsGuest($target->email)
            ->assertOk()
            ->assertJsonStructure(['token']);
    }

    public function test_login_records_last_login_at(): void
    {
        $user = $this->makeUser($this->financeRole);
        $this->assertNull($user->last_login_at);

        $this->loginAsGuest($user->email)->assertOk();

        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_reset_password_is_audited_and_listed_in_history(): void
    {
        $admin = $this->makeUser($this->adminRole);
        $target = $this->makeUser($this->financeRole);
        $target->createToken('session');
        Sanctum::actingAs($admin);

        $this->putJson("/api/users/{$target->id}/reset-password", [
            'password' => 'temp1234',
            'password_confirmation' => 'temp1234',
        ])->assertOk();

        $target->refresh();
        $this->assertTrue(Hash::check('temp1234', $target->password));
        $this->assertTrue($target->must_change_password);
        $this->assertSame(0, $target->tokens()->count());

        $this->getJson("/api/users/{$target->id}/audit-logs")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', AccountAuditLog::ACTION_PASSWORD_RESET)
            ->assertJsonPath('data.0.actor', $admin->email);
    }
}
