<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Arr;
use Symfony\Component\HttpFoundation\Response;
use Carbon\Carbon;
use App\Models\CATIRespondent;
use App\Models\CATIBatch;
use App\Models\Project;
use App\Models\ProjectDetail;
use App\Models\Employee;
use App\Http\Resources\CATIBatchResource;
use App\Http\Resources\CATIRespondentResource;

class CatiController extends Controller
{
    public function index(Request $request, $projectId)
    {
        try
        {
            $validated = $request->validate([
                'per_page' => 'nullable|integer|min:1|max:100',
                'searchTerm' => 'nullable|string|max:255'
            ]);

            $perPage = $validated['per_page'] ?? 10;
            $searchTerm = $validated['searchTerm'] ?? null;
            
            $query = CATIBatch::where('project_id', $projectId);

            if($searchTerm){
                $query->where(function($q) use ($searchTerm){
                    $q->where('name', 'LIKE', "%{$searchTerm}%");
                });
            }            

            $catiBatches = $query->paginate($perPage);

            return response()->json([
                'status_code' => 200,
                'message' => 'Successfully',
                'data' => CATIBatchResource::collection($catiBatches),
                'meta' => [
                    'current_page' => $catiBatches->currentPage(),
                    'per_page' => $catiBatches->perPage(),
                    'total' => $catiBatches->total(),
                    'last_page' => $catiBatches->lastPage(),
                ]
            ]);
        } catch(\Exception $e){
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function destroyBatch(Request $request, $projectId, $batchId)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            $project = Project::findOrFail($projectId);

            $batch = $project->catiBatches()->where('id', $batchId)->first();

            if($logged_in_user !== $batch->created_user_id){
                return response()->json([
                    'status_code' => 403,
                    'message' => 'You are not allowed to delete this batch.'
                ], 403);
            }

            $toUsed = $batch->respondents()
                                ->where('status', '!=', 'New')
                                ->exists();

            if($toUsed){
                return response()->json([
                    'status_code' => 403,
                    'message' => "This batch can't delete."
                ], 403);
            }
            
            $batch->delete();

            return response()->json([
                'status_code' => 200,
                'message' => 'Deleted successfully.'
            ]);
        } catch(\Exception $e){
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function updateState(Request $request, $projectId, $batchId)
    {
        try
        {
            $validated = $request->validate([
                'status' => 'required|string|in:blocked,active'
            ]);

            $status = $validated['status'] ?? null;

            $logged_in_user = Auth::user()->id;

            $project = Project::findOrFail($projectId);

            $batch = $project->catiBatches()->where('id', $batchId)->first();

            if($logged_in_user !== $batch->created_user_id){
                return response()->json([
                    'status_code' => 403,
                    'message' => 'You are not allowed to block this batch.'
                ], 403);
            }

            $batch->update([
                'status' => $status
            ]);

            return response()->json([
                'status_code' => 200,
                'message' => 'Updated successfully',
                'data' => $batch
            ]);
        } catch(\Exception $e){
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage()
            ]);
        }
    }

    public function getCATIProjects(Request $request)
    {
        $catiProjects = Cache::remember('cati.projects', 3600, function(){
            return DB::table('projects')
                    ->join('project_details', 'projects.id', '=', 'project_details.project_id')
                    ->join('project_project_types', 'projects.id', '=', 'project_project_types.project_id')
                    ->where('project_details.status', 'LIKE', 'on going')
                    ->where('project_project_types.project_type_id', 4)
                    ->select('projects.id', 'projects.internal_code', 'projects.project_name')
                    ->distinct()
                    ->get();
        });

        return response()->json([
            'data' => $catiProjects
        ]);
    }

    public function catiLogin(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|int',
            'employee_id' => 'required|string|exists:employees,employee_id'
        ]);

        $projectId = $validated['project_id'] ?? null;
        $employeeId = trim($validated['employee_id']) ?? null;

        $employee = Employee::where('employee_id', $employeeId)->first();

        if(!$employee){
            return response()->json([
                'status_code' => 400,
                'error' => 'Employee not found.'
            ]);
        }

        $exists = $employee->projects()
                    ->where('project_id', $projectId)
                    ->exists();

        if(!$exists){
            return response()->json([
                'status_code' => 400,
                'error' => 'Employee not in project'
            ]);
        }

        $token = Str::random(40);

        Cache::put("cati_token_$token", [
            'employee_id' => $employee->id,
            'project_id' => $projectId
        ], now()->addHours(8));

        Cache::forget('cati.filters.all');

        return response()->json([
            'status_code' => 200,
            'token' => $token,
            'message' => 'Login Successfully.'
        ]);
    }

    public function filters()
    {
        $filters = ['filter_1','filter_2','filter_3','filter_4'];

        $data = Cache::remember('cati.filters.all', 3600, function() use ($filters){
            $result = [];

            foreach($filters as $filter){
                $result[$filter] = CATIRespondent::whereHas('batch', function($q) {
                                $q->where('status', 'active');
                            })
                            ->distinct()
                            ->pluck($filter)
                            ->filter()
                            ->values();
            }

            return $result;
        });

        return response()->json([
            'status_code' => 200,
            'data' => $data
        ]);
    }

    public function getCatiRespondent(Request $request)
    {
        $validated = $request->validate([
            'filter_1' => 'nullable|string',
            'filter_2' => 'nullable|string',
            'filter_3' => 'nullable|string',
            'filter_4' => 'nullable|string'
        ]);

        $auth = $request->attributes->get('auth');

        $employeeId = $auth['employee_id'];
        $projectId = $auth['project_id'];

        DB::beginTransaction();

        $query = CATIRespondent::with('batch')
                        ->where('status', 'New')
                        ->whereHas('batch', function($q) {
                            $q->where('status', 'active');
                        });

        if($request->filter_1){
            $query->where('filter_1', $request->filter_1);
        }
        
        if($request->filter_2){
            $query->where('filter_2', $request->filter_2);
        }

        if($request->filter_3){
            $query->where('filter_3', $request->filter_3);
        }

        if($request->filter_4){
            $query->where('filter_4', $request->filter_4);
        }

        $respondent = $query->lockForUpdate()->first();

        if (!$respondent) {
            DB::commit();

            return response()->json([
                'status' => 200,
                'data' => null
            ]);
        }

        $respondent->update([
            'status' => 'Calling',
            'assigned_to' => $employeeId,
            'locked_at' => now(),
        ]);

        DB::commit();

        return response()->json([
            'status_code' => 200,
            'data' => new CATIRespondentResource($respondent)
        ]);
    }

    public function updateStatus(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
            'status' => 'required|string',
            'comment' => 'nullable|string'
        ]);
        
        DB::table('cati_respondents')
            ->where('id', $request->id)
            ->update([
                'status' => $request->status,
                'comment' => $request->comment,
                'updated_at' => now()
            ]);

        return response()->json(['success' => true]);
    }
    
    public function getSuspended(Request $request)
    {
        try
        {   
            $validated = $request->validate([
                'per_page' => 'nullable|integer|min:1|max:100',
                'searchTerm' => 'nullable|string|max:255'
            ]);

            $perPage = $validated['per_page'] ?? 10;
            $searchTerm = $validated['searchTerm'] ?? null;
            
            $auth = $request->attributes->get('auth');

            $employeeId = $auth['employee_id'];
            $projectId = $auth['project_id'];

            $query = CATIRespondent::with('batch')
                        ->where('status', 'Suspended')
                        ->where('assigned_to', $employeeId)
                        ->whereHas('batch', function($q) {
                            $q->where('status', 'active');
                        })
                        ->orderBy('updated_at', 'desc');

            if($searchTerm){
                $query->where(function($q) use ($searchTerm){
                    $q->where('phone', 'LIKE', "%{$searchTerm}%")
                        ->orWhere('respondent_id', 'LIKE', "%{$searchTerm}%");
                });
            }            

            $catiRespondents = $query->paginate($perPage);

            return response()->json([
                'status_code' => 200,
                'message' => 'Successfully',
                'data' => CATIRespondentResource::collection($catiRespondents),
                'meta' => [
                    'current_page' => $catiRespondents->currentPage(),
                    'per_page' => $catiRespondents->perPage(),
                    'total' => $catiRespondents->total(),
                    'last_page' => $catiRespondents->lastPage(),
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

    public function authenticateToken(Request $request)
    {
        $rememberToken = $request->remember_token ?? null;
        $employeeId = $request->employee_id ?? null;
        $respondentName = $request->respondent_name ?? null;
        $phoneNumber = $request->phone_number ?? null;
        $batchName = $request->batch_name ?? null;
        $link = $request->link ?? null;
        $data = $request->data ?? null;

        if(!$respondentName || !$phoneNumber || !$batchName || !$link){
            return response()->json([
                'status_code' => 400,
                'error' => 'Respondent Name, Phone Number, Batch Name and Link should not be blank.'
            ]);
        }

        $project = ProjectDetail::where('remember_token', $rememberToken)->first();

        if(!$project){
            return response()->json([
                'status_code' => 400,
                'error' => 'Dự án không tồn tại.'
            ]);
        }

        $batch = CATIBatch::where('project_id', $project->project_id)
                    ->where('name', $batchName)
                    ->first();

        if(!$batch){
            return response()->json([
                'status_code' => 400,
                'error' => 'Batch không tồn tại. Vui lòng kiểm tra.'
            ]);
        }

        $employee = Employee::where('employee_id', $employeeId)->first();

        if(!$employee){
            return response()->json([
                'status_code' => 400,
                'error' => 'Interviewer ID không tồn tại. Vui lòng kiểm tra.'
            ]);
        }

        $existingPhoneNumber = $batch->respondents()
            ->where('phone', $phoneNumber)
            ->exists();
        
        if($existingPhoneNumber){
            return response()->json([
                'status_code' => 403,
                'error' => 'Số điện thoại này đã tham gia khảo sát trước đó. Vui lòng kiểm tra.'
            ]);
        }

        if(!$data){
            return response()->json([
                'status_code' => 400,
                'error' => 'Dữ liệu truyền vào không hợp lệ.'
            ]);
        }

        if(is_string($data)){
            $data = json_decode($data, true);
        }

        if(!is_array($data)){
            return response()->json([
                'status_code' => 400,
                'error' => 'Dữ liệu truyền vào không hợp lệ.'
            ]);
        }

        $dataArr = [];

        foreach($data as $key => $value){
            $dataArr[] = $key . '=' . trim($value);
        }

        $dataBase64 = base64_encode(implode(';', $dataArr));
        
        $respondent = DB::transaction(function() use ($project, $batch, $phoneNumber, $respondentName, $link, $dataBase64) {
            $nextNumber = (int) CATIRespondent::where('project_id', $project->project_id)
                ->lockForUpdate()
                ->max(DB::raw('CAST(respondent_id AS UNSIGNED)')) + 1;

            $query = http_build_query([
                'id' => $nextNumber,
                'I.User1' => $dataBase64
            ]);

            $linkFinal = $link . '&' . http_build_query([
                'id' => $nextNumber,
                'I.User1' => $dataBase64
            ]);
            
            return CATIRespondent::create([
                'project_id' => $batch->project_id,
                'batch_id' => $batch->id,
                'respondent_id' => $nextNumber,
                'phone' => $phoneNumber,
                'name' => $respondentName,
                'link' => $linkFinal,
                'status' => 'New'
            ]);
        });

        return response()->json([
            'status_code' => 200,
            'link' => $respondent->link
        ]);
    }
}
