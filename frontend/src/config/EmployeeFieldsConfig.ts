import { ColumnFormat } from "../config/ColumnConfig";
import i18n from "../i18n/i18n";

export interface EmployeeData {
    id: number,
    employee_id: string,
    first_name: string,
    last_name: string,
    full_name: string,
    vinnet_total: number,
    gotit_total: number,
    other_total: number,
    transaction_total: number
};

// A function, so the headers are read in the current language.
export const employeeColumns = (): ColumnFormat[] => [
    {
        label: i18n.t("interviewers.columns.id"),
        name: "employee_id",
        type: "string",
        flex: 1
    },
    {
        label: i18n.t("interviewers.columns.fullName"),
        name: "full_name",
        type: "string",
        flex: 1.5
    }
];