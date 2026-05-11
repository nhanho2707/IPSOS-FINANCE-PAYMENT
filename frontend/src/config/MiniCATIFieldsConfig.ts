import { ColumnFormat } from "./ColumnConfig";

export interface CATIRespondentData {
    id: string,
    respondent_id: string,
    phone: string,
    link: string,
    comment: string,
};

export interface CATIBatchData {
    id: number,
    project_id: number,
    name: string,
    status: string,
    total_records: number,
    to_used: boolean //Batch đã được sử dụng hay chưa
    created_user_name: string
};

export const MiniCATICellConfig: ColumnFormat[] = [
    {
        label: "ID",
        name: "respondent_id",
        type: "string",
        flex: 1
    },
    {
        label: "Phone",
        name: "phone",
        type: "string",
        flex: 1
    },
    {
        label: "Comment",
        name: "comment",
        type: "string",
        flex: 1
    }
];

export const MiniCATIBatchCellConfig: ColumnFormat[] = [
    {
        label: "Batch Name",
        name: "name",
        type: "string",
        flex: 1
    },
    {
        label: "Number of respondents",
        name: "total_records",
        type: "number",
        flex: 1
    },
    {
        label: "Status",
        name: "status",
        type: "string",
        flex: 1
    },
    {
        label: "Created By",
        name: "created_user_name",
        type: "string",
        flex: 1
    }
]