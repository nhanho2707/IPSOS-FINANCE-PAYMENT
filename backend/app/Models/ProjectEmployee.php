<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectEmployee extends Model
{
    use HasFactory;

    protected $table = "project_employees";

    protected $fillable = [
        'project_id',
        'employee_id'
    ];

    public function projects(){
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function employees(){
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
