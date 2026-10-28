<?php

namespace Tests\Feature;

use App\Http\Requests\ImportCATIRespondentsRequest;
use App\Models\CATIBatch;
use App\Services\CATIRespondentImportService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class CATIRespondentImportTest extends TestCase
{
    private const PROJECT_ID = 1;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        Schema::create('cati_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->string('name');
            $table->string('status')->default('active');
            $table->integer('total_records')->default(0);
            $table->foreignId('created_user_id');
            $table->timestamps();
        });

        Schema::create('cati_respondents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id');
            $table->foreignId('batch_id');
            $table->string('respondent_id');
            $table->string('phone');
            $table->string('name')->nullable();
            $table->text('link')->nullable();
            $table->string('filter_1')->nullable();
            $table->string('filter_2')->nullable();
            $table->string('filter_3')->nullable();
            $table->string('filter_4')->nullable();
            $table->string('status')->default('New');
            $table->timestamps();

            $table->unique(['project_id', 'respondent_id']);
        });
    }

    private function batch(string $name = 'Batch 1'): CATIBatch
    {
        return CATIBatch::create([
            'project_id' => self::PROJECT_ID,
            'name' => $name,
            'status' => 'active',
            'created_user_id' => 1,
        ]);
    }

    private function row(int $row, string $id, array $overrides = []): array
    {
        return array_merge([
            'row' => $row,
            'respondent_id' => $id,
            'phone' => '0901234567',
            'name' => 'Respondent ' . $id,
            'link' => 'https://survey.example.com/s?id=' . $id,
            'filter_1' => 'A',
            'filter_2' => null,
            'filter_3' => null,
            'filter_4' => null,
        ], $overrides);
    }

    public function test_one_bad_row_no_longer_drops_the_rest_of_the_batch(): void
    {
        $rows = [];

        for ($i = 1; $i <= 1000; $i++) {
            $rows[] = $this->row($i + 1, 'R' . $i);
        }

        $rows[499]['phone'] = '123';
        $rows[700]['respondent_id'] = 'R1';

        $batch = $this->batch();

        $result = (new CATIRespondentImportService())->import($batch, $rows);

        $this->assertSame(998, $result['imported_count']);
        $this->assertSame(998, DB::table('cati_respondents')->count());
        $this->assertSame(998, $batch->fresh()->total_records);

        $this->assertSame([
            ['row' => 501, 'respondent_id' => 'R500', 'reason' => 'Phone must be a valid 10-digit number'],
            ['row' => 702, 'respondent_id' => 'R1', 'reason' => CATIRespondentImportService::REASON_DUPLICATE_IN_FILE],
        ], $result['skipped']);
    }

    public function test_ids_already_in_the_project_are_skipped_across_chunks_and_batches(): void
    {
        $service = new CATIRespondentImportService();

        $service->import($this->batch('Batch 1'), [$this->row(2, 'R1'), $this->row(3, 'R2')]);

        $result = $service->import($this->batch('Batch 2'), [$this->row(2, 'R1'), $this->row(3, 'R3')]);

        $this->assertSame(1, $result['imported_count']);
        $this->assertSame(CATIRespondentImportService::REASON_ALREADY_EXISTS, $result['skipped'][0]['reason']);
        $this->assertSame(3, DB::table('cati_respondents')->count());
    }

    public function test_values_from_excel_are_normalized(): void
    {
        $longLink = 'https://survey.example.com/s?' . str_repeat('token=abc&', 40);

        $result = (new CATIRespondentImportService())->import($this->batch(), [
            $this->row(2, '12345.0', ['phone' => '901 234 567', 'link' => $longLink, 'filter_1' => '  ']),
        ]);

        $this->assertSame(1, $result['imported_count']);

        $respondent = DB::table('cati_respondents')->first();

        $this->assertSame('12345', $respondent->respondent_id);
        $this->assertSame('0901234567', $respondent->phone);
        $this->assertSame($longLink, $respondent->link);
        $this->assertNull($respondent->filter_1);
        $this->assertSame('New', $respondent->status);
    }

    public function test_numbers_excel_stored_as_decimals_are_restored(): void
    {
        $result = (new CATIRespondentImportService())->import($this->batch(), [
            $this->row(2, '123.00', ['phone' => '313798999.0']),
        ]);

        $this->assertSame(1, $result['imported_count']);

        $respondent = DB::table('cati_respondents')->first();

        $this->assertSame('123', $respondent->respondent_id);
        $this->assertSame('0313798999', $respondent->phone);
    }

    public function test_rows_missing_required_fields_are_reported(): void
    {
        $result = (new CATIRespondentImportService())->import($this->batch(), [
            $this->row(2, 'R1', ['name' => null]),
            $this->row(3, 'R2', ['link' => 'not a url']),
            $this->row(4, ''),
        ]);

        $this->assertSame(0, $result['imported_count']);
        $this->assertSame(
            ['Respondent Name is required', 'Link must be a valid URL', 'Respondent ID is required'],
            array_column($result['skipped'], 'reason')
        );
    }

    public function test_request_limits_the_chunk_size_but_not_row_content(): void
    {
        $rules = (new ImportCATIRespondentsRequest())->rules();

        $valid = Validator::make([
            'batch_name' => 'Batch 1',
            'respondents' => [$this->row(2, 'R1', ['phone' => 'bad', 'name' => null])],
        ], $rules);

        $this->assertFalse($valid->fails());

        $tooMany = Validator::make([
            'batch_name' => 'Batch 1',
            'respondents' => array_map(fn ($i) => $this->row($i, 'R' . $i), range(1, ImportCATIRespondentsRequest::MAX_ROWS_PER_REQUEST + 1)),
        ], $rules);

        $this->assertTrue($tooMany->errors()->has('respondents'));
    }
}
