import { ColumnFormat } from "./ColumnConfig";

export const OFFLINE_RESPONDENT_IMPORT_COLUMNS = [
    "InstanceID", "Shell_ChainID", "SamplePoint", "Province", "InterviewerID", "RespondentPhoneNumber", "PhoneNumber", "Email", "PriceLevel", "Channel"
] as const;

export type OfflineProjectRespondentImportData = Record<typeof OFFLINE_RESPONDENT_IMPORT_COLUMNS[number], string>;

export const toImportRow = (sheetRow: Record<string, unknown>): OfflineProjectRespondentImportData =>
    Object.fromEntries(
        OFFLINE_RESPONDENT_IMPORT_COLUMNS.map(col => [col, String(sheetRow[col] ?? "").trim()])
    ) as OfflineProjectRespondentImportData;

export interface OfflineProjectRespondentImportPayload {
    instance_id: string,
    shell_chainid: string,
    location_id: string,
    province_name: string,
    employee_id: string,
    respondent_phone_number: string,
    phone_number: string,
    email: string,
    price_level: string,
    channel: string
}

export interface OfflineProjectRespondentData {
    id: number,
    respondent_id: string,
    shell_chainid: string,
    province_name: string,
    employee_id: string,
    respondent_phone_number: string,
    phone_number: string,
    email: string,
    status_label: string,
    status: "pending" | "success" | "refused" | "failed",
    environment: "live" | "test",
    token: string,
    price_level: string
    channel: "vinnet" | "gotit" | "other"
};

export const OfflineProjectRespondentCellConfig: ColumnFormat[] = [
    {
        label: "InstanceID",
        name: "respondent_id",
        type: "string",
        flex: 1.5
    },
    {
        label: "ShellChainID",
        name: "shell_chainid",
        type: "string",
        flex: 1.5
    },
    {
        label: "Province",
        name: "province_name",
        type: "string",
        flex: 1.5
    },
    {
        label: "Interviewer ID",
        name: "employee_id",
        type: "string",
        flex: 1.5
    },
    {
        label: "Resp. Phone",
        name: "respondent_phone_number",
        type: "string",
        flex: 1.5
    },
    {
        label: "Phone",
        name: "phone_number",
        type: "string",
        flex: 1.5
    },
    {
        label: "Email",
        name: "email",
        type: "string",
        flex: 1.5
    },
    {
        label: "Price Level",
        name: "price_level",
        type: "string",
        flex: 1.5
    },
    {
        label: "Channel",
        name: "channel",
        type: "string",
        flex: 1.5
    }
];

export interface OfflineGiftSendResult {
    row: OfflineProjectRespondentData,
    success: boolean,
    message: string
};

export interface OfflineGiftBulkSendResult {
    results: OfflineGiftSendResult[],
    stoppedOnFailures: boolean
};
