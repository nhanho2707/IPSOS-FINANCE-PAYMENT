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
use App\Models\Notification;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\QuotationVersionResource;

class QuotationController extends Controller
{
    public function getQuotationVersions($projectId)
    {
        try
        {
            $logged_in_user = Auth::user();

            $roleName = $logged_in_user->userDetails->role->name;

            $project = Project::findOrFail($projectId);

            if(in_array($roleName, ['Researcher', 'Admin'])){
                $quotationVersions = $project->quotations()
                                            ->orderByDesc('version')
                                            ->get();
            } else {
                $quotationVersions = $project->quotations()
                                            ->whereIn('status', ['submitted','fm_confirmed','approved'])
                                            ->orderByDesc('version')
                                            ->get();
            }

            return response()->json([
                'status_code' => 200,
                'project' => new ProjectResource($project),
                'versions' => QuotationVersionResource::collection($quotationVersions)
            ], 200);
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
                'data.project_information.internal_code' => 'required|string',
                'data.project_information.project_name' => 'required|string',
                'data.fieldwork_design.platform' => 'required|string',
                'data.target_group.project_objectives' => 'required|string'
            ]);

            $newInternalCode = trim($request->data['project_information']['internal_code']);
            $newProjectName = trim(strtoupper($request->data['project_information']['project_name']));

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

                $newInternalCode = trim($request->data['project_information']['internal_code']);
                $newProjectName = trim(strtoupper($request->data['project_information']['project_name']));

                $project->update([
                    'internal_code' => $newInternalCode,
                    'project_name' => $newProjectName
                ]);

                $project->projectDetails()->update([
                    'platform' => trim($request->data['fieldwork_design']['platform']),
                    'project_objectives' => $request->data['target_group']['project_objectives']
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

            $roleName = Auth::user()->userDetails->role->name;
            if($roleName !== 'Admin' && $logged_in_user !== $quotation->created_user_id){
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

            $countPermissions = $project->projectPermissions()->count();

            if($countPermissions === 1){
                return response()->json([
                    'status_code' => 422,
                    'error' => 'Project must have at least one assigned user before submit.'
                ], 422);
            }

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if($quotation->status !== 'draft'){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only draft can be submitted.'
                ], 403);
            }

            $roleName = Auth::user()->userDetails->role->name;
            if($roleName !== 'Admin' && $logged_in_user !== $quotation->created_user_id){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'You are not allowed to submit this version.'
                ], 403);
            }

            $quotation->update([
                'status' => 'submitted',
                'submitted_user_id' => $logged_in_user
            ]);

            # Tạo Notification
            $projectPermisstions = $project->projectPermissions;

            foreach($projectPermisstions as $projectPermission){
                Notification::create([
                    'user_id' => $projectPermission->id,
                    'project_id' => $project->id,
                    'created_by' => $logged_in_user,
                    'type' => 'quotation_submitted', 
                    'message' => "Quotation v{$quotation->version} submitted for {$project->internal_code} - {$project->project_name}",
                    'url' => "/project-management/projects/{$project->id}/quotation"
                ]);
            }

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

    public function confirmFm($projectId, $versionId)
    {
        try
        {
            $logged_in_user = Auth::user();

            $roleName = $logged_in_user->userDetails->role->name;
            if ($roleName !== 'Field Manager') {
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only Field Manager can confirm FM review.'
                ], 403);
            }

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if (!$quotation) {
                return response()->json([
                    'status_code' => 404,
                    'error' => 'Quotation not found.'
                ], 404);
            }

            if ($quotation->status !== 'submitted') {
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only submitted quotations can be confirmed by FM.'
                ], 403);
            }

            foreach (($quotation->feedbacks ?? []) as $thread) {
                $normalized = $this->normalizeThread($thread);
                if (!empty($normalized) && end($normalized)['type'] === 'feedback') {
                    return response()->json([
                        'status_code' => 422,
                        'error' => 'Còn feedback chưa được xử lý. Researcher phải resolve hoặc reject tất cả feedback trước khi FM confirm.'
                    ], 422);
                }
            }

            $quotation->update([
                'status'               => 'fm_confirmed',
                'fm_confirmed_user_id' => $logged_in_user->id,
                'fm_confirmed_at'      => now(),
            ]);

            $projectPermissions = $project->projectPermissions;

            foreach ($projectPermissions as $projectPermission) {
                Notification::create([
                    'user_id'    => $projectPermission->id,
                    'project_id' => $project->id,
                    'created_by' => $logged_in_user->id,
                    'type'       => 'quotation_fm_confirmed',
                    'message'    => "Quotation v{$quotation->version} confirmed by FM for {$project->internal_code} - {$project->project_name}",
                    'url'        => "/project-management/projects/{$project->id}/quotation"
                ]);
            }

            return response()->json([
                'status_code' => 200,
                'data'    => new QuotationVersionResource($quotation),
                'message' => 'FM review confirmed successfully.'
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage());

            return response()->json([
                'status_code' => 400,
                'error'       => $e->getMessage(),
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

            if($quotation->status !== 'fm_confirmed'){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only FM-confirmed quotations can be approved.'
                ], 403);
            }

            $roleName = Auth::user()->userDetails->role->name;
            if(!in_array($roleName, ['Admin', 'Researcher'])){
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

    public function saveFeedback(Request $request, $projectId, $versionId)
    {
        try
        {
            $validator = Validator::make($request->all(), [
                'section' => 'required|string',
                'content' => 'required|string|max:2000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status_code' => 422,
                    'error' => $validator->errors()->first()
                ], 422);
            }

            $logged_in_user = Auth::user();

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if (!$quotation) {
                return response()->json([
                    'status_code' => 404,
                    'error' => 'Quotation not found.'
                ], 404);
            }

            if ($quotation->status !== 'submitted') {
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Feedback chỉ được phép khi quotation đang ở trạng thái submitted.'
                ], 403);
            }

            $section   = $request->input('section');
            $feedbacks = $quotation->feedbacks ?? [];
            $thread    = $this->normalizeThread($feedbacks[$section] ?? []);

            $thread[] = [
                'type'       => 'feedback',
                'content'    => $request->input('content'),
                'user_id'    => $logged_in_user->id,
                'user_name'  => $logged_in_user->name,
                'created_at' => now()->toIso8601String(),
            ];

            $feedbacks[$section] = array_values($thread);

            $quotation->update(['feedbacks' => $feedbacks]);

            return response()->json([
                'status_code' => 200,
                'data' => new QuotationVersionResource($quotation),
                'message' => 'Feedback saved.'
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage());

            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function saveFeedbackResponse(Request $request, $projectId, $versionId)
    {
        try
        {
            $validator = Validator::make($request->all(), [
                'section'  => 'required|string',
                'status'   => 'required|in:resolved,rejected',
                'content'  => 'nullable|string|max:2000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status_code' => 422,
                    'error' => $validator->errors()->first()
                ], 422);
            }

            $logged_in_user = Auth::user();

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if (!$quotation) {
                return response()->json([
                    'status_code' => 404,
                    'error' => 'Quotation not found.'
                ], 404);
            }

            if ($quotation->status !== 'submitted') {
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Phản hồi feedback chỉ được phép khi quotation đang ở trạng thái submitted.'
                ], 403);
            }

            $section   = $request->input('section');
            $feedbacks = $quotation->feedbacks ?? [];
            $thread    = $this->normalizeThread($feedbacks[$section] ?? []);

            if (empty($thread)) {
                return response()->json([
                    'status_code' => 404,
                    'error' => 'No feedback thread found for this section.'
                ], 404);
            }

            $thread[] = [
                'type'       => 'response',
                'status'     => $request->input('status'),
                'content'    => $request->input('content'),
                'user_id'    => $logged_in_user->id,
                'user_name'  => $logged_in_user->name,
                'created_at' => now()->toIso8601String(),
            ];

            $feedbacks[$section] = array_values($thread);

            $quotation->update(['feedbacks' => $feedbacks]);

            return response()->json([
                'status_code' => 200,
                'data' => new QuotationVersionResource($quotation),
                'message' => 'Response saved.'
            ]);
        } catch (\Exception $e) {
            Log::error($e->getMessage());

            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function withdraw($projectId, $versionId)
    {
        try
        {
            $logged_in_user = Auth::user()->id;

            $project = Project::findOrFail($projectId);

            $quotation = $project->quotations()->where('id', $versionId)->first();

            if(!$quotation){
                return response()->json([
                    'status_code' => 404,
                    'error' => 'Quotation not found.'
                ], 404);
            }

            if(!in_array($quotation->status, ['submitted', 'fm_confirmed'])){
                return response()->json([
                    'status_code' => 403,
                    'error' => 'Only submitted or FM-confirmed quotations can be withdrawn.'
                ], 403);
            }

            // fm_confirmed → submitted (FM needs to re-review); submitted → draft
            $newStatus = $quotation->status === 'fm_confirmed' ? 'submitted' : 'draft';

            $quotation->update([
                'status'               => $newStatus,
                'fm_confirmed_user_id' => null,
                'fm_confirmed_at'      => null,
            ]);

            $projectPermissions = $project->projectPermissions;

            foreach($projectPermissions as $projectPermission){
                Notification::create([
                    'user_id' => $projectPermission->id,
                    'project_id' => $project->id,
                    'created_by' => $logged_in_user,
                    'type' => 'quotation_withdrawn',
                    'message' => "Quotation v{$quotation->version} withdrawn for {$project->internal_code} - {$project->project_name}",
                    'url' => "/project-management/projects/{$project->id}/quotation"
                ]);
            }

            return response()->json([
                'status_code' => 200,
                'data' => new QuotationVersionResource($quotation),
                'message' => 'The quotation withdrawn successfully.'
            ]);
        } catch(\Exception $e){
            Log::error($e->getMessage());

            return response()->json([
                'status_code' => 400,
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    private function normalizeThread(array $thread): array
    {
        // Already a proper sequential array (new format)
        if (array_is_list($thread)) {
            return $thread;
        }

        $result = [];

        // Old-format string keys → convert to one feedback entry
        if (isset($thread['content'])) {
            $result[] = [
                'type'       => 'feedback',
                'content'    => $thread['content'],
                'user_id'    => $thread['user_id'] ?? 0,
                'user_name'  => $thread['user_name'] ?? '',
                'created_at' => $thread['updated_at'] ?? now()->toIso8601String(),
            ];
        }

        // Numeric-keyed entries (new format mixed in) → append in order
        $numericKeys = array_filter(array_keys($thread), 'is_int');
        sort($numericKeys);
        foreach ($numericKeys as $key) {
            $result[] = $thread[$key];
        }

        return $result;
    }
}
