<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectProvince extends Model
{
    use HasFactory;

    //Specify the table name
    protected $table = 'project_provinces';

    protected $fillable = [
        'project_id',
        'province_id',
        'sample_size_main',
        'price_main',
        'price_main_1',
        'price_main_2',
        'price_main_3',
        'price_main_4',
        'price_main_5',
        'sample_size_boosters',
        'price_boosters',
        'price_boosters_1',
        'price_boosters_2',
        'price_boosters_3',
        'price_boosters_4',
        'price_boosters_5',
        'sample_size_non',
        'price_non',
        'price_non_1',
        'price_non_2',
        'price_non_3',
        'price_non_4',
        'price_non_5',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function province()
    {
        return $this->belongsTo(Province::class);
    }
}
