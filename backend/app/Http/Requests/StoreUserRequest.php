<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:6|confirmed',
            'role'       => 'required|exists:roles,id',
            'department' => 'required|exists:departments,id',
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
        ];
    }
}
