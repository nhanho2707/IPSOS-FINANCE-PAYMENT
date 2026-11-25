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

    public function test_the_date_export_reads_invoice_comments_and_keeps_cancelled_gotit_vouchers(): void
    {
        config([
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);
        DB::purge('sqlite');
        DB::connection()->getPdo()->sqliteCreateFunction('MONTH', fn ($date) => $date ? (int) substr($date, 5, 2) : null, 1);

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('internal_code');
            $table->string('project_name');
        });
        Schema::create('project_details', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->string('symphony')->nullable();
        });
        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
        });
        Schema::create('project_respondents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_id');
            $table->unsignedBigInteger('province_id');
            $table->unsignedBigInteger('employee_id');
            $table->string('shell_chainid')->nullable();
            $table->string('respondent_id')->nullable();
            $table->string('respondent_phone_number')->nullable();
            $table->string('phone_number')->nullable();
            $table->string('service_code')->nullable();
            $table->string('channel');
            $table->datetime('interview_start')->nullable();
            $table->datetime('interview_end')->nullable();
        });
        Schema::create('project_vinnet_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('vinnet_payservice_requuid')->nullable();
            $table->string('vinnet_token_message')->nullable();
            $table->string('vinnet_invoice_comment')->nullable();
            $table->double('total_amt')->default(0);
            $table->double('discount')->default(0);
            $table->double('payment_amt')->default(0);
            $table->timestamps();
        });
        // As on the live database before the invoice_comment migration.
        Schema::create('project_gotit_voucher_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('project_respondent_id');
            $table->string('transaction_ref_id')->nullable();
            $table->double('voucher_value')->default(0);
            $table->string('voucher_status')->nullable();
            $table->timestamps();
        });

        $migration = require database_path('migrations/2026_11_15_000000_add_invoice_comment_to_project_gotit_voucher_transactions_table.php');
        $migration->up();
        $this->assertTrue(Schema::hasColumn('project_gotit_voucher_transactions', 'invoice_comment'));
        // Running it again (or on a database that already has the column) changes nothing.
        $migration->up();

        DB::table('projects')->insert(['id' => 1, 'internal_code' => 'VN2604', 'project_name' => 'Brand tracker']);
        DB::table('project_details')->insert(['project_id' => 1, 'symphony' => '26-041293-01']);
        DB::table('provinces')->insert(['id' => 1, 'name' => 'Hà Nội']);
        DB::table('employees')->insert(['id' => 1, 'employee_id' => 'HN001']);

        $respondent = fn (int $id, string $channel) => DB::table('project_respondents')->insert([
            'id' => $id, 'project_id' => 1, 'province_id' => 1, 'employee_id' => 1, 'channel' => $channel,
            'respondent_id' => "R{$id}", 'phone_number' => '0903412887', 'service_code' => 'S0002',
        ]);
        $gotit = fn (int $respondentId, string $status, string $at) => DB::table('project_gotit_voucher_transactions')->insert([
            'project_respondent_id' => $respondentId, 'transaction_ref_id' => "G{$respondentId}", 'voucher_value' => 100000,
            'voucher_status' => $status, 'created_at' => $at, 'updated_at' => $at,
        ]);

        $respondent(1, 'vinnet');
        DB::table('project_vinnet_transactions')->insert([
            'project_respondent_id' => 1, 'vinnet_payservice_requuid' => 'V1', 'vinnet_token_message' => 'Thành công',
            'vinnet_invoice_comment' => 'Invoice 1', 'total_amt' => 50000, 'payment_amt' => 49000,
            'created_at' => '2026-10-05 10:00:00', 'updated_at' => '2026-10-05 10:00:00',
        ]);
        $respondent(2, 'gotit');
        $gotit(2, 'Voucher được cập nhật thành công.', '2026-10-06 10:00:00');
        DB::table('project_gotit_voucher_transactions')->where('project_respondent_id', 2)->update(['invoice_comment' => 'GotIt invoice 2']);
        $respondent(3, 'gotit');
        $gotit(3, 'Voucher được cancelled by GotIt ngày 20/10/2026', '2026-10-07 10:00:00');
        $respondent(4, 'gotit');
        $gotit(4, 'Đang xử lý', '2026-10-08 10:00:00');
        $respondent(5, 'gotit');
        $gotit(5, 'Voucher được cập nhật thành công.', '2026-12-01 10:00:00');
        // GotIt voucher, then a failed Vinnet attempt and a refusal from the re-opened interview set the channel to 'other'.
        $respondent(6, 'other');
        $gotit(6, 'Voucher được cập nhật thành công.', '2026-10-09 10:00:00');
        DB::table('project_vinnet_transactions')->insert([
            'project_respondent_id' => 6, 'vinnet_payservice_requuid' => 'V6', 'vinnet_token_message' => 'Lỗi Token',
            'created_at' => '2026-10-09 11:00:00', 'updated_at' => '2026-10-09 11:00:00',
        ]);

        $export = new TransactionsExport('2026-10-01 00:00:00', '2026-10-31 23:59:59', 'finance', new VinnetService());
        $rows = $export->query()->get();

        $this->assertSame(['R1', 'R2', 'R3', 'R6'], $rows->pluck('respondent_id')->all());
        $this->assertSame(['Invoice 1', 'GotIt invoice 2', null, null], $rows->pluck('invoice_comment')->all());
        $this->assertSame(['V1', 'G2', 'G3', 'G6'], $rows->pluck('transaction_id')->all());
        $this->assertEquals([10, 10, 10, 10], $rows->pluck('month')->all());

        // The provider comes from the transaction on the row, not from the respondent's channel.
        $this->assertSame(['vinnet', 'gotit', 'gotit', 'gotit'], $rows->pluck('channel')->all());
        $this->assertSame('DAYONE', $export->map($rows[3])[8]);
        $this->assertEquals(100000, $export->map($rows[3])[12]);
    }
}
