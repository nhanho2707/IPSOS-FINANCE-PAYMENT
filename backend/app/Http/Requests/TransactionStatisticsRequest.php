<?php

namespace App\Http\Requests;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Http\FormRequest;

class TransactionStatisticsRequest extends FormRequest
{
    private const ALL_PROJECTS_ROLES = ['Admin', 'Finance'];

    /**
     * Project id 0 means every project, and the anomaly list carries respondent phone numbers,
     * so only roles that already see all transactions may ask for it.
     */
    public function authorize(): bool
    {
        if((int) $this->route('projectId') !== 0){
            return true;
        }

        return (bool) $this->user()?->userDetails?->hasAnyRole(self::ALL_PROJECTS_ROLES);
    }

    protected function failedAuthorization(): void
    {
        throw new AuthorizationException('Chỉ Admin hoặc Finance được xem thống kê của tất cả dự án.');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'channel' => 'nullable|string|in:vinnet,gotit,other',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from'
        ];
    }

    public function messages(): array
    {
        return [
            'channel.in' => 'Channel phải là vinnet, gotit hoặc other.',
            'date_to.after_or_equal' => 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.'
        ];
    }
}
