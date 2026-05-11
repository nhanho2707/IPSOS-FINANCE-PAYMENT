<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;

class ProjectDetail extends Model
{
    use HasFactory;
    
    protected $table = 'project_details';

    protected $fillable = [
        'symphony', 
        'job_number', 
        'status', 
        'created_user_id', 
        'platform', 
        'planned_field_start', 
        'planned_field_end', 
        'actual_field_start', 
        'actual_field_end',
        'remember_token',
        'remember_uuid'
    ];

    protected $casts = [
        'planned_field_start' => 'datetime', 
        'planned_field_end' => 'datetime', 
        'actual_field_start' => 'datetime', 
        'actual_field_end' => 'datetime'
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($project) {
            $project->remember_token = Str::random(60);

            // Generate a UUID using Laravel's Str::uuid() method
            $uuid = Uuid::uuid4()->toString();

            $project->remember_uuid = $uuid;
        });
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
    
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_user_id');
    }
}
