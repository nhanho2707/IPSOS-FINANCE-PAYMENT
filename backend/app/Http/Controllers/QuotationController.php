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
use App\Models\Project;
use App\Models\Quotation;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\QuotationVersionResource;

class QuotationController extends Controller
{
    public function getQuotationVersions($projectId)
    {
        try
        {
            $project = Project::findOrFail($projectId);

            $quotationVersions = $project->quotations()
                                            ->orderByDesc('version')
                                            ->get();

            return response()->json([
                'status_code' => 200,
                'project' => new ProjectResource($project),
                'versions' => QuotationVersionResource::collection($quotationVersions)
            ],200);
        } catch(\Exception $e)
        {
            Log::error($e->getMessage());

            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function getQuotation($projectId, $versionId)
    {
        try
        {
            $quotation = Quotation::where('project_id', $projectId)
                            ->where('version', $versionId)
                            ->first();

            if(!$quotation){
                return response()->json([
                    'status_code' => 200,
                    'quotation' => null,
                    'message' => 'Successful.'
                ]);
            }

            return response()->json([
                'status_code' => 200,
                'quotation' => $quotation,
                'message' => 'Successful.'
            ]);
        } catch(\Exception $e)
        {
            Log::error($e->getMessage());

            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function store(Request $request, $projectId)
    {
        try
        {
            $request->validate([
                'data' => 'required|array',
                'data.internal_code' => 'required|string',
                'data.project_name' => 'required|string'
            ]);

            $logged_in_user = Auth::user()->id;

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

            $lastestVersion = $project->quotations()->max('version') ?? 0;
            
            $quotation = $project->quotations()->create([
                'data' => $request->data,
                'version' => $lastestVersion + 1,
                'status' => 'draft',
                'created_user_id' => $logged_in_user
            ]);
            
            return response()->json([
                'status_code' => 200,
                'quotation' => $quotation,
                'message' => 'The quotation stored successfully.'
            ]);

        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function cloneVersion($projectId, $versionId)
    {
        try
        {
            $logged_in_user = Auth::user();

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()
                            ->where('id', $versionId)
                            ->firstOrFail();

            $newQuotation = DB::transaction(function() use ($project, $quotation, $logged_in_user) {

                //Lock tất cả các quotation của dự án này => các request khác phải đợi
                $maxVersion = $project->quotations()
                                ->lockForUpdate()
                                ->max('version');

                $maxVersion = ($maxVersion ?? 0) + 1;

                $data = $quotation->data;

                return $project->quotations()->create([
                    'data' => $data,
                    'version' => $maxVersion,
                    'status' => 'draft',
                    'created_user_id' => $logged_in_user->id
                ]);
            });
            
            return response()->json([
                'status_code' => 200,
                'data' => $quotation,
                'message' => "Cloned to version {$newQuotation->version}"
            ]);

        } catch(\Exception $e){
            Log::error('Cloning Version Fails: ' . $e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function update(Request $request, $projectId, $versionId)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            $request->validate([
                'data' => 'required|array',
                'data.internal_code' => 'required|string',
                'data.project_name' => 'required|string',
                'data.platform' => 'required|string',
                'data.project_objectives' => 'required|string'
            ]);

            $newInternalCode = trim($request->data['internal_code']);
            $newProjectName = trim(strtoupper($request->data['project_name']));

            $existingProject = Project::where('internal_code', $newInternalCode)
                                ->where('project_name', $newProjectName)
                                ->where('id', '!=', $projectId)
                                ->exists();

            if($existingProject){
                return response()->json([
                    'status_code' => 422,
                    'error' => 'Project Name and Internal Code already exist.'
                ], 422);
            }

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if($quotation->status !== 'draft' && $quotation->status != 'rejected'){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Cannot edit this quotation.'
                ], 403);
            }

            DB::transaction(function() use ($logged_in_user, $project, $quotation, $request) {

                $newInternalCode = trim($request->data['internal_code']);
                $newProjectName = trim(strtoupper($request->data['project_name']));
                
                $project->update([
                    'internal_code' => $newInternalCode,
                    'project_name' => $newProjectName
                ]);

                $project->projectDetails()->update([
                    'platform' => trim($request->data['platform']),
                    'project_objectives' => $request->data['project_objectives']
                ]);

                $quotation->update([
                    'data' => $request->data,
                    'updated_user_id' => $logged_in_user
                ]);
            });

            return response()->json([
                'status_code' => 200,
                'quotation' => new QuotationVersionResource($quotation),
                'message' => 'The quotation updated successfully.'
            ]);

        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function destroy($projectId, $versionId)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if($quotation->status !== 'draft'){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only draft version can be deleted.'
                ], 403);
            }

            if($logged_in_user !== $quotation->created_user_id){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'You are not allowed to delete this version.'
                ], 403);
            }

            $deleteVersion = $quotation->version;

            $quotation->delete();

            $remainingCount = $project->quotations()->count();

            if($remainingCount === 0){
                $projectDetails = $project->projectDetails;

                $project->quotations()->create([
                    'data' => [
                        'internal_code' => $project->internal_code,
                        'project_name' => $project->project_name,
                        'project_types' => $project->projectTypes()
                                                ->get()
                                                ->map(function($item) {
                                                    return [
                                                        'label' => $item->name,
                                                        'value' => $item->id
                                                    ];
                                                }),
                        'platform' => $projectDetails->platform,
                        'planned_field_start' => $projectDetails->planned_field_start,
                        'planned_field_end' => $projectDetails->planned_field_end
                    ],
                    'version' => 1,
                    'status' => 'draft',
                    'created_user_id' => $logged_in_user
                ]);
            }
            
            return response()->json([
                'status_code' => 200,
                'message' => "Draft version {$deleteVersion} deleted successfully."
            ]);

        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function submit($projectId, $versionId)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if($quotation->status !== 'draft'){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only draft can be submitted.'
                ], 403);
            }

            if($logged_in_user !== $quotation->created_user_id){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'You are not allowed to delete this version.'
                ], 403);
            }

            $quotation->update([
                'status' => 'submitted',
                'submitted_user_id' => $logged_in_user
            ]);

            return response()->json([
                'status_code' => 200,
                'data' => new QuotationVersionResource($quotation),
                'message' => 'The quotation submitted successfully.'
            ]);
        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function approve($projectId, $versionId)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if($quotation->status !== 'submitted'){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only submit can be approved.'
                ], 403);
            }

            if($logged_in_user !== $quotation->created_user_id){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'You are not allowed to approve this version.'
                ], 403);
            }

            $quotation->update([
                'status' => 'approved',
                'approved_user_id' => $logged_in_user,
                'approved_at' => now()
            ]);

            return response()->json([
                'status_code' => 200,
                'data' => new QuotationVersionResource($quotation),
                'message' => 'The quotation approved successfully.'
            ]);
        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function reject($quotationId)
    {
        try
        {
            $quotation = Quotation::findOrFail($quotationId);

            if($quotation->status !== 'submitted'){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only submitted can be rejected.'
                ], 403);
            }

            $quotation->update([
                'status' => 'rejected'
            ]);

            return response()->json([
                'status_code' => 200,
                'quotation' => new QuotationVersionResource($quotation),
                'message' => 'The quotation rejected successfully.'
            ]);
        } catch(\Exception $e){
            Log::error($e->getMessage());
            
            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
