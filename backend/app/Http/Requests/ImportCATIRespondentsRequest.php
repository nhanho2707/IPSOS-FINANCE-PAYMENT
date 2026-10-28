<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportCATIRespondentsRequest extends FormRequest
{
    public const MAX_ROWS_PER_REQUEST = 1000;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Only the shape is checked here: a bad row must be skipped and reported, not fail
     * the whole chunk, so row content is checked by CATIRespondentImportService.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'batch_name' => 'required|string|max:255',
            'respondents' => 'required|array|min:1|max:' . self::MAX_ROWS_PER_REQUEST,
            'respondents.*' => 'required|array',
            'respondents.*.row' => 'required|integer|min:1',
            'respondents.*.respondent_id' => 'nullable|string',
            'respondents.*.phone' => 'nullable|string',
            'respondents.*.name' => 'nullable|string',
            'respondents.*.link' => 'nullable|string',
            'respondents.*.filter_1' => 'nullable|string',
            'respondents.*.filter_2' => 'nullable|string',
            'respondents.*.filter_3' => 'nullable|string',
            'respondents.*.filter_4' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'batch_name.required' => 'Batch name is required.',
            'respondents.required' => 'File không có dữ liệu để import.',
            'respondents.max' => 'Mỗi lần gửi tối đa ' . self::MAX_ROWS_PER_REQUEST . ' dòng.',
        ];
    }
}
