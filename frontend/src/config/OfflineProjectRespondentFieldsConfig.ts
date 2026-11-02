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

// The four groups the API reports (stored survey and provider statuses collapse into these).
export type GiftStatus = "pending" | "success" | "refused" | "failed";

export type GiftStatusCounts = Record<GiftStatus, number>;

export interface OfflineProjectRespondentData {
    id: number,
    respondent_id: string,
    shell_chainid: string,
    province_name: string,
    employee_id: string,
    employee_name?: string | null,
    respondent_phone_number: string,
    phone_number: string,
    email: string,
    status_label: string,
    status: GiftStatus,
    environment: "live" | "test",
    token: string,
    // The gift amount in VND for the respondent's province and price level, despite the name.
    price_level: number | string
    channel: "vinnet" | "gotit" | "other"
};


export interface OfflineGiftSendResult {
    row: OfflineProjectRespondentData,
    success: boolean,
    message: string
};

export interface OfflineGiftBulkSendResult {
    results: OfflineGiftSendResult[],
    stoppedOnFailures: boolean
};
