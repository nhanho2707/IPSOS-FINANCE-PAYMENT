<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Traits\ApiResponse;

class SilverBulletController extends Controller
{
    use ApiResponse;

    public function getRespondents(Request $request)
    {
        $request->validate([
            // 'pack_type' => 'nullable|string',
            // 'pack_size' => 'nullable|string',
            'p1_from' => 'nullable|date',
            'p1_to' => 'nullable|date|after_or_equal:p1_from',
            'p2_from' => 'nullable|date',
            'p2_to' => 'nullable|date|after_or_equal:p2_from',
            'project_names' => 'nullable|array',
            'project_names.*' => 'string'
        ]);

        $cols = ['id', 'respondent_id', 'brand_code', 'brand_name', 'pack_type', 'pack_size', 'quantity', 'recorded_date', 'time_of_day', 'project_name'];

        $p1Respondent = DB::table('silver_bullet_data')
                        ->select($cols)
                        ->when($request->p1_from && $request->p1_to, fn(Builder $q) =>
                            $q->whereBetween('recorded_date', [$request->p1_from, $request->p1_to])
                        )
                        ->when($request->filled('project_names'), fn(Builder $q) =>
                            $q->whereIn('project_name', $request->project_names)
                        )
                        // ->when($request->pack_type !== 'All', fn(Builder $q) =>
                        //     $q->where('pack_type', $request->pack_type)
                        // )
                        // ->when($request->pack_size !== 'All', fn(Builder $q) =>
                        //     $q->where('pack_size', $request->pack_size)
                        // )
                        ->get();

        $p2Respondent = DB::table('silver_bullet_data')
                        ->select($cols)
                        ->when($request->p2_from && $request->p2_to, fn(Builder $q) =>
                            $q->whereBetween('recorded_date', [$request->p2_from, $request->p2_to])
                        )
                        ->when($request->filled('project_names'), fn(Builder $q) =>
                            $q->whereIn('project_name', $request->project_names)
                        )
                        // ->when($request->pack_type !== 'All', fn(Builder $q) =>
                        //     $q->where('pack_type', $request->pack_type)
                        // )
                        // ->when($request->pack_size !== 'All', fn(Builder $q) =>
                        //     $q->where('pack_size', $request->pack_size)
                        // )
                        ->get();

        return $this->success(['p1' => $p1Respondent, 'p2' => $p2Respondent], 'Successfully retrieved respondents data.');
    }
    
    public function getSilverBulletMetadata(Request $request)
    {
        $request->validate([
            'project_names' => 'nullable|array',
            'project_names.*' => 'string'
        ]);

        $scoped = fn(Builder $q) => $q->when($request->filled('project_names'), fn(Builder $q) =>
            $q->whereIn('project_name', $request->project_names)
        );

        $brands = DB::table('silver_bullet_data')
                    ->select('brand_code', 'brand_name', 'pack_type', 'pack_size')
                    ->tap($scoped)
                    ->distinct()
                    ->get();

        $packTypes = DB::table('silver_bullet_data')
                        ->tap($scoped)
                        ->distinct()
                        ->pluck('pack_type');

        $packSizes = DB::table('silver_bullet_data')
                        ->tap($scoped)
                        ->distinct()
                        ->pluck('pack_size');

        // Không lọc theo project_names — combobox phải luôn hiển thị đầy đủ danh sách project để chọn thêm.
        $projectNames = DB::table('silver_bullet_data')
                        ->whereNotNull('project_name')
                        ->distinct()
                        ->pluck('project_name');

        $minRecordDate = DB::table('silver_bullet_data')
                            ->tap($scoped)
                            ->min('recorded_date');

        $maxRecordDate = DB::table('silver_bullet_data')
                            ->tap($scoped)
                            ->max('recorded_date');

        return $this->success([
            'brands' => $brands,
            'pack_types' => $packTypes,
            'pack_sizes' => $packSizes,
            'project_names' => $projectNames,
            'min_recorded_date' => $minRecordDate,
            'max_recorded_date' => $maxRecordDate
        ], 'Successfully retrieved silver bullet metadata.');
    }

}