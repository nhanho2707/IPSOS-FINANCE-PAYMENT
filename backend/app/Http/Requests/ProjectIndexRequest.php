<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

class ProjectIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page'           => 'nullable|integer|min:1',
            'perPage'        => 'nullable|integer|min:1|max:500',
            'searchTerm'     => 'nullable|string|max:255',
            'searchFromDate' => 'nullable|date|required_with:searchToDate',
            'searchToDate'   => 'nullable|date|required_with:searchFromDate|after_or_equal:searchFromDate',
            'status'         => 'nullable|in:' . implode(',', Project::STATUSES),
            'platform'       => 'nullable|string|max:50',
        ];
    }
}
