import { Autocomplete, Box, Button, Checkbox, Dialog, DialogTitle, Divider, Grid, Table, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useVinnetAccount } from "../../hook/useVinnetAccount";
import numeral from "numeral";
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
import SendIcon from '@mui/icons-material/Send';

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

    const [ loadingExportExcelByProjects, setLoadingExportExcelByProjects ]= useState<boolean>(false);

    const token = localStorage.getItem("authToken");

    const handleAddDeposit = async () => {
        await addDeposit(amount);

        setAmount("");
        setOpen(false);
    }

    const handleExport = async (from: Dayjs | null, to: Dayjs | null) => {
        try{
            setLoadingExport(true);

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

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");

            link.href = url;
            link.setAttribute("download", "gotit_transactions.xlsx");

            document.body.appendChild(link);
            link.click();

            link.remove();
        }catch(error){
            console.log("Export failed", error);
        } finally{
            setLoadingExport(false);
        }
    }

    const handleExportExcelByProjects = async () => {
        try
        {
            setLoadingExportByProjects(true);

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

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");

            link.href = url;
            link.setAttribute("download", "transactions.xlsx");

            document.body.appendChild(link);
            link.click();

            link.remove();


        }catch(error){
            console.log("Export failed", error);
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
                        boxShadow: 3,
                        bgcolor: "background.paper",
                        border: "1px solid #ddd",
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
                            <Typography>${numeral(vinnetAccount?.deposited).format("0,0")}</Typography>
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
                            <Typography>${numeral(vinnetAccount?.balance).format("0,0")}</Typography>
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
                            <Typography>${numeral(vinnetAccount?.spent).format("0,0")}</Typography>
                        )}
                    </Box>
                </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Box
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        boxShadow: 3,
                        bgcolor: "background.paper",
                        border: "1px solid #ddd",
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
                            sx={{
                                mb: 2
                            }}
                            onClick={() => setOpen(true)}
                        >
                            + Add Deposited
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
                            <Typography>${numeral(gotitAccount.deposited).format("0,0")}</Typography>
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
                            <Typography>${numeral(gotitAccount.balance).format("0,0")}</Typography>
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
                            <Typography>${numeral(gotitAccount.spent).format("0,0")}</Typography>
                        )}
                    </Box>
                </Box>
            </Grid>
            <Grid item xs={12}>
                <Typography variant="subtitle1" color="text.primary" sx={{ mb: 2 }}>
                    Chọn ngày để xuất transactions (Ví dụ: 01/01/2026 - 01/31/2026)
                </Typography>
                <SearchDatePickerFromTo fromValue={fromDate} toValue={toDate} buttonLabel="EXPORT EXCEL" loadingButton={loadingExport} onSearchChange={handleExport} />
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
                            Chọn dự án để xuất transactions:
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
                            startIcon ={<SendIcon />}
                            loading={loadingExportExcelByProjects}
                            loadingPosition="end"
                            variant="contained"
                            disabled={selectedProjects.length == 0}
                            className='btn bg-vinnet-primary'
                            >
                                <span>EXPORT EXCEL</span>
                        </LoadingButton>
                    </Box>
                </Box>
                
            </Grid>
            
            <GenericDialog
                open={open}
                title="Add Deposited"
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
                        label="Amount"
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