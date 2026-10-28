<?php

namespace Tests\Feature;

use App\Exports\StreamedXlsxExport;
use App\Exports\TransactionsByProjectsExport;
use App\Exports\TransactionsExport;
use App\Services\VinnetService;
use App\Services\XlsxStreamWriter;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;
use ZipArchive;

class TransactionsExportTest extends TestCase
{
    private function transactionRow(array $overrides = []): object
    {
        return (object) array_merge([
            'month' => 10,
            'invoice_comment' => 'comment',
            'transaction_id' => 'txn-1',
            'service_code' => null,
            'created_at' => '2026-10-01 10:00:00',
            'channel' => 'vinnet',
            'phone_number' => null,
            'amount' => '50000',
            'discount' => null,
            'payment_amt' => null,
            'thanh_toan' => null,
            'status' => 'Thành công',
            'project_name' => 'Project',
            'province_name' => 'Hà Nội',
            'internal_code' => 'P001',
            'symphony' => '123',
            'shell_chainid' => 'S1',
            'respondent_id' => 'R1',
            'respondent_phone_number' => '12',
            'employee_id' => 'E1',
            'first_name' => 'A',
            'last_name' => 'B',
            'interview_start' => null,
            'interview_end' => null,
        ], $overrides);
    }

    public function test_rows_with_missing_phone_or_service_code_do_not_break_the_export(): void
    {
        $export = new TransactionsExport('2026-10-01', '2026-10-31', 'finance', new VinnetService());

        $vinnetRow = $export->map($this->transactionRow());
        $gotitRow = $export->map($this->transactionRow(['channel' => 'gotit', 'phone_number' => '0901']));

        $this->assertCount(count($export->headings()), $vinnetRow);
        $this->assertSame('', $vinnetRow[9]);
        $this->assertSame('0901', $gotitRow[9]);
    }

    public function test_phone_numbers_are_still_masked(): void
    {
        $export = new TransactionsByProjectsExport([1], 'finance', new VinnetService());

        $row = $export->map($this->transactionRow([
            'respondent_phone_number' => '0901234567',
            'phone_number' => '12',
            'project_respondent_status' => 'ok',
            'reject_message' => null,
            'location_id' => null,
            'environment' => 'live',
            'delivery_method' => 'sms',
        ]));

        $this->assertSame('090****567', $row[10]);
        $this->assertSame('12', $row[11]);
    }

    public function test_stream_writer_produces_a_readable_workbook(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'xlsx_test_');

        (new XlsxStreamWriter())->write($path, ['ID', 'Phone', 'Name', 'Amount'], (function () {
            yield ['1', '0901234567', "Tiếng Việt & <b>\x01", '50000'];
            yield ['12345678901234567890', null, '', 1500.5];
        })());

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path));

        $sheet = simplexml_load_string($zip->getFromName('xl/worksheets/sheet1.xml'));
        $this->assertNotFalse($zip->getFromName('xl/workbook.xml'));
        $zip->close();
        unlink($path);

        $rows = $sheet->sheetData->row;
        $this->assertCount(3, $rows);

        $cells = $rows[1]->c;
        $this->assertSame('1', (string) $cells[0]->v);
        $this->assertSame('inlineStr', (string) $cells[1]['t']);
        $this->assertSame('0901234567', (string) $cells[1]->is->t);
        $this->assertSame('Tiếng Việt & <b>', (string) $cells[2]->is->t);
        $this->assertSame('D2', (string) $cells[3]['r']);

        $cells = $rows[2]->c;
        $this->assertSame('inlineStr', (string) $cells[0]['t']);
        $this->assertSame('D3', (string) $cells[1]['r']);
    }

    public function test_download_streams_every_row_of_the_query(): void
    {
        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('phone')->nullable();
        });

        DB::table('items')->insert(array_map(fn ($i) => ['phone' => $i % 2 ? '0901234567' : null], range(1, 2500)));

        $export = new class extends StreamedXlsxExport {
            public function query(): Builder
            {
                return DB::table('items')->orderBy('id');
            }

            public function headings(): array
            {
                return ['ID', 'Phone'];
            }

            public function map($row): array
            {
                return [$row->id, $this->maskPhone($row->phone)];
            }
        };

        $response = $export->download('items.xlsx');
        $path = $response->getFile()->getPathname();

        $this->assertStringContainsString('items.xlsx', $response->headers->get('Content-Disposition'));

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path));
        $sheet = simplexml_load_string($zip->getFromName('xl/worksheets/sheet1.xml'));
        $zip->close();
        unlink($path);

        $this->assertCount(2501, $sheet->sheetData->row);
        $this->assertSame('090****567', (string) $sheet->sheetData->row[1]->c[1]->is->t);
    }
}
