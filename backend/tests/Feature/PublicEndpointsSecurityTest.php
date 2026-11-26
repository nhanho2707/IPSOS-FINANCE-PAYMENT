<?php

namespace Tests\Feature;

use App\Services\VinnetService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PublicEndpointsSecurityTest extends TestCase
{
    private const SECRET = 'respondent-secret';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        Schema::create('techcombank_panel', function (Blueprint $table) {
            $table->id();
            $table->string('gender')->nullable();
            $table->string('email')->nullable();
            $table->string('status');
        });

        Schema::create('project_respondents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->timestamps();
        });

        Schema::create('project_respondent_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('token_public');
            $table->string('token_hash');
            $table->integer('attempts')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->string('status')->default('active');
            $table->string('batch_id')->nullable();
            $table->timestamps();
        });

        Schema::create('project_vinnet_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('vinnet_payservice_requuid')->nullable();
            $table->timestamps();
        });

        Schema::create('project_gotit_voucher_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('transaction_ref_id')->nullable();
            $table->timestamps();
        });

        DB::table('project_respondents')->insert([['id' => 1, 'project_id' => 1], ['id' => 2, 'project_id' => 1]]);

        // Respondent 1 got gift online; respondent 2 was imported offline with batch BATCH7.
        DB::table('project_respondent_tokens')->insert([
            ['project_respondent_id' => 1, 'token_public' => 'pub-1', 'token_hash' => Hash::make(self::SECRET), 'status' => 'blocked', 'expires_at' => '2026-01-01 00:00:00', 'batch_id' => null],
            ['project_respondent_id' => 2, 'token_public' => 'pub-2', 'token_hash' => Hash::make('unused'), 'status' => 'blocked', 'expires_at' => '2026-01-01 00:00:00', 'batch_id' => 'BATCH7'],
        ]);
        DB::table('project_vinnet_transactions')->insert([
            ['project_respondent_id' => 1, 'vinnet_payservice_requuid' => 'vinnet-uuid-1'],
            ['project_respondent_id' => 2, 'vinnet_payservice_requuid' => 'vinnet-uuid-2'],
        ]);
        DB::table('project_gotit_voucher_transactions')->insert([
            ['project_respondent_id' => 2, 'transaction_ref_id' => 'IPSOS_gotit-ref-2'],
        ]);
    }

    public function test_the_panel_count_route_only_reads_the_dashboard_columns(): void
    {
        DB::table('techcombank_panel')->insert([
            ['gender' => 'Nam', 'email' => 'a@example.com', 'status' => 'Active'],
            ['gender' => 'Nam', 'email' => 'b@example.com', 'status' => 'Active'],
            ['gender' => 'Nữ', 'email' => 'c@example.com', 'status' => 'Inactive'],
        ]);

        $this->getJson('/api/techcombank-panel/techcombank_panel/gender')
            ->assertOk()
            ->assertExactJson([['gender' => 'Nam', 'count' => 2]]);

        $this->getJson('/api/techcombank-panel/techcombank_panel/email')->assertNotFound();
        $this->getJson('/api/techcombank-panel/users/password')->assertNotFound();
        $this->getJson('/api/techcombank-panel/project_vinnet_transactions/card_pin_code')->assertNotFound();
    }

    public function test_the_sms_test_routes_are_gone(): void
    {
        $this->getJson('/api/test_sms?phone_number=0900000000&message=hi')->assertNotFound();
        $this->postJson('/api/cmc-telecom/sendsms', ['phone_number' => '0900000000'])->assertNotFound();
    }

    public function test_a_vinnet_code_lookup_needs_the_token_of_the_respondent_who_owns_it(): void
    {
        $this->mock(VinnetService::class, function ($mock) {
            $mock->shouldNotReceive('authenticate_token');
            $mock->shouldNotReceive('check_transaction');
        });

        $cases = [
            ['token' => 'not-a-token', 'transaction_id' => 'vinnet-uuid-1'],
            ['token' => 'pub-1.wrong-secret', 'transaction_id' => 'vinnet-uuid-1'],
            ['token' => 'unknown.' . self::SECRET, 'transaction_id' => 'vinnet-uuid-1'],
            // A real token cannot read another respondent's card.
            ['token' => 'pub-1.' . self::SECRET, 'transaction_id' => 'vinnet-uuid-2'],
        ];

        foreach ($cases as $payload) {
            $this->postJson('/api/project-management/vinnet/check-transaction', $payload)
                ->assertForbidden()
                ->assertJson(['status_code' => 995]);
        }

        $this->assertSame(0, (int) DB::table('project_respondent_tokens')->sum('attempts'));
    }

    public function test_the_owner_can_look_up_their_vinnet_code_after_the_gift_was_sent(): void
    {
        $this->mock(VinnetService::class, function ($mock) {
            $mock->shouldReceive('authenticate_token')->andReturn(['code' => 0, 'token' => 'vinnet-token']);
            $mock->shouldReceive('check_transaction')->twice()->andReturn([
                'code' => 0,
                'pay_item' => ['totalAmt' => 50000, 'cardItems' => [['pinCode' => '1234', 'serialNo' => 'S1', 'expiryDate' => '2027-01-01']]],
            ]);
        });

        // Online token (secret) and offline token (batch id), both already blocked after the gift.
        foreach ([['pub-1.' . self::SECRET, 'vinnet-uuid-1'], ['pub-2.BATCH7', 'vinnet-uuid-2']] as [$token, $transactionId]) {
            $this->postJson('/api/project-management/vinnet/check-transaction', ['token' => $token, 'transaction_id' => $transactionId])
                ->assertOk()
                ->assertJson(['status_code' => 900])
                ->assertJsonFragment(['data' => "IPSOS cam on ban. Tang ban ma dien thoai:\n50K:Code:1234,Seri:S1,Exp:2027-01-01"]);
        }
    }

    public function test_a_gotit_voucher_lookup_needs_the_owners_token(): void
    {
        $this->postJson('/api/project-management/gotit/check-transaction', ['token' => 'pub-1.' . self::SECRET, 'transaction_id' => 'IPSOS_gotit-ref-2'])
            ->assertForbidden()
            ->assertJson(['status_code' => 995]);

        $this->postJson('/api/project-management/gotit/check-transaction', ['token' => 'pub-2.wrong', 'transaction_id' => 'IPSOS_gotit-ref-2'])
            ->assertForbidden();
    }
}
