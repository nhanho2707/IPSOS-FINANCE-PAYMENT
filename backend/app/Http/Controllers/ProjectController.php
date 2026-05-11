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
use Symfony\Component\HttpFoundation\Response;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\EmployeeResource;
use App\Models\User;
use App\Models\Project;
use App\Models\ProjectType;
use App\Models\Team;
use App\Models\Province;
use App\Models\ProjectUUID;
use App\Models\Employee;
use App\Models\ProjectEmployee;
use App\Models\ProjectRespondent;
use App\Http\Requests\StoreProjectVinnetTokenRequest;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Requests\UpdateProjectStatusRequest;
use App\Http\Requests\UpdateProjectDisabledRequest;
use App\Http\Requests\ImportEmployeesRequest;
use App\Http\Requests\ImportProjectRespondentsRequest;
use App\Services\ProjectRespondentTokenService;
use Carbon\Carbon;

class ProjectController extends Controller
{
    public function show($projectId)
    {
        try
        {
            try
            {
                $project = Project::with(['projectDetails','projectTypes'])->findOrFail($projectId);
            }
            catch(\Exception $e)
            {
                Log::error('The project not found: ' . $e->getMessage());
                return response()->json([
                    'status_code' => Response::HTTP_NOT_FOUND, //404
                    'message' => 'The project not found'
                ], Response::HTTP_NOT_FOUND);
            }
            
            return response()->json([
                'status_code' => Response::HTTP_OK, //400
                'message' => 'Projects displayed successfully upon request',
                'data' => new ProjectResource($project)
            ], Response::HTTP_OK);
        }
        catch(\Exception $e)
        {
            Log::error("Project display fails. " . $e->getMessage());
            return response()->json([
                'status_code' => 500,
                'message' => 'Project display fails. ' . $e->getMessage(),
            ]);
        }
        
    }

    public function index(Request $request): JsonResponse
    {
        try{
            //Retrieve a value from the headers
            $showOnlyEnabled = $request->header('Show-Only-Enabled');

            //Get the values from the request
            $platform = $request->input('platform');
            $status = $request->input('status');
            
            $logged_in_user = Auth::user()->id;
            
            //page = số trang | per_page = số dòng mỗi trang
            $perPage = $request->input('perPage', 10);

            $search = $request->input('searchTerm');
            $searchFromDate = $request->input('searchFromDate') ? Carbon::parse($request->input('searchFromDate')) : null;
            $searchToDate = $request->input('searchToDate') ? Carbon::parse($request->input('searchToDate')) : null;

            if(in_array(Auth::user()->userDetails->role->name, ['Admin', 'Finance'])){
                $query = Project::with([
                    'projectDetails', 
                    'projectDetails.createdBy'
                ])
                ->withCount([
                    'projectRespondents as count_respondents' => function($q) {
                        $q->where('environment', 'live');
                    }
                ])
                ->withCount('projectEmployees as count_employees');
            } else {
                $query = Project::with(['projectDetails', 'projectDetails.createdBy'])
                    ->withCount([
                        'projectRespondents as count_respondents' => function($q) {
                            $q->where('environment', 'live');
                        }
                    ])
                    ->withCount('projectEmployees as count_employees')
                    ->whereHas('projectPermissions', function($q) use ($logged_in_user) {
                        $q->where('user_id', $logged_in_user);
                    });
            }
            
            if($showOnlyEnabled)
            {
                $query->when($showOnlyEnabled, function($query, $showOnlyEnabled){
                    return $query->where('disabled', !$showOnlyEnabled);
                });
            }

            $query->when($platform, function($query, $platform){
                return $query->whereHas('projectDetails', function(Builder $query) use ($platform){
                    $query->where('platform', $platform);
                });
            })->when($status, function($query, $status){
                return $query->whereHas('projectDetails', function(Builder $query) use ($status){
                    $query->where('platform', $status);
                });
            });

            if($search){
                $query->where(function($q) use ($search){
                    $q->where('project_name', 'LIKE', "%$search%")
                        ->orWhere('internal_code', 'LIKE', "%$search%")
                        ->orWhereHas('projectDetails', function(Builder $qd) use ($search){
                            $qd->where('symphony', 'LIKE', "%$search%");
                        });  
                });
            }

            if($searchFromDate && $searchToDate){
                $query->when($searchFromDate && $searchToDate, function($q) use ($searchFromDate, $searchToDate){
                    return $q->whereHas('projectDetails', function(Builder $sub) use ($searchFromDate, $searchToDate){
                        $sub->whereBetween('planned_field_start', [
                            $searchFromDate,
                            $searchToDate
                        ]);
                    });
                });
            }
            
            $query->orderByRaw("
                (
                    SELECT 
                        CASE project_details.status
                            WHEN 'on going' THEN 1
                            WHEN 'in coming' THEN 2
                            WHEN 'planned' THEN 3
                            WHEN 'on hold' THEN 4
                            WHEN 'completed' THEN 5
                            WHEN 'cancelled' THEN 6
                        END
                    FROM project_details
                    WHERE project_details.project_id = projects.id
                    LIMIT 1
                )
            ");

            $query->latest();

            //$projects = $query->get();
            // Laravel paginator
            $projects = $query->paginate($perPage);

            return response()->json([
                'status_code' => Response::HTTP_OK,
                'message' => 'List of projects requested successfully',
                'data' => ProjectResource::collection($projects),
                'meta' => [
                    'current_page' => $projects->currentPage(),
                    'per_page' => $projects->perPage(),
                    'total' => $projects->total(),
                    'last_page' => $projects->lastPage(),
                ] 
            ], Response::HTTP_OK)
            ->header('Content-Type', 'application/json');
        } catch(\Exception $e){
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => Response::HTTP_BAD_REQUEST, //400
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST)
            ->header('Content-Type', 'application/json');
        }
    }

    public function store(Request $request)
    {
        try
        {
            //Decode JSON data
            $decodedRequest = $request->json()->all();

            Log::info('Decoded data: ' . json_encode($decodedRequest));

            // Validate the decoded data
            $validator = Validator::make($decodedRequest, (new StoreProjectRequest())->rules(), (new StoreProjectRequest())->messages());

            if ($validator->fails()) {
                Log::error($validator->errors());
                return response->json([
                    'message' => $validator->errors()->first(),
                ], 422); // Unprocessable Entity
            }
            
            $validatedRequest = $validator->validated();
            
            try
            {
                DB::beginTransaction();

                $user = Auth::user();

                $tempInternalCode = 'TMP-' . Str::uuid();

                $project = Project::create([
                    'internal_code' => $tempInternalCode,
                    'project_name' => $validatedRequest['project_name']
                ]);

                $year = date('Y');

                $internalCode = $year . '-' . str_pad($project->id, 4, '0', STR_PAD_LEFT);

                $project->update([
                    'internal_code' => $internalCode
                ]);

                $project->projectDetails()->create([
                    'created_user_id' => $user->id,
                    'platform' => strtolower($validatedRequest['platform']),
                    'planned_field_start' => $validatedRequest['planned_field_start'],
                    'planned_field_end' => $validatedRequest['planned_field_end']
                ]);

                $project->projectPermissions()->create([
                    'user_id' => $user->id,
                ]);

                $projectTypes = $validatedRequest['project_types'];
                
                // Attach the project types to the project (assuming a many-to-many relationship)
                $project->projectTypes()->attach($projectTypes);

                $teams = $validatedRequest['teams'];
                
                //Attach the teams to the project (assuming a many-to-many relationship)
                $project->teams()->attach($teams);

                $projectTypeItems = ProjectType::whereIn('id', $validatedRequest['project_types'])
                                                ->get()
                                                ->map(function($item) {
                                                    return [
                                                        'value' => $item->id,
                                                        'label' => $item->name
                                                    ];
                                                });

                $project->quotations()->create([
                    'data' => [
                        'internal_code' => $internalCode,
                        'project_name' => $validatedRequest['project_name'],
                        'project_types' => $projectTypeItems,
                        'platform' => strtolower($validatedRequest['platform']),
                        'planned_field_start' => $validatedRequest['planned_field_start'],
                        'planned_field_end' => $validatedRequest['planned_field_end']
                    ],
                    'version' => 1,
                    'status' => 'draft',
                    'created_user_id' => $user->id
                ]);
                
                DB::commit();
                
                Log::info('The project stored successfully.');

                Cache::forget('cati_projects');
                Cache::forget('metadata_projects');

                return response()->json([
                    'message' => 'The project stored successfully.',
                    'data' => new ProjectResource($project)
                ], 201);
            } 
            catch (\Exception $e)
            {
                DB::rollBack();
                
                Log::error('SQL Error: ' . $e->getMessage());

                if($e->getCode() === '23000' && str_contains($e->getMessage(), 'Duplicate entry')){
                    return response()->json([
                        'message' => 'The project already exists with the same internal code or a similar name. Please check again!',
                        'error' => $e->getMessage()
                    ], 409); // 409 Conflict
                }
                
                return response()->json([
                    'message' => 'Database error occurred while creating project.',
                    'error' => $e->getMessage()
                ], 500);
            }
        } catch(\Exception $e)
        {
            DB::rollBack();
            Log::error('Unexpected error: ' . $e->getMessage());

            return response()->json([
                'message' => 'Unexpected error occurred while creating project.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(UpdateProjectRequest $request, $projectId): JsonResponse
    {
        try
        {
            $user = Auth::user();
            
            //Retrieve the project by its id
            try
            {
                $project = Project::findOrFail($projectId);

            } catch(\Exception $e){
                Log::error('The project not found: ' . $e->getMessage());
                return response()->json([
                    'status_code' => Response::HTTP_NOT_FOUND, //404
                    'message' => 'The project not found'
                ], Response::HTTP_NOT_FOUND);
            }

            if($user->id !== $project->projectDetails->created_user_id)
            {
                return response()->json([
                    'status_code' => 403, 
                    'message' => 'You do not have permission on this project. Please contact the admin for assistance.'
                ], 403);
            }

            $validatedRequest = $request->validated();
            
            $query = Project::where('internal_code', $validatedRequest['internal_code'])
                            ->where('project_name', $validatedRequest['project_name'])
                            ->where('id', '!=', $projectId);

            if($query->exists())
            {
                return response()->json(['status_code' => 401, 'message' => 'The combination of internal code and project name has already been taken.'], 401);
            }

            DB::beginTransaction();

            try
            {
                //Update project basic information
                $project->update($request->only([
                    'internal_code',
                    'project_name'
                ]));

                $project->projectDetails()->updateOrCreate([
                    'project_id' => $project->id,
                ], $request->only([
                    'symphony',
                    'job_number',
                    'planned_field_start',
                    'planned_field_end'
                ]));

                //Update project types (assuming a many-to-many relationship)
                $projectTypes = $validatedRequest['project_types'];
                $projectTypeIDs = ProjectType::whereIn('name', $projectTypes)->pluck('id');

                $project->projectTypes()->sync($projectTypeIDs);

                //Update teams (assuming a many-to-many relationship)
                $teams = $validatedRequest['teams'];
                $teamIds = Team::whereIn('name', $teams)->pluck('id');

                $project->teams()->sync($teamIds);

                //Update permissions
                $permissions = $validatedRequest['permissions'];
                $userIds = User::whereIn('email', $permissions)->pluck('id');

                foreach($userIds as $user_id) 
                {
                    $projectPermission = $project->projectPermissions()->where('user_id', $user_id)->first();

                    if(!$projectPermission)
                    {
                        $project->projectPermissions()->create([
                            'project_id' => $projectId,
                            'user_id' => $user_id
                        ]);
                    }
                }

                //Update provinces (assuming a many-to-many relationship)
                $provinceData = $request->input('provinces', []);

                foreach($provinceData as $provinceId => $provinceAttributes)
                {
                    $projectProvince = $project->projectProvinces()->where('province_id', $provinceId)->first();

                    if($projectProvince)
                    {
                        $projectProvince->update($provinceAttributes);
                    }
                    else
                    {
                        $project->projectProvinces()->create(array_merge(['province_id' => $provinceId], $provinceAttributes));
                    }
                }

                Cache::forget('cati.projects');
                Cache::forget('cati.filters.all');

                DB::commit();
                
                Log::info('The project editted successfully.');
                return response()->json([
                    'status_code' => Response::HTTP_OK,
                    'message' => 'The project editted successfully.',
                    'data' => new ProjectResource($project) 
                ]);
            }
            catch(\Exception $e)
            {
                DB::rollBack();
                Log::error('An error occurred while updating the project: ' . $e->getMessage());
                throw new \Exception('An error occurred while updating the project');
            }
        }
        catch(\Exception $e)
        {
            Log::error('The project editting failed: ' . $e->getMessage());
            return response()->json([
                'status_code' => Response::HTTP_BAD_REQUEST, //400
                'message' => 'The project editting failed: ' . $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    public function updateProjectInfo(Request $request, $projectId)
    {
        try
        {
            $request->validated([
                'internal_code' => 'required|string',
                'project_name' => 'required|string'
            ]);

            //Retrieve the project by its id
            try
            {
                $project = Project::findOrFail($projectId);

            } catch(\Exception $e){
                Log::error('The project not found: ' . $e->getMessage());
                return response()->json([
                    'status_code' => Response::HTTP_NOT_FOUND, //404
                    'message' => 'The project not found'
                ], Response::HTTP_NOT_FOUND);
            }

            $project->update([
                'internal_code' => $request->internal_code,
                'project_name' => $request->project_name
            ]);

            return response()->json([
                'status_code' => 200,
                'message' => 'The project updated successfully.',
                'data' => new ProjectResource($project) 
            ]);

        }catch(\Exception $e){
            Log::error('The project updating failed: ' . $e->getMessage());
            return response()->json([
                'status_code' => 400,
                'error' => 'The project updating failed: ' . $e->getMessage()
            ]);
        }
    }

    public function updateStatus(UpdateProjectStatusRequest $request, $projectId)
    {
        try
        {
            //Retrieve the project by its id
            try
            {
                $project = Project::findOrFail($projectId);

            } catch(\Exception $e){
                Log::error('The project not found: ' . $e->getMessage());
                return response()->json([
                    'status_code' => Response::HTTP_NOT_FOUND, //404
                    'message' => 'The project not found'
                ], Response::HTTP_NOT_FOUND);
            }

            //Validate and get the validated data from the request
            $validatedRequest = $request->validated();

            //Update the status in the project details
            $projectDetails = $project->projectDetails;

            if($projectDetails)
            {
                $projectDetails->update([
                    'status' => $validatedRequest['status']
                ]);
            }

            Cache::forget('cati.projects');
            Cache::forget('cati.filters.all');

            Log::info('The project is updated successfully.');
            return response()->json([
                'status_code' => Response::HTTP_OK,
                'message' => 'The project is updated successfully.',
                'data' => new ProjectResource($project)
            ]);
        }
        catch (Exception $e)
        {
            Log::error('Updating failed: ' . $e->getMessage());
            return response()->json([
                'status_code' => Response::HTTP_BAD_REQUEST,
                'message' => 'Updating failed: ' . $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    public function updateDisabled(UpdateProjectDisabledRequest $request, $projectId)
    {
        try
        {
            //Retrieve the project by its id
            try
            {
                $project = Project::findOrFail($projectId);

            } catch(\Exception $e){
                Log::error('The project not found: ' . $e->getMessage());
                return response()->json([
                    'status_code' => Response::HTTP_NOT_FOUND, //404
                    'message' => 'The project not found'
                ], Response::HTTP_NOT_FOUND);
            }
            
            //Validate and get the validated data from the request
            $validatedRequest = $request->validated();

            $project->update([
                'disabled' => $validatedRequest['disabled'],
            ]);

            Log::info('The project is disabled successfully.');
            return response()->json([
                'status_code' => Response::HTTP_OK,
                'message' => 'The project is disabled successfully.',
                'data' => $project
            ]);
        }
        catch(\Exception $e)
        {
            Log::error('The project disabling failed: ' . $e->getMessage());
            return response()->json([
                'status_code' => Response::HTTP_BAD_REQUEST,
                'message' => 'The project disabling failed: ' . $e->getMessage()
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    public function removeProvinceFromProject(Request $request, $projectId, $provinceId)
    {
        //Retrieve the project by its id
        try
        {
            $project = Project::findOrFail($projectId);

        } 
        catch(\Exception $e)
        {
            Log::error('The project not found: ' . $e->getMessage());
            return response()->json([
                'status_code' => Response::HTTP_NOT_FOUND, //404
                'message' => 'The project not found'
            ], Response::HTTP_NOT_FOUND);
        }

        $user = Auth::user();

        if($user->id !== $project->projectDetails->created_user_id)
        {
            return response()->json(['status_code' => 403, 'message' => 'You do not have permission on this project. Please contact the admin for assistance.'], 403);
        }

        try
        {
            DB::beginTransaction();

            $projectProvince = $project->projectProvinces()->where('province_id', $provinceId)->first();

            if($projectProvince){
                //Delete the specific province
                $projectProvince->delete();
            } else {
                return response()->json(['status_code' => 404, 'message' => 'Province not found in this project.'], 404);
            }

            DB::commit();

            return response()->json([
                'status_code' => 404, 
                'message' => 'Province removed from this project successfully.',
                'data' => new ProjectResource($project)
            ], 404);
        }
        catch(\Exception $e)
        {
            DB::rollBack();

            Log::error('An error occurred while removing province from the project: ' . $e->getMessage());
            return response()->json([
                'status_code' => 500,
                'message' => 'An error occurred while removing province from the project: ' . $e->getMessage()
            ]);
        }
    }
    
    public function bulkAddEmployees(ImportEmployeesRequest $request, $projectId)
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
            
            try{
                $project = Project::findOrFail($projectId);
            } catch(\Exception $e){
                Log::error('The project not found: ' . $e->getMessage());

                return response()->json([
                    'status_code' => 404,
                    'message' => Project::STATUS_PROJECT_NOT_FOUND
                ]);
            }

            $employeeIdsRaw = explode(',', $request->employee_ids);

            $validIds = [];
            $invalidEmployeeIds = [];
            $existedEmployeeIds = [];
            $messages = [];

            foreach ($employeeIdsRaw as $item){
                $clear = trim($item);

                if($clear === '') continue;

                if(!preg_match('/^(([a-zA-Z]{2}))((\d{2,7}))$/', $clear)){
                    $invalidEmployeeIds[] = $clear;
                    continue;
                }

                $id = Employee::where('employee_id', $clear)->value('id');

                if(!$id){
                    $invalidEmployeeIds[] = $clear;
                    continue;
                }

                $existsInProject = $project->projectEmployees()
                                    ->where('employee_id', $id)
                                    ->exists();

                if($existsInProject){
                    $existedEmployeeIds[] = $clear;
                    continue;
                }

                $validIds[] = $id;
            }

            $countSuccess = 0;

            if(!empty($validIds)){
                DB::beginTransaction();
                
                foreach($validIds as $validId){
                    ProjectEmployee::create([
                        'project_id' => $projectId,
                        'employee_id' => $validId
                    ]);

                    $countSuccess++;
                }

                DB::commit();
            }

            if ($countSuccess > 0) {
                $messages[] = "$countSuccess employees added successfully.";
            }

            if (!empty($invalidEmployeeIds)) {
                $messages[] = "Invalid IDs: " . implode(', ', $invalidEmployeeIds);
            }

            if (!empty($existedEmployeeIds)) {
                $messages[] = "Already existed: " . implode(', ', $existedEmployeeIds);
            }

            return response()->json([
                'status_code' => 200,
                'message' => implode("<br/>", $messages),
                'validIds' => $countSuccess,
                'invalidEmployeeIds' => $invalidEmployeeIds,
                'existedEmployeeIds' => $existedEmployeeIds
            ]);

        } catch(\Exception $e)
        {
            DB::rollBack();
            Log::error('Unexpected error: ' . $e->getMessage());

            return response()->json([
                'message' => 'Unexpected error occurred while adding employees into project.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function bulkRemoveEmployee(Request $request, $projectId, $employeeId)
    {
        try{
            $logged_in_user = Auth::user()->id;

            if(!in_array(Auth::user()->userDetails->role->name, ['Admin', 'Scripter'])){
                
                return response()->json([
                    'status_code' => 403,
                    'message' => 'You do not have permission.'
                ]);
            }
            
            try{
                $project = Project::findOrFail($projectId);
            } catch(\Exception $e){
                Log::error('The project not found: ' . $e->getMessage());

                return response()->json([
                    'status_code' => 404,
                    'message' => Project::STATUS_PROJECT_NOT_FOUND
                ]);
            }

            $deleted = DB::table('project_employees')
                        ->where('project_id', $projectId)
                        ->where('employee_id', $employeeId)
                        ->delete();
                        
            if ($deleted === 0) {
                return response()->json([
                    'status_code' => 200,
                    'success' => false,
                    'message' => 'Employee not found in this project'
                ], 404);
            }

            return response()->json([
                'status_code' => 200,
                'success' => true,
                'message' => 'Employee removed successfully'
            ]);

        } catch(\Exception $e){
            DB::rollBack();
            Log::error('Unexpected error: ' . $e->getMessage());

            return response()->json([
                'message' => 'Unexpected error occurred while removing employee into project.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
