<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use App\Models\TechcombankPanel;
use App\Http\Resources\TCBProductResource;
use App\Http\Resources\TCBChannelResource;
use App\Http\Resources\TCBPanellistResource;
use App\Http\Resources\VennDataResource;

class TechcombankPanelController extends Controller
{
    public function index(Request $request){
        try
        {
            return response()->json([
                'status_code' => 400,
                'message' => 'Successfully',
                'data' => TechcombankPanel::all()
            ]);
        } catch(\Exception $e)
        {
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => Response::HTTP_BAD_REQUEST, //400
                'message' => $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    public function getTotalMembers(){
        $totalMembers = DB::table('techcombank_panel')
            ->select(DB::raw('count(*) as count'))
            ->where('status', '=', 'Active')
            ->first();
        
            return response()->json($totalMembers);
    }

    // The dashboard counts these panel columns; anything else is refused so the route cannot read other tables.
    private const COUNTABLE_COLUMNS = [
        'techcombank_panel' => ['gender', 'resource', 'householdincome', 'AUM', 'Q4'],
    ];

    public function getCount($table_name, $column_name){

        if(!in_array($column_name, self::COUNTABLE_COLUMNS[$table_name] ?? [], true)){
            return response()->json([
                'status_code' => Response::HTTP_NOT_FOUND,
                'message' => 'Not found.'
            ], Response::HTTP_NOT_FOUND);
        }

        $dataCount = DB::table($table_name)
            ->select($column_name, DB::raw('count(*) as count'))
            ->where('status', '=', 'Active')
            ->groupBy($column_name)
            ->get();

        return response()->json($dataCount);
    }

    public function getProvince()
    {
        $provinceCounts = DB::table('techcombank_panel as tp')
            ->join('provinces as p', 'tp.province_id', '=', 'p.id')
            ->select('p.name as province_name', DB::raw('COUNT(*) as count'))
            ->where('status', '=', 'Active')
            ->groupBy('p.name')
            ->get();

        return response()->json($provinceCounts);
    }

    public function getPanellist()
    {
        $recruitmentStats = DB::table('techcombank_panel')
            ->select(
                DB::raw('DATE_FORMAT(recruitment_date, "%Y-%m") as month'),
                'recruitment_status',
                DB::raw('COUNT(*) as count')
            )
            ->where('status', '=', 'Active')
            ->groupBy('month', 'recruitment_status')
            ->get();
        
        return response()->json(new TCBPanellistResource($recruitmentStats));
    }

    public function getChannels()
    {
        $channelCounts = DB::table('techcombank_channels_summarizes as tcs')
            ->join('banks as b', 'tcs.bank_id', '=', 'b.id')
            ->join('techcombank_channels as tc', 'tcs.channel_id', '=', 'tc.id')
            ->join('techcombank_panel as t_panel', 'tcs.panel_id', '=', 't_panel.id')
            ->select('b.name as bank_name', 'tc.chart_label as channel_name', DB::raw('SUM(tcs.value) as total'))
            ->whereNotNull('tc.chart_label')
            ->where('t_panel.status', '=', 'Active')
            ->groupBy('b.name','tc.chart_label')
            ->get();

        return response()->json(new TCBChannelResource($channelCounts));
    }

    public function getProducts()
    {
        $productCounts = DB::table('techcombank_products_summarizes as tps')
            ->join('banks as b', 'tps.bank_id', '=', 'b.id')
            ->join('techcombank_products as tp', 'tps.product_id', '=', 'tp.id')
            ->join('techcombank_panel as t_panel', 'tps.panel_id', '=', 't_panel.id')
            ->select('b.name as bank_name', 'tp.chart_label as product_name', DB::raw('SUM(tps.value) as total'))
            ->whereNotNull('tp.chart_label')
            ->where('t_panel.status', '=', 'Active')
            ->groupBy('b.name','tp.chart_label')
            ->get();

        return response()->json(new TCBProductResource($productCounts));
    }

    public function getVennProducts()
    {
        $productCounts = DB::table('techcombank_products_summarizes as tps')
        ->join('techcombank_products as tp', 'tp.id', '=', 'tps.product_id')
        ->select('tps.panel_id', 
            DB::raw('GROUP_CONCAT(DISTINCT tp.chart_label) as product_ids'))
        ->where('tps.value', '=', 1)
        ->whereNotNull('tp.chart_label')
        ->groupBy('tps.panel_id')
        ->get();

        return response()->json(new VennDataResource($productCounts));
    }

    public function getAgeGroup() 
    {
        $yearOfBirths = DB::table('techcombank_panel')
                            ->where('status', 'Active')
                            ->pluck('year_of_birth');

        $currentYear = date('Y');

        $ageGroups = [
            '20-29' => 0,
            '30-34' => 0,
            '35-39' => 0,
            '40-45' => 0,
            '46-50' => 0,
            '51-55' => 0,
        ];

        foreach($yearOfBirths as $yearOfBirth){
            $age = $currentYear - $yearOfBirth;

            if($age >= 20 && $age <= 29) $ageGroups['20-29']++;
            elseif($age >= 30 && $age <= 34) $ageGroups['30-34']++;
            elseif($age >= 35 && $age <= 39) $ageGroups['35-39']++;
            elseif($age >= 40 && $age <= 45) $ageGroups['40-45']++;
            elseif($age >= 46 && $age <= 50) $ageGroups['46-50']++;
            elseif($age >= 51 && $age <= 55) $ageGroups['51-55']++;
        }

        return response()->json($ageGroups);
    }
    
    public function getOccupation() 
    {
        $occupationCount = DB::table('techcombank_panel')
            ->select('occupation', DB::raw('count(*) as count'))
            ->where('status', '=', 'Active')
            ->groupBy('occupation')
            ->get();

        $occupationGroup = [
            'Chủ doanh nghiệp' => 0,
            'Buôn bán nhỏ lẻ / Hộ kinh doanh cá thể' => 0,
            'Làm việc tự do' => 0,
            'Nhân viên văn phòng' => 0,
            'Khác (Công nhân/ Nhân viên không thuộc văn phòng/ chuyên gia/ ...)' => 0,
        ];

        $sum_other = 0;

        foreach ($occupationCount as $occ) {
            // Ensure that $occ is a string or extract the relevant property if it's an object
            if (is_object($occ) && isset($occ->occupation)) {
                $occString = $occ->occupation; // Extract the occupation string
            } else {
                $occString = (string) $occ; // Fallback to casting to string
            }

            $count = 0;

            // Your logic for matching and updating counts
            foreach ($occupationGroup as $occupation => &$value) {
                if (str_contains($occ->occupation, $occupation)) {
                    $count = 1;
                    $value += $occ->count;
                    break;
                }
            }

            if($count == 0){
                $occupationGroup['Khác (Công nhân/ Nhân viên không thuộc văn phòng/ chuyên gia/ ...)'] += $occ->count;
            }
        }

        return response()->json($occupationGroup);
    }
}
