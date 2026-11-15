<?php

namespace Tests\Feature;

use App\Services\TemplateParserService;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class TemplateParserTest extends TestCase
{
    private array $tempFiles = [];

    protected function setUp(): void
    {
        parent::setUp();

        config(['cache.default' => 'array']);
    }

    protected function tearDown(): void
    {
        array_map('unlink', array_filter($this->tempFiles, 'file_exists'));

        parent::tearDown();
    }

    private function workbook(array $sheets): string
    {
        $book = new Spreadsheet();
        $book->removeSheetByIndex(0);
        foreach ($sheets as $name => $rows) {
            $book->createSheet()->setTitle($name)->fromArray($rows, null, 'A1', true);
        }

        $path = tempnam(sys_get_temp_dir(), 'template') . '.xlsx';
        (new Xlsx($book))->save($path);

        return $this->tempFiles[] = $path;
    }

    public function test_the_real_operations_template_parses(): void
    {
        $schema = (new TemplateParserService())->parse(storage_path('schema/operations_template.xlsx'), 'CLT');

        $this->assertSame(
            ['daily_interview_target', 'target_for_interviewers', 'interviewers_per_supervisor'],
            array_column($schema, 'name')
        );
        $this->assertSame(['number'], array_values(array_unique(array_column($schema, 'type'))));
        $this->assertFalse($schema[0]['hidden']);
    }

    public function test_columns_are_read_by_header_name_not_position(): void
    {
        // Operations-style CONFIG: no placeholder column, and project_types before options_key.
        $path = $this->workbook([
            'FIELDS' => [
                ['field_name', 'label', 'type', 'required', 'default_value', 'config_key', 'options_key', 'layout_xs', 'layout_sm', 'layout_md', 'project_types'],
                ['team', 'Team', 'repeater', null, null, 'TEAM', null, 12, null, null, 'CLT'],
            ],
            'CONFIG' => [
                ['group_key', 'field_name', 'label', 'type', 'required', 'default_value', 'project_types', 'options_key'],
                ['TEAM', 'role', 'Role', 'select', 1, null, 'CLT, F2F', 'excel:ROLES'],
                ['TEAM', 'headcount', 'Headcount', 'number', 0, 2, 'F2F', null],
            ],
            'SELECT' => [
                ['key', 'value', 'label'],
                ['ROLES', 'qc', 'Quality control'],
            ],
        ]);

        $config = (new TemplateParserService())->parse($path, 'CLT')[0]['fields'];

        $this->assertSame('select', $config[0]['type']);
        $this->assertTrue($config[0]['required']);
        $this->assertSame('', $config[0]['placeholder']);
        $this->assertSame([['value' => 'qc', 'label' => 'Quality control']], $config[0]['options']);
        $this->assertFalse($config[0]['hidden']);

        $this->assertSame('number', $config[1]['type']);
        $this->assertTrue($config[1]['hidden']);
    }

    public function test_a_field_shows_when_any_of_the_projects_types_matches(): void
    {
        $path = $this->workbook([
            'FIELDS' => [
                ['field_name', 'label', 'type', 'required', 'default_value', 'config_key', 'options_key', 'layout_xs', 'layout_sm', 'layout_md', 'project_types'],
                ['sample', 'Sample', 'number', null, null, null, null, 12, null, null, 'F2F'],
                ['venue', 'Venue', 'text', null, null, null, null, 12, null, null, 'CLT'],
                ['dialer', 'Dialer', 'text', null, null, null, null, 12, null, null, 'CATI'],
                ['untagged', 'Untagged', 'text', null, null, null, null, 12, null, null, null],
            ],
            'CONFIG' => [['group_key', 'field_name', 'label', 'placeholder', 'type', 'required', 'default_value', 'options_key', 'project_types']],
            'SELECT' => [['key', 'value', 'label']],
        ]);

        $hidden = array_column((new TemplateParserService())->parse($path, 'CLT,F2F'), 'hidden', 'name');

        $this->assertSame(['sample' => false, 'venue' => false, 'dialer' => true, 'untagged' => true], $hidden);
    }
}
