<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAccountDepositRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'account_type' => 'required|string|in:gotit,gotti-trade',
            // account_deposits.amount is decimal(15, 2).
            'amount' => 'required|numeric|gt:0|max:9999999999999',
            'note' => 'nullable|string|max:255',
        ];
    }
}
