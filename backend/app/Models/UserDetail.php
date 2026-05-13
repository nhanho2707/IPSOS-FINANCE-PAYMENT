<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserDetail extends Model
{
    use HasFactory;

    protected $primaryKey = 'email';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'date_of_birth',
        'address',
        'phone_number',
        'profile_picture',
        'role_id',
        'department_id'
    ];

    protected $casts = [
        'date_of_birth' => 'datetime'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function hasAnyRole($roles)
    {
        $allowedRoles = collect((array) $roles)
            ->map(fn ($role) => strtolower(trim($role)))
            ->all();

        $currentRole = strtolower(trim($this->role?->name ?? ''));

        return in_array($currentRole, $allowedRoles, true);
    }
}
