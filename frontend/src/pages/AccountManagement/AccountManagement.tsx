import { Box, Button, MenuItem, Stack, TextField, Tooltip } from "@mui/material";
import { ColumnFormat } from "../../config/ColumnConfig";
import { AccountAuditLog, AccountData, AccountStatusFilter, ResetPasswordPayload } from "../../config/AccountFieldsConfig";
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
import { BlockOutlined, CheckCircleOutlineOutlined, EditOutlined, HistoryOutlined, LockResetOutlined, PersonAddAltOutlined } from "@mui/icons-material";
import { formatDateTime } from "../../utils/format";
import { Trans, useTranslation } from "react-i18next";
import { translateDataValue } from "../../i18n/i18n";

type RoleOption = { id: number; name: string; department_id: number };
type DepartmentOption = { id: number; name: string };

const STATUS_FILTER_VALUES: Exclude<AccountStatusFilter, "">[] = ["active", "inactive"];

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
    const { t } = useTranslation();
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
            label: t("accounts.columns.user"),
            name: "name",
            type: "string",
            flex: 2.2,
            renderCell: (row: AccountData) => {
                const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.name;
                return (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                        <UserAvatar name={fullName} size={28} showTooltip={false} />
                        <CellStack primary={fullName} secondary={row.email} title={t("accounts.username", { name: fullName, email: row.email, username: row.name })} />
                    </Box>
                );
            }
        },
        {
            label: t("accounts.columns.role"),
            name: "role",
            type: "string",
            flex: 1.4,
            renderCell: (row: AccountData) => <CellStack primary={row.role} secondary={row.department} />
        },
        {
            label: t("accounts.columns.status"),
            name: "is_active",
            type: "string",
            width: 184,
            renderCell: (row: AccountData) => (
                <Stack direction="row" spacing={0.5}>
                    <StatusChip label={row.is_active ? t("accounts.status.active") : t("accounts.status.inactive")} tone={row.is_active ? "success" : "neutral"} />
                    {row.is_active && row.must_change_password && (
                        <StatusChip label={t("accounts.tempPassword")} tone="warning" tooltip={t("accounts.tempPasswordTooltip")} />
                    )}
                </Stack>
            )
        },
        {
            label: t("accounts.columns.lastLogin"),
            name: "last_login_at",
            type: "date",
            width: 148,
            renderCell: (row: AccountData) => formatDateTime(row.last_login_at)
        },
        {
            label: t("accounts.columns.created"),
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
                    menuLabel={t("accounts.actionsFor", { email: row.email })}
                    items={[
                        { label: t("accounts.actions.edit"), icon: EditOutlined, onClick: () => handleOpenEditDialog(row) },
                        { label: t("accounts.actions.reset"), icon: LockResetOutlined, onClick: () => handleOpenResetPasswordDialog(row) },
                        { label: t("accounts.actions.history"), icon: HistoryOutlined, onClick: () => setHistoryTarget(row) },
                        {
                            label: row.is_active ? t("accounts.actions.deactivate") : t("accounts.actions.activate"),
                            icon: row.is_active ? BlockOutlined : CheckCircleOutlineOutlined,
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
            label: t("accounts.audit.time"),
            name: "created_at",
            type: "date",
            width: 148,
            renderCell: (row: AccountAuditLog) => formatDateTime(row.created_at)
        },
        {
            label: t("accounts.audit.action"),
            name: "action",
            type: "string",
            width: 160,
            renderCell: (row: AccountAuditLog) => translateDataValue("accounts.audit.actions", row.action)
        },
        {
            label: t("accounts.audit.by"),
            name: "actor",
            type: "string",
            flex: 1,
            renderCell: (row: AccountAuditLog) => row.actor ?? "—"
        },
        {
            label: t("accounts.audit.details"),
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
            setDialogError(getAccountErrorMessage(error, t("accounts.errors.update")));
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
            setDialogError(getAccountErrorMessage(error, t("accounts.errors.reset")));
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
            setDialogError(getAccountErrorMessage(error, t("accounts.errors.store")));
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
            {t("accounts.create.button")}
        </Button>
    );

    return (
        <Box>
            <PageHeader
                title={t("accounts.title")}
                description={t("accounts.description")}
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
                    placeholder: t("accounts.search"),
                    defaultValue: searchTerm,
                    onChange: (value) => {
                        setSearchTerm(value);
                        setPage(0);
                    },
                }}
                filters={
                    <>
                        <SelectFilter
                            label={t("accounts.form.department")}
                            value={filters.department_id}
                            options={data.departments.map((d: DepartmentOption) => ({ value: d.id, label: d.name }))}
                            onChange={(value) => handleFilterChange({ department_id: value, role_id: "" })}
                        />
                        <SelectFilter
                            label={t("accounts.form.role")}
                            value={filters.role_id}
                            options={filterRoles.map((r: RoleOption) => ({ value: r.id, label: r.name }))}
                            onChange={(value) => handleFilterChange({ role_id: value })}
                        />
                        <SelectFilter
                            label={t("accounts.filters.status")}
                            value={filters.status}
                            options={STATUS_FILTER_VALUES.map((value) => ({ value, label: t(`accounts.status.${value}`) }))}
                            onChange={(value) => handleFilterChange({ status: value })}
                        />
                    </>
                }
                stickyColumns={{ last: true }}
                emptyState={isFiltered ? (
                    <EmptyState title={t("accounts.empty.notFound")} description={t("accounts.empty.notFoundDescription")} />
                ) : (
                    <EmptyState title={t("accounts.empty.none")} action={createButton} />
                )}
            />

            <FormDialog
                open={openCreateDialog}
                title={t("accounts.create.title")}
                error={dialogError}
                onClose={() => setOpenCreateDialog(false)}
                onSubmit={handleCreateUser}
                submitText={t("accounts.create.button")}
                submitDisabled={isCreateInvalid}
                loading={actionState.loading}
            >
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    <TextField
                        autoFocus
                        size="small"
                        label={t("accounts.form.firstName")}
                        value={formCreateData.first_name}
                        onChange={(event) => handleChange("first_name", event.target.value)}
                        required
                    />
                    <TextField
                        size="small"
                        label={t("accounts.form.lastName")}
                        value={formCreateData.last_name}
                        onChange={(event) => handleChange("last_name", event.target.value)}
                        required
                    />
                    <TextField
                        size="small"
                        label={t("accounts.form.username")}
                        value={formCreateData.name}
                        onChange={(event) => handleChange("name", event.target.value)}
                        required
                    />
                    <TextField
                        size="small"
                        label={t("accounts.form.email")}
                        type="email"
                        value={formCreateData.email}
                        onChange={(event) => handleChange("email", event.target.value)}
                        required
                    />
                    <TextField
                        size="small"
                        label={t("accounts.form.password")}
                        type="password"
                        value={formCreateData.password}
                        onChange={(event) => handleChange("password", event.target.value)}
                        error={isCreatePasswordTooShort}
                        helperText={isCreatePasswordTooShort ? t("accounts.form.atLeast6") : ""}
                        autoComplete="new-password"
                        required
                    />
                    <TextField
                        size="small"
                        label={t("accounts.form.confirmPassword")}
                        type="password"
                        value={formCreateData.password_confirmation}
                        onChange={(event) => handleChange("password_confirmation", event.target.value)}
                        error={isCreatePasswordMismatch}
                        helperText={isCreatePasswordMismatch ? t("accounts.form.mismatch") : ""}
                        autoComplete="new-password"
                        required
                    />
                    <TextField
                        select
                        size="small"
                        label={t("accounts.form.department")}
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
                        label={t("accounts.form.role")}
                        value={formCreateData.role}
                        onChange={(event) => handleChange("role", String(event.target.value))}
                        disabled={!formCreateData.department}
                        helperText={!formCreateData.department ? t("accounts.form.departmentFirst") : ""}
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
                title={t("accounts.editTitle")}
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
                        label={t("accounts.form.department")}
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
                        label={t("accounts.form.role")}
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
                title={t("accounts.reset.title")}
                description={<Trans i18nKey="accounts.reset.description" values={{ email: resetPasswordTarget?.email ?? "" }} components={{ strong: <strong /> }} />}
                error={dialogError}
                onClose={handleCloseResetPasswordDialog}
                onSubmit={handleResetPassword}
                submitText={t("accounts.reset.submit")}
                submitDisabled={isResetPasswordInvalid}
                loading={actionState.loading}
                maxWidth="xs"
            >
                <Stack spacing={2}>
                    <TextField
                        autoFocus
                        size="small"
                        label={t("accounts.form.newPassword")}
                        type="password"
                        value={formResetPasswordData.password}
                        onChange={(e) => setFormResetPasswordData(prev => ({ ...prev, password: e.target.value }))}
                        error={isResetPasswordTooShort}
                        helperText={isResetPasswordTooShort ? t("accounts.form.passwordTooShort") : ""}
                        autoComplete="new-password"
                        required
                    />
                    <TextField
                        size="small"
                        label={t("accounts.form.confirmNewPassword")}
                        type="password"
                        value={formResetPasswordData.password_confirmation}
                        onChange={(e) => setFormResetPasswordData(prev => ({ ...prev, password_confirmation: e.target.value }))}
                        error={isResetPasswordMismatch}
                        helperText={isResetPasswordMismatch ? t("accounts.form.mismatch") : ""}
                        autoComplete="new-password"
                        required
                    />
                </Stack>
            </FormDialog>

            <ConfirmDialog
                open={Boolean(statusTarget)}
                onClose={() => setStatusTarget(null)}
                onConfirm={handleConfirmStatusChange}
                title={statusTarget?.is_active ? t("accounts.statusDialog.deactivateTitle") : t("accounts.statusDialog.activateTitle")}
                tone={statusTarget?.is_active ? "danger" : "default"}
                confirmText={statusTarget?.is_active ? t("accounts.statusDialog.deactivate") : t("accounts.statusDialog.activate")}
                message={statusTarget?.is_active
                    ? t("accounts.statusDialog.deactivateMessage", { email: statusTarget?.email ?? "" })
                    : t("accounts.statusDialog.activateMessage", { email: statusTarget?.email ?? "" })}
            />

            <DetailDrawer
                open={Boolean(historyTarget)}
                onClose={() => setHistoryTarget(null)}
                title={t("accounts.audit.title")}
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
                    emptyText={t("accounts.audit.empty")}
                    inset={false}
                    dense
                />
            </DetailDrawer>
        </Box>
    )
};

export default AccountManagement;
