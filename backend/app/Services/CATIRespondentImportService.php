<?php

namespace App\Services;

use App\Models\CATIBatch;
use App\Models\CATIRespondent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CATIRespondentImportService
{
    private const INSERT_CHUNK_SIZE = 500;

    public const REASON_DUPLICATE_IN_FILE = 'Duplicate ID in file';
    public const REASON_ALREADY_EXISTS = 'ID already exists in this project';

    /**
     * Inserts the valid rows and reports every skipped row with its reason. Rows are checked
     * one by one before inserting: a single duplicate or invalid row used to fail the whole
     * 1000-row insert batch, silently dropping the good rows with it.
     *
     * @return array{imported_count: int, skipped: array<int, array{row: int, respondent_id: ?string, reason: string}>}
     */
    public function import(CATIBatch $batch, array $rows): array
    {
        $skipped = [];
        $candidates = [];

        foreach ($rows as $row) {
            $normalized = $this->normalize($row);

            $error = $this->validationError($normalized);

            if ($error !== null) {
                $skipped[] = $this->skip($normalized, $error);
                continue;
            }

            // MySQL compares IDs case-insensitively, so "ab1" and "AB1" hit the same unique key.
            $key = mb_strtolower($normalized['respondent_id']);

            if (isset($candidates[$key])) {
                $skipped[] = $this->skip($normalized, self::REASON_DUPLICATE_IN_FILE);
                continue;
            }

            $candidates[$key] = $normalized;
        }

        if (!empty($candidates)) {
            $existing = CATIRespondent::where('project_id', $batch->project_id)
                            ->whereIn('respondent_id', array_column($candidates, 'respondent_id'))
                            ->pluck('respondent_id')
                            ->map(fn ($id) => mb_strtolower($id))
                            ->flip();

            foreach ($candidates as $key => $candidate) {
                if ($existing->has($key)) {
                    $skipped[] = $this->skip($candidate, self::REASON_ALREADY_EXISTS);
                    unset($candidates[$key]);
                }
            }
        }

        $now = now();

        $records = array_map(fn (array $candidate) => [
            'project_id' => $batch->project_id,
            'batch_id' => $batch->id,
            'respondent_id' => $candidate['respondent_id'],
            'phone' => $candidate['phone'],
            'name' => $candidate['name'],
            'link' => $candidate['link'],
            'filter_1' => $candidate['filter_1'],
            'filter_2' => $candidate['filter_2'],
            'filter_3' => $candidate['filter_3'],
            'filter_4' => $candidate['filter_4'],
            'status' => 'New',
            'created_at' => $now,
            'updated_at' => $now,
        ], array_values($candidates));

        DB::transaction(function () use ($batch, $records) {
            foreach (array_chunk($records, self::INSERT_CHUNK_SIZE) as $chunk) {
                CATIRespondent::insert($chunk);
            }

            $batch->update([
                'total_records' => $batch->respondents()->count()
            ]);
        });

        usort($skipped, fn ($a, $b) => $a['row'] <=> $b['row']);

        return [
            'imported_count' => count($records),
            'skipped' => $skipped,
        ];
    }

    private function normalize(array $row): array
    {
        $value = fn (string $key) => isset($row[$key]) ? trim((string) $row[$key]) : null;

        $phone = $value('phone');

        if ($phone !== null) {
            $phone = preg_replace('/\D/', '', preg_replace('/\.0+$/', '', $phone));

            // Excel drops the leading 0 of phone numbers stored as numbers.
            if (strlen($phone) === 9) {
                $phone = '0' . $phone;
            }
        }

        $respondentId = $value('respondent_id');

        if ($respondentId !== null) {
            $respondentId = preg_replace('/\.0+$/', '', $respondentId);
        }

        $nullIfEmpty = fn (?string $text) => ($text === null || $text === '') ? null : $text;

        return [
            'row' => (int) ($row['row'] ?? 0),
            'respondent_id' => $nullIfEmpty($respondentId),
            'phone' => $nullIfEmpty($phone),
            'name' => $nullIfEmpty($value('name')),
            'link' => $nullIfEmpty($value('link')),
            'filter_1' => $nullIfEmpty($value('filter_1')),
            'filter_2' => $nullIfEmpty($value('filter_2')),
            'filter_3' => $nullIfEmpty($value('filter_3')),
            'filter_4' => $nullIfEmpty($value('filter_4')),
        ];
    }

    private function validationError(array $row): ?string
    {
        $validator = Validator::make($row, [
            'respondent_id' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'link' => 'required|url|max:2048',
            'phone' => 'required|string|digits_between:10,11',
            'filter_1' => 'nullable|string|max:255',
            'filter_2' => 'nullable|string|max:255',
            'filter_3' => 'nullable|string|max:255',
            'filter_4' => 'nullable|string|max:255',
        ], [
            'respondent_id.required' => 'Respondent ID is required',
            'respondent_id.max' => 'Respondent ID is longer than 255 characters',
            'name.required' => 'Respondent Name is required',
            'name.max' => 'Respondent Name is longer than 255 characters',
            'phone.required' => 'Phone is required',
            'phone.digits_between' => 'Phone must be a valid 10-digit number',
            'link.required' => 'Link is required',
            'link.url' => 'Link must be a valid URL',
            'link.max' => 'Link is longer than 2048 characters',
            'filter_*.max' => 'Filter is longer than 255 characters',
        ]);

        return $validator->fails() ? $validator->errors()->first() : null;
    }

    private function skip(array $row, string $reason): array
    {
        return [
            'row' => $row['row'],
            'respondent_id' => $row['respondent_id'],
            'reason' => $reason,
        ];
    }
}
