<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CATIRespondentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'respondent_id' => $this->respondent_id,
            'phone' => $this->phone,
            'link' => $this->link,
            'comment' => $this->comment
        ];
    }
}