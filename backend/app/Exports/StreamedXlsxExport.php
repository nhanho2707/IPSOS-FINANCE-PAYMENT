<?php

namespace App\Exports;

use App\Services\XlsxStreamWriter;
use Generator;
use Illuminate\Database\Query\Builder;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

abstract class StreamedXlsxExport
{
    abstract public function query(): Builder;

    abstract public function headings(): array;

    abstract public function map($row): array;

    public function download(string $fileName): BinaryFileResponse
    {
        $path = tempnam(sys_get_temp_dir(), 'export_');

        (new XlsxStreamWriter())->write($path, $this->headings(), $this->rows());

        return response()
            ->download($path, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }

    // A single cursor instead of LIMIT/OFFSET chunks: each chunk re-ran the whole join with a
    // growing offset, which made big exports time out.
    private function rows(): Generator
    {
        foreach ($this->query()->cursor() as $row) {
            yield $this->map($row);
        }
    }

    protected function maskPhone($phone): string
    {
        $phone = (string) $phone;

        if (strlen($phone) <= 6) {
            return $phone;
        }

        return substr($phone, 0, 3) . str_repeat('*', strlen($phone) - 6) . substr($phone, -3);
    }
}
