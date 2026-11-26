<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectRespondent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RespondentEnvironmentTest extends TestCase
{
    public function test_live_or_test_follows_project_status_and_field_codes(): void
    {
        $cases = [
            // status, interviewer code, location, expected
            [Project::STATUS_PLANNED, 'HN001', 'HN_A1', 'live'],
            [Project::STATUS_IN_COMING, 'HN001', 'HN_A1', 'test'],
            [Project::STATUS_ON_HOLD, 'HN001', 'HN_A1', 'test'],
            [Project::STATUS_ON_GOING, 'HN001', 'HN_A1', 'live'],
            [Project::STATUS_ON_GOING, 'ma002', 'ma_b2', 'live'],
            [Project::STATUS_ON_GOING, 'QC001', 'HN_A1', 'test'],
            [Project::STATUS_ON_GOING, 'HN001', '', 'test'],
            [Project::STATUS_ON_GOING, 'HN001', '_defaultsp', 'test'],
            [Project::STATUS_ON_GOING, 'HN001', null, 'test'],
            [Project::STATUS_ON_GOING, null, 'HN_A1', 'test'],
            [Project::STATUS_COMPLETED, 'QC001', 'SG_C3', 'live'],
        ];

        foreach ($cases as [$status, $employee, $location, $expected]) {
            $this->assertSame(
                $expected,
                ProjectRespondent::environmentFor($status, $employee, $location),
                "status={$status}, interviewer={$employee}, location={$location}"
            );
        }
    }

    public function test_a_respondent_imported_before_fieldwork_turns_live_once_the_project_is_in_field(): void
    {
        $this->useInMemoryTables();

        $projectId = DB::table('projects')->insertGetId(['project_name' => 'Clone of Vinamilk', 'internal_code' => 'VN2605']);
        DB::table('project_details')->insert(['project_id' => $projectId, 'status' => Project::STATUS_IN_COMING]);
        $employeeId = DB::table('employees')->insertGetId(['employee_id' => 'HN001']);
        $respondentId = DB::table('project_respondents')->insertGetId([
            'project_id' => $projectId,
            'employee_id' => $employeeId,
            'location_id' => 'HN_A1',
            'environment' => ProjectRespondent::ENVIRONMENT_TEST,
        ]);

        $respondent = ProjectRespondent::find($respondentId);
        $this->assertSame('test', $respondent->syncEnvironment());

        DB::table('project_details')->where('project_id', $projectId)->update(['status' => Project::STATUS_ON_GOING]);

        $respondent = ProjectRespondent::find($respondentId);
        $this->assertSame('live', $respondent->currentEnvironment());
        $this->assertSame('live', $respondent->syncEnvironment());
        $this->assertSame('live', DB::table('project_respondents')->where('id', $respondentId)->value('environment'));
    }

    private function useInMemoryTables(): void
    {
        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        // The real migrations reuse index names, which SQLite rejects, so build only what the rule reads.
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code')->nullable();
            $table->string('project_name');
            $table->timestamps();
        });
        Schema::create('project_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('status')->default(Project::STATUS_PLANNED);
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
            $table->string('location_id')->nullable();
            $table->string('environment')->nullable();
            $table->timestamps();
        });
    }
}
