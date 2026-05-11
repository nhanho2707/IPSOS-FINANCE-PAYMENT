<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $table = 'employees';

    protected $fillable = [
        'id',
        'employee_id',
        'first_name',
        'last_name',
        'date_of_birth',
        'address',
        'province_id',
        'phone_number',
        'profile_picture',
        'tax_code',
        'tax_deduction_at',
        'card_id',
        'citizen_identity_card',
        'date_of_issuance',
        'place_of_issuance',
        'role_id',
        'team_id'
    ];

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function projects()
    {
        return $this->belongsToMany(Project::class, 'project_employees', 'employee_id', 'project_id');
    }
}
