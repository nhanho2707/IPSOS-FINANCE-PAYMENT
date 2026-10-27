import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Tooltip } from "@mui/material";
import { ColumnFormat } from "../../config/ColumnConfig";
import { AccountCellConfig, AccountData, ResetPasswordPayload } from "../../config/AccountFieldsConfig";
import { useAccounts } from "../../hook/useAccounts";
import ReusableTable from "../../components/Table/ReusableTable";
import { useMetadata } from "../../hook/useMetadata";
import { useMemo, useState } from "react";
import LoadingButton from "@mui/lab/LoadingButton";
import { EditOutlined, LockResetOutlined } from "@mui/icons-material";

const AccountManagement = () => {
    const { data, invalidate: invalidateMetadata } = useMetadata();
    const { accounts, total, page, setPage, rowsPerPage, setRowsPerPage, searchTerm, setSearchTerm, actionState, storeAccount, updateAccount, resetAccountPassword } = useAccounts();
    
    const [ openCreateDialog, setOpenCreateDialog ] = useState<boolean>(false);
    const [ openEditDialog, setOpenEditDialog ] = useState<boolean>(false);
    const [ editTarget, setEditTarget ] = useState<AccountData | null>(null);
    const [ formEditData, setFormEditData ] = useState<{ role: number; department: number }>({ role: 0, department: 0 });

    const initialResetPasswordData: ResetPasswordPayload = { password: "", password_confirmation: "" };
    const [ openResetPasswordDialog, setOpenResetPasswordDialog ] = useState<boolean>(false);
    const [ resetPasswordTarget, setResetPasswordTarget ] = useState<AccountData | null>(null);
    const [ formResetPasswordData, setFormResetPasswordData ] = useState<ResetPasswordPayload>(initialResetPasswordData);

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
    const [ isCreateDisabled, setIsCreateDisabled ] = useState<boolean>(false);

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
            label: "",
            name: "action",
            type: "menu",
            align: "center",
            width: 100,
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
                </Stack>
            )
        }
    ];

    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleCloseCreateDialog = () => {
        setOpenCreateDialog(false);
    }

    const handleChange = (field: keyof AccountData, value: any) => {
        setFormCreateData((prev) => ({
            ...prev,
            [field]: value
        }));
    }

    const handleOpenCreateDialog = () => {
        setOpenCreateDialog(true);
    }

    const handleOpenEditDialog = (account: AccountData) => {
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
        await updateAccount(editTarget.id, formEditData);
        setOpenEditDialog(false);
    };

    const handleOpenResetPasswordDialog = (account: AccountData) => {
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
        return data.roles.filter((r: { id: number; department_id: number }) => r.department_id === formEditData.department);
    }, [data.roles, formEditData.department]);

    const handleCreateUser = async () => {
        const response = await storeAccount(formCreateData);

        if (response?.status_code === 200) {
            invalidateMetadata();
        }

        setOpenCreateDialog(false);
    }

    const filteredRoles = useMemo(() => {
        if(!formCreateData.department) return [];

        return data.roles.filter((r: { id: number, name: string, department_id: number }) => r.department_id === Number(formCreateData.department)); 
    }, [data.roles, formCreateData.department]); 

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
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ xs: "stretch", sm: "center" }}
                        sx={{ pt: 2, pb: 2 }}
                    >
                        <TextField
                        label="Search users"
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setPage(0);
                        }}
                        sx={{ width: "100%", maxWidth: 320 }}
                        />

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
                            fullWidth
                            required
                        />
                        <TextField
                            label="Confirm Password"
                            type="password"
                            value={formCreateData.password_confirmation}
                            onChange={(event) => handleChange("password_confirmation", event.target.value)}
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
                                const selected = data.departments.find((d: {id: number, name: string}) => d.id === Number(event.target.value));

                                handleChange("department", selected.id);
                            }}
                        >
                            {data.departments.map((department: {id: number, name: string}) => (
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
                            onChange={(event) => {
                                const selected = data.roles.find((d: {id: number, name: string}) => d.id === Number(event.target.value));

                                handleChange("role", selected.id);
                            }}
                        >
                            {filteredRoles.map((r: {id: string, name: string}) => (
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
                        >
                            <span>CREATE</span>
                    </LoadingButton>
                </DialogActions>
            </Dialog>
            <Dialog open={openEditDialog} onClose={handleCloseEditDialog} fullWidth maxWidth="xs">
                <DialogTitle>Edit Role & Department</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
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
                                {data.departments.map((d: { id: number; name: string }) => (
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
                                {filteredEditRoles.map((r: { id: number; name: string }) => (
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
        </Box>
    )
};

export default AccountManagement;