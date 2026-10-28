<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Auth;
use App\Models\CATIBatch;
use App\Models\Project;
use App\Http\Requests\ImportCATIRespondentsRequest;
use App\Services\CATIRespondentImportService;

class ImportController extends Controller
{
    public function importRecipients(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv',
            'list_name' => 'required|string'
        ]);

        $logged_in_user = Auth::user()->id;

        $list = TradeUnionRecipientList::firstOrCreate([
            'name' => $request->list_name,
            'created_by' => $logged_in_user
        ]);
        
        try {
            Excel::import(new RecipientsImport($list->id), $request->file('file'));
            
            return response()->json([
                'status_code' => 200,
                'message' => 'Recipients imported successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status_code' => 500,
                'error' => 'Failed to import recipients: ' . $e->getMessage()
            ]);
        }
    }

    public function importOfflineProjectRespondents(Request $request, $projectId)
    {
        $validated = $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:10240', //10MB
        ]);

        $logged_in_user = Auth::user()->id;

        $batchId = "IMPORT_" . now()->format('dmYHis');

        try 
        {
            $import = new OfflineRespondentImport($batchId);

            Excel::import($import, $request->file('file'));

            
        }catch (\Throwable $e) {
            \Log::error('Project Respondents import failed', [
                'error' => $e->getMessage(),
                'project_id' => $projectId,
            ]);

            return response()->json([
                'message' => 'Failed to import offline respondents'
            ], 500);
        }
    }

    public function importCATIRespondents(ImportCATIRespondentsRequest $request, $projectId, CATIRespondentImportService $importService)
    {
        $validated = $request->validated();

        $project = Project::findOrFail($projectId);

        try 
        {
            $batch = CATIBatch::firstOrCreate([
                'project_id' => $project->id,
                'name' => trim($validated['batch_name'])
            ], [
                'status' => 'active',
                'created_user_id' => Auth::user()->id
            ]);

            $result = $importService->import($batch, $validated['respondents']);

            return response()->json([
                'status_code' => 200,
                'message' => 'Imported ' . $result['imported_count'] . ' respondents.',
                'data' => [
                    'batch_id' => $batch->id,
                    'imported_count' => $result['imported_count'],
                    'skipped' => $result['skipped']
                ]
            ], 200);

        } catch (\Throwable $e) {
            \Log::error('CATI import failed', [
                'error' => $e->getMessage(),
                'project_id' => $projectId,
            ]);

            return response()->json([
                'status_code' => 500,
                'message' => 'Failed to import CATI respondents'
            ], 500);
        }
    }
}
