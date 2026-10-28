<?php

namespace App\Exports;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use App\Services\VinnetService;

class TransactionsExport extends StreamedXlsxExport
{
    protected $fromDate;
    protected $toDate;
    protected $userName;
    protected $vinnetService;

    public function __construct($fromDate, $toDate, $userName, VinnetService $vinnetService)
    {
        $this->fromDate = $fromDate;
        $this->toDate = $toDate;
        $this->userName = $userName;
        $this->vinnetService = $vinnetService;
    }

    public function query(): Builder
    {
        return DB::table('project_respondents as pr')
                    ->leftJoin('project_vinnet_transactions as pvt', function($join) {
                        $join->on('pr.id', '=', 'pvt.project_respondent_id')
                            ->where('pvt.vinnet_token_message', 'like', 'Thành công');
                    })
                    ->leftJoin('project_gotit_voucher_transactions as pgv', 'pr.id', '=', 'pgv.project_respondent_id')
                    ->join('projects as p', 'p.id', '=', 'pr.project_id')
                    ->join('provinces as pv', 'pv.id', '=', 'pr.province_id')
                    ->join('employees as ep', 'ep.id', '=', 'pr.employee_id')
                    ->where(function($q){
                        $q->whereIn(DB::raw("COALESCE(pvt.vinnet_token_message, pgv.voucher_status)"), [
                            'Thành công',
                            'Voucher được cập nhật thành công.'
                        ])
                        ->orWhere(DB::raw("COALESCE(pvt.vinnet_token_message, pgv.voucher_status) like 'Voucher được cancelled by GotIt ngày%'"));
                    })
                    ->whereIn('pr.channel', [
                        'vinnet',
                        'gotit',
                        'other',
                        'email'
                    ])
                    ->whereBetween(DB::raw("COALESCE(pvt.created_at, pgv.created_at)"),[
                        $this->fromDate,
                        $this->toDate
                    ])
                    ->orderBy('pr.id')
                    ->select([
                        DB::raw("MONTH(COALESCE(pvt.created_at, pgv.created_at)) as month"),
                        DB::raw("COALESCE(pvt.vinnet_invoice_comment, pgv.invoice_comment) as invoice_comment"),
                        DB::raw("COALESCE(pvt.vinnet_payservice_requuid, pgv.transaction_ref_id) as transaction_id"),
                        'pr.service_code',
                        DB::raw("COALESCE(pvt.created_at, pgv.created_at) as created_at"),
                        'pr.channel',
                        'pr.phone_number',
                        DB::raw("COALESCE(pvt.total_amt, pgv.voucher_value) as amount"),
                        'pvt.discount',
                        'pvt.payment_amt',
                        DB::raw("COALESCE(pvt.payment_amt / 1.1, pgv.voucher_value) as thanh_toan"),
                        DB::raw("COALESCE(pvt.vinnet_token_message, pgv.voucher_status) as status"),
                        'p.project_name',
                        'pv.name as province_name',
                        'p.internal_code',
                        DB::raw("(select pd.symphony from project_details as pd where pd.project_id = p.id) as symphony"),
                        'pr.shell_chainid',
                        'pr.respondent_id',
                        'pr.respondent_phone_number',
                        'ep.employee_id',
                        'ep.first_name',
                        'ep.last_name',
                        'pr.interview_start',
                        'pr.interview_end'
                    ]);
    }

    public function map($row): array
    {
        return [
            $row->month,
            $row->invoice_comment,
            $this->userName,
            $row->transaction_id,
            $row->transaction_id,
            $row->transaction_id,
            $row->channel == 'gotit' ? $this->vinnetService->getProviceByPhoneNumber((string) $row->phone_number) : $this->vinnetService->getProviceByServiceCode((string) $row->service_code),
            optional($row->created_at) ? date('d/m/Y H:i:s', strtotime($row->created_at)) : '',
            $row->channel == 'gotit' ? "DAYONE" : "VINNET",
            $this->maskPhone($row->phone_number),
            $row->amount ?? '',
            $row->amount ?? '',
            $row->channel == 'gotit' ? ($row->amount ?? '') : ($row->payment_amt ?? ''),
            $row->status,
            "QUA",
            $row->discount ?? '',
            $row->project_name,
            $row->province_name,
            $row->symphony,
            $row->thanh_toan,
            '',
            '',
            '',
            $row->channel == 'gotit' ? "DAYONE" : "VINNET",
            $row->internal_code,
            $row->shell_chainid,
            $row->respondent_id,
            $row->employee_id,
            $row->first_name,
            $row->last_name,
            $row->interview_start,
            $row->interview_end
        ];
    }

    public function headings(): array
    {
        return [
            'THANG',
            'STATUS',
            'NGƯỜI NẠP',
            'MÃ ĐƠN HÀNG',
            'MÃ REQUEST',
            'NGƯỜI TẠO',
            'LOẠI SẢN PHẨM',
            'THỜI GIAN GIAO DỊCH',
            'NHÀ CUNG CẤP',
            'SỐ ĐIỆN THOẠI',
            'MỆNH GIÁ (VNĐ)',
            'NẠP THÀNH CÔNG (VNĐ)',
            'THANH TOÁN',
            'TRẠNG THÁI',
            'ĐT / QUÀ',
            'CHIÊT KHẤU',
            'TÊN DỰ ÁN',
            'KHU VỰC',
            'SYMPHONY',
            'THÀNH TIỀN',
            'TÀI KHOẢN',
            'TÌNH TRẠNG DỰ ÁN',
            'PO NUMBER',
            'VENDOR',
            'INTERNAL_CODE',
            'SHELL_CHAINID',
            'RESPONDENT_ID',
            'EMPLOYEE',
            'FIRST_NAME',
            'LAST_NAME',
            'INTERVIEW_START',
            'INTERVIEW_END'
        ];
    }
}
