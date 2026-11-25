<?php

namespace Tests\Feature;

use App\Constants\TransactionStatus;
use App\Models\ProjectGotItVoucherTransaction;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class FixGiftChannelsTest extends TestCase
{
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
            $table->string('internal_code');
        });
        Schema::create('project_respondents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('respondent_id');
            $table->string('channel')->nullable();
            $table->string('status')->nullable();
        });
        Schema::create('project_vinnet_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('vinnet_token_status')->nullable();
        });
        Schema::create('project_gotit_voucher_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('voucher_status')->nullable();
        });

        DB::table('projects')->insert([['id' => 1, 'internal_code' => '2026-0001'], ['id' => 2, 'internal_code' => '2026-0002']]);
        DB::table('project_respondents')->insert([
            // GotIt voucher, then a failed Vinnet attempt overwrote the channel.
            ['id' => 1, 'project_id' => 1, 'respondent_id' => 'SC1-1', 'channel' => 'vinnet'],
            // Vinnet cards, then a GotIt attempt overwrote the channel.
            ['id' => 2, 'project_id' => 1, 'respondent_id' => 'SC1-2', 'channel' => 'gotit'],
            // Paid through both providers.
            ['id' => 3, 'project_id' => 1, 'respondent_id' => 'SC1-3', 'channel' => 'vinnet'],
            // Correct.
            ['id' => 4, 'project_id' => 1, 'respondent_id' => 'SC1-4', 'channel' => 'gotit'],
            // Another project, also mislabelled.
            ['id' => 5, 'project_id' => 2, 'respondent_id' => 'SC2-1', 'channel' => 'vinnet'],
            // No delivered gift: a failed Vinnet attempt only.
            ['id' => 6, 'project_id' => 1, 'respondent_id' => 'SC1-6', 'channel' => 'vinnet'],
        ]);

        $gotit = ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS;
        $vinnet = TransactionStatus::STATUS_VERIFIED;

        DB::table('project_gotit_voucher_transactions')->insert([
            ['project_respondent_id' => 1, 'voucher_status' => $gotit],
            ['project_respondent_id' => 3, 'voucher_status' => $gotit],
            ['project_respondent_id' => 4, 'voucher_status' => $gotit],
            ['project_respondent_id' => 5, 'voucher_status' => $gotit],
        ]);
        DB::table('project_vinnet_transactions')->insert([
            ['project_respondent_id' => 1, 'vinnet_token_status' => TransactionStatus::STATUS_ERROR],
            ['project_respondent_id' => 2, 'vinnet_token_status' => $vinnet],
            ['project_respondent_id' => 2, 'vinnet_token_status' => $vinnet],
            ['project_respondent_id' => 3, 'vinnet_token_status' => $vinnet],
            ['project_respondent_id' => 6, 'vinnet_token_status' => TransactionStatus::STATUS_ERROR],
        ]);
    }

    public function test_without_apply_it_only_reports(): void
    {
        $this->artisan('gifts:fix-channels')
            ->expectsOutputToContain('Channel does not match the provider that delivered the gift: 3')
            ->expectsOutputToContain('Gift delivered by both Vinnet and GotIt (paid twice, left as is): 1')
            ->expectsOutputToContain('Nothing was changed.')
            ->assertSuccessful();

        $this->assertSame(['vinnet', 'gotit', 'vinnet', 'gotit', 'vinnet', 'vinnet'], $this->channels());
    }

    public function test_apply_sets_the_channel_of_the_provider_that_delivered_the_gift(): void
    {
        $this->artisan('gifts:fix-channels', ['--apply' => true])
            ->expectsOutputToContain('Corrected 3 channel(s).')
            ->assertSuccessful();

        // Respondent 3 was paid twice and is left for Finance to review; 6 has no delivered gift.
        $this->assertSame(['gotit', 'vinnet', 'vinnet', 'gotit', 'gotit', 'vinnet'], $this->channels());
    }

    public function test_it_can_be_limited_to_one_project(): void
    {
        $this->artisan('gifts:fix-channels', ['--project' => 2, '--apply' => true])
            ->expectsOutputToContain('Corrected 1 channel(s).')
            ->assertSuccessful();

        $this->assertSame(['vinnet', 'gotit', 'vinnet', 'gotit', 'gotit', 'vinnet'], $this->channels());
    }

    private function channels(): array
    {
        return DB::table('project_respondents')->orderBy('id')->pluck('channel')->all();
    }
}
