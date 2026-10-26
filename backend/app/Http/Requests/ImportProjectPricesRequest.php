<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ImportProjectPricesRequest extends FormRequest
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
            'prices' => 'required|array|min:1',
            'prices.*.province_id' => 'required|integer|exists:provinces,id',
            'prices.*.price_type' => 'required|string|in:main,booster,non',
            'prices.*.sample_size' => 'required|integer|min:1',
            'prices.*.price' => 'required|numeric|gt:0',
            'prices.*.price_1' => 'nullable|numeric|min:0',
            'prices.*.price_2' => 'nullable|numeric|min:0',
            'prices.*.price_3' => 'nullable|numeric|min:0',
            'prices.*.price_4' => 'nullable|numeric|min:0',
            'prices.*.price_5' => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'prices.required' => 'File không có đơn giá nào để import.',
            'prices.*.province_id.exists' => 'Đơn giá thứ :position: tỉnh thành không tồn tại.',
            'prices.*.price_type.in' => 'Đơn giá thứ :position: loại đơn giá không hợp lệ.',
            'prices.*.sample_size.min' => 'Đơn giá thứ :position: sample size phải lớn hơn 0.',
            'prices.*.price.gt' => 'Đơn giá thứ :position: đơn giá quà 1 phải lớn hơn 0.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $prices = $this->input('prices');

                if (!is_array($prices)) {
                    return;
                }

                $seen = [];

                foreach ($prices as $index => $price) {
                    if (!is_array($price)) {
                        continue;
                    }

                    $key = ($price['province_id'] ?? '') . '|' . ($price['price_type'] ?? '');

                    if (isset($seen[$key])) {
                        $validator->errors()->add(
                            "prices.{$index}",
                            'Đơn giá thứ ' . ($index + 1) . ': trùng tỉnh thành và loại đơn giá với đơn giá thứ ' . ($seen[$key] + 1) . '.'
                        );
                        continue;
                    }

                    $seen[$key] = $index;
                }
            },
        ];
    }
}
