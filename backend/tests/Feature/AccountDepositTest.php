<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDepositTest extends TestCase
{
    private const DEPOSITS_URL = '/api/transaction-management/gotit/account/gotit/deposits';
    private const STORE_URL = '/api/transaction-management/gotit/account/store';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        // The full migration set does not run on SQLite, so build the tables these endpoints touch.
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

        Schema::create('project_gotit_voucher_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_status')->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->timestamps();
        });

        (require database_path('migrations/2026_04_01_104356_create_account_deposits_table.php'))->up();
        (require database_path('migrations/2026_11_25_000000_add_created_user_id_and_note_to_account_deposits_table.php'))->up();
        (require database_path('migrations/2026_11_26_000000_add_void_columns_to_account_deposits_table.php'))->up();

        DB::table('roles')->insert([
            ['id' => 1, 'name' => 'Finance'],
            ['id' => 2, 'name' => 'Researcher'],
        ]);
    }

    public function test_a_deposit_records_who_added_it_and_the_note(): void
    {
        Sanctum::actingAs($this->user('Lan Tran', 'Finance'));

        $response = $this->postJson(self::STORE_URL, [
            'account_type' => 'gotit',
            'amount' => '5000000',
            'note' => 'Bank transfer 12/11',
        ]);

        $response->assertOk();
        $this->assertEquals(5000000, $response->json('deposited'));
        $this->assertEquals(5000000, $response->json('balance'));
        $this->assertIsInt($response->json('deposit.id'));
        $this->assertSame('Lan Tran', $response->json('deposit.created_by'));
        $this->assertNull($response->json('deposit.voided_at'));

        $history = $this->getJson(self::DEPOSITS_URL)->assertOk();

        $this->assertSame(1, $history->json('meta.total'));
        $this->assertEquals(5000000, $history->json('data.0.amount'));
        $this->assertSame('Bank transfer 12/11', $history->json('data.0.note'));
        $this->assertSame('Lan Tran', $history->json('data.0.created_by'));
        $this->assertNotNull($history->json('data.0.created_at'));
    }

    public function test_the_history_lists_newest_first_for_the_account_and_pages(): void
    {
        Sanctum::actingAs($this->user('Lan Tran', 'Finance'));

        // Deposits from before the author was recorded have none.
        DB::table('account_deposits')->insert([
            ['account_type' => 'gotit', 'amount' => 1000000, 'created_at' => '2026-10-01 09:00:00'],
            ['account_type' => 'gotti-trade', 'amount' => 7000000, 'created_at' => '2026-10-02 09:00:00'],
        ]);

        $this->postJson(self::STORE_URL, ['account_type' => 'gotit', 'amount' => 2000000])->assertOk();
        $this->postJson(self::STORE_URL, ['account_type' => 'gotit', 'amount' => 3000000])->assertOk();

        $firstPage = $this->getJson(self::DEPOSITS_URL . '?per_page=2')->assertOk();

        $this->assertSame(3, $firstPage->json('meta.total'));
        $this->assertEquals([3000000, 2000000], array_column($firstPage->json('data'), 'amount'));

        $lastPage = $this->getJson(self::DEPOSITS_URL . '?per_page=2&page=2')->assertOk();

        $this->assertEquals([1000000], array_column($lastPage->json('data'), 'amount'));
        $this->assertNull($lastPage->json('data.0.created_by'));
        $this->assertNull($lastPage->json('data.0.note'));
    }

    public function test_an_amount_that_is_not_a_positive_number_is_rejected(): void
    {
        Sanctum::actingAs($this->user('Lan Tran', 'Finance'));

        foreach (['abc', '0', '-500000', ''] as $amount) {
            $this->postJson(self::STORE_URL, ['account_type' => 'gotit', 'amount' => $amount])
                ->assertStatus(422)
                ->assertJsonValidationErrors('amount');
        }

        $this->assertSame(0, DB::table('account_deposits')->count());
    }

    public function test_a_voided_deposit_stays_in_the_history_but_leaves_the_balance(): void
    {
        Sanctum::actingAs($this->user('Lan Tran', 'Finance'));

        $this->postJson(self::STORE_URL, ['account_type' => 'gotit', 'amount' => 2000000])->assertOk();
        $mistake = $this->postJson(self::STORE_URL, ['account_type' => 'gotit', 'amount' => 50000000])->json('deposit.id');

        $voided = $this->postJson($this->voidUrl($mistake), ['reason' => 'Typed 50,000,000 instead of 5,000,000'])
            ->assertOk();

        $this->assertEquals(2000000, $voided->json('deposited'));
        $this->assertEquals(2000000, $voided->json('balance'));
        $this->assertSame('Lan Tran', $voided->json('deposit.voided_by'));
        $this->assertSame('Typed 50,000,000 instead of 5,000,000', $voided->json('deposit.void_reason'));

        $this->assertEquals(2000000, $this->getJson('/api/transaction-management/gotit/account/gotit/view')->json('deposited'));

        $history = $this->getJson(self::DEPOSITS_URL)->assertOk();
        $this->assertSame(2, $history->json('meta.total'));
        $this->assertEquals(50000000, $history->json('data.0.amount'));
        $this->assertNotNull($history->json('data.0.voided_at'));
        $this->assertSame('Typed 50,000,000 instead of 5,000,000', $history->json('data.0.void_reason'));
        $this->assertNull($history->json('data.1.voided_at'));
    }

    public function test_a_deposit_is_voided_only_once_and_needs_a_reason(): void
    {
        Sanctum::actingAs($this->user('Lan Tran', 'Finance'));

        $id = $this->postJson(self::STORE_URL, ['account_type' => 'gotit', 'amount' => 3000000])->json('deposit.id');

        $this->postJson($this->voidUrl($id), ['reason' => ''])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->postJson($this->voidUrl($id), ['reason' => 'Undone right after adding'])->assertOk();
        $this->postJson($this->voidUrl($id), ['reason' => 'Clicked twice'])->assertStatus(409);
        $this->postJson($this->voidUrl(999), ['reason' => 'Unknown'])->assertNotFound();

        $this->assertSame('Undone right after adding', DB::table('account_deposits')->where('id', $id)->value('void_reason'));
    }

    public function test_only_admin_and_finance_can_add_or_read_deposits(): void
    {
        Sanctum::actingAs($this->user('Minh Le', 'Researcher'));

        $this->postJson(self::STORE_URL, ['account_type' => 'gotit', 'amount' => 1000000])->assertForbidden();
        $this->getJson(self::DEPOSITS_URL)->assertForbidden();

        DB::table('account_deposits')->insert(['id' => 1, 'account_type' => 'gotit', 'amount' => 1000000]);
        $this->postJson($this->voidUrl(1), ['reason' => 'Not mine to void'])->assertForbidden();
        $this->assertNull(DB::table('account_deposits')->value('voided_at'));
        DB::table('account_deposits')->delete();

        $this->assertSame(0, DB::table('account_deposits')->count());
    }

    private function voidUrl(int $depositId): string
    {
        return "/api/transaction-management/gotit/account/deposits/{$depositId}/void";
    }

    private function user(string $name, string $role): User
    {
        $user = User::create([
            'name' => $name,
            'email' => strtolower(str_replace(' ', '.', $name)) . '@example.com',
            'password' => 'not-used',
        ]);

        DB::table('user_details')->insert([
            'user_id' => $user->id,
            'role_id' => DB::table('roles')->where('name', $role)->value('id'),
        ]);

        return $user;
    }
}
