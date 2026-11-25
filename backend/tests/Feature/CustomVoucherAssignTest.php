<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CustomVoucherAssignTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        Schema::create('custom_vouchers_token', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->string('phone_number');
            $table->string('token');
            $table->integer('attempts')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->string('batch_id');
            $table->string('status')->default('active');
            $table->timestamps();
        });
        Schema::create('custom_vouchers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('token_id')->nullable();
            $table->string('uuid')->nullable();
            $table->string('code');
            $table->string('batch_id');
            $table->timestamp('expired_from')->nullable();
            $table->timestamp('expired_to')->nullable();
            $table->string('status')->default('unused');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        DB::table('custom_vouchers_token')->insert([
            ['phone_number' => '0903412887', 'token' => 'token-a', 'batch_id' => 'B1', 'expires_at' => now()->addDay()],
            ['phone_number' => '0912556201', 'token' => 'token-b', 'batch_id' => 'B1', 'expires_at' => now()->addDay()],
            ['phone_number' => '0987330145', 'token' => 'token-c', 'batch_id' => 'B1', 'expires_at' => now()->addDay()],
        ]);
        DB::table('custom_vouchers')->insert([
            ['code' => 'HL-0001', 'batch_id' => 'B1'],
            ['code' => 'HL-0002', 'batch_id' => 'B1'],
        ]);
    }

    public function test_each_token_gets_its_own_voucher_and_keeps_it(): void
    {
        $first = $this->assign('token-a');
        $again = $this->assign('token-a');
        $other = $this->assign('token-b');

        $this->assertSame($first['uuid'], $again['uuid']);
        $this->assertNotSame($first['uuid'], $other['uuid']);
        $this->assertSame(
            ['HL-0001' => 1, 'HL-0002' => 2],
            DB::table('custom_vouchers')->orderBy('code')->pluck('token_id', 'code')->map(fn ($id) => (int) $id)->all()
        );
        $this->assertSame(1, (int) DB::table('custom_vouchers_token')->where('token', 'token-a')->value('attempts'));
    }

    public function test_a_token_after_the_last_voucher_is_told_they_ran_out(): void
    {
        $this->assign('token-a');
        $this->assign('token-b');

        $this->postJson('/api/custom-voucher/assign', ['token' => 'token-c'])
            ->assertOk()
            ->assertJson(['status_code' => 400, 'error' => 'Out of vouchers']);
    }

    private function assign(string $token): array
    {
        return $this->postJson('/api/custom-voucher/assign', ['token' => $token])
            ->assertOk()
            ->assertJson(['status_code' => 200])
            ->json();
    }
}
