import { Alert, Autocomplete, Box, Button, Checkbox, Dialog, DialogTitle, Divider, Grid, Table, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useVinnetAccount } from "../../hook/useVinnetAccount";
import GenericDialog from "../../components/Dialogs/GenericDialog";
import { useState } from "react";
import axios from "axios";
import { ApiConfig } from "../../config/ApiConfig";
import { Skeleton } from "@mui/material";
import { useGotItAccount } from "../../hook/useGotItAccount";
import dayjs, { Dayjs } from "dayjs"
import SearchDatePickerFromTo from "../../components/SearchDatePickerFromTo";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { useMetadata } from "../../hook/useMetadata";
import LoadingButton from "@mui/lab/LoadingButton";
import AddIcon from '@mui/icons-material/Add';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { formatMoney } from "../../utils/format";
import TransactionStatisticsPanel from "../../components/TransactionStatisticsPanel";

const Transactions = () => {
    const { loading: vinnetLoading, vinnetAccount } = useVinnetAccount();
    const { gotitAccount, addDeposit, loading: gotitLoading } = useGotItAccount('gotit');
    const [ open, setOpen ] = useState(false);
    const [ amount, setAmount ] = useState("");

    const [ fromDate, setFromDate ] = useState<Dayjs | null>(null);
    const [ toDate, setToDate ] = useState<Dayjs | null>(null);
    
    const [ loadingExport, setLoadingExport ] = useState<boolean>(false);
    const [ loadingExportByProjects, setLoadingExportByProjects ] = useState<boolean>(false); 
    
    const { data } = useMetadata();

    const [ selectedProjects, setSelectedProjects ] = useState<ProjectData[]>([]);

    const [ exportError, setExportError ] = useState<string>("");

    const [ statsProject, setStatsProject ] = useState<ProjectData | null>(null);

    const token = localStorage.getItem("authToken");

    const handleAddDeposit = async () => {
        await addDeposit(amount);

        setAmount("");
        setOpen(false);
    }

    const saveBlob = (data: Blob, fileName: string) => {
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement("a");

        link.href = url;
        link.setAttribute("download", fileName);

        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);
    }

    // With responseType 'blob' the server's JSON error arrives as a Blob and has to be read back as text.
    const getExportErrorMessage = async (error: unknown): Promise<string> => {
        if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
            try {
                const body = JSON.parse(await error.response.data.text());
                return body.message || error.message;
            } catch {
                return error.message;
            }
        }

        return error instanceof Error ? error.message : String(error);
    }

    const handleExport = async (from: Dayjs | null, to: Dayjs | null) => {
        try{
            setLoadingExport(true);
            setExportError("");

            if(!from || !to) return;

            const from_date = from.startOf('day').format('YYYY-MM-DD HH:mm:ss');
            const to_date = to.endOf('day').format('YYYY-MM-DD HH:mm:ss');

            const response = await axios.get(ApiConfig.functions.exportTransactions, {
                params: {
                    from_date: from_date,
                    to_date: to_date
                },
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            saveBlob(response.data, "gotit_transactions.xlsx");
        }catch(error){
            console.error("Export failed", error);
            setExportError(`Export failed: ${await getExportErrorMessage(error)}`);
        } finally{
            setLoadingExport(false);
        }
    }

    const handleExportExcelByProjects = async () => {
        try
        {
            setLoadingExportByProjects(true);
            setExportError("");

            const project_ids = selectedProjects.map((p) => p.id);

            const response = await axios.get(ApiConfig.functions.exportTransactionsByProjecs, {
                params: {
                    project_ids: project_ids
                },
                responseType: 'blob',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            saveBlob(response.data, "transactions.xlsx");
        }catch(error){
            console.error("Export failed", error);
            setExportError(`Export failed: ${await getExportErrorMessage(error)}`);
        } finally{
            setLoadingExportByProjects(false);
        }
    }
    
    return (
        <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
                <Box
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        border: 1,
                        borderColor: "divider",
                    }}
                >
                    <Typography 
                        variant="h6" 
                        gutterBottom 
                        sx={{
                            mb: 2
                        }}
                    >
                        Vinnet Account
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1
                    }}>
                        <Typography color="text.secondary">Deposited:</Typography>
                        {vinnetLoading ? (
                            <Skeleton width={80} height={24} />
                        ) : (
                            <Typography>{formatMoney(vinnetAccount?.deposited)}</Typography>
                        )}
                    </Box>
                    <Box sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1
                    }}>
                        <Typography color="text.secondary">Balance:</Typography>
                        {vinnetLoading ? (
                            <Skeleton width={80} height={24} />
                        ) : (
                            <Typography>{formatMoney(vinnetAccount?.balance)}</Typography>
                        )}
                    </Box>
                    <Box sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1
                    }}>
                        <Typography color="text.secondary">Spent:</Typography>
                        {vinnetLoading ? (
                            <Skeleton width={80} height={24} />
                        ) : (
                            <Typography>{formatMoney(vinnetAccount?.spent)}</Typography>
                        )}
                    </Box>
                </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Box
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        border: 1,
                        borderColor: "divider",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <Typography 
                            variant="h6"
                            gutterBottom
                        >
                            Got It Account
                        </Typography>
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            sx={{
                                mb: 2
                            }}
                            onClick={() => setOpen(true)}
                        >
                            Add deposit
                        </Button>
                    </Box>

                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1
                    }}>
                        <Typography color="text.secondary">Deposited:</Typography>
                        {gotitLoading ? (
                            <Skeleton width={80} height={24} />
                        ) : (
                            <Typography>{formatMoney(gotitAccount.deposited)}</Typography>
                        )}
                    </Box>
                    <Box sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1
                    }}>
                        <Typography color="text.secondary">Balance:</Typography>
                        {gotitLoading ? (
                            <Skeleton width={80} height={24} />
                        ) : (
                            <Typography>{formatMoney(gotitAccount.balance)}</Typography>
                        )}
                    </Box>
                    <Box sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1
                    }}>
                        <Typography color="text.secondary">Spent:</Typography>
                        {gotitLoading ? (
                            <Skeleton width={80} height={24} />
                        ) : (
                            <Typography>{formatMoney(gotitAccount.spent)}</Typography>
                        )}
                    </Box>
                </Box>
            </Grid>
            {exportError && (
                <Grid item xs={12}>
                    <Alert severity="error" onClose={() => setExportError("")}>
                        {exportError}
                    </Alert>
                </Grid>
            )}
            <Grid item xs={12}>
                <Typography variant="subtitle1" color="text.primary" sx={{ mb: 2 }}>
                    Choose a date range to export transactions
                </Typography>
                <SearchDatePickerFromTo fromValue={fromDate} toValue={toDate} buttonLabel="Export Excel" buttonIcon={<FileDownloadOutlinedIcon />} loadingButton={loadingExport} onSearchChange={handleExport} />
                <Divider sx={{ mt: 2 }} />
            </Grid>
            <Grid item xs={12}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 2,
                    }}
                >
                    <Box
                        sx={{
                            flex: 1
                        }}
                    >
                        <Typography variant="subtitle1" color="text.primary" sx={{ mb: 2 }}>
                            Choose projects to export transactions:
                        </Typography>
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            options={data.projects || {}}
                            value={selectedProjects || []}
                            onChange={(event, newValue) => setSelectedProjects(newValue)}
                            getOptionLabel={(option) => `${option.internal_code} - ${option.project_name}`}
                            renderOption={(props, option, { selected }) => (
                                <li {...props}>
                                    <Checkbox
                                        style={{ marginRight: 8 }}
                                        checked={selected}
                                    />
                                    {option.internal_code} - {option.project_name}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    placeholder="Select..."
                                />
                            )}
                        />
                    </Box>
                    <Box
                        sx={{
                            pt: 5.2
                        }}
                    >
                        <LoadingButton
                            onClick={handleExportExcelByProjects}
                            size="small"
                            startIcon={<FileDownloadOutlinedIcon />}
                            loading={loadingExportByProjects}
                            loadingPosition="start"
                            variant="contained"
                            disabled={selectedProjects.length == 0}
                            >
                                <span>Export Excel</span>
                        </LoadingButton>
                    </Box>
                </Box>
                
            </Grid>

            <Grid item xs={12}>
                <Divider sx={{ mt: 2, mb: 2 }} />

                <Typography variant="h6" color="text.primary" sx={{ mb: 2 }}>
                    Interview & gift timing statistics
                </Typography>

                <Autocomplete
                    options={data.projects || []}
                    value={statsProject}
                    onChange={(event, newValue) => setStatsProject(newValue)}
                    getOptionLabel={(option) => `${option.internal_code} - ${option.project_name}`}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            size="small"
                            label="Projects"
                            placeholder="All projects"
                            sx={{ maxWidth: 400 }}
                        />
                    )}
                />

                <TransactionStatisticsPanel projectId={statsProject?.id ?? 0} />
            </Grid>

            <GenericDialog
                open={open}
                title="Add deposit"
                onClose = {() => setOpen(false)}
                onSubmit={() => handleAddDeposit()}
            >
                <Box 
                    sx={{ 
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        mt: 1
                    }}
                >
                    <TextField
                        label="Amount (VND)"
                        type="number"
                        fullWidth
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                </Box>
            </GenericDialog>
        </Grid>
    )
}

export default Transactions;