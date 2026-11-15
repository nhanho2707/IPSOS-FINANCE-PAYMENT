<?php

namespace App\Http\Requests;

use App\Services\TransactionStatisticsService;

class TransactionStatisticsInterviewsRequest extends TransactionStatisticsRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'view' => 'nullable|string|in:' . implode(',', TransactionStatisticsService::VIEWS),
            'search' => 'nullable|string|max:100',
            'sort' => 'nullable|string|in:' . implode(',', TransactionStatisticsService::SORTS),
            'direction' => 'nullable|string|in:asc,desc',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|between:1,100'
        ];
    }
}
