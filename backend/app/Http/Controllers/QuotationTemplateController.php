<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\TemplateParserService;
use App\Models\Project;

class QuotationTemplateController extends Controller
{
    public function parse(Request $request, $projectId, TemplateParserService $parser)
    {
        $project = Project::findOrFail($projectId);

        $projectTypes = $project->projectTypes()->pluck('name')->implode(',');

        $filePath = storage_path('schema/quotation_template.xlsx');

        $schema = $parser->parse($filePath, $projectTypes);

        return response()->json($schema);
    }
}
