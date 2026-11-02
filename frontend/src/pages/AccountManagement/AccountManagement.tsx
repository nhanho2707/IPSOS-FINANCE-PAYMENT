import { Box, Button, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { ColumnFormat } from "../../config/ColumnConfig";
import { AccountAuditActionLabels, AccountAuditLog, AccountData, AccountStatusFilter, ResetPasswordPayload } from "../../config/AccountFieldsConfig";
import { getAccountErrorMessage, useAccounts } from "../../hook/useAccounts";
import { useAccountAuditLogs } from "../../hook/useAccountAuditLogs";
import ReusableTable from "../../components/Table/ReusableTable";
import ResourceTable from "../../components/Table/ResourceTable";
import RowActions from "../../components/Table/RowActions";
import CellStack from "../../components/Table/CellStack";
import UserAvatar from "../../components/UserAvatar";
import { SelectFilter } from "../../components/Table/FilterChip";
import StatusChip from "../../components/StatusChip";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import DetailDrawer from "../../components/DetailDrawer";
import ConfirmDialog from "../../components/Dialogs/ConfirmDialog";
import FormDialog from "../../components/Dialogs/FormDialog";
import { useMetadata } from "../../hook/useMetadata";
import { useMemo, useState } from "react";
import { BlockOutlined, CheckCircleOutline, EditOutlined, HistoryOutlined, LockResetOutlined, PersonAddAltOutlined } from "@mui/icons-material";
import { formatDateTime } from "../../utils/format";

type RoleOption = { id: number; name: string; department_id: number };
type DepartmentOption = { id: number; name: string };

const STATUS_FILTER_OPTIONS: { value: Exclude<AccountStatusFilter, "">; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

const formatAuditChanges = (log: AccountAuditLog) => {
    if (!log.changes) return "—";

    return Object.entries(log.changes)
        .map(([field, value]) => {
            if (value && typeof value === "object") {
                return `${field}: ${value.from ?? "—"} → ${value.to ?? "—"}`;
            }
            return `${field}: ${value ?? "—"}`;
        })
        .join(", ");
};

const AccountManagement = () => {
    const { data, invalidate: invalidateMetadata } = useMetadata();
    const { accounts, total, page, setPage, rowsPerPage, setRowsPerPage, searchTerm, setSearchTerm, filters, setFilters, actionState, storeAccount, updateAccount, updateAccountStatus, resetAccountPassword } = useAccounts();

    const [ dialogError, setDialogError ] = useState<string>("");

    const [ openCreateDialog, setOpenCreateDialog ] = useState<boolean>(false);
    const [ openEditDialog, setOpenEditDialog ] = useState<boolean>(false);
    const [ editTarget, setEditTarget ] = useState<AccountData | null>(null);
    const [ formEditData, setFormEditData ] = useState<{ role: number; department: number }>({ role: 0, department: 0 });

    const initialResetPasswordData: ResetPasswordPayload = { password: "", password_confirmation: "" };
    const [ openResetPasswordDialog, setOpenResetPasswordDialog ] = useState<boolean>(false);
    const [ resetPasswordTarget, setResetPasswordTarget ] = useState<AccountData | null>(null);
    const [ formResetPasswordData, setFormResetPasswordData ] = useState<ResetPasswordPayload>(initialResetPasswordData);

    const [ statusTarget, setStatusTarget ] = useState<AccountData | null>(null);
    const [ historyTarget, setHistoryTarget ] = useState<AccountData | null>(null);

    const {
        logs: auditLogs,
        actionState: auditActionState,
        total: auditTotal,
        page: auditPage,
        setPage: setAuditPage,
        rowsPerPage: auditRowsPerPage,
        setRowsPerPage: setAuditRowsPerPage
    } = useAccountAuditLogs(historyTarget?.id ?? null);

    const initialAccountData: AccountData = {
        name: "",
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        password_confirmation: "",
        department: "",
        role: ""
    }

    const [ formCreateData, setFormCreateData ] = useState<AccountData>(initialAccountData);

    const columns: ColumnFormat[] = [
        {
            label: "User",
            name: "name",
            type: "string",
            flex: 2.2,
            renderCell: (row: AccountData) => {
                const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.name;
                return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                        <UserAvatar name={fullName} size={28} showTooltip={false} />
                        <CellStack primary={fullName} secondary={row.email} title={`${fullName} · ${row.email} · username ${row.name}`} />
                    </Box>
                );
            }
        },
        {
            label: "Role",
            name: "role",
            type: "string",
            flex: 1.4,
            renderCell: (row: AccountData) => <CellStack primary={row.role} secondary={row.department} />
        },
        {
            label: "Status",
            name: "is_active",
            type: "string",
            width: 184,
            renderCell: (row: AccountData) => (
                <Stack direction="row" spacing={0.5}>
                    <StatusChip label={row.is_active ? "Active" : "Inactive"} tone={row.is_active ? "success" : "neutral"} />
                    {row.is_active && row.must_change_password && (
                        <StatusChip label="Temp password" tone="warning" tooltip="Must change password on next login" />
                    )}
                </Stack>
            )
        },
        {
            label: "Last Login",
            name: "last_login_at",
            type: "date",
            width: 148,
            renderCell: (row: AccountData) => formatDateTime(row.last_login_at)
        },
        {
            label: "Created",
            name: "created_at",
            type: "date",
            width: 148,
            renderCell: (row: AccountData) => formatDateTime(row.created_at)
        },
        {
            label: "",
            name: "action",
            type: "menu",
            align: "right",
            width: 56,
            renderCell: (row: AccountData) => (
                <RowActions
                    menuLabel={`Actions for ${row.email}`}
                    items={[
                        { label: "Edit role & department", icon: EditOutlined, onClick: () => handleOpenEditDialog(row) },
                        { label: "Reset password", icon: LockResetOutlined, onClick: () => handleOpenResetPasswordDialog(row) },
                        { label: "View history", icon: HistoryOutlined, onClick: () => setHistoryTarget(row) },
                        {
                            label: row.is_active ? "Deactivate account" : "Activate account",
                            icon: row.is_active ? BlockOutlined : CheckCircleOutline,
                            tone: row.is_active ? "danger" : "default",
                            onClick: () => setStatusTarget(row),
                        },
                    ]}
                />
            )
        }
    ];

    const auditColumns: ColumnFormat[] = [
        {
            label: "Time",
            name: "created_at",
            type: "date",
            width: 148,
            renderCell: (row: AccountAuditLog) => formatDateTime(row.created_at)
        },
        {
            label: "Action",
            name: "action",
            type: "string",
            width: 160,
            renderCell: (row: AccountAuditLog) => AccountAuditActionLabels[row.action] ?? row.action
        },
        {
            label: "By",
            name: "actor",
            type: "string",
            flex: 1,
            renderCell: (row: AccountAuditLog) => row.actor ?? "—"
        },
        {
            label: "Details",
            name: "changes",
            type: "string",
            flex: 1.5,
            renderCell: (row: AccountAuditLog) => (
                <Tooltip title={formatAuditChanges(row)}>
                    <span>{formatAuditChanges(row)}</span>
                </Tooltip>
            )
        }
    ];

    const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterChange = (patch: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...patch }));
        setPage(0);
    };

    const handleChange = (field: keyof AccountData, value: string | number) => {
        setFormCreateData((prev) => ({
            ...prev,
            [field]: value
        }));
    }

    const handleOpenCreateDialog = () => {
        setDialogError("");
        setFormCreateData(initialAccountData);
        setOpenCreateDialog(true);
    }

    const handleOpenEditDialog = (account: AccountData) => {
        setDialogError("");
        setEditTarget(account);
        setFormEditData({
            role: account.role_id ?? 0,
            department: account.department_id ?? 0,
        });
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
        setEditTarget(null);
    };

    const handleUpdateUser = async () => {
        if (!editTarget?.id) return;
        try {
            await updateAccount(editTarget.id, formEditData);
            setOpenEditDialog(false);
        } catch (error) {
            setDialogError(getAccountErrorMessage(error, "Failed to update Account."));
        }
    };

    const handleOpenResetPasswordDialog = (account: AccountData) => {
        setDialogError("");
        setResetPasswordTarget(account);
        setFormResetPasswordData(initialResetPasswordData);
        setOpenResetPasswordDialog(true);
    };

    const handleCloseResetPasswordDialog = () => {
        setOpenResetPasswordDialog(false);
        setResetPasswordTarget(null);
        setFormResetPasswordData(initialResetPasswordData);
    };

    const handleResetPassword = async () => {
        if (!resetPasswordTarget?.id) return;
        try {
            await resetAccountPassword(resetPasswordTarget.id, formResetPasswordData);
            handleCloseResetPasswordDialog();
        } catch (error) {
            setDialogError(getAccountErrorMessage(error, "Failed to reset password."));
        }
    };

    const handleConfirmStatusChange = async () => {
        if (!statusTarget?.id) return;
        const target = statusTarget;
        setStatusTarget(null);
        try {
            await updateAccountStatus(target.id!, !target.is_active);
        } catch {
            // error message is already surfaced through actionState
        }
    };

    const isResetPasswordTooShort = formResetPasswordData.password.length > 0 && formResetPasswordData.password.length < 6;
    const isResetPasswordMismatch = formResetPasswordData.password_confirmation.length > 0
        && formResetPasswordData.password !== formResetPasswordData.password_confirmation;
    const isResetPasswordInvalid = formResetPasswordData.password.length < 6
        || formResetPasswordData.password !== formResetPasswordData.password_confirmation;

    const filteredEditRoles = useMemo(() => {
        if (!formEditData.department) return [];
        return data.roles.filter((r: RoleOption) => r.department_id === formEditData.department);
    }, [data.roles, formEditData.department]);

    const isCreatePasswordTooShort = (formCreateData.password ?? "").length > 0 && (formCreateData.password ?? "").length < 6;
    const isCreatePasswordMismatch = (formCreateData.password_confirmation ?? "").length > 0
        && formCreateData.password !== formCreateData.password_confirmation;
    const isCreateInvalid = !formCreateData.first_name || !formCreateData.last_name || !formCreateData.name
        || !formCreateData.email || !formCreateData.department || !formCreateData.role
        || (formCreateData.password ?? "").length < 6 || formCreateData.password !== formCreateData.password_confirmation;

    const handleCreateUser = async () => {
        try {
            await storeAccount(formCreateData);
            invalidateMetadata();
            setFormCreateData(initialAccountData);
            setOpenCreateDialog(false);
        } catch (error) {
            setDialogError(getAccountErrorMessage(error, "Failed to store Account."));
        }
    }

    const filteredRoles = useMemo(() => {
        if(!formCreateData.department) return [];

        return data.roles.filter((r: RoleOption) => r.department_id === Number(formCreateData.department));
    }, [data.roles, formCreateData.department]);

    const filterRoles = useMemo(() => {
        if (!filters.department_id) return data.roles;
        return data.roles.filter((r: RoleOption) => r.department_id === filters.department_id);
    }, [data.roles, filters.department_id]);

    const isFiltered = Boolean(searchTerm || filters.department_id || filters.role_id || filters.status);

    const createButton = (
        <Button variant="contained" startIcon={<PersonAddAltOutlined />} onClick={handleOpenCreateDialog}>
            Create user
        </Button>
    );

    return (
        <Box>
            <PageHeader
                title="Accounts"
                description="Who can sign in, with which role and department."
                actions={createButton}
            />

            <ResourceTable
                columns={columns}
                data={accounts}
                actionStatus={actionState}
                page = {page}
                rowsPerPage = {rowsPerPage}
                total = {total}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                search={{
                    placeholder: "Search name or email",
                    defaultValue: searchTerm,
                    onChange: (value) => {
                        setSearchTerm(value);
                        setPage(0);
                    },
                }}
                filters={
                    <>
                        <SelectFilter
                            label="Department"
                            value={filters.department_id}
                            options={data.departments.map((d: DepartmentOption) => ({ value: d.id, label: d.name }))}
                            onChange={(value) => handleFilterChange({ department_id: value, role_id: "" })}
                        />
                        <SelectFilter
                            label="Role"
                            value={filters.role_id}
                            options={filterRoles.map((r: RoleOption) => ({ value: r.id, label: r.name }))}
                            onChange={(value) => handleFilterChange({ role_id: value })}
                        />
                        <SelectFilter
                            label="Status"
                            value={filters.status}
                            options={STATUS_FILTER_OPTIONS}
                            onChange={(value) => handleFilterChange({ status: value })}
                        />
                    </>
                }
                stickyColumns={{ last: true }}
                emptyState={isFiltered ? (
                    <EmptyState title="No accounts found" description="No account matches the search and filters." />
                ) : (
                    <EmptyState title="No accounts yet" action={createButton} />
                )}
            />

            <FormDialog
                open={openCreateDialog}
                title="Create user"
                error={dialogError}
                onClose={() => setOpenCreateDialog(false)}
                onSubmit={handleCreateUser}
                submitText="Create user"
                submitDisabled={isCreateInvalid}
                loading={actionState.loading}
            >
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <TextField
                        autoFocus
                        size="small"
                        label="First name"
                        value={formCreateData.first_name}
                        onChange={(event) => handleChange("first_name", event.target.value)}
                        required
                    />
                    <TextField
                        size="small"
                        label="Last name"
                        value={formCreateData.last_name}
                        onChange={(event) => handleChange("last_name", event.target.value)}
                        required
                    />
                    <TextField
                        size="small"
                        label="Username"
                        value={formCreateData.name}
                        onChange={(event) => handleChange("name", event.target.value)}
                        required
                    />
                    <TextField
                        size="small"
                        label="Email"
                        type="email"
                        value={formCreateData.email}
                        onChange={(event) => handleChange("email", event.target.value)}
                        required
                    />
                    <TextField
                        size="small"
                        label="Password"
                        type="password"
                        value={formCreateData.password}
                        onChange={(event) => handleChange("password", event.target.value)}
                        error={isCreatePasswordTooShort}
                        helperText={isCreatePasswordTooShort ? "At least 6 characters" : ""}
                        autoComplete="new-password"
                        required
                    />
                    <TextField
                        size="small"
                        label="Confirm password"
                        type="password"
                        value={formCreateData.password_confirmation}
                        onChange={(event) => handleChange("password_confirmation", event.target.value)}
                        error={isCreatePasswordMismatch}
                        helperText={isCreatePasswordMismatch ? "Passwords do not match" : ""}
                        autoComplete="new-password"
                        required
                    />
                    <TextField
                        select
                        size="small"
                        label="Department"
                        value={formCreateData.department ?? ""}
                        onChange={(event) => {
                            setFormCreateData((prev) => ({
                                ...prev,
                                department: String(event.target.value),
                                role: ""
                            }));
                        }}
                        required
                    >
                        {data.departments.map((department: DepartmentOption) => (
                            <MenuItem key={department.id} value={String(department.id)}>
                                {department.name}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        size="small"
                        label="Role"
                        value={formCreateData.role}
                        onChange={(event) => handleChange("role", String(event.target.value))}
                        disabled={!formCreateData.department}
                        helperText={!formCreateData.department ? "Choose a department first" : ""}
                        required
                    >
                        {filteredRoles.map((r: RoleOption) => (
                            <MenuItem key={r.id} value={String(r.id)}>
                                {r.name}
                            </MenuItem>
                        ))}
                    </TextField>
                </Box>
            </FormDialog>

            <FormDialog
                open={openEditDialog}
                title="Edit role & department"
                description={editTarget?.email}
                error={dialogError}
                onClose={handleCloseEditDialog}
                onSubmit={handleUpdateUser}
                submitDisabled={!formEditData.role || !formEditData.department}
                loading={actionState.loading}
                maxWidth="xs"
            >
                <Stack spacing={2}>
                    <TextField
                        select
                        size="small"
                        label="Department"
                        value={formEditData.department || ""}
                        onChange={(e) => setFormEditData({ role: 0, department: Number(e.target.value) })}
                        required
                    >
                        {data.departments.map((d: DepartmentOption) => (
                            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        size="small"
                        label="Role"
                        value={formEditData.role || ""}
                        onChange={(e) => setFormEditData(prev => ({ ...prev, role: Number(e.target.value) }))}
                        disabled={!formEditData.department}
                        required
                    >
                        {filteredEditRoles.map((r: RoleOption) => (
                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                    </TextField>
                </Stack>
            </FormDialog>

            <FormDialog
                open={openResetPasswordDialog}
                title="Reset password"
                description={
                    <>
                        Set a temporary password for <strong>{resetPasswordTarget?.email}</strong>.
                        The user is signed out and must choose a new password at the next login.
                    </>
                }
                error={dialogError}
                onClose={handleCloseResetPasswordDialog}
                onSubmit={handleResetPassword}
                submitText="Reset password"
                submitDisabled={isResetPasswordInvalid}
                loading={actionState.loading}
                maxWidth="xs"
            >
                <Stack spacing={2}>
                    <TextField
                        autoFocus
                        size="small"
                        label="New password"
                        type="password"
                        value={formResetPasswordData.password}
                        onChange={(e) => setFormResetPasswordData(prev => ({ ...prev, password: e.target.value }))}
                        error={isResetPasswordTooShort}
                        helperText={isResetPasswordTooShort ? "Password must be at least 6 characters" : ""}
                        autoComplete="new-password"
                        required
                    />
                    <TextField
                        size="small"
                        label="Confirm new password"
                        type="password"
                        value={formResetPasswordData.password_confirmation}
                        onChange={(e) => setFormResetPasswordData(prev => ({ ...prev, password_confirmation: e.target.value }))}
                        error={isResetPasswordMismatch}
                        helperText={isResetPasswordMismatch ? "Passwords do not match" : ""}
                        autoComplete="new-password"
                        required
                    />
                </Stack>
            </FormDialog>

            <ConfirmDialog
                open={Boolean(statusTarget)}
                onClose={() => setStatusTarget(null)}
                onConfirm={handleConfirmStatusChange}
                title={statusTarget?.is_active ? "Deactivate account" : "Activate account"}
                tone={statusTarget?.is_active ? "danger" : "default"}
                confirmText={statusTarget?.is_active ? "Deactivate" : "Activate"}
                message={statusTarget?.is_active
                    ? `${statusTarget?.email} will be signed out immediately and will no longer be able to log in.`
                    : `${statusTarget?.email} will be able to log in again.`}
            />

            <DetailDrawer
                open={Boolean(historyTarget)}
                onClose={() => setHistoryTarget(null)}
                title="Account history"
                subtitle={historyTarget?.email}
                width={760}
            >
                <ReusableTable
                    columns={auditColumns}
                    data={auditLogs}
                    actionStatus={auditActionState}
                    page={auditPage}
                    rowsPerPage={auditRowsPerPage}
                    total={auditTotal}
                    onPageChange={(_event, newPage) => setAuditPage(newPage)}
                    onRowsPerPageChange={(event) => {
                        setAuditRowsPerPage(parseInt(event.target.value, 10));
                        setAuditPage(0);
                    }}
                    emptyText="No changes recorded yet"
                    inset={false}
                    dense
                />
            </DetailDrawer>
        </Box>
    )
};

export default AccountManagement;
