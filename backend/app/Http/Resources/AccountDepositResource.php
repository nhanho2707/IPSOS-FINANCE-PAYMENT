<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountDepositResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'amount'           => (float) $this->amount,
            'note'             => $this->note,
            'created_by'       => $this->createdBy?->name,
            'created_by_email' => $this->createdBy?->email,
            'created_at'       => $this->created_at?->toIso8601String(),
            'voided_at'        => $this->voided_at?->toIso8601String(),
            'voided_by'        => $this->voidedBy?->name,
            'void_reason'      => $this->void_reason,
        ];
    }
}
