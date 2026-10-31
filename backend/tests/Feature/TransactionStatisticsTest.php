<?php

namespace Tests\Feature;

use App\Constants\TransactionStatus;
use App\Http\Controllers\TransactionController;
use App\Http\Requests\TransactionStatisticsRequest;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TransactionStatisticsTest extends TestCase
{
    private int $nextRespondentId = 1;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
            // Fixtures write interview and transaction times on the same clock; the UTC case is tested on its own.
            'app.timezone' => 'Asia/Ho_Chi_Minh',
        ]);
        DB::purge('sqlite');

        // The real migrations reuse index names, which SQLite rejects, so build only what the query touches.
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
        });

        Schema::create('project_respondents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->string('channel')->nullable();
            $table->string('respondent_id')->nullable();
            $table->string('respondent_phone_number')->nullable();
            $table->datetime('interview_start')->nullable();
            $table->datetime('interview_end')->nullable();
            $table->string('environment')->default('live');
        });

        Schema::create('project_respondent_tokens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id')->unique();
            $table->string('batch_id')->nullable();
        });

        Schema::create('project_vinnet_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('vinnet_token_message')->nullable();
            $table->double('total_amt')->default(0.0);
            $table->timestamps();
        });

        Schema::create('project_gotit_voucher_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('voucher_status')->nullable();
            $table->double('voucher_value')->default(0.0);
            $table->timestamps();
        });

        DB::table('employees')->insert(['id' => 1, 'employee_id' => 'PVV01', 'first_name' => 'Nguyen', 'last_name' => 'An']);
    }

    public function test_split_vinnet_cards_count_as_one_gift_with_the_summed_amount(): void
    {
        $respondent = $this->createRespondent('vinnet', '2026-10-01 09:10:00', '2026-10-01 09:40:00');
        $this->createVinnet($respondent, '2026-10-01 09:50:00', 300000);
        $this->createVinnet($respondent, '2026-10-01 09:50:05', 50000);

        $data = $this->statistics();

        $this->assertSame(1, $data['total']);
        $this->assertEquals(350000, $data['total_amount']);
        $this->assertSame(1, $data['by_channel']['vinnet']['count']);
        $this->assertSame(1, $data['interview_time_buckets']['09-10']);
        $this->assertSame(1, $data['gift_time_buckets']['09-10']);
        $this->assertSame(1, $data['gap_buckets']['≤ 30 phút']);
        $this->assertSame(10, $data['gap_median_minutes']);
        $this->assertSame(0, $data['anomalies_total']);
    }

    public function test_hour_buckets_cover_the_whole_day(): void
    {
        $data = $this->statistics();

        $this->assertCount(24, $data['interview_time_buckets']);
        $this->assertSame('00-01', array_key_first($data['gift_time_buckets']));
        $this->assertSame('23-00', array_key_last($data['gift_time_buckets']));
        $this->assertNull($data['gap_median_minutes']);
    }

    public function test_failed_transactions_are_not_counted(): void
    {
        $respondent = $this->createRespondent('vinnet', '2026-10-01 09:10:00', '2026-10-01 09:40:00');
        $this->createVinnet($respondent, '2026-10-01 09:50:00', 100000, 'Thất bại');

        $this->assertSame(0, $this->statistics()['total']);
    }

    public function test_a_gift_sent_before_the_interview_ended_is_an_anomaly(): void
    {
        $respondent = $this->createRespondent('gotit', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createGotIt($respondent, '2026-10-01 14:10:00', 200000);

        $data = $this->statistics();

        $this->assertSame(1, $data['anomalies_total']);
        $this->assertSame(-20, $data['anomalies'][0]['gap_minutes']);
        $this->assertSame('Nguyen An', $data['anomalies'][0]['employee_name']);
        $this->assertSame(1, $data['gap_buckets']['Trước khi PV xong > 5 phút (bất thường)']);
    }

    public function test_a_small_negative_gap_from_clock_drift_is_not_an_anomaly(): void
    {
        $withinTolerance = $this->createRespondent('vinnet', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createVinnet($withinTolerance, '2026-10-01 14:25:00', 100000);

        $beyondTolerance = $this->createRespondent('vinnet', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createVinnet($beyondTolerance, '2026-10-01 14:24:00', 100000);

        $data = $this->statistics();

        $this->assertSame(5, $data['anomaly_tolerance_minutes']);
        $this->assertSame(1, $data['anomalies_total']);
        $this->assertSame(-6, $data['anomalies'][0]['gap_minutes']);
        $this->assertSame(1, $data['gap_buckets']['≤ 30 phút']);
    }

    public function test_utc_transaction_times_are_compared_against_vietnam_interview_times(): void
    {
        config(['app.timezone' => 'UTC']);

        $respondent = $this->createRespondent('gotit', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createGotIt($respondent, '2026-10-01 07:40:00', 200000);

        $data = $this->statistics();

        $this->assertSame(0, $data['anomalies_total']);
        $this->assertSame(10, $data['gap_median_minutes']);
        $this->assertSame(1, $data['interview_time_buckets']['14-15']);
        $this->assertSame(1, $data['gift_time_buckets']['14-15']);
    }

    public function test_anomaly_times_are_returned_in_vietnam_time(): void
    {
        config(['app.timezone' => 'UTC']);

        $respondent = $this->createRespondent('gotit', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createGotIt($respondent, '2026-10-01 07:10:00', 200000);

        $anomaly = $this->statistics()['anomalies'][0];

        $this->assertSame('2026-10-01 14:30:00', $anomaly['interview_end']);
        $this->assertSame('2026-10-01 14:10:00', $anomaly['gift_time']);
        $this->assertSame(-20, $anomaly['gap_minutes']);
    }

    public function test_test_environment_respondents_are_not_counted(): void
    {
        $respondent = $this->createRespondent('vinnet', '2026-10-01 09:10:00', '2026-10-01 09:40:00');
        DB::table('project_respondents')->where('id', $respondent)->update(['environment' => 'test']);
        $this->createVinnet($respondent, '2026-10-01 09:50:00', 100000);

        $this->assertSame(0, $this->statistics()['total']);
    }

    public function test_offline_respondents_count_as_gifts_but_not_in_interview_timing(): void
    {
        // Offline import stamps both interview times with the import time, long before the gift is sent.
        $respondent = $this->createRespondent('vinnet', '2026-10-01 08:00:00', '2026-10-01 08:00:00');
        DB::table('project_respondent_tokens')->insert(['project_respondent_id' => $respondent, 'batch_id' => 'IMPORT_01102026080000']);
        $this->createVinnet($respondent, '2026-10-03 15:20:00', 100000);

        $online = $this->createRespondent('vinnet', '2026-10-01 09:10:00', '2026-10-01 09:40:00');
        DB::table('project_respondent_tokens')->insert(['project_respondent_id' => $online, 'batch_id' => null]);
        $this->createVinnet($online, '2026-10-01 09:50:00', 100000);

        $data = $this->statistics();

        $this->assertSame(2, $data['total']);
        $this->assertSame(1, $data['gap_offline']);
        $this->assertSame(0, $data['gap_unknown']);
        $this->assertSame(1, array_sum($data['interview_time_buckets']));
        $this->assertSame(0, $data['interview_time_buckets']['08-09']);
        $this->assertSame(1, $data['gift_time_buckets']['15-16']);
        $this->assertSame(1, array_sum($data['gap_buckets']));
        $this->assertSame(10, $data['gap_median_minutes']);
    }

    public function test_a_missing_interview_end_is_left_out_of_the_gap_instead_of_flagged(): void
    {
        $respondent = $this->createRespondent('gotit', '2026-10-01 14:00:00', null);
        $this->createGotIt($respondent, '2026-10-01 14:10:00', 200000);

        $data = $this->statistics();

        $this->assertSame(1, $data['total']);
        $this->assertSame(1, $data['gap_unknown']);
        $this->assertSame(0, $data['anomalies_total']);
        $this->assertSame(0, array_sum($data['gap_buckets']));
    }

    public function test_filters_by_project_channel_and_interview_date(): void
    {
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00'), '2026-10-01 09:40:00', 100000);
        $this->createGotIt($this->createRespondent('gotit', '2026-10-05 09:00:00', '2026-10-05 09:30:00'), '2026-10-05 09:40:00', 100000);
        $this->createGotIt($this->createRespondent('gotit', '2026-10-05 09:00:00', '2026-10-05 09:30:00', 2), '2026-10-05 09:40:00', 100000);

        $this->assertSame(3, $this->statistics([], 0)['total']);
        $this->assertSame(2, $this->statistics()['total']);
        $this->assertSame(1, $this->statistics(['channel' => 'gotit'])['total']);
        $this->assertSame(1, $this->statistics(['date_from' => '2026-10-02', 'date_to' => '2026-10-31'])['total']);
    }

    private function statistics(array $query = [], int $projectId = 1): array
    {
        $request = TransactionStatisticsRequest::create('/statistics', 'GET', $query);
        $request->setContainer($this->app)->setRedirector($this->app['redirect']);
        $request->validateResolved();

        $response = (new TransactionController())->statistics($request, $projectId);

        $this->assertSame(200, $response->getStatusCode(), json_encode($response->getData(true)));

        return $response->getData(true)['data'];
    }

    private function createRespondent(string $channel, ?string $start, ?string $end, int $projectId = 1): int
    {
        $id = $this->nextRespondentId++;

        DB::table('project_respondents')->insert([
            'id' => $id,
            'project_id' => $projectId,
            'employee_id' => 1,
            'channel' => $channel,
            'respondent_id' => 'R' . $id,
            'respondent_phone_number' => '090000000' . $id,
            'interview_start' => $start,
            'interview_end' => $end,
        ]);

        return $id;
    }

    private function createVinnet(int $respondentId, string $createdAt, int $amount, string $message = TransactionStatus::VINNET_SUCCESS): void
    {
        DB::table('project_vinnet_transactions')->insert([
            'project_respondent_id' => $respondentId,
            'vinnet_token_message' => $message,
            'total_amt' => $amount,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    private function createGotIt(int $respondentId, string $createdAt, int $amount): void
    {
        DB::table('project_gotit_voucher_transactions')->insert([
            'project_respondent_id' => $respondentId,
            'voucher_status' => TransactionStatus::GOTIT_SUCCESS,
            'voucher_value' => $amount,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }
}
