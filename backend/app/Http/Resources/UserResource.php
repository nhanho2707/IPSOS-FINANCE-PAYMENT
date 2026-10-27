<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $details = $this->userDetails;

        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'email'         => $this->email,
            'first_name'    => $details?->first_name,
            'last_name'     => $details?->last_name,
            'date_of_birth' => $details?->date_of_birth,
            'address'       => $details?->address,
            'role'          => $details?->role?->name,
            'role_id'       => $details?->role_id,
            'department'           => $details?->department?->name,
            'department_id'        => $details?->department_id,
            'must_change_password' => (bool) $this->must_change_password,
            'is_active'            => (bool) $this->is_active,
            'last_login_at'        => $this->last_login_at?->toIso8601String(),
            'created_at'           => $this->created_at?->toIso8601String(),
        ];
    }
}
