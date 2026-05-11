<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\ProjectType;
use App\Models\Department;
use App\Models\Team;
use App\Models\Project;
use App\Models\Role;
use App\Http\Resources\ProjectResource;

class MetadataController extends Controller
{
    public function index(Request $request)
    {
        try
        {
            $projects = Cache::remember('metadata_projects', 3600, function() {
                return Project::with('projectDetails')
                        ->orderByRaw("
                            (
                                SELECT
                                    CASE project_details.status
                                        WHEN 'completed' THEN 1
                                        WHEN 'on going' THEN 2
                                        WHEN 'in coming' THEN 3
                                        WHEN 'planned' THEN 4
                                        WHEN 'on hold' THEN 5
                                        WHEN 'cancelled' THEN 6   
                                    END
                                FROM project_details
                                WHERE project_details.project_id = projects.id
                                LIMIT 1
                            )
                        ")
                        ->latest()
                        ->get(['id', 'internal_code', 'project_name']);
            });
            $projectTypes = Cache::remember('metadata_project_types', 3600, fn() => ProjectType::all(['id', 'name']));
            $departments = Cache::remember('metadata_deparments', 3600, fn() => Department::all(['id', 'name']));
            $roles = Cache::remember('metadata_roles', 3600, fn() => Role::all(['id', 'name', 'department_id']));
            $teams = Cache::remember('metadata_teams', 3600, fn() => Team::whereIn('department_id', [2, 3])->get(['id', 'name']));

            return response()->json([
                'status_code' => 200,
                'message' => 'Metadata fetched successfully',
                'data' => [
                    'projects' => $projects,
                    'project_types' => $projectTypes,
                    'departments' => $departments,
                    'roles' => $roles,
                    'teams' => $teams
                ]
            ]);
        }catch(Exception $e){
            Log::error($e->getMessage());
            return response()->json([
                'status_code' => 500,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
