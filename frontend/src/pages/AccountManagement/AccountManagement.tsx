import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Tooltip } from "@mui/material";
import { ColumnFormat } from "../../config/ColumnConfig";
import { AccountAuditActionLabels, AccountAuditLog, AccountCellConfig, AccountData, AccountStatusFilter, ResetPasswordPayload } from "../../config/AccountFieldsConfig";
import { getAccountErrorMessage, useAccounts } from "../../hook/useAccounts";
import { useAccountAuditLogs } from "../../hook/useAccountAuditLogs";
import ReusableTable from "../../components/Table/ReusableTable";
import ConfirmDialog from "../../components/Dialogs/ConfirmDialog";
import { useMetadata } from "../../hook/useMetadata";
import { useMemo, useState } from "react";
import LoadingButton from "@mui/lab/LoadingButton";
import { BlockOutlined, CheckCircleOutline, EditOutlined, HistoryOutlined, LockResetOutlined } from "@mui/icons-material";
import dayjs from "dayjs";

type RoleOption = { id: number; name: string; department_id: number };
type DepartmentOption = { id: number; name: string };

const formatDateTime = (value?: string | null) => value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—";

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

    const actionButtonSx = {
        backgroundColor: '#f6f6f6',
        borderRadius: '8px',
        border: '1px solid #e8e8e8',
        '&:hover': { backgroundColor: '#e0e0e0' },
        padding: '5px',
    };

    const columns: ColumnFormat[] = [
        ...AccountCellConfig,
        {
            label: "Status",
            name: "is_active",
            type: "string",
            width: 170,
            renderCell: (row: AccountData) => (
                <Stack direction="row" spacing={0.5}>
                    <Chip
                        size="small"
                        label={row.is_active ? "Active" : "Inactive"}
                        color={row.is_active ? "success" : "default"}
                        variant={row.is_active ? "outlined" : "filled"}
                    />
                    {row.is_active && row.must_change_password && (
                        <Tooltip title="Must change password on next login">
                            <Chip size="small" label="Temp password" color="warning" variant="outlined" />
                        </Tooltip>
                    )}
                </Stack>
            )
        },
        {
            label: "Last Login",
            name: "last_login_at",
            type: "date",
            width: 140,
            renderCell: (row: AccountData) => formatDateTime(row.last_login_at)
        },
        {
            label: "Created",
            name: "created_at",
            type: "date",
            width: 140,
            renderCell: (row: AccountData) => formatDateTime(row.created_at)
        },
        {
            label: "",
            name: "action",
            type: "menu",
            align: "center",
            width: 180,
            renderCell: (row: AccountData) => (
                <Stack direction="row" spacing={1} justifyContent="center">
                    <Tooltip title="Edit Role & Department">
                        <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(row)}
                            sx={actionButtonSx}
                        >
                            <EditOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Reset Password">
                        <IconButton
                            size="small"
                            onClick={() => handleOpenResetPasswordDialog(row)}
                            sx={actionButtonSx}
                        >
                            <LockResetOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={row.is_active ? "Deactivate" : "Activate"}>
                        <IconButton
                            size="small"
                            onClick={() => setStatusTarget(row)}
                            sx={actionButtonSx}
                        >
                            {row.is_active
                                ? <BlockOutlined fontSize="small" color="error" />
                                : <CheckCircleOutline fontSize="small" color="success" />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="History">
                        <IconButton
                            size="small"
                            onClick={() => setHistoryTarget(row)}
                            sx={actionButtonSx}
                        >
                            <HistoryOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            )
        }
    ];

    const auditColumns: ColumnFormat[] = [
        {
            label: "Time",
            name: "created_at",
            type: "date",
            width: 140,
            renderCell: (row: AccountAuditLog) => formatDateTime(row.created_at)
        },
        {
            label: "Action",
            name: "action",
            type: "string",
            width: 200,
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

    const handleChangePage = (event: unknown, newPage: number) => {
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

    const handleCloseCreateDialog = () => {
        setOpenCreateDialog(false);
    }

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

    return (
        <Box>
            <ReusableTable
                title="Employees"
                columns={columns}
                data={accounts}
                actionStatus={actionState}
                page = {page}
                rowsPerPage = {rowsPerPage}
                total = {total}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                topToolbar={
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ xs: "stretch", md: "center" }}
                        sx={{ pt: 2, pb: 2 }}
                    >
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ flex: 1 }}>
                            <TextField
                                label="Search name or email"
                                variant="outlined"
                                size="small"
                                value={searchTerm}
                                onChange={(event) => {
                                    setSearchTerm(event.target.value);
                                    setPage(0);
                                }}
                                sx={{ width: "100%", maxWidth: 280 }}
                            />

                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel id="filter-department-label">Department</InputLabel>
                                <Select
                                    labelId="filter-department-label"
                                    label="Department"
                                    value={filters.department_id}
                                    onChange={(event) => handleFilterChange({
                                        department_id: event.target.value === "" ? "" : Number(event.target.value),
                                        role_id: ""
                                    })}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    {data.departments.map((d: DepartmentOption) => (
                                        <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel id="filter-role-label">Role</InputLabel>
                                <Select
                                    labelId="filter-role-label"
                                    label="Role"
                                    value={filters.role_id}
                                    onChange={(event) => handleFilterChange({
                                        role_id: event.target.value === "" ? "" : Number(event.target.value)
                                    })}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    {filterRoles.map((r: RoleOption) => (
                                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 130 }}>
                                <InputLabel id="filter-status-label">Status</InputLabel>
                                <Select
                                    labelId="filter-status-label"
                                    label="Status"
                                    value={filters.status}
                                    onChange={(event) => handleFilterChange({ status: event.target.value as AccountStatusFilter })}
                                >
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Button variant="contained" onClick={handleOpenCreateDialog}>
                            Create User
                        </Button>
                    </Stack>
                }
            />

            <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog} fullWidth maxWidth="sm">
                <DialogTitle>Create New User</DialogTitle>
                <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {dialogError && <Alert severity="error">{dialogError}</Alert>}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="First Name"
                            value={formCreateData.first_name}
                            onChange={(event) => handleChange("first_name", event.target.value)}
                            fullWidth
                            required
                        />

                        <TextField
                            label="Last Name"
                            value={formCreateData.last_name}
                            onChange={(event) => handleChange("last_name", event.target.value)}
                            fullWidth
                            required
                        />
                    </Stack>

                    <TextField
                        label="Username"
                        value={formCreateData.name}
                        onChange={(event) => handleChange("name", event.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label="Email"
                        type="email"
                        value={formCreateData.email}
                        onChange={(event) => handleChange("email", event.target.value)}
                        fullWidth
                        required
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Password"
                            type="password"
                            value={formCreateData.password}
                            onChange={(event) => handleChange("password", event.target.value)}
                            error={isCreatePasswordTooShort}
                            helperText={isCreatePasswordTooShort ? "At least 6 characters" : ""}
                            autoComplete="new-password"
                            fullWidth
                            required
                        />
                        <TextField
                            label="Confirm Password"
                            type="password"
                            value={formCreateData.password_confirmation}
                            onChange={(event) => handleChange("password_confirmation", event.target.value)}
                            error={isCreatePasswordMismatch}
                            helperText={isCreatePasswordMismatch ? "Passwords do not match" : ""}
                            autoComplete="new-password"
                            fullWidth
                            required
                        />
                    </Stack>

                    <FormControl fullWidth required>
                        <InputLabel id="department-label">Department</InputLabel>
                        <Select
                            labelId="department-label"
                            label="Department"
                            value={formCreateData.department ?? ""}
                            onChange={(event) => {
                                setFormCreateData((prev) => ({
                                    ...prev,
                                    department: String(event.target.value),
                                    role: ""
                                }));
                            }}
                        >
                            {data.departments.map((department: DepartmentOption) => (
                                <MenuItem key={department.id} value={String(department.id)}>
                                    {department.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth required disabled={!formCreateData.department}>
                        <InputLabel id="role-label">Role</InputLabel>
                        <Select
                            labelId="role-label"
                            label="Role"
                            value={formCreateData.role}
                            onChange={(event) => handleChange("role", String(event.target.value))}
                        >
                            {filteredRoles.map((r: RoleOption) => (
                                <MenuItem key={r.id} value={String(r.id)}>
                                    {r.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateDialog}>Cancel</Button>
                    <LoadingButton
                        onClick={handleCreateUser}
                        size="small"
                        loading={actionState.loading}
                        loadingPosition="end"
                        variant="contained"
                        className='btn bg-vinnet-primary'
                        disabled={isCreateInvalid}
                        >
                            <span>CREATE</span>
                    </LoadingButton>
                </DialogActions>
            </Dialog>
            <Dialog open={openEditDialog} onClose={handleCloseEditDialog} fullWidth maxWidth="xs">
                <DialogTitle>Edit Role & Department</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {dialogError && <Alert severity="error">{dialogError}</Alert>}

                        <FormControl fullWidth required>
                            <InputLabel id="edit-department-label">Department</InputLabel>
                            <Select
                                labelId="edit-department-label"
                                label="Department"
                                value={formEditData.department || ""}
                                onChange={(e) =>
                                    setFormEditData({ role: 0, department: Number(e.target.value) })
                                }
                            >
                                {data.departments.map((d: DepartmentOption) => (
                                    <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth required disabled={!formEditData.department}>
                            <InputLabel id="edit-role-label">Role</InputLabel>
                            <Select
                                labelId="edit-role-label"
                                label="Role"
                                value={formEditData.role || ""}
                                onChange={(e) =>
                                    setFormEditData(prev => ({ ...prev, role: Number(e.target.value) }))
                                }
                            >
                                {filteredEditRoles.map((r: RoleOption) => (
                                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog}>Cancel</Button>
                    <LoadingButton
                        onClick={handleUpdateUser}
                        loading={actionState.loading}
                        variant="contained"
                        disabled={!formEditData.role || !formEditData.department}
                    >
                        Save
                    </LoadingButton>
                </DialogActions>
            </Dialog>
            <Dialog open={openResetPasswordDialog} onClose={handleCloseResetPasswordDialog} fullWidth maxWidth="xs">
                <DialogTitle>Reset Password</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Set a temporary password for <strong>{resetPasswordTarget?.email}</strong>.
                        The user will be signed out and must choose a new password on next login.
                    </DialogContentText>
                    <Stack spacing={2}>
                        {dialogError && <Alert severity="error">{dialogError}</Alert>}

                        <TextField
                            label="New Password"
                            type="password"
                            value={formResetPasswordData.password}
                            onChange={(e) => setFormResetPasswordData(prev => ({ ...prev, password: e.target.value }))}
                            error={isResetPasswordTooShort}
                            helperText={isResetPasswordTooShort ? "Password must be at least 6 characters" : ""}
                            autoComplete="new-password"
                            fullWidth
                            required
                        />
                        <TextField
                            label="Confirm New Password"
                            type="password"
                            value={formResetPasswordData.password_confirmation}
                            onChange={(e) => setFormResetPasswordData(prev => ({ ...prev, password_confirmation: e.target.value }))}
                            error={isResetPasswordMismatch}
                            helperText={isResetPasswordMismatch ? "Passwords do not match" : ""}
                            autoComplete="new-password"
                            fullWidth
                            required
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseResetPasswordDialog}>Cancel</Button>
                    <LoadingButton
                        onClick={handleResetPassword}
                        loading={actionState.loading}
                        variant="contained"
                        disabled={isResetPasswordInvalid}
                    >
                        Reset
                    </LoadingButton>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(statusTarget)}
                onClose={() => setStatusTarget(null)}
                onConfirm={handleConfirmStatusChange}
                title={statusTarget?.is_active ? "Deactivate account" : "Activate account"}
                message={statusTarget?.is_active
                    ? `${statusTarget?.email} will be signed out immediately and will no longer be able to log in.`
                    : `${statusTarget?.email} will be able to log in again.`}
            />

            <Dialog open={Boolean(historyTarget)} onClose={() => setHistoryTarget(null)} fullWidth maxWidth="md">
                <DialogTitle>Account history — {historyTarget?.email}</DialogTitle>
                <DialogContent sx={{ px: 0 }}>
                    <ReusableTable
                        columns={auditColumns}
                        data={auditLogs}
                        actionStatus={auditActionState}
                        page={auditPage}
                        rowsPerPage={auditRowsPerPage}
                        total={auditTotal}
                        onPageChange={(event, newPage) => setAuditPage(newPage)}
                        onRowsPerPageChange={(event) => {
                            setAuditRowsPerPage(parseInt(event.target.value, 10));
                            setAuditPage(0);
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryTarget(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
};

export default AccountManagement;
