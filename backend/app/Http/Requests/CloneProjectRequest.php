<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CloneProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_name' => 'required|string|max:255',
            'planned_field_start' => 'required|date',
            'planned_field_end' => 'required|date|after_or_equal:planned_field_start',
            'include_prices' => 'sometimes|boolean',
            'include_quotation' => 'sometimes|boolean',
            'include_permissions' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'project_name.required' => 'The project name is required.',
            'project_name.string' => 'The project name must be a string.',
            'project_name.max' => 'The project name may not be greater than 255 characters.',

            'planned_field_start.required' => 'The planned field start is required.',
            'planned_field_start.date' => 'The planned field start must be a valid date.',

            'planned_field_end.required' => 'The planned field end is required.',
            'planned_field_end.date' => 'The planned field end must be a valid date.',
            'planned_field_end.after_or_equal' => 'The planned field end must be on or after the planned field start.',
        ];
    }
}
