<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectRespondent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ListStatusFiltersTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        // The real migrations reuse index names, which SQLite rejects, so build only what the queries touch.
        Schema::create('project_respondents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('respondent_id')->nullable();
            $table->string('phone_number')->nullable();
            $table->string('respondent_phone_number')->nullable();
            $table->string('status')->nullable();
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code')->nullable();
            $table->string('project_name');
            $table->boolean('disabled')->default(false);
            $table->timestamps();
        });

        Schema::create('project_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('status')->nullable();
            $table->timestamps();
        });
    }

    public function test_stored_statuses_collapse_into_the_four_gift_statuses(): void
    {
        $this->assertSame('success', ProjectRespondent::giftStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED));
        $this->assertSame('pending', ProjectRespondent::giftStatus(ProjectRespondent::STATUS_RESPONDENT_PENDING));
        $this->assertSame('refused', ProjectRespondent::giftStatus(ProjectRespondent::STATUS_RESPONDENT_REJECTED));
        $this->assertSame('failed', ProjectRespondent::giftStatus(ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR));
        $this->assertSame('failed', ProjectRespondent::giftStatus(ProjectRespondent::ERROR_RESPONDENT_GIFT_INSUFFICIENT_BALANCE));
        $this->assertSame('failed', ProjectRespondent::giftStatus(null));
    }

    public function test_each_gift_status_filter_returns_only_its_respondents(): void
    {
        $this->respondent(1, 'R-1', ProjectRespondent::STATUS_RESPONDENT_PENDING);
        $this->respondent(1, 'R-2', ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED);
        $this->respondent(1, 'R-3', ProjectRespondent::STATUS_RESPONDENT_REJECTED);
        $this->respondent(1, 'R-4', ProjectRespondent::ERROR_RESPONDENT_GIFT_INSUFFICIENT_BALANCE);
        $this->respondent(1, 'R-5', ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR);
        $this->respondent(1, 'R-6', null);

        $ids = fn (string $status) => ProjectRespondent::query()->withGiftStatus($status)->orderBy('id')->pluck('respondent_id')->all();

        $this->assertSame(['R-1'], $ids('pending'));
        $this->assertSame(['R-2'], $ids('success'));
        $this->assertSame(['R-3'], $ids('refused'));
        $this->assertSame(['R-4', 'R-5', 'R-6'], $ids('failed'));
    }

    public function test_search_matches_respondent_id_and_phone_numbers_typed_with_spaces(): void
    {
        $this->respondent(1, 'SC903100-48210', ProjectRespondent::STATUS_RESPONDENT_PENDING, '0903412887', '0912556201');
        $this->respondent(1, 'SC903113-48217', ProjectRespondent::STATUS_RESPONDENT_PENDING, '0987330145', '0935221908');

        $ids = fn (?string $term) => ProjectRespondent::query()->search($term)->orderBy('id')->pluck('respondent_id')->all();

        $this->assertSame(['SC903100-48210'], $ids('0903 412'));
        $this->assertSame(['SC903113-48217'], $ids('0935221'));
        $this->assertSame(['SC903113-48217'], $ids('48217'));
        $this->assertSame([], $ids('0999'));
        $this->assertCount(2, $ids('  '));
    }

    public function test_gift_status_counts_follow_the_project_and_search(): void
    {
        $this->respondent(1, 'A-1', ProjectRespondent::STATUS_RESPONDENT_PENDING, '0903000001');
        $this->respondent(1, 'A-2', ProjectRespondent::STATUS_RESPONDENT_PENDING, '0903000002');
        $this->respondent(1, 'A-3', ProjectRespondent::STATUS_RESPONDENT_GIFT_RECEIVED, '0903000003');
        $this->respondent(1, 'A-4', ProjectRespondent::STATUS_RESPONDENT_GIFT_TEMPORARY_ERROR, '0911000004');
        $this->respondent(2, 'B-1', ProjectRespondent::STATUS_RESPONDENT_REJECTED, '0903000005');

        $projectOne = ProjectRespondent::query()->where('project_id', 1);

        $this->assertSame(
            ['pending' => 2, 'success' => 1, 'failed' => 1, 'refused' => 0],
            ProjectRespondent::giftStatusCounts($projectOne)
        );
        $this->assertSame(
            ['pending' => 2, 'success' => 1, 'failed' => 0, 'refused' => 0],
            ProjectRespondent::giftStatusCounts((clone $projectOne)->search('0903'))
        );
        // Counting must not change the query that is paginated afterwards.
        $this->assertSame(4, $projectOne->count());
    }

    public function test_project_status_filter_and_counts_use_the_project_details_status(): void
    {
        $this->project(1, 'Vinamilk Brand Health', Project::STATUS_ON_GOING);
        $this->project(2, 'Vinamilk Concept Test', Project::STATUS_IN_COMING);
        $this->project(3, 'Grab Food NPS', Project::STATUS_ON_GOING);
        $this->project(4, 'Vinamilk Retail Audit', Project::STATUS_COMPLETED);

        $vinamilk = Project::query()->where('project_name', 'like', '%Vinamilk%');

        $this->assertSame(
            ['planned' => 0, 'in coming' => 1, 'on going' => 1, 'completed' => 1, 'on hold' => 0, 'cancelled' => 0],
            Project::statusCounts($vinamilk)
        );
        $this->assertSame([1, 3], Project::query()->withStatus(Project::STATUS_ON_GOING)->orderBy('id')->pluck('id')->all());
        $this->assertSame([1], (clone $vinamilk)->withStatus(Project::STATUS_ON_GOING)->pluck('id')->all());
    }

    private function respondent(int $projectId, string $respondentId, ?string $status, ?string $phone = null, ?string $respondentPhone = null): void
    {
        DB::table('project_respondents')->insert([
            'project_id' => $projectId,
            'respondent_id' => $respondentId,
            'status' => $status,
            'phone_number' => $phone,
            'respondent_phone_number' => $respondentPhone,
        ]);
    }

    private function project(int $id, string $name, string $status): void
    {
        DB::table('projects')->insert(['id' => $id, 'internal_code' => "VN$id", 'project_name' => $name]);
        DB::table('project_details')->insert(['project_id' => $id, 'status' => $status]);
    }
}
