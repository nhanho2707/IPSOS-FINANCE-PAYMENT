<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\TransactionsExport;
use App\Exports\TransactionsByProjectsExport;
use Illuminate\Support\Facades\Auth;
use App\Services\VinnetService;
use Carbon\Carbon;

class ExportController extends Controller
{
    public function exportTransaction(Request $request, VinnetService $vinnetService)
    {
        $request->validate([
            'from_date' => 'required|date',
            'to_date' => 'required|date'
        ]);

        $fromDate = $request->from_date;
        $toDate = $request->to_date;

        $logged_in_user = Auth::user()->username;

        ini_set('memory_limit', '512M');

        $excelName = 'transaction_'
                        . Carbon::parse($fromDate)->format('Ymd')
                        . '_to_'
                        . Carbon::parse($toDate)->format('Ymd')
                        . '.xlsx';
        
        return (new TransactionsExport($fromDate, $toDate, $logged_in_user, $vinnetService))->download($excelName);
    }

    public function exportTransactionByProjects(Request $request, VinnetService $vinnetService)
    {
        $request->validate([
            'project_ids' => 'required|exists:projects,id'
        ]);

        $projectIds = $request->project_ids ?? [];

        $logged_in_user = Auth::user()->username;

        ini_set('memory_limit', '512M');

        return (new TransactionsByProjectsExport($projectIds, $logged_in_user, $vinnetService))->download('transactions.xlsx');
    }
}
