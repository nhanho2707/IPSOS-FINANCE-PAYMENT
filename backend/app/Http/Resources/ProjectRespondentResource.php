<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Models\ProjectRespondent;
use App\Models\ProjectRespondentToken;

class ProjectRespondentResource extends JsonResource
{
    private function getToken(string $id): string
    {
        $public = ProjectRespondentToken::where('project_respondent_id', $id)->value('token_public');
        $batch_id = ProjectRespondentToken::where('project_respondent_id', $id)->value('batch_id');

        return $public . '.' . $batch_id;
    }

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
            'shell_chainid' => $this->shell_chainid,
            'province_name' => $this->province?->name,
            'employee_id' => $this->employee?->employee_id,
            'employee_name' => $this->employee
                ? trim($this->employee->first_name . ' ' . $this->employee->last_name)
                : null,
            'respondent_phone_number' => $this->respondent_phone_number,
            'phone_number' => $this->phone_number,
            'email' => $this->email,
            'status_label' => $this->status,
            'status' => ProjectRespondent::giftStatus($this->status),
            'environment' => $this->environment,
            'token' => $this->getToken($this->id),
            'channel' => $this->channel,
            'price_level' =>$this->project->getPriceForProvince($this->province_id, $this->price_level)
        ];
    }


}
