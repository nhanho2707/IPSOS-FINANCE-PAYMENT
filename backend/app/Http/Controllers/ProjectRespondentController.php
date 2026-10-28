<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;
use App\Models\Project;
use App\Models\Province;
use App\Models\Employee;
use App\Models\ProjectRespondent;
use App\Http\Requests\ImportProjectRespondentsRequest;
use App\Http\Requests\ProjectRespondentIndexRequest;
use App\Http\Resources\ProjectRespondentResource;
use App\Services\ProjectRespondentTokenService;

class ProjectRespondentController extends Controller
{
    public function show(ProjectRespondentIndexRequest $request, $projectId)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            if(!in_array(Auth::user()->userDetails->role->name, ['Admin', 'Scripter'])){
                
                return response()->json([
                    'status_code' => 403,
                    'message' => 'You do not have permission.'
                ]);
            }
            
            try
            {
                $project = Project::findOrFail($projectId);
            } 
            catch(\Exception $e)
            {
                Log::error('The project not found: ' . $e->getMessage());

                return response()->json([
                    'status_code' => 404,
                    'message' => Project::STATUS_PROJECT_NOT_FOUND
                ]);
            }

            $perPage = $request->input('perPage', 10);

            $query = $project->projectRespondents()
                                            ->with('province:id,name')
                                            ->with('employee:id,employee_id');

            if($request->input('status') === 'pending'){
                $query->where('status', ProjectRespondent::STATUS_RESPONDENT_PENDING);
            }
            
            $projectRespondents = $query->orderBy('id')->paginate($perPage);

            return response()->json([
                'status_code' => 400,
                'message' => 'List of respondents requested successfully',
                'data' => ProjectRespondentResource::collection($projectRespondents),
                'meta' => [
                    'current_page' => $projectRespondents->currentPage(),
                    'per_page' => $projectRespondents->perPage(),
                    'total' => $projectRespondents->total(),
                    'last_page' => $projectRespondents->lastPage(),
                ]
            ]);
        } 
        catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'message' => $e->getMessage(),
                'error' => $e->getMessage()
            ], 400);
        }
    }

    private function checkImportData(array $rows, $project): array
    {
        $errors = [];
        $duplicateKeys = [];

        Log::info('Data Import: ', $rows);

        foreach($rows as $index => $row){
            
            $respondentId = $row['shell_chainid'] . '-' . $row['instance_id'];

            $exists = $project->projectRespondents()->where('respondent_id', $respondentId)
                                        ->exists();
            
            if($exists){
                $errors[] = [
                    'row' => $index + 2,
                    'type' => 'DUPLICATE',
                    'respondent_id' => $respondentId
                ];
            }

            $exists = $project->projectRespondents()
                                ->where(function($query) use ($row) {
                                    $query->where('respondent_phone_number', $row['respondent_phone_number'])
                                            ->orWhere('phone_number', $row['respondent_phone_number'])
                                            ->orWhere('respondent_phone_number', $row['phone_number'])
                                            ->orWhere('phone_number', $row['phone_number']);
                                })
                                ->exists();
            
            if($exists){
                $errors[] = [
                    'row' => $index + 2,
                    'type' => 'DUPLICATE_PHONE_NUMBER',
                    'respondent_id' => $respondentId
                ];
            }

            Log::info('Checking province: ' . $row['province_name']);

            if(!Province::where('name', $row['province_name'])->exists()){
                $errors[] = [
                    'row' => $index + 2,
                    'type' => 'PROVINCE_NOT_FOUND',
                    'respondent_id' => $respondentId
                ];
            }

            Log::info('Checking employee: ' . $row['employee_id']);

            if(!Employee::where('employee_id', $row['employee_id'])->exists()){
                $errors[] = [
                    'row' => $index + 2,
                    'type' => 'EMPLOYEE_NOT_FOUND',
                    'respondent_id' => $respondentId
                ];
            }
        }

        return $errors;
    }

    public function bulkImportOfflineProjectRespondents(ImportProjectRespondentsRequest $request, $projectId, ProjectRespondentTokenService $tokenService)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            if(!in_array(Auth::user()->userDetails->role->name, ['Admin', 'Scripter'])){
                
                return response()->json([
                    'status_code' => 403,
                    'message' => 'You do not have permission.'
                ]);
            }
            
            try
            {
                $project = Project::findOrFail($projectId);
            } 
            catch(\Exception $e)
            {
                Log::error('The project not found: ' . $e->getMessage());

                return response()->json([
                    'status_code' => 404,
                    'message' => Project::STATUS_PROJECT_NOT_FOUND
                ]);
            }

            $validatedRequest = $request->validated();

            $errors = $this->checkImportData($validatedRequest['project_respondents'], $project);

            Log::error("Import Data Fails: ", $errors);

            if(!empty($errors)){
                return response()->json([
                    'status_code' => 422,
                    'message' => 'Import failed. Please fix the errors and try again.',
                    'error_count' => count($errors),
                    'errors' => $errors
                ], 442);
            }

            $projectRespondentData = $validatedRequest['project_respondents'];

            Log::info($projectRespondentData);

            $batchId = "IMPORT_" . now()->format('dmYHis');

            DB::beginTransaction();

            try
            {
                $successCount = 0;

                foreach($projectRespondentData as $row)
                {
                    $environment = 'live';

                    if($project->projectDetails->status === Project::STATUS_IN_COMING || $project->projectDetails->status === Project::STATUS_ON_HOLD || 
                        ($project->projectDetails->status === Project::STATUS_ON_GOING && !in_array(substr(strtolower($row['employee_id']), 0, 2), ['hn', 'sg', 'dn', 'ct', 'ma'])))
                        {
                            $environment = 'test';
                        }

                    if(strlen($row['location_id']) == 0 || 
                        strtolower($row['location_id']) === '_defaultsp' || 
                            !in_array(substr(strtolower($row['location_id']), 0, 2), ['hn', 'sg', 'dn', 'ct', 'ma']))
                            {
                                $environment = 'test';
                            }
                    
                    $province = Province::where('name', $row['province_name'])->first();
                    $employee = Employee::where('employee_id', $row['employee_id'])->first();

                    $province_id = $province->id;
                    $employee_id = $employee->id;

                    $projectRespondent = $project->createProjectRespondents([
                        'project_id' => $projectId,
                        'location_id' => $row['location_id'],
                        'shell_chainid' => $row['shell_chainid'],
                        'respondent_id' => $row['shell_chainid'] . '-' . $row['instance_id'],
                        'employee_id' => $employee_id,
                        'province_id' => $province_id,
                        'interview_start' => now(),
                        'interview_end' => now(),
                        'respondent_phone_number' => $row['respondent_phone_number'],
                        'phone_number' => $row['phone_number'],
                        'email' => $row['email'],
                        'channel' => $row['channel'],
                        'price_level' => $row['price_level'],
                        'status' => ProjectRespondent::STATUS_RESPONDENT_PENDING,
                        'environment' => $environment,
                    ]);

                    $token = $tokenService->createOfflineToken($projectRespondent, $batchId);

                    $successCount++;
                }

                DB::commit();

                return response()->json([
                    'status_code' => 900,
                    'message' => 'Import successfully',
                    'batch_id' => $batchId,
                    'imported_count' => $successCount
                ]);
            }
            catch (\Throwable $e) {
                DB::rollBack();
                
                Log::error($e->getMessage());

                return response()->json([
                    'status_code' => 500,
                    'message' => $e->getMessage(),
                    'error' => $e->getMessage()
                ], 500);
            }
        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'message' => $e->getMessage(),
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function bulkRemoveProjectRespondent(Request $request, $projectId, $projectRespondentId)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            if(!in_array(Auth::user()->userDetails->role->name, ['Admin', 'Scripter'])){
                
                return response()->json([
                    'status_code' => 403,
                    'message' => 'You do not have permission.'
                ]);
            }
            
            try
            {
                $project = Project::findOrFail($projectId);
            } 
            catch(\Exception $e){
                Log::error('The project not found: ' . $e->getMessage());

                return response()->json([
                    'status_code' => 404,
                    'message' => Project::STATUS_PROJECT_NOT_FOUND
                ]);
            }

            $request->validate([
                'shell_chainid' => "required|string",
                'respondent_id' => "required|string"
            ]);

            $projectRespondent = ProjectRespondent::where('id', $projectRespondentId)
                                        ->where('project_id', $projectId)
                                        ->firstOrFail();

            if($projectRespondent->shell_chainid != $request->shell_chainid ||
                $projectRespondent->respondent_id != $request->respondent_id
            ){
                return response()->json([
                    'success' => false,
                    'message' => 'Respondent data mismatch. Delete aborted.'
                ]);
            }

            $projectRespondent->delete();

            return response()->json([
                'success' => true,
                'message' => 'Respondent deleted successfully'
            ]);

        } catch(\Exception $e){
            DB::rollBack();
            Log::error('Unexpected error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Unexpected error occurred while removing respondents into project.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
