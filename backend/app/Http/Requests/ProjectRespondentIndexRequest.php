<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProjectRespondentIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page'       => 'nullable|integer|min:1',
            'perPage'    => 'nullable|integer|min:1|max:500',
            'searchTerm' => 'nullable|string|max:255',
            'status'     => 'nullable|in:pending',
        ];
    }
}
