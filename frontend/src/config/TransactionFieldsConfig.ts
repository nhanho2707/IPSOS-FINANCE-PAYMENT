import { ColumnFormat } from "../config/ColumnConfig";
import { formatDateTime, formatMoney } from "../utils/format";

export interface TransactionData {
    id: string,
    transaction_id: string,
    symphony: string,
    internal_code: string,
    project_name: string,
    province_name: string,
    employee_id: string,
    first_name: string,
    last_name: string,
    full_name: string,
    interview_start: string,
    interview_end: string,
    shell_chainid: string
    respondent_id: string,
    respondent_phone_number: string,
    phone_number: string,
    project_respondent_status: string,
    channel: string,
    reject_message: string,
    service_code: string,
    amount: number,
    discount: number,
    payment_amt: number,
    payment_pre_tax: number,
    transaction_status: string,
    created_at: string
};

export const TransactionCellConfig: ColumnFormat[] = [
    {
        label: "Interviewer ID",
        name: "employee_id",
        type: "string",
        flex: 1
    },
    {
        label: "Full Name",
        name: "full_name",
        type: "string",
        flex: 1.4
    },
    {
        label: "Province",
        name: "province_name",
        type: "string",
        flex: 1.2
    },
    {
        label: "Interview Start",
        name: "interview_start",
        type: "string",
        flex: 1.8,
        renderCell: (row: TransactionData) => formatDateTime(row.interview_start)
    },
    {
        label: "Interview End",
        name: "interview_end",
        type: "string",
        flex: 1.8,
        renderCell: (row: TransactionData) => formatDateTime(row.interview_end)
    },
    {
        label: "Shell_ChainID",
        name: "shell_chainid",
        type: "string",
        flex: 1
    },
    {
        label: "Res. Phone Number",
        name: "respondent_phone_number",
        type: "string",
        flex: 1.25,
        align: "right"
    },
    {
        label: "Phone Number",
        name: "phone_number",
        type: "string",
        flex: 1.25,
        align: "right"
    },
    {
        label: "Service Code",
        name: "service_code",
        type: "string",
        flex: 1.05
    },
    {
        label: "Channel",
        name: "channel",
        type: "string",
        flex: 0.9
    },
    {
        label: "Amount",
        name: "amount",
        type: "number",
        flex: 1,
        align: "right",
        renderCell: (row: TransactionData) => formatMoney(row.amount)
    }
];