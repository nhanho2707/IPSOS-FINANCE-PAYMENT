<?php

namespace Tests\Feature;

use App\Constants\TransactionStatus;
use App\Models\Project;
use App\Models\ProjectGotItVoucherTransaction;
use App\Models\ProjectRespondent;
use App\Services\VinnetService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GiftFlowSafetyTest extends TestCase
{
    private const TOKEN = 'pub-1.respondent-secret';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code')->nullable();
            $table->string('project_name');
            $table->timestamps();
        });
        Schema::create('project_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('status');
            $table->timestamps();
        });
        Schema::create('project_provinces', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('province_id');
            $table->decimal('price_main', 15, 2)->nullable();
            $table->timestamps();
        });
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id');
            $table->timestamps();
        });
        Schema::create('project_respondents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->unsignedBigInteger('province_id')->nullable();
            $table->string('location_id')->nullable();
            $table->string('price_level')->nullable();
            $table->string('phone_number')->nullable();
            $table->string('respondent_phone_number')->nullable();
            $table->string('service_code')->nullable();
            $table->string('service_type')->nullable();
            $table->string('delivery_method')->nullable();
            $table->string('channel')->nullable();
            $table->string('reject_message')->nullable();
            $table->string('status')->nullable();
            $table->string('environment')->nullable();
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
        Schema::create('project_gotit_voucher_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('transaction_ref_id')->nullable();
            $table->string('voucher_status')->nullable();
            $table->timestamps();
        });
        Schema::create('project_vinnet_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('vinnet_token_status')->nullable();
            $table->timestamps();
        });

        DB::table('projects')->insert(['id' => 1, 'internal_code' => '2026-0001', 'project_name' => 'Brand Health']);
        DB::table('project_details')->insert(['project_id' => 1, 'status' => Project::STATUS_ON_GOING]);
        DB::table('project_provinces')->insert(['project_id' => 1, 'province_id' => 79, 'price_main' => 50000]);
        DB::table('employees')->insert(['id' => 1, 'employee_id' => 'HN1024']);
        DB::table('project_respondents')->insert([
            'id' => 1, 'project_id' => 1, 'employee_id' => 1, 'province_id' => 79, 'location_id' => 'HN01',
            'price_level' => 'main', 'status' => ProjectRespondent::STATUS_RESPONDENT_PENDING, 'environment' => 'live',
        ]);
        DB::table('project_respondent_tokens')->insert([
            'project_respondent_id' => 1, 'token_public' => 'pub-1', 'token_hash' => Hash::make('respondent-secret'),
            'expires_at' => now()->addHours(24), 'status' => 'active',
        ]);
    }

    public function test_a_respondent_refusing_a_test_gift_gets_an_answer_not_a_server_error(): void
    {
        DB::table('project_details')->update(['status' => Project::STATUS_IN_COMING]);

        $this->postJson('/api/project-management/project/refusal-transaction', [
            'token' => self::TOKEN,
            'refusal_message' => 'Không muốn nhận quà',
        ])
            ->assertOk()
            ->assertJson(['message' => TransactionStatus::STATUS_TRANSACTION_TEST . ' [Ghi nhận lý do từ chối của đáp viên]']);
    }

    public function test_an_unknown_token_is_reported_as_invalid_not_as_a_server_error(): void
    {
        $this->getJson('/api/project-management/project/verify_token?token=unknown.secret')
            ->assertStatus(400)
            ->assertJson(['message' => TransactionStatus::STATUS_INVALID]);
    }

    public function test_a_respondent_who_got_a_gotit_voucher_gets_no_vinnet_cards_on_a_second_request(): void
    {
        $this->giftAlreadySentThrough('gotit');

        $this->mock(VinnetService::class, function ($mock) {
            $mock->shouldReceive('get_service_code')->andReturn('S0004');
            $mock->shouldNotReceive('authenticate_token');
            $mock->shouldNotReceive('pay_service');
        });

        $this->postJson('/api/project-management/vinnet/transaction', $this->giftRequest('vinnet', 'card', 'S0004', 'qr'))
            ->assertStatus(409)
            ->assertJson([
                'status_code' => ProjectRespondent::CODE_GIFT_ALREADY_DELIVERED,
                'message' => 'Đáp viên đã nhận quà qua GotIt trước đó, hệ thống không gửi thêm quà.',
            ]);

        $respondent = DB::table('project_respondents')->first();
        $this->assertSame('gotit', $respondent->channel);
        $this->assertSame('qr', $respondent->delivery_method);
        $this->assertSame('0903412887', $respondent->phone_number);
        $this->assertSame(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED, $respondent->status);
        $this->assertSame(0, DB::table('project_vinnet_transactions')->count());
    }

    public function test_a_respondent_who_got_vinnet_cards_gets_no_gotit_voucher_on_a_second_request(): void
    {
        $this->giftAlreadySentThrough('vinnet');

        $this->postJson('/api/project-management/gotit/transaction', $this->giftRequest('gotit', 'voucher', 'S0004', 'sms', '0912556201'))
            ->assertStatus(409)
            ->assertJson([
                'status_code' => ProjectRespondent::CODE_GIFT_ALREADY_DELIVERED,
                'message' => 'Đáp viên đã nhận quà qua Vinnet trước đó, hệ thống không gửi thêm quà.',
            ]);

        $respondent = DB::table('project_respondents')->first();
        $this->assertSame('vinnet', $respondent->channel);
        $this->assertSame('0903412887', $respondent->phone_number);
        $this->assertSame(0, DB::table('project_gotit_voucher_transactions')->count());
    }

    public function test_a_vinnet_request_waits_for_a_gotit_request_for_the_same_respondent(): void
    {
        $this->mock(VinnetService::class, function ($mock) {
            $mock->shouldReceive('get_service_code')->andReturn('S0004');
            $mock->shouldNotReceive('authenticate_token');
        });

        $lock = Cache::lock('gift-transaction-1', 300);
        $this->assertTrue($lock->get());

        try {
            $this->postJson('/api/project-management/vinnet/transaction', $this->giftRequest('vinnet', 'card', 'S0004', 'qr'))
                ->assertStatus(409)
                ->assertJson(['status_code' => 998]);
        } finally {
            $lock->release();
        }
    }

    public function test_a_second_gotit_request_while_the_first_is_sending_buys_nothing(): void
    {
        $lock = Cache::lock('gift-transaction-1', 300);
        $this->assertTrue($lock->get());

        try {
            $this->postJson('/api/project-management/gotit/transaction', $this->giftRequest('gotit', 'voucher', 'GOTIT', 'sms'))
                ->assertStatus(409)
                ->assertJson(['status_code' => 998, 'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY]);
        } finally {
            $lock->release();
        }

        $this->assertSame(0, DB::table('project_gotit_voucher_transactions')->count());
        $this->assertSame(ProjectRespondent::STATUS_RESPONDENT_PENDING, DB::table('project_respondents')->value('status'));
    }

    /**
     * The respondent got the gift long ago: the token is blocked and past its 24 hours.
     */
    private function giftAlreadySentThrough(string $channel): void
    {
        DB::table('project_respondents')->update([
            'channel' => $channel,
            'delivery_method' => 'qr',
            'phone_number' => '0903412887',
            'status' => ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED,
        ]);
        DB::table('project_respondent_tokens')->update(['status' => 'blocked', 'expires_at' => now()->subDays(20)]);

        if ($channel === 'gotit') {
            DB::table('project_gotit_voucher_transactions')->insert([
                'project_respondent_id' => 1,
                'transaction_ref_id' => 'IPSOS_ref-1',
                'voucher_status' => ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS,
            ]);
        } else {
            DB::table('project_vinnet_transactions')->insert([
                'project_respondent_id' => 1,
                'vinnet_token_status' => TransactionStatus::STATUS_VERIFIED,
            ]);
        }
    }

    private function giftRequest(string $provider, string $serviceType, string $serviceCode, string $deliveryMethod, string $phone = '0903412887'): array
    {
        return [
            'token' => self::TOKEN,
            'phone_number' => $phone,
            'service_type' => $serviceType,
            'service_code' => $serviceCode,
            'provider' => $provider,
            'delivery_method' => $deliveryMethod,
        ];
    }
}
