<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Models\Province;
use App\Models\User;

class ProjectResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        if($request->get('type') === 'metadata'){
            return [
                'id' => $this->id,
                'internal_code' => $this->internal_code,
                'project_name' => $this->project_name
            ];
        }

        return [
            'id' => $this->id,
            'internal_code' => $this->internal_code,
            'project_name' => $this->project_name,
            'symphony' => $this->projectDetails->symphony ?? null,
            'job_number' => $this->projectDetails->job_number ?? null,
            'remember_token' => $this->projectDetails->remember_token ?? null,
            'status' => $this->projectDetails->status ?? null,
            'platform' => $this->projectDetails->platform ?? null,
            'planned_field_start' => $this->projectDetails->planned_field_start?->format('Y-m-d') ?? null,
            'planned_field_end' => $this->projectDetails->planned_field_end?->format('Y-m-d') ?? null,
            'actual_field_start' => $this->projectDetails->actual_field_start?->format('Y-m-d') ?? null,
            'actual_field_end' => $this->projectDetails->actual_field_end?->format('Y-m-d') ?? null,
            'project_objectives' => $this->projectDetails->project_objectives ?? null,
            'created_user_id' => [
                'id' => $this->projectDetails->createdBy->id,
                'name' => $this->projectDetails->createdBy->name,
                'email' => $this->projectDetails->createdBy->email,
            ],
            'project_types' => $this->projectTypes->map(function($projectType){
                return $projectType->name;
            }),
            'teams' => $this->teams->map(function($team){
                return $team->name;
            }),
            'permissions' => $this->projectPermissions->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ];
            }),
            'provinces' => $this->projectProvinces->map(function($item){
                return [
                    'id' => $item->province_id,
                    'name' => Province::where('id', $item->province_id)->pluck('name')[0],
                    'sample_size_main' => $item->sample_size_main,
                    'price_main' => $item->price_main,
                    'sample_size_booters' => $item->sample_size_boosters,
                    'price_boosters' => $item->price_boosters
                ];
            })->values(),
            'count_respondents' => $this->count_respondents,
            'count_employees' => $this->count_employees
        ];
    }
}
