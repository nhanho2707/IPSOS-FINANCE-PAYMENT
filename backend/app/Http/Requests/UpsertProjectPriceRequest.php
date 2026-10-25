<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpsertProjectPriceRequest extends FormRequest
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
            'province_id' => 'required|integer|exists:provinces,id',
            'price_type' => 'required|string|in:main,booster,non',
            'sample_size' => 'required|integer|min:1',
            'price' => 'required|numeric|gt:0',
            'price_1' => 'nullable|numeric|min:0',
            'price_2' => 'nullable|numeric|min:0',
            'price_3' => 'nullable|numeric|min:0',
            'price_4' => 'nullable|numeric|min:0',
            'price_5' => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'province_id.required' => 'Vui lòng chọn tỉnh thành.',
            'province_id.exists' => 'Tỉnh thành không tồn tại.',
            'price_type.required' => 'Vui lòng chọn loại đơn giá.',
            'price_type.in' => 'Loại đơn giá không hợp lệ.',
            'sample_size.min' => 'Sample size phải lớn hơn 0.',
            'price.required' => 'Vui lòng nhập đơn giá quà 1.',
            'price.gt' => 'Đơn giá quà 1 phải lớn hơn 0.',
        ];
    }
}
