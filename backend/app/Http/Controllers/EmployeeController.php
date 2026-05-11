<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\DB;
use App\Models\Project;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Role;
use App\Models\ProjectVinnetToken;
use App\Http\Resources\EmployeeResource;

class EmployeeController extends Controller
{
    public function index(Request $request, $projectId)
    {
        try
        {
            $perPage = $request->input('perPage', 10);
            $search = $request->input('searchTerm');

            try{
                $project = Project::findOrFail($projectId);
            } catch (\Exception $e){
                Log::error('The project not found: ' . $e->getMessage());
                return response()->json([
                    'status_code' => 404,
                    'message' => 'The project not found' 
                ]);
            }

            $query = Employee::query()
                                ->select(
                                    'employees.id',
                                    'employees.employee_id',
                                    'employees.first_name',
                                    'employees.last_name',
                                    DB::raw("COUNT(project_respondents.id) as transaction_total"),
                                    DB::raw("SUM(CASE WHEN project_respondents.channel = 'vinnet' THEN 1 ELSE 0 END) as vinnet_total"),
                                    DB::raw("SUM(CASE WHEN project_respondents.channel = 'gotit' THEN 1 ELSE 0 END) as gotit_total"),
                                    DB::raw("SUM(CASE WHEN project_respondents.channel = 'other' THEN 1 ELSE 0 END) as other_total")
                                )
                                ->join('project_employees', 'project_employees.employee_id', '=', 'employees.id')
                                ->leftJoin('project_respondents', function($join) use ($projectId){
                                    $join->on('project_respondents.employee_id', '=', 'employees.id')
                                            ->where('project_respondents.project_id', '=', $projectId);
                                })
                                ->where('project_employees.project_id', $projectId)
                                ->groupBy(
                                    'employees.id',
                                    'employees.employee_id',
                                    'employees.first_name',
                                    'employees.last_name'
                                )
                                ->orderBy('transaction_total', 'desc');
            
            if($search){
                $query->where(function($q) use ($search){
                    $q->where('employees.first_name', 'LIKE', "%{$search}%")
                        ->orWhere('employees.last_name', 'LIKE', "%{$search}%")
                        ->orWhere('employees.employee_id', 'LIKE', "%{$search}%");
                });
            }
            
            $employees = $query->paginate($perPage);

            // Log::info('Employee Query Debug: ', [
            //     'sql' => $query->toSql(),
            //     'bindings' => $query->getBindings()
            // ]);

            return response()->json([
                'status_code' => Response::HTTP_OK,
                'message' => 'List of employees requested successfully',
                'data' => EmployeeResource::collection($employees),
                'meta' => [
                    'current_page' => $employees->currentPage(),
                    'per_page' => $employees->perPage(),
                    'total' => $employees->total(),
                    'last_page' => $employees->lastPage(),
                ] 
            ]);
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
}