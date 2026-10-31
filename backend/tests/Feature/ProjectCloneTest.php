<?php

namespace Tests\Feature;

use App\Http\Controllers\ProjectController;
use App\Http\Requests\CloneProjectRequest;
use App\Models\Project;
use App\Models\ProjectDetail;
use App\Models\ProjectProvince;
use App\Models\Quotation;
use App\Models\User;
use App\Services\ProjectCloneService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ProjectCloneTest extends TestCase
{
    private const SOURCE_ID = 1;
    private const OWNER_ID = 1;
    private const CLONER_ID = 2;
    private const OUTSIDER_ID = 3;
    private const HO_CHI_MINH = 79;

    private const OPTIONS = [
        'project_name' => 'NEW STUDY',
        'planned_field_start' => '2026-12-01',
        'planned_field_end' => '2026-12-31',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        // The real migrations reuse index names, which SQLite rejects, so build only what cloning touches.
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('password')->nullable();
            $table->timestamps();
        });
        Schema::create('user_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id');
            $table->foreignId('role_id');
            $table->timestamps();
        });
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code')->unique();
            $table->string('project_name');
            $table->boolean('disabled')->default(false);
            $table->timestamps();
        });
        Schema::create('project_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->string('symphony')->nullable();
            $table->string('job_number')->nullable();
            $table->text('project_objectives')->nullable();
            $table->string('status')->default('planned');
            $table->foreignId('created_user_id');
            $table->string('platform');
            $table->datetime('planned_field_start');
            $table->datetime('planned_field_end');
            $table->datetime('actual_field_start')->nullable();
            $table->datetime('actual_field_end')->nullable();
            $table->string('remember_token', 100);
            $table->string('remember_uuid');
            $table->timestamps();
        });
        foreach (['project_types', 'teams', 'provinces'] as $name) {
            Schema::create($name, function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->timestamps();
            });
        }
        foreach (['project_project_types' => 'project_type_id', 'project_teams' => 'team_id', 'project_permissions' => 'user_id'] as $name => $column) {
            Schema::create($name, function (Blueprint $table) use ($column) {
                $table->id();
                $table->foreignId('project_id');
                $table->foreignId($column);
                $table->timestamps();
            });
        }
        Schema::create('project_provinces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('province_id');
            $table->integer('sample_size_main');
            $table->decimal('price_main', 15, 2);
            $table->decimal('price_main_1', 15, 2)->nullable();
            $table->timestamps();
        });
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->json('data');
            $table->json('feedbacks')->nullable();
            $table->integer('version');
            $table->string('status')->default('draft');
            $table->foreignId('created_user_id');
            $table->foreignId('updated_user_id')->nullable();
            $table->foreignId('submitted_user_id')->nullable();
            $table->foreignId('approved_user_id')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('fm_confirmed_user_id')->nullable();
            $table->timestamp('fm_confirmed_at')->nullable();
            $table->timestamps();
        });
        Schema::create('project_respondents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->timestamps();
        });

        DB::table('roles')->insert([['id' => 1, 'name' => 'Admin'], ['id' => 2, 'name' => 'Researcher']]);
        DB::table('users')->insert([
            ['id' => self::OWNER_ID, 'name' => 'Owner', 'email' => 'owner@example.com'],
            ['id' => self::CLONER_ID, 'name' => 'Cloner', 'email' => 'cloner@example.com'],
            ['id' => self::OUTSIDER_ID, 'name' => 'Outsider', 'email' => 'outsider@example.com'],
        ]);
        DB::table('user_details')->insert([
            ['user_id' => self::OWNER_ID, 'role_id' => 2],
            ['user_id' => self::CLONER_ID, 'role_id' => 2],
            ['user_id' => self::OUTSIDER_ID, 'role_id' => 2],
        ]);
        DB::table('project_types')->insert(['id' => 1, 'name' => 'Ad-hoc']);
        DB::table('teams')->insert([['id' => 1, 'name' => 'Team A'], ['id' => 2, 'name' => 'Team B']]);
        DB::table('provinces')->insert(['id' => self::HO_CHI_MINH, 'name' => 'Hồ Chí Minh']);

        DB::table('projects')->insert(['id' => self::SOURCE_ID, 'internal_code' => '2026-0001', 'project_name' => 'OLD STUDY']);
        DB::table('project_details')->insert([
            'project_id' => self::SOURCE_ID,
            'symphony' => 'SYM-1',
            'job_number' => 'JOB-1',
            'project_objectives' => 'Measure awareness',
            'status' => 'completed',
            'created_user_id' => self::OWNER_ID,
            'platform' => 'ifield',
            'planned_field_start' => '2026-01-01',
            'planned_field_end' => '2026-01-31',
            'actual_field_start' => '2026-01-02',
            'actual_field_end' => '2026-02-02',
            'remember_token' => 'old-token',
            'remember_uuid' => 'old-uuid',
        ]);
        DB::table('project_project_types')->insert(['project_id' => self::SOURCE_ID, 'project_type_id' => 1]);
        DB::table('project_teams')->insert([
            ['project_id' => self::SOURCE_ID, 'team_id' => 1],
            ['project_id' => self::SOURCE_ID, 'team_id' => 2],
        ]);
        DB::table('project_permissions')->insert([
            ['project_id' => self::SOURCE_ID, 'user_id' => self::OWNER_ID],
            ['project_id' => self::SOURCE_ID, 'user_id' => self::CLONER_ID],
        ]);
        DB::table('project_provinces')->insert([
            'project_id' => self::SOURCE_ID,
            'province_id' => self::HO_CHI_MINH,
            'sample_size_main' => 100,
            'price_main' => 50000,
            'price_main_1' => 70000,
        ]);
        DB::table('project_respondents')->insert(['project_id' => self::SOURCE_ID]);

        $quotationData = ['project_information' => ['internal_code' => '2026-0001', 'project_name' => 'OLD STUDY', 'client_name' => 'ACME']];
        DB::table('quotations')->insert([
            ['project_id' => self::SOURCE_ID, 'data' => json_encode(['internal_code' => '2026-0001']), 'version' => 1, 'status' => 'rejected', 'created_user_id' => self::OWNER_ID, 'approved_user_id' => null, 'feedbacks' => null],
            ['project_id' => self::SOURCE_ID, 'data' => json_encode($quotationData), 'version' => 2, 'status' => 'approved', 'created_user_id' => self::OWNER_ID, 'approved_user_id' => self::OWNER_ID, 'feedbacks' => json_encode([['message' => 'ok']])],
        ]);
    }

    public function test_clone_copies_the_setup_and_resets_the_run_state(): void
    {
        $clone = $this->cloneAs(self::CLONER_ID);

        $this->assertNotSame(self::SOURCE_ID, $clone->id);
        $this->assertSame('NEW STUDY', $clone->project_name);
        $this->assertSame(date('Y') . '-' . str_pad($clone->id, 4, '0', STR_PAD_LEFT), $clone->internal_code);

        $details = $clone->projectDetails;
        $this->assertSame('planned', $details->status);
        $this->assertSame('ifield', $details->platform);
        $this->assertSame('Measure awareness', $details->project_objectives);
        $this->assertSame(self::CLONER_ID, (int) $details->created_user_id);
        $this->assertSame('2026-12-01', $details->planned_field_start->format('Y-m-d'));
        $this->assertNull($details->actual_field_start);
        $this->assertNull($details->symphony);
        $this->assertNull($details->job_number);
        $this->assertNotSame('old-token', $details->remember_token);
        $this->assertNotSame('old-uuid', $details->remember_uuid);

        $this->assertEquals([1], $clone->projectTypes->pluck('id')->all());
        $this->assertEquals([1, 2], $clone->teams->pluck('id')->sort()->values()->all());
        $this->assertEquals([self::CLONER_ID], $clone->projectPermissions->pluck('id')->all());

        $price = ProjectProvince::where('project_id', $clone->id)->sole();
        $this->assertSame(self::HO_CHI_MINH, (int) $price->province_id);
        $this->assertEquals(100, $price->sample_size_main);
        $this->assertEquals(70000, $price->price_main_1);
        $this->assertSame(1, ProjectProvince::where('project_id', self::SOURCE_ID)->count());

        $this->assertSame(0, DB::table('project_respondents')->where('project_id', $clone->id)->count());
    }

    public function test_clone_copies_the_latest_quotation_as_a_fresh_draft(): void
    {
        $clone = $this->cloneAs(self::CLONER_ID);

        $quotation = Quotation::where('project_id', $clone->id)->sole();
        $this->assertSame(1, $quotation->version);
        $this->assertSame('draft', $quotation->status);
        $this->assertSame(self::CLONER_ID, (int) $quotation->created_user_id);
        $this->assertNull($quotation->approved_user_id);
        $this->assertNull($quotation->feedbacks);
        $this->assertSame([
            'project_information' => [
                'internal_code' => $clone->internal_code,
                'project_name' => 'NEW STUDY',
                'client_name' => 'ACME',
            ],
        ], $quotation->data);

        $this->assertSame(2, Quotation::where('project_id', self::SOURCE_ID)->count());
    }

    public function test_clone_without_quotation_and_prices_starts_from_a_default_quotation(): void
    {
        $clone = $this->cloneAs(self::CLONER_ID, ['include_prices' => false, 'include_quotation' => false]);

        $this->assertSame(0, ProjectProvince::where('project_id', $clone->id)->count());

        $quotation = Quotation::where('project_id', $clone->id)->sole();
        $this->assertSame($clone->internal_code, $quotation->data['internal_code']);
        $this->assertSame('NEW STUDY', $quotation->data['project_name']);
        $this->assertSame([['value' => 1, 'label' => 'Ad-hoc']], $quotation->data['project_types']);
        $this->assertSame('2026-12-31', $quotation->data['planned_field_end']);
    }

    public function test_clone_with_permissions_keeps_the_source_users(): void
    {
        $clone = $this->cloneAs(self::CLONER_ID, ['include_permissions' => true]);

        $this->assertEquals(
            [self::OWNER_ID, self::CLONER_ID],
            $clone->projectPermissions->pluck('id')->sort()->values()->all()
        );
    }

    public function test_endpoint_returns_the_new_project(): void
    {
        $this->actingAs(User::find(self::CLONER_ID));

        $response = (new ProjectController())->cloneProject($this->validated(self::OPTIONS), self::SOURCE_ID, new ProjectCloneService());

        $this->assertSame(201, $response->getStatusCode());
        $data = $response->getData(true)['data'];
        $this->assertSame('NEW STUDY', $data['project_name']);
        $this->assertSame('planned', $data['status']);
        $this->assertSame(2, Project::count());
    }

    public function test_user_without_access_to_the_source_cannot_clone_it(): void
    {
        $this->actingAs(User::find(self::OUTSIDER_ID));

        $response = (new ProjectController())->cloneProject($this->validated(self::OPTIONS), self::SOURCE_ID, new ProjectCloneService());

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame(1, Project::count());
    }

    public function test_cloning_a_missing_project_returns_not_found(): void
    {
        $this->actingAs(User::find(self::CLONER_ID));

        $response = (new ProjectController())->cloneProject($this->validated(self::OPTIONS), 999, new ProjectCloneService());

        $this->assertSame(404, $response->getStatusCode());
    }

    public function test_clone_rejects_invalid_input(): void
    {
        foreach ([
            'missing name' => ['project_name' => ''],
            'invalid start' => ['planned_field_start' => 'not-a-date'],
            'end before start' => ['planned_field_end' => '2026-11-30'],
            'non boolean flag' => ['include_prices' => 'maybe'],
        ] as $case => $override) {
            try {
                $this->validated(array_merge(self::OPTIONS, $override));
                $this->fail("Expected a validation error for: {$case}");
            } catch (ValidationException $e) {
                $this->addToAssertionCount(1);
            }
        }
    }

    private function cloneAs(int $userId, array $options = []): Project
    {
        return (new ProjectCloneService())->cloneProject(
            Project::findOrFail(self::SOURCE_ID),
            User::findOrFail($userId),
            $this->validated(array_merge(self::OPTIONS, $options))->validated()
        );
    }

    private function validated(array $data): FormRequest
    {
        $request = CloneProjectRequest::create('/', 'POST', $data);
        $request->setContainer($this->app)->setRedirector($this->app['redirect']);
        $request->validateResolved();

        return $request;
    }
}
