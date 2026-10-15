<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use App\Http\Requests\ProjectRespondentTokenRequest;
use App\Http\Requests\TransactionRejectedRequest;
use App\Http\Requests\TransactionStatisticsRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Project;
use App\Models\ProjectRespondent;
use App\Models\ProjectGotItVoucherTransaction;
use Ramsey\Uuid\Uuid;
use App\Constants\TransactionStatus;
use App\Services\ProjectRespondentTokenService;
use App\Services\VinnetService;
use App\Services\InterviewURL;


class TransactionController extends Controller
{
    public function verify(Request $request, ProjectRespondentTokenService $tokenService)
    {
        try{
            $recordToken = $tokenService->verifyToken($request->token);

            return response()->json(['valid' => true]);

        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function refusal_transaction(TransactionRejectedRequest $request, ProjectRespondentTokenService $tokenService)
    {
        try
        {
            $validatedRequest = $request->validated();

            $token = $validatedRequest['token'] ?? null;
            $refusalMessage = $validatedRequest['refusal_message'] ?? null;

            Log::info('Transaction Info: ', [
                'token' => $token,
                'refusal_message' => $refusalMessage
            ]);

            $tokenRecord = $tokenService->verifyToken($token);

            $projectRespondent = $tokenRecord->projectRespondent;

            $project = $projectRespondent->project;

            $employee = $projectRespondent->employee;

            if($project->projectDetails->status === Project::STATUS_IN_COMING || $project->projectDetails->status === Project::STATUS_ON_HOLD || 
                ($project->projectDetails->status === Project::STATUS_ON_GOING && !in_array(substr(strtolower($employee->employee_id), 0, 2), ['hn', 'sg', 'dn', 'ct']))){
                    
                    Log::info('Staging Environment: ');
                    
                    return response()->json([
                        'message' => TransactionStatus::STATUS_TRANSACTION_TEST . ' [Ghi nhận lý do từ chối của đáp viên]'
                    ], Response::HTTP_OK);
            } 

            Log::info('Live Environment:');

            $projectRespondent->update([
                'channel' => 'other',
                'reject_message' => $refusalMessage,
                'status' => ProjectRespondent::STATUS_RESPONDENT_REJECTED
            ]);
            
            $projectRespondent->token()->update([
                'status' => 'blocked'
            ]);

            return response()->json([
                'status_code' => 994,
                'message' => TransactionStatus::STATUS_REFUSAL_TRANSACTION
            ], 200);
            
        } catch(\Exception $e) {
            
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => $e->getCode(),
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    private function detectEnvironment($project, $interviewURL): string
    {
        if($project->projectDetails->status === Project::STATUS_IN_COMING || $project->projectDetails->status === Project::STATUS_ON_HOLD || 
            ($project->projectDetails->status === Project::STATUS_ON_GOING && !in_array(substr(strtolower($interviewURL->interviewer_id), 0, 2), ['hn', 'sg', 'dn', 'ct', 'ma'])))
            {
                return 'test';
            }

        if(strlen($interviewURL->location_id) == 0 || 
            strtolower($interviewURL->location_id) === '_defaultsp' || 
                !in_array(substr(strtolower($interviewURL->location_id), 0, 2), ['hn', 'sg', 'dn', 'ct', 'ma']))
                {
                    return 'test';
                }
        
        return 'live';
    }

    public function authenticate_token(ProjectRespondentTokenRequest $request, ProjectRespondentTokenService $tokenService, VinnetService $vinnetService)
    {
        try
        {
            $validatedRequest = $request->validated();

            $decodedURL = base64_decode($validatedRequest['url']);

            if (!$decodedURL || !str_contains($decodedURL, '/')) {
                return response()->json([
                    'status_code' => 901,
                    'message' => 'URL không hợp lệ.',
                    'error' => 'URL không hợp lệ.'
                ], 400);
            }

            $interviewURL = new InterviewURL(explode("/", $decodedURL));

            //Tìm thông tin dự án dựa trên dữ liệu từ Interview URL
            $project = Project::findByInterviewURL($interviewURL);

            if (!$project || !$project->projectDetails) {
                return response()->json([
                    'status_code' => 902,
                    'message' => Project::ERROR_PROJECT_DETAILS_NOT_CONFIGURED . ' Vui lòng liên hệ Admin để biết thêm thông tin.',
                    'error' => Project::ERROR_PROJECT_DETAILS_NOT_CONFIGURED
                ], 404);
            }

            //Tìm thông tin dự án đã được set up giá dựa trên dữ liệu từ Interview URL
            $price = $project->getPriceForProvince($interviewURL->province_id, $interviewURL->price_level);

            if($price <= 0)
            {   
                Log::error(Project::STATUS_PROJECT_NOT_SUITABLE_PRICES);
                
                return response()->json([
                    'status_code' => 903,
                    'message' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES . ' Vui lòng liên hệ Admin để biết thêm thông tin.',
                    'error' => Project::STATUS_PROJECT_NOT_SUITABLE_PRICES
                ], 422);
            }
            
            $phoneNumber = $validatedRequest['phone_number'];

            $serviceCode = cache()->remember(
                "service_code_$phoneNumber",
                3600,
                fn() => $vinnetService->get_service_code($phoneNumber)
            );

            if(!$serviceCode){
                return response()->json([
                    'status_code' => 904,
                    'message' => ProjectRespondent::ERROR_INVALID_RESPONDENT_PHONE_NUMBER . 'Vui lòng kiểm tra lại.',
                    'error' => ProjectRespondent::ERROR_INVALID_RESPONDENT_PHONE_NUMBER
                ], 409);
            }

            $serviceItems = cache()->remember(
                "service_items_$price",
                3600,
                fn() => $vinnetService->get_service_items($price)
            );
            
            try
            {
                //Kiểm tra đáp viên đã thực hiện giao dịch nhận quà trước đó hay chưa?
                ProjectRespondent::checkIfRespondentProcessed($project, $interviewURL);

                //Kiểm tra số điện thoại đáp viên nhập đã được nhận quà trước đó hay chưa?
                ProjectRespondent::checkGiftPhoneNumber($project, $phoneNumber);

            } catch(\Exception $e){
                return response()->json([
                    'status_code' => 905,
                    'message' => $e->getMessage() . ' Vui lòng liên hệ Admin để biết thêm thông tin.',
                    'error' => $e->getMessage()
                ], 409);
            }

            $environment = $this->detectEnvironment($project, $interviewURL);
            
            Log::info('Environment: ' . $environment);

            // Tìm thông tin của Project Respondent
            $projectRespondent = ProjectRespondent::findProjectRespondent($project, $interviewURL, $phoneNumber);

            if(!$projectRespondent){
                //Thông tin mới => Cập nhật thông tin vào hệ thống
                $projectRespondent = DB::transaction(function() use (
                    $project,
                    $interviewURL,
                    $phoneNumber,
                    $serviceCode,
                    $environment
                ) {
                    return $project->createProjectRespondents([
                        'project_id' => $project->id,
                        'location_id' => $interviewURL->location_id,
                        'shell_chainid' => $interviewURL->shell_chainid,
                        'respondent_id' => $interviewURL->shell_chainid . '-' . $interviewURL->respondent_id,
                        'employee_id' => $interviewURL->employee->id,
                        'province_id' => $interviewURL->province_id,
                        'interview_start' => $interviewURL->interview_start,
                        'interview_end' => $interviewURL->interview_end,
                        'respondent_phone_number' => $interviewURL->respondent_phone_number,
                        'phone_number' => $phoneNumber,
                        'service_code' => $serviceCode,
                        'price_level' => $interviewURL->price_level,
                        'status' => ProjectRespondent::STATUS_RESPONDENT_PENDING,
                        'environment' => $environment,
                    ]);
                });
            } else {
                //Thông tin cũ
                //Kiểm tra xem Project Respondent có thực hiện bất kỳ giao dịch nào chưa?
                //Nếu chưa => xem như thông tin mới => cập nhật lại status cho Project Respondent
                
                $hasSuccess = $projectRespondent->vinnetTransactions()
                                ->where('vinnet_token_status', TransactionStatus::STATUS_VERIFIED)
                                ->exists()
                                ||
                                $projectRespondent->gotitVoucherTransactions()
                                ->where('voucher_status', ProjectGotItVoucherTransaction::STATUS_VOUCHER_SUCCESS)
                                ->exists();
                
                if($hasSuccess){
                    return response()->json([
                        'status_code' => 905,
                        'message' => ProjectRespondent::ERROR_DUPLICATE_RESPONDENT,
                        'error' => ProjectRespondent::ERROR_DUPLICATE_RESPONDENT . ' [Trường hợp Đáp viên đã tồn tại và đã có thực hiện giao dịch]'
                    ], 409);
                }

                $projectRespondent->updateStatus(ProjectRespondent::STATUS_RESPONDENT_PENDING);   
            }

            $token = $tokenService->createOrReuseToken($projectRespondent);
            
            if($environment === 'test'){
                    
                Log::info('Staging Environment: ');

                return response()->json([
                    'status_code' => 996,
                    'message' => TransactionStatus::STATUS_TRANSACTION_TEST . ' [Giá trị quà tặng: ' . $price . ']',
                    'token' => $token,
                    'service_items' => $serviceItems
                ], 200); 
            } else {
                return response()->json([
                    'status_code' => 900,
                    'message' => ProjectRespondent::STATUS_RESPONDENT_QUALIFIED,
                    'token' => $token,
                    'service_items' => $serviceItems
                ], 200);
            }
        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 999,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
    
    public function show(Request $request, $projectId)
    {
        try{
            $perPage = $request->query('per_page', 10);
            $search = $request->query('searchTerm');
            
            $query = DB::table('project_respondents as pr')
                    ->leftJoin('project_vinnet_transactions as pvt', 'pr.id', '=', 'pvt.project_respondent_id')
                    ->leftJoin('project_gotit_voucher_transactions as pgt', 'pr.id', '=', 'pgt.project_respondent_id')
                    ->join('projects as p', 'p.id', '=', 'pr.project_id')
                    ->join('provinces', 'provinces.id', '=', 'pr.province_id')
                    ->join('employees', 'employees.id', '=', 'pr.employee_id')
                    ->select(
                        DB::raw('MONTH(COALESCE(pvt.created_at, pgt.created_at)) as `month`'),
                        DB::raw('COALESCE(pvt.vinnet_payservice_requuid, pgt.transaction_ref_id) AS transaction_id'),
                        'pr.service_code',
                        DB::raw('COALESCE(pvt.created_at, pgt.created_at) AS created_at'),
                        'pr.channel',
                        'pr.phone_number',
                        DB::raw('COALESCE(pvt.total_amt, pgt.voucher_value) AS amount'),
                        'pvt.discount',
                        'pvt.payment_amt',
                        DB::raw('COALESCE(pvt.payment_amt / 1.1, pgt.voucher_value) AS payment_pre_tax'),
                        DB::raw('COALESCE(pvt.vinnet_token_message, pgt.voucher_status) AS transaction_status'),
                        'p.project_name',
                        'provinces.name as province_name',
                        'p.internal_code',
                        DB::raw('(SELECT pd.symphony FROM project_details as pd WHERE pd.project_id = p.id) as symphony'),
                        'pr.shell_chainid',
                        'pr.respondent_id',
                        'pr.respondent_phone_number',
                        'employees.employee_id',
                        'employees.first_name',
                        'employees.last_name',
                        'pr.interview_start',
                        'pr.interview_end',
                        'pr.reject_message',
                        'pr.status as project_respondent_status'
                    )
                    ->where(function($q) {
                        $q->whereRaw("COALESCE(pvt.vinnet_token_message, pgt.voucher_status) IN ('Thành công', 'Voucher được cập nhật thành công.')")
                        ->orWhereRaw("COALESCE(pvt.vinnet_token_message, pgt.voucher_status) LIKE 'Voucher được cancelled by GotIt ngày%'");
                    })
                    ->whereIn('pr.channel', ['vinnet','gotit','other']);
            
            if($projectId != 0){
                $query->where('pr.project_id', $projectId);
            }

            if($search){
                Log::info('search: ' . $search);

                $query->where(function($q) use ($search){
                    $q->where('pr.respondent_phone_number', 'LIKE', "%$search%")
                        ->orWhere('pr.phone_number', 'LIKE', "%$search%");  
                });
            }

            if($request->query('export_all')){
                $transactions = $query->get();

                return response()->json([
                    'status_code' => 200,
                    'data' => TransactionResource::collection($transactions),
                    'meta' => []
                ]);
            } else {
                $transactions = $query->paginate($perPage);

                return response()->json([
                    'status_code' => 200,
                    'data' => TransactionResource::collection($transactions),
                    'meta' => [
                        'current_page' => $transactions->currentPage(),
                        'per_page' => $transactions->perPage(),
                        'total' => $transactions->total(),
                        'last_page' => $transactions->lastPage(),
                    ]
                ]);
            }

            
        }
        catch(\Exception $e)
        {
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => 500,
                'message' => 'List of employees requested failed - ' . $e->getMessage(),
            ]);
        }
    }

    public function statistics(TransactionStatisticsRequest $request, $projectId)
    {
        try
        {
            $validated = $request->validated();

            $query = DB::table('project_respondents as pr')
                    ->leftJoin('project_vinnet_transactions as pvt', 'pr.id', '=', 'pvt.project_respondent_id')
                    ->leftJoin('project_gotit_voucher_transactions as pgt', 'pr.id', '=', 'pgt.project_respondent_id')
                    ->join('employees', 'employees.id', '=', 'pr.employee_id')
                    ->whereIn('pr.channel', ['vinnet', 'gotit', 'other'])
                    ->where(function($q) {
                        $q->whereRaw("COALESCE(pvt.vinnet_token_message, pgt.voucher_status) IN ('Thành công', 'Voucher được cập nhật thành công.')")
                        ->orWhereRaw("COALESCE(pvt.vinnet_token_message, pgt.voucher_status) LIKE 'Voucher được cancelled by GotIt ngày%'");
                    });

            if($projectId != 0){
                $query->where('pr.project_id', $projectId);
            }

            if(!empty($validated['channel'])){
                $query->where('pr.channel', $validated['channel']);
            }

            if(!empty($validated['date_from'])){
                $query->whereDate('pr.interview_start', '>=', $validated['date_from']);
            }

            if(!empty($validated['date_to'])){
                $query->whereDate('pr.interview_start', '<=', $validated['date_to']);
            }

            $rows = $query->select(
                    'pr.channel',
                    'pr.interview_start',
                    'pr.interview_end',
                    DB::raw('COALESCE(pvt.created_at, pgt.created_at) as gift_time'),
                    'pr.respondent_id',
                    'pr.respondent_phone_number',
                    'employees.employee_id',
                    'employees.first_name',
                    'employees.last_name'
                )
                ->get();

            $interviewBuckets = [];
            $giftBuckets = [];
            $gapBuckets = $this->emptyGapBuckets();
            $anomalies = [];

            foreach($rows as $row){
                $interviewStart = Carbon::parse($row->interview_start);
                $interviewHourKey = $this->hourRangeBucket($interviewStart->hour);
                $interviewBuckets[$interviewHourKey] = ($interviewBuckets[$interviewHourKey] ?? 0) + 1;

                if(!$row->gift_time){
                    continue;
                }

                $giftTime = Carbon::parse($row->gift_time);
                $giftHourKey = $this->hourRangeBucket($giftTime->hour);
                $giftBuckets[$giftHourKey] = ($giftBuckets[$giftHourKey] ?? 0) + 1;

                $interviewEnd = Carbon::parse($row->interview_end);
                $gapMinutes = (int) round(($giftTime->getTimestamp() - $interviewEnd->getTimestamp()) / 60);

                $gapBuckets[$this->gapBucket($gapMinutes)]++;

                if($gapMinutes < 0){
                    $anomalies[] = [
                        'respondent_id' => $row->respondent_id,
                        'phone' => $row->respondent_phone_number,
                        'channel' => $row->channel,
                        'employee_id' => $row->employee_id,
                        'employee_name' => trim($row->first_name . ' ' . $row->last_name),
                        'interview_end' => $row->interview_end,
                        'gift_time' => $row->gift_time,
                        'gap_minutes' => $gapMinutes
                    ];
                }
            }

            $anomaliesTotal = count($anomalies);

            usort($anomalies, fn($a, $b) => $a['gap_minutes'] <=> $b['gap_minutes']);

            ksort($interviewBuckets);
            ksort($giftBuckets);

            return response()->json([
                'status_code' => 200,
                'data' => [
                    'total' => $rows->count(),
                    'interview_time_buckets' => $interviewBuckets,
                    'gift_time_buckets' => $giftBuckets,
                    'gap_buckets' => $gapBuckets,
                    'anomalies' => array_slice($anomalies, 0, 300),
                    'anomalies_total' => $anomaliesTotal
                ]
            ]);
        } catch(\Exception $e){
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    private function emptyGapBuckets(): array
    {
        return [
            '< 0 (bất thường)' => 0,
            '0 - 30 phút' => 0,
            '30 phút - 2 giờ' => 0,
            '2 - 24 giờ' => 0,
            '> 24 giờ' => 0
        ];
    }

    private function hourRangeBucket(int $hour): string
    {
        return sprintf('%02d-%02d', $hour, ($hour + 1) % 24);
    }

    private function gapBucket(int $minutes): string
    {
        if($minutes < 0) return '< 0 (bất thường)';
        if($minutes <= 30) return '0 - 30 phút';
        if($minutes <= 120) return '30 phút - 2 giờ';
        if($minutes <= 1440) return '2 - 24 giờ';
        return '> 24 giờ';
    }
}
