import { ColumnFormat } from "./ColumnConfig"

export interface UserData {
    id: number,
    name: string,
    email: string
}

export interface AccountData {
    id?: number,
    name: string,
    email: string,
    first_name: string,
    last_name: string,
    date_of_birth?: Date | null,
    address?: string,
    role: string,
    role_id?: number,
    department: string,
    department_id?: number,
    password?: string,
    password_confirmation?: string,
    must_change_password?: boolean,
    is_active?: boolean,
    last_login_at?: string | null,
    created_at?: string | null,
}

export type AccountStatusFilter = "" | "active" | "inactive";

export interface AccountFilters {
    role_id: number | "",
    department_id: number | "",
    status: AccountStatusFilter,
}

export type AccountAuditAction = "created" | "updated" | "password_reset" | "activated" | "deactivated";

export interface AccountAuditChange {
    from: string | null,
    to: string | null,
}

export interface AccountAuditLog {
    id: number,
    action: AccountAuditAction,
    actor: string | null,
    changes: Record<string, AccountAuditChange | string | null> | null,
    created_at: string | null,
}

export const AccountAuditActionLabels: Record<AccountAuditAction, string> = {
    created: "Account created",
    updated: "Role / department changed",
    password_reset: "Password reset by admin",
    activated: "Account activated",
    deactivated: "Account deactivated",
};

export interface ResetPasswordPayload {
    password: string,
    password_confirmation: string,
}

export const AccountCellConfig: ColumnFormat[] = [
    {
        label: "Name",
        name: "name",
        type: "string",
        flex: 1
    },
    {
        label: "Email",
        name: "email",
        type: "string",
        flex: 1.5
    },
    {
        label: "Role",
        name: "role",
        type: "string",
        flex: 1,
    },
    {
        label: "Department",
        name: "department",
        type: "string",
        flex: 1,
    }
];