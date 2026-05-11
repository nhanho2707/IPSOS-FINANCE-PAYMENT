<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CATIRespondent extends Model
{
    use HasFactory;

    protected $table = "cati_respondents";

    protected $fillable = [
        'project_id',
        'batch_id',
        'respondent_id',
        'phone',
        'name',
        'link',
        'filter_1',
        'filter_2',
        'filter_3',
        'filter_4',
        'status',
        'assigned_to',
        'lock_at'
    ];

    protected $casts = [
        'locked_at' => 'datetime'
    ];

    public function assignedTo()
    {
        return $this->belongsTo(Employee::class, 'assigned_to');
    }

    public function batch()
    {
        return $this->belongsTo(CATIBatch::class, 'batch_id');
    }
}
