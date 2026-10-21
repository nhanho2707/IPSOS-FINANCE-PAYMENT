<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DeleteProjectPriceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'province_id' => 'required|integer',
            'price_type' => 'required|string|in:main,booster,non',
        ];
    }

    public function messages(): array
    {
        return [
            'province_id.required' => 'Thiếu tỉnh thành cần xoá.',
            'price_type.in' => 'Loại đơn giá không hợp lệ.',
        ];
    }
}
