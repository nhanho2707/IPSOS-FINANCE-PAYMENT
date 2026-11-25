<?php

namespace Tests\Feature;

use App\Constants\TransactionStatus;
use App\Models\Project;
use App\Models\ProjectRespondent;
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

    public function test_a_second_gotit_request_while_the_first_is_sending_buys_nothing(): void
    {
        $lock = Cache::lock('gotit-transaction-1', 300);
        $this->assertTrue($lock->get());

        try {
            $this->postJson('/api/project-management/gotit/transaction', [
                'token' => self::TOKEN,
                'phone_number' => '0903412887',
                'service_type' => 'voucher',
                'service_code' => 'GOTIT',
                'provider' => 'gotit',
                'delivery_method' => 'sms',
            ])
                ->assertStatus(409)
                ->assertJson(['status_code' => 998, 'message' => ProjectRespondent::ERROR_RESPONDENT_GIFT_TEMPORARY]);
        } finally {
            $lock->release();
        }

        $this->assertSame(0, DB::table('project_gotit_voucher_transactions')->count());
        $this->assertSame(ProjectRespondent::STATUS_RESPONDENT_PENDING, DB::table('project_respondents')->value('status'));
    }
}
