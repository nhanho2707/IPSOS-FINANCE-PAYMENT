<?php

namespace App\Imports;

use App\Models\CATIRespondent;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Concerns\{
    ToModel,
    WithHeadingRow,
    WithValidation,
    WithBatchInserts,
    WithChunkReading,
    SkipsEmptyRows,
    SkipsOnError,
    SkipsErrors,
    SkipsOnFailure,
    SkipsFailures
};

class CATIRespondentsImport implements 
    ToModel,
    WithHeadingRow,
    WithValidation,
    WithBatchInserts,
    WithChunkReading,
    SkipsEmptyRows,
    SkipsOnError,
    SkipsOnFailure
{
    //Import vẫn chạy dù có dòng lỗi
    use SkipsErrors, SkipsFailures;

    protected int $projectId;
    protected int $batchId;

    public function __construct(int $project_id, int $batch_id)
    {
        $this->projectId = $project_id;
        $this->batchId = $batch_id;
    }

    public function model(array $row)
    {
        $row = array_change_key_case($row, CASE_LOWER);

        return new CATIRespondent([
            'project_id' => $this->projectId,
            'batch_id' => $this->batchId,
            'respondent_id' => trim(Arr::get($row, 'id')),
            'phone' => trim(Arr::get($row, 'phone')),
            'name' => trim(Arr::get($row, 'name')),
            'link' => trim(Arr::get($row, 'link')),
            'filter_1' => trim(Arr::get($row, 'filter_1')),
            'filter_2' => trim(Arr::get($row, 'filter_2')),
            'filter_3' => trim(Arr::get($row, 'filter_3')),
            'filter_4' => trim(Arr::get($row, 'filter_4')),
            'status' => 'New'
        ]);
    }

    public function prepareForValidation(array $row): array
    {
        $row = array_change_key_case($row, CASE_LOWER);

        if (isset($row['phone'])) {
            $phone = preg_replace('/\D/', '', (string) $row['phone']);

            if (strlen($phone) === 9) {
                $phone = '0' . $phone;
            }

            $row['phone'] = $phone;
        }

        if (isset($row['id'])) {
            $row['id'] = preg_replace('/\.0+$/', '', (string) $row['id']);
        }

        return $row;
    }

    public function rules(): array
    {
        return [
            '*.id' => [
                'required',
                'string',
                'max:255'
            ],
            '*.name' => [
                'required',
                'string',
                'max:255'
            ],
            '*.link' => [
                'required',
                'url'
            ],
            '*.phone' => [
                'required',
                'string',
                'min:10',
                'max:11'
            ],
            '*.filter_1' => ['nullable', 'string', 'max:255'],
            '*.filter_2' => ['nullable', 'string', 'max:255'],
            '*.filter_3' => ['nullable', 'string', 'max:255'],
            '*.filter_4' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function customValidationMessages()
    {
        return [
            '*.id.required' => 'Respondent ID is required',
            '*.name.required' => 'Respondent Name is required',
            '*.phone.required' => 'Phone is required',
            '*.phone.min' => 'Phone must be a valid 10-digit number',
            '*.phone.max' => 'Phone must be a valid 10-digit number',
            '*.link.required' => 'Link is required',
            '*.link.url' => 'Link must be a valid URL',
        ];
    }

    public function batchSize(): int
    {
        return 1000;
    }

    public function chunkSize(): int
    {
        return 1000;
    }
}
