import { ColumnFormat } from "./ColumnConfig";
import i18n from "../i18n/i18n";

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

export type CATIRespondentSheetCell = string | number | boolean;

export interface CATIRespondentSheetRow {
    ID: CATIRespondentSheetCell,
    Phone: CATIRespondentSheetCell,
    Name: CATIRespondentSheetCell,
    Link: CATIRespondentSheetCell,
    Filter_1: CATIRespondentSheetCell,
    Filter_2: CATIRespondentSheetCell,
    Filter_3: CATIRespondentSheetCell,
    Filter_4: CATIRespondentSheetCell,
    __rowNum__?: number
};

export interface CATIRespondentImportRow {
    row: number,
    respondent_id: string,
    phone: string,
    name: string,
    link: string,
    filter_1: string,
    filter_2: string,
    filter_3: string,
    filter_4: string
};

export interface CATIImportSkippedRow {
    row: number,
    respondent_id: string | null,
    reason: string
};

export interface CATIImportResult {
    total: number,
    imported: number,
    skipped: CATIImportSkippedRow[],
    error: string | null
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

// A function, so the headers are read in the current language.
export const catiBatchColumns = (): ColumnFormat[] => [
    {
        label: i18n.t("cati.columns.name"),
        name: "name",
        type: "string",
        flex: 1
    },
    {
        label: i18n.t("cati.columns.total"),
        name: "total_records",
        type: "number",
        flex: 1
    },
    {
        label: i18n.t("cati.columns.status"),
        name: "status",
        type: "string",
        flex: 1
    },
    {
        label: i18n.t("cati.columns.createdBy"),
        name: "created_user_name",
        type: "string",
        flex: 1
    }
]