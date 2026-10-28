import { ColumnFormat } from "./ColumnConfig";

export interface OfflineProjectRespondentImportData {
    InstanceID: string,
    Shell_ChainID: string, 
    SamplePoint: string,
    Province: string,
    InterviewerID: string, 
    RespondentPhoneNumber: string, 
    PhoneNumber: string,
    Email: string,
    PriceLevel: string,
    Channel: string
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
