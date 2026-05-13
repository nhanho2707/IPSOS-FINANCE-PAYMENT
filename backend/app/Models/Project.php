<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;

class Project extends Model
{
    use HasFactory;

    protected $table = 'projects';

    protected $fillable = [
        'internal_code',
        'project_name',
        'disabled'
    ];

    const STATUS_PLANNED = 'planned'; 
    const STATUS_IN_COMING = 'in coming'; 
    const STATUS_ON_GOING = 'on going';
    const STATUS_COMPLETED = 'completed';
    const STATUS_ON_HOLD = 'on hold';
    const STATUS_CANCELLED = 'cancelled';
    
    const STATUS_PROJECT_NOT_FOUND = 'Không tìm thấy dự án. Vui lòng liên hệ Admin để biết thêm thông tin.'; // Project not found
    const STATUS_PROJECT_SUSPENDED_OR_NOT_FOUND = 'Dự án đang tạm dừng giao dịch hoặc không tồn tại'; // Project temporarily suspended or does not exist
    const STATUS_PROJECT_NOT_SUITABLE_PRICES = 'Dự án chưa tạo mức giá phù hợp cho mỗi phần quà.';
    const STATUS_REJECT_REASON_PHONE_NUMBER = 'Từ chối nhập số điện thoại để nhận quà.';

    const ERROR_PROJECT_DETAILS_NOT_CONFIGURED =   'Dự án chưa được cấu hình chi tiết';
    const ERROR_INTERVIEWER_ID_NOT_REGISTERED =    'Mã số PVV không có trong danh sách đăng ký của dự án này.';

    public function projectDetails()
    {
        return $this->hasOne(ProjectDetail::class);
    }

    public function quotations()
    {
        return $this->hasMany(Quotation::class, 'project_id', 'id');
    }

    public function catiBatches()
    {
        return $this->hasMany(CATIBatch::class, 'project_id', 'id');
    }

    public function projectTypes()
    {
        return $this->belongsToMany(ProjectType::class, 'project_project_types', 'project_id', 'project_type_id')->withTimestamps();
    }

    public function teams()
    {
        return $this->belongsToMany(Team::class, 'project_teams', 'project_id', 'team_id')->withTimestamps();
    }

    public function projectProvinces()
    {
        return $this->hasMany(ProjectProvince::class, 'project_id');
    }

    public function projectEmployees()
    {
        return $this->hasMany(ProjectEmployee::class, 'project_id', 'id');
    }

    public function employees(){

        return $this->belongsToMany(Employee::class, 'project_employees', 'project_id', 'employee_id');
    }

    public function projectPermissions()
    {
        return $this->belongsToMany(User::class, 'project_permissions', 'project_id', 'user_id');
    }

    public function projectRespondents()
    {
        return $this->hasMany(ProjectRespondent::class, 'project_id');
    }

    public function projectIUURespondents()
    {
        return $this->hasMany(ProjectIUURespondent::class, 'project_id');
    }
    
    public function projectVinnetTokens()
    {
        return $this->hasMany(ProjectVinnetToken::class);
    }

    public function createProjectRespondents(array $data)
    {
        return $this->projectRespondents()->create($data);
    }

    public function createProjectEmployees(array $data) {
        return $this->employees()->create($data);
    }

    public static function findByInterviewURL($interviewURL): self
    {
        $project = self::query()
            ->with(['projectDetails', 'projectRespondents'])
            ->where('internal_code', $interviewURL->internal_code)
            ->where('project_name', $interviewURL->project_name)
            ->whereHas('projectDetails', function(Builder $query) use ($interviewURL){
                $query->where('remember_token', $interviewURL->remember_token);
            })->first();

        if(!$project){
            throw new \Exception(self::STATUS_PROJECT_NOT_FOUND);
        }

        $projectDetails = $project->projectDetails;

        if(!$projectDetails){
            throw new \Exception(self::STATUS_PROJECT_NOT_FOUND);
        }
        
        if(in_array($projectDetails->status, [
            self::STATUS_PLANNED,
            self::STATUS_COMPLETED,
            self::STATUS_CANCELLED
        ])){
            throw new \Exception(self::STATUS_PROJECT_SUSPENDED_OR_NOT_FOUND);
        }

        return $project;
    }

    public function getPriceForProvince($provinceId, $priceLevel)
    {
        $price_item = $this->projectProvinces->firstWhere('province_id', $provinceId);

        if(!$price_item){
            Log::error(Project::STATUS_PROJECT_NOT_SUITABLE_PRICES);
            throw new \Exception(Project::STATUS_PROJECT_NOT_SUITABLE_PRICES);
        }
        
        if(str_starts_with($priceLevel, 'main')){
            $property = 'price_' . $priceLevel;
        } elseif(str_starts_with($priceLevel, 'boosters')){
            $property = 'price_' . str_replace('boosters', 'boosters', $priceLevel);
        } elseif(str_starts_with($priceLevel, 'booster')){
            $property = 'price_' . str_replace('booster', 'boosters', $priceLevel);
        }elseif(str_starts_with($priceLevel, 'none')) {
            $property = 'price_' . str_replace('none', 'non', $priceLevel);
        }elseif(str_starts_with($priceLevel, 'non')) {
            $property = 'price_' . $priceLevel;
        } else {
            $property = null;
        }

        $price = $property && isset($price_item->$property) ? intval($price_item->$property) : 0;

        return $price;
    }

    
}
