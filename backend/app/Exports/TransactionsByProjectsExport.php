<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\Exportable;
use App\Services\VinnetService;

class TransactionsByProjectsExport implements FromQuery, WithHeadings, WithChunkReading, WithMapping
{
    use Exportable;

    protected $projectIds;
    protected $userName;
    protected $vinnetService;

    public function __construct($projectIds, $userName, VinnetService $vinnetService)
    {
        $this->projectIds = $projectIds;
        $this->userName = $userName;
        $this->vinnetService = $vinnetService;
    }

    public function query()
    {
        $vinnetTransactions = DB::table('project_vinnet_transactions')
                                    ->select(
                                        'project_respondent_id',
                                        DB::raw('SUM(total_amt) as total_amount'),
                                        DB::raw("GROUP_CONCAT(
                                            vinnet_token_message
                                            SEPARATOR '###'
                                        ) as statuses"),
                                        DB::raw("GROUP_CONCAT(
                                            vinnet_invoice_comment
                                            SEPARATOR '###'
                                        ) as invoice_comments")
                                    )
                                    ->whereIn('vinnet_token_message', [
                                        'Thành công',
                                        'Voucher được cập nhật thành công.'
                                    ])
                                    ->groupBy('project_respondent_id');
        
        $gotitTransactions = DB::table('project_gotit_voucher_transactions')
                                    ->select(
                                        'project_respondent_id',
                                        DB::raw('SUM(voucher_value) as total_amount'),
                                        DB::raw("GROUP_CONCAT(
                                            voucher_status
                                            SEPARATOR '###'
                                        ) as statuses"),
                                        DB::raw("GROUP_CONCAT(
                                            invoice_comment
                                            SEPARATOR '###'
                                        ) as invoice_comments")
                                    )
                                    ->whereIn('voucher_status', [
                                        'Thành công',
                                        'Voucher được cập nhật thành công.'
                                    ])
                                    ->orWhere(
                                        'voucher_status',
                                        'LIKE',
                                        'Voucher được cancelled by Gotit ngày%'
                                    )
                                    ->groupBy('project_respondent_id');

        return DB::table('project_respondents as pr')
                    ->leftJoin('projects as p', 'p.id', '=', 'pr.project_id')
                    ->join('project_details as pd', 'pd.project_id', '=', 'p.id')
                    ->join('provinces as pv', 'pv.id', '=', 'pr.province_id')
                    ->join('employees as emp', 'emp.id', '=', 'pr.employee_id')
                    ->leftJoinSub($vinnetTransactions, 'vt', function($join){
                        $join->on('vt.project_respondent_id', '=', 'pr.id');
                    })
                    ->leftJoinSub($gotitTransactions, 'gt', function($join){
                        $join->on('gt.project_respondent_id', '=', 'pr.id');
                    })
                    ->whereIn('pr.channel', [
                        'vinnet',
                        'gotit',
                        'other',
                        'email'
                    ])
                    ->whereIn('pr.project_id', $this->projectIds)
                    ->orderBy('pr.id')
                    ->select([
                        'pd.symphony',
                        'p.internal_code',
                        'p.project_name',
                        'pr.shell_chainid',
                        'emp.employee_id',
                        'emp.first_name',
                        'emp.last_name',
                        'pv.name as province_name',
                        'pr.interview_start',
                        'pr.interview_end',
                        'pr.respondent_phone_number',
                        'pr.phone_number',
                        'pr.status as project_respondent_status',
                        'pr.reject_message',
                        'pr.location_id',
                        'pr.environment',
                        'pr.delivery_method',
                        DB::raw("COALESCE(vt.total_amount, gt.total_amount) as amount"),
                        DB::raw("COALESCE(vt.statuses, gt.statuses) as status"),
                        DB::raw("COALESCE(vt.invoice_comments, gt.invoice_comments) as invoice_comment")
                    ]);
    }

    public function chunkSize(): int
    {
        return 1000;
    }

    public function map($row): array
    {
        return [
            $row->symphony,
            $row->internal_code,
            $row->project_name,
            $row->shell_chainid,
            $row->employee_id,
            $row->first_name,
            $row->last_name,
            $row->province_name,
            $row->interview_start,
            $row->interview_end,
            $this->maskPhone($row->respondent_phone_number),
            $this->maskPhone($row->phone_number),
            $row->project_respondent_status,
            $row->reject_message,
            $row->location_id,
            $row->environment,
            $row->delivery_method,
            $row->amount,
            $row->status,
            $row->invoice_comment
        ];
    }

    public function headings(): array
    {
        return [
            'Symphony',
            'Internal_code',
            'Project_name',
            'Shell_chainid',
            'Employee ID',
            'First Name',
            'Last Name',
            'Province Name',
            'Interview Start',
            'Interview End',
            'Respondent Phone Number',
            'Phone Number',
            'Project Respondent Status',
            'Reject Message',
            'Location ID',
            'Environment',
            'Delivery Method',
            'Amount',
            'Status',
            'Invoice Comment'
        ];
    }

    private function maskPhone($phone)
    {
        return substr($phone, 0, 3) . str_repeat('*', strlen($phone) - 6) . substr($phone, - 3);
    }
}

