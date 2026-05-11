import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { ColumnFormat } from "../../config/ColumnConfig";
import { AccountCellConfig, AccountData } from "../../config/AccountFieldsConfig";
import { useAccounts } from "../../hook/useAccounts";
import ReusableTable from "../../components/Table/ReusableTable";
import { useMetadata } from "../../hook/useMetadata";
import { useMemo, useState } from "react";
import { error } from "console";

const AccountManagement = () => {
    const { data, isLoading } = useMetadata();
    const { accounts, meta, total, page, setPage, rowsPerPage, setRowsPerPage, searchTerm, setSearchTerm, loading: loadingAccount, error: errorAccounts, message: messageAccount, storeAccount, fetchAcounts } = useAccounts();
    
    const [ openCreateDialog, setOpenCreateDialog ] = useState<boolean>(false);

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

    const columns: ColumnFormat[] = [
        ...AccountCellConfig
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

    const handleCreateUser = async () => {
        await storeAccount(formCreateData);

        setOpenCreateDialog(false);

        await fetchAcounts();
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
                actionStatus={{
                    type: 'fetch',
                    loading: loadingAccount,
                    error: errorAccounts,
                    message: messageAccount
                }}
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
                    <Button variant="contained" onClick={handleCreateUser} disabled={isCreateDisabled}>
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
};

export default AccountManagement;