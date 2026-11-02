import { ColumnFormat } from "../config/ColumnConfig";

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

export const EmployeeCellConfig: ColumnFormat[] = [
    {
        label: "ID",
        name: "employee_id",
        type: "string",
        flex: 1
    },
    {
        label: "Full Name",
        name: "full_name",
        type: "string",
        flex: 1.5
    }
];