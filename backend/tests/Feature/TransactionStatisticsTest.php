<?php

namespace Tests\Feature;

use App\Constants\TransactionStatus;
use App\Http\Controllers\TransactionController;
use App\Http\Requests\TransactionStatisticsInterviewsRequest;
use App\Http\Requests\TransactionStatisticsRequest;
use App\Models\ProjectRespondent;
use App\Models\Role;
use App\Models\User;
use App\Models\UserDetail;
use App\Services\TransactionStatisticsService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Routing\Route;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpSpreadsheet\IOFactory;
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
            $table->string('status')->nullable();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code');
            $table->string('project_name');
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

        DB::table('employees')->insert([
            ['id' => 1, 'employee_id' => 'PVV01', 'first_name' => 'Nguyen', 'last_name' => 'An'],
            ['id' => 2, 'employee_id' => 'PVV02', 'first_name' => 'Tran', 'last_name' => 'Binh'],
        ]);
        DB::table('projects')->insert([
            ['id' => 1, 'internal_code' => 'VN2601', 'project_name' => 'Brand tracker'],
            ['id' => 2, 'internal_code' => 'VN2602', 'project_name' => 'Product test'],
        ]);
    }

    public function test_split_vinnet_cards_count_as_one_gift_with_the_summed_amount(): void
    {
        $respondent = $this->createRespondent('vinnet', '2026-10-01 09:10:00', '2026-10-01 09:40:00');
        $this->createVinnet($respondent, '2026-10-01 09:50:00', 300000);
        $this->createVinnet($respondent, '2026-10-01 09:50:05', 50000);

        $data = $this->statistics();

        $this->assertSame(1, $data['interviews']);
        $this->assertSame(1, $data['gifts']);
        $this->assertEquals(350000, $data['amount']);
        $this->assertSame(1, $data['by_channel']['vinnet']['gifts']);
        $this->assertSame(1, $data['interview_hours'][9]);
        $this->assertSame(1, $data['gift_hours'][9]);
        $this->assertSame(['le15' => 1], $this->waitBuckets($data));
        $this->assertSame(10, $data['wait']['median_minutes']);
        $this->assertSame(0, $data['review_total']);
    }

    public function test_hours_cover_the_whole_day_and_the_week(): void
    {
        $data = $this->statistics();

        $this->assertCount(24, $data['interview_hours']);
        $this->assertCount(24, $data['gift_hours']);
        $this->assertCount(7, $data['weekday_hours']);
        $this->assertCount(24, $data['weekday_hours'][0]);
        $this->assertSame(['early', 'le15', 'le60', 'le360', 'le1440', 'gt1440'], array_column($data['wait']['buckets'], 'key'));
        $this->assertNull($data['wait']['median_minutes']);
    }

    public function test_an_interview_without_a_successful_transaction_counts_as_an_interview_not_a_gift(): void
    {
        $failed = $this->createRespondent('vinnet', '2026-10-01 09:10:00', '2026-10-01 09:40:00');
        $this->createVinnet($failed, '2026-10-01 09:50:00', 100000, 'Thất bại');
        DB::table('project_respondents')->where('id', $failed)->update(['status' => ProjectRespondent::STATUS_RESPONDENT_REJECTED]);

        $data = $this->statistics();

        $this->assertSame(1, $data['interviews']);
        $this->assertSame(0, $data['gifts']);
        $this->assertEquals(0, $data['amount']);
        $this->assertSame(1, $data['interview_hours'][9]);
        $this->assertSame(0, array_sum($data['gift_hours']));
        $this->assertSame(['interviews' => 1, 'gifts' => 0], array_intersect_key($data['by_employee'][0], ['interviews' => 0, 'gifts' => 0]));

        $noGift = $this->interviews(['view' => 'no_gift']);
        $this->assertSame(1, $noGift['meta']['total']);
        $this->assertSame('refused', $noGift['data'][0]['gift_status']);
        $this->assertNull($noGift['data'][0]['gift_time']);
    }

    public function test_a_gift_sent_before_the_interview_ended_needs_review(): void
    {
        $respondent = $this->createRespondent('gotit', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createGotIt($respondent, '2026-10-01 14:10:00', 200000);

        $data = $this->statistics();

        $this->assertSame(1, $data['review_total']);
        $this->assertSame(['early' => 1], $this->waitBuckets($data));
        $this->assertSame(1, $data['by_employee'][0]['review']);

        $row = $this->interviews()['data'][0];
        $this->assertSame(-20, $row['wait_minutes']);
        $this->assertSame('Nguyen An', $row['employee_name']);
        $this->assertSame('PVV01', $row['employee_id']);
        $this->assertTrue($row['needs_review']);
    }

    public function test_a_small_negative_wait_from_clock_drift_does_not_need_review(): void
    {
        $withinTolerance = $this->createRespondent('vinnet', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createVinnet($withinTolerance, '2026-10-01 14:25:00', 100000);

        $beyondTolerance = $this->createRespondent('vinnet', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createVinnet($beyondTolerance, '2026-10-01 14:24:00', 100000);

        $data = $this->statistics();

        $this->assertSame(5, $data['wait']['tolerance_minutes']);
        $this->assertSame(1, $data['review_total']);
        $this->assertSame(['early' => 1, 'le15' => 1], $this->waitBuckets($data));
        $this->assertSame(-6, $this->interviews()['data'][0]['wait_minutes']);
    }

    public function test_utc_transaction_times_are_compared_against_vietnam_interview_times(): void
    {
        config(['app.timezone' => 'UTC']);

        $respondent = $this->createRespondent('gotit', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createGotIt($respondent, '2026-10-01 07:40:00', 200000);

        $data = $this->statistics();

        $this->assertSame(0, $data['review_total']);
        $this->assertSame(10, $data['wait']['median_minutes']);
        $this->assertSame(1, $data['interview_hours'][14]);
        $this->assertSame(1, $data['gift_hours'][14]);
    }

    public function test_interview_times_are_returned_in_vietnam_time(): void
    {
        config(['app.timezone' => 'UTC']);

        $respondent = $this->createRespondent('gotit', '2026-10-01 14:00:00', '2026-10-01 14:30:00');
        $this->createGotIt($respondent, '2026-10-01 07:10:00', 200000);

        $row = $this->interviews()['data'][0];

        $this->assertSame('2026-10-01 14:30:00', $row['interview_end']);
        $this->assertSame('2026-10-01 14:10:00', $row['gift_time']);
        $this->assertSame(-20, $row['wait_minutes']);
    }

    public function test_test_environment_respondents_are_not_counted(): void
    {
        $respondent = $this->createRespondent('vinnet', '2026-10-01 09:10:00', '2026-10-01 09:40:00');
        DB::table('project_respondents')->where('id', $respondent)->update(['environment' => 'test']);
        $this->createVinnet($respondent, '2026-10-01 09:50:00', 100000);

        $this->assertSame(0, $this->statistics()['interviews']);
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

        $this->assertSame(2, $data['gifts']);
        $this->assertSame(1, $data['wait']['offline']);
        $this->assertSame(0, $data['wait']['unknown']);
        $this->assertSame(1, $data['wait']['measured']);
        $this->assertSame(1, array_sum($data['interview_hours']));
        $this->assertSame(0, $data['interview_hours'][8]);
        $this->assertSame(1, $data['gift_hours'][15]);
        $this->assertSame(['le15' => 1], $this->waitBuckets($data));
        $this->assertSame(10, $data['wait']['median_minutes']);
    }

    public function test_a_missing_interview_end_is_left_out_of_the_wait_instead_of_flagged(): void
    {
        $respondent = $this->createRespondent('gotit', '2026-10-01 14:00:00', null);
        $this->createGotIt($respondent, '2026-10-01 14:10:00', 200000);

        $data = $this->statistics();

        $this->assertSame(1, $data['gifts']);
        $this->assertSame(1, $data['wait']['unknown']);
        $this->assertSame(0, $data['review_total']);
        $this->assertSame([], $this->waitBuckets($data));
    }

    public function test_filters_by_project_channel_and_interview_date(): void
    {
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00'), '2026-10-01 09:40:00', 100000);
        $this->createGotIt($this->createRespondent('gotit', '2026-10-05 09:00:00', '2026-10-05 09:30:00'), '2026-10-05 09:40:00', 100000);
        $this->createGotIt($this->createRespondent('gotit', '2026-10-05 09:00:00', '2026-10-05 09:30:00', 2), '2026-10-05 09:40:00', 100000);

        $this->assertSame(3, $this->statistics([], 0)['gifts']);
        $this->assertSame(2, $this->statistics()['gifts']);
        $this->assertSame(1, $this->statistics(['channel' => 'gotit'])['gifts']);
        $this->assertSame(1, $this->statistics(['date_from' => '2026-10-02', 'date_to' => '2026-10-31'])['gifts']);
    }

    public function test_only_admin_and_finance_can_see_all_projects(): void
    {
        $this->assertSame(0, $this->statistics([], 0, 'Finance')['gifts']);
        $this->assertSame(0, $this->statistics([], 1, 'Scripter')['gifts']);

        $this->expectException(AuthorizationException::class);
        $this->statistics([], 0, 'Scripter');
    }

    public function test_date_to_includes_the_whole_last_day(): void
    {
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-31 23:30:00', '2026-10-31 23:50:00'), '2026-10-31 23:55:00', 100000);
        $this->createVinnet($this->createRespondent('vinnet', '2026-11-01 00:10:00', '2026-11-01 00:40:00'), '2026-11-01 00:45:00', 100000);

        $this->assertSame(1, $this->statistics(['date_from' => '2026-10-31', 'date_to' => '2026-10-31'])['gifts']);
    }

    public function test_a_respondent_paid_by_both_providers_uses_the_earlier_gift(): void
    {
        $respondent = $this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00');
        $this->createVinnet($respondent, '2026-10-01 11:00:00', 100000);
        $this->createGotIt($respondent, '2026-10-01 09:40:00', 50000);

        $data = $this->statistics();

        $this->assertSame(1, $data['gifts']);
        $this->assertEquals(150000, $data['amount']);
        $this->assertSame(10, $data['wait']['median_minutes']);
        $this->assertSame(1, $data['gift_hours'][9]);
    }

    public function test_interviewers_are_counted_by_code_with_their_gifts_and_median_wait(): void
    {
        // PVV01: three interviews, two gifts (waits of 10 and 30 minutes). PVV02: one interview that needs review.
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00'), '2026-10-01 09:40:00', 100000);
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 10:00:00', '2026-10-01 10:30:00'), '2026-10-01 11:00:00', 50000);
        $this->createRespondent('vinnet', '2026-10-02 10:00:00', '2026-10-02 10:30:00');
        $this->createGotIt($this->createRespondent('gotit', '2026-10-02 14:00:00', '2026-10-02 14:30:00', 1, 2), '2026-10-02 14:10:00', 200000);

        $data = $this->statistics();

        $this->assertSame(4, $data['interviews']);
        $this->assertSame(3, $data['gifts']);
        $this->assertEquals([
            ['employee_id' => 'PVV01', 'employee_name' => 'Nguyen An', 'interviews' => 3, 'gifts' => 2, 'amount' => 150000, 'review' => 0, 'median_wait_minutes' => 20],
            ['employee_id' => 'PVV02', 'employee_name' => 'Tran Binh', 'interviews' => 1, 'gifts' => 1, 'amount' => 200000, 'review' => 1, 'median_wait_minutes' => -20],
        ], $data['by_employee']);
        $this->assertSame([], $data['by_project']);
    }

    public function test_days_and_the_week_grid_follow_the_interview_start(): void
    {
        // 1 Oct 2026 is a Thursday.
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00'), '2026-10-01 09:40:00', 100000);
        $this->createGotIt($this->createRespondent('gotit', '2026-10-01 20:00:00', '2026-10-01 20:30:00'), '2026-10-01 20:40:00', 50000);
        $this->createRespondent('vinnet', '2026-10-03 09:00:00', '2026-10-03 09:30:00');

        $data = $this->statistics();

        $this->assertEquals([
            ['date' => '2026-10-01', 'interviews' => 2, 'gifts' => ['vinnet' => 1, 'gotit' => 1, 'other' => 0], 'amount' => ['vinnet' => 100000, 'gotit' => 50000, 'other' => 0]],
            ['date' => '2026-10-03', 'interviews' => 1, 'gifts' => ['vinnet' => 0, 'gotit' => 0, 'other' => 0], 'amount' => ['vinnet' => 0, 'gotit' => 0, 'other' => 0]],
        ], $data['daily']);
        $this->assertSame(1, $data['weekday_hours'][3][9]);
        $this->assertSame(1, $data['weekday_hours'][3][20]);
        $this->assertSame(1, $data['weekday_hours'][5][9]);
        $this->assertSame(3, array_sum(array_map('array_sum', $data['weekday_hours'])));
    }

    public function test_a_breakdown_ignores_the_filter_on_its_own_dimension(): void
    {
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00'), '2026-10-01 09:40:00', 100000);
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 10:00:00', '2026-10-01 10:30:00'), '2026-10-01 11:00:00', 100000);
        $this->createGotIt($this->createRespondent('gotit', '2026-10-02 14:00:00', '2026-10-02 14:30:00', 1, 2), '2026-10-02 14:10:00', 200000);

        $byInterviewer = $this->statistics(['employee' => 'PVV02']);
        $this->assertSame(1, $byInterviewer['interviews']);
        $this->assertEquals(200000, $byInterviewer['amount']);
        $this->assertSame(['early' => 1], $this->waitBuckets($byInterviewer));
        $this->assertSame(['PVV01', 'PVV02'], array_column($byInterviewer['by_employee'], 'employee_id'));

        $byWait = $this->statistics(['wait' => 'le60']);
        $this->assertSame(1, $byWait['interviews']);
        $this->assertSame(['early' => 1, 'le15' => 1, 'le60' => 1], $this->waitBuckets($byWait));
        $this->assertSame([['PVV01', 1]], array_map(fn ($e) => [$e['employee_id'], $e['interviews']], $byWait['by_employee']));

        // Friday 2 October, 14:00.
        $bySlot = $this->statistics(['weekday' => 5, 'hour' => 14]);
        $this->assertSame(1, $bySlot['interviews']);
        $this->assertSame(3, array_sum($bySlot['interview_hours']));
        $this->assertSame(['PVV02'], array_column($bySlot['by_employee'], 'employee_id'));
    }

    public function test_all_projects_are_broken_down_by_project(): void
    {
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00'), '2026-10-01 09:40:00', 100000);
        $this->createRespondent('vinnet', '2026-10-01 10:00:00', '2026-10-01 10:30:00');
        $this->createGotIt($this->createRespondent('gotit', '2026-10-05 09:00:00', '2026-10-05 09:30:00', 2), '2026-10-05 09:40:00', 300000);

        $this->assertEquals([
            ['project_id' => 1, 'internal_code' => 'VN2601', 'project_name' => 'Brand tracker', 'interviews' => 2, 'gifts' => 1, 'amount' => 100000, 'review' => 0, 'median_wait_minutes' => 10],
            ['project_id' => 2, 'internal_code' => 'VN2602', 'project_name' => 'Product test', 'interviews' => 1, 'gifts' => 1, 'amount' => 300000, 'review' => 0, 'median_wait_minutes' => 10],
        ], $this->statistics([], 0)['by_project']);
    }

    public function test_a_date_range_is_compared_with_the_period_before_it(): void
    {
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-05 09:00:00', '2026-10-05 09:30:00'), '2026-10-05 09:40:00', 100000);
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-09 09:00:00', '2026-10-09 09:30:00'), '2026-10-09 09:40:00', 100000);
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-12 09:00:00', '2026-10-12 09:30:00'), '2026-10-12 09:50:00', 250000);
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00'), '2026-10-01 09:40:00', 999000);

        $data = $this->statistics(['date_from' => '2026-10-10', 'date_to' => '2026-10-16']);

        $this->assertSame(1, $data['gifts']);
        $this->assertEquals([
            'date_from' => '2026-10-03',
            'date_to' => '2026-10-09',
            'interviews' => 2,
            'gifts' => 2,
            'amount' => 200000,
            'median_wait_minutes' => 10,
            'review_total' => 0,
        ], $data['previous']);
        $this->assertNull($this->statistics(['date_from' => '2026-10-10'])['previous']);
    }

    public function test_the_interview_list_is_searched_sorted_and_paged(): void
    {
        $first = $this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00');
        $this->createVinnet($first, '2026-10-01 09:40:00', 100000);
        $second = $this->createRespondent('vinnet', '2026-10-02 09:00:00', '2026-10-02 09:30:00');
        $this->createVinnet($second, '2026-10-02 12:30:00', 300000);
        $noGift = $this->createRespondent('vinnet', '2026-10-03 09:00:00', '2026-10-03 09:30:00');
        $early = $this->createRespondent('gotit', '2026-10-04 14:00:00', '2026-10-04 14:30:00', 1, 2);
        $this->createGotIt($early, '2026-10-04 14:10:00', 200000);

        $all = $this->interviews(['view' => 'all']);
        $this->assertSame(['review' => 1, 'all' => 4, 'no_gift' => 1], $all['meta']['counts']);
        $this->assertSame([$early, $noGift, $second, $first], array_column($all['data'], 'id'));

        $byWait = $this->interviews(['view' => 'all', 'sort' => 'wait_minutes', 'direction' => 'desc']);
        $this->assertSame([$second, $first, $early, $noGift], array_column($byWait['data'], 'id'));

        $paged = $this->interviews(['view' => 'all', 'sort' => 'amount', 'direction' => 'desc', 'per_page' => 2, 'page' => 2]);
        $this->assertSame(4, $paged['meta']['total']);
        $this->assertSame([$first, $noGift], array_column($paged['data'], 'id'));

        $this->assertSame([$early], array_column($this->interviews(['view' => 'all', 'search' => 'PVV02'])['data'], 'id'));
        $this->assertSame([$second], array_column($this->interviews(['view' => 'all', 'search' => '0900000002'])['data'], 'id'));
        $this->assertSame([$early], array_column($this->interviews(['view' => 'all', 'employee' => 'PVV02'])['data'], 'id'));
        $this->assertSame([$second], array_column($this->interviews(['view' => 'all', 'wait' => 'le360'])['data'], 'id'));
        $this->assertSame([], $this->interviews(['view' => 'all', 'search' => '100%'])['data']);
    }

    public function test_the_export_holds_the_filtered_interviews_with_masked_phones(): void
    {
        $this->createVinnet($this->createRespondent('vinnet', '2026-10-01 09:00:00', '2026-10-01 09:30:00'), '2026-10-01 09:40:00', 100000);
        $this->createRespondent('vinnet', '2026-10-03 09:00:00', '2026-10-03 09:30:00');
        $this->createGotIt($this->createRespondent('gotit', '2026-10-04 14:00:00', '2026-10-04 14:30:00', 1, 2), '2026-10-04 14:10:00', 200000);

        $sheet = $this->export(['view' => 'all']);

        $this->assertCount(4, $sheet);
        $this->assertSame(
            ['Project code', 'Project name', 'Respondent ID', 'Phone', 'Channel', 'Interviewer ID', 'Interviewer', 'Interview start', 'Interview end', 'Gift received', 'Gift value', 'Wait (minutes)', 'Gift status', 'Offline import', 'Needs review'],
            $sheet[0]
        );
        $this->assertEquals(
            ['VN2601', 'Brand tracker', 'R1', '090****001', 'vinnet', 'PVV01', 'Nguyen An', '2026-10-01 09:00:00', '2026-10-01 09:30:00', '2026-10-01 09:40:00', 100000, 10, 'success', 'No', 'No'],
            $sheet[1]
        );
        $this->assertSame([null, null, 'failed', 'No', 'No'], array_slice($sheet[2], 10));
        $this->assertEquals([200000, -20, 'success', 'No', 'Yes'], array_slice($sheet[3], 10));

        $this->assertSame(['R3'], array_column(array_slice($this->export(['view' => 'review']), 1), 2));
        $this->assertSame(['R3'], array_column(array_slice($this->export(['view' => 'all', 'employee' => 'PVV02']), 1), 2));
    }

    private function waitBuckets(array $data): array
    {
        return array_filter(array_column($data['wait']['buckets'], 'count', 'key'));
    }

    private function statistics(array $query = [], int $projectId = 1, string $role = 'Admin'): array
    {
        $request = $this->request(TransactionStatisticsRequest::class, $query, $projectId, $role);
        $response = (new TransactionController())->statistics($request, new TransactionStatisticsService(), $projectId);

        $this->assertSame(200, $response->getStatusCode(), json_encode($response->getData(true)));

        return $response->getData(true)['data'];
    }

    private function interviews(array $query = [], int $projectId = 1): array
    {
        $request = $this->request(TransactionStatisticsInterviewsRequest::class, $query, $projectId, 'Admin');
        $response = (new TransactionController())->statisticsInterviews($request, new TransactionStatisticsService(), $projectId);

        $this->assertSame(200, $response->getStatusCode(), json_encode($response->getData(true)));

        return $response->getData(true);
    }

    private function export(array $query = [], int $projectId = 1): array
    {
        $request = $this->request(TransactionStatisticsInterviewsRequest::class, $query, $projectId, 'Admin');
        $response = (new TransactionController())->exportStatisticsInterviews($request, new TransactionStatisticsService(), $projectId);

        $path = $response->getFile()->getPathname();
        $rows = IOFactory::load($path)->getActiveSheet()->toArray(null, false, false);
        unlink($path);

        return $rows;
    }

    private function request(string $class, array $query, int $projectId, string $role): TransactionStatisticsRequest
    {
        $request = $class::create("/projects/{$projectId}/transactions/statistics", 'GET', $query);
        $request->setContainer($this->app)->setRedirector($this->app['redirect']);
        $request->setRouteResolver(fn() => (new Route('GET', 'projects/{projectId}/transactions/statistics', []))->bind($request));
        $request->setUserResolver(fn() => $this->userWithRole($role));
        $request->validateResolved();

        return $request;
    }

    private function userWithRole(string $role): User
    {
        $details = new UserDetail();
        $details->setRelation('role', new Role(['name' => $role]));

        $user = new User();
        $user->setRelation('userDetails', $details);

        return $user;
    }

    private function createRespondent(string $channel, ?string $start, ?string $end, int $projectId = 1, int $employeeId = 1): int
    {
        $id = $this->nextRespondentId++;

        DB::table('project_respondents')->insert([
            'id' => $id,
            'project_id' => $projectId,
            'employee_id' => $employeeId,
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
