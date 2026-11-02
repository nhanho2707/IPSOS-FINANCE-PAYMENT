import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from "@mui/material";
import ReusableTable from "../../components/Table/ReusableTable";
import { ColumnFormat } from "../../config/ColumnConfig";
import { ChangeEvent, useState } from "react";
import axios from "axios";
import { ApiConfig } from "../../config/ApiConfig";
import { useTradeUnion } from "../../hook/useTradeUnion";
import { RecipientListCellConfig } from "../../config/TradeUnionFieldsConfig";
import MailOutlineIcon from '@mui/icons-material/MailOutlineOutlined';

const TradeUnionTransactions: React.FC = () => {

    const [ openImportDialog, setOpenImportDialog ] = useState(false);  
    const [ listName, setListName ] = useState("");
    const [ selectedFile, setSelectedFile ] = useState<File | null>(null);
    const [ message, setMessage ] = useState<string | null>(null);
    const [ recipientListCellConfig, setRecipientListCellConfig ] = useState(RecipientListCellConfig);

    const token = localStorage.getItem("authToken");

    const { recipientLists, total, loading, error, message: tradeUnionMessage, page, setPage, rowsPerPage, setRowsPerPage, searchTerm, setSearchTerm } = useTradeUnion();

    const handleSendEmail = async (recipientList: any) => {
        if (!recipientList?.id) return;

        try {
            const response = await axios.post(
            ApiConfig.tradeUnion.sendEmail.replace("{id}", recipientList.id.toString()),
            { list_id: recipientList.id },
            {
                headers: {
                Authorization: `Bearer ${token}`,
                },
            }
            );

            setMessage(response.data.message || "Email sent successfully");
        } catch (error) {
            console.error("Send email failed", error);
            setMessage("Failed to send email. Please try again.");
        }
    };

    const columns: ColumnFormat[] = [
        ... recipientListCellConfig,
        {
            label: "Actions",
            name: "actions",
            type: "menu",
            align: "center",
            flex: 1,
            renderAction: (row: any) => {
                const disabled = loading || row.transaction_total > 0;

                return (
                    <IconButton
                        color="error"
                        size="small"
                        disabled={disabled}
                        onClick={() => handleSendEmail(row)}
                    >
                        <MailOutlineIcon />
                    </IconButton>
                )
            }
        }
    ]

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    }

    const handleImport = async () => {
        if(!listName.trim()){
            setMessage("Please enter a campaign name.");
            return;
        }

        if(!selectedFile){
            setMessage("Please choose a file to import.");
            return;
        }

        const formData = new FormData();
        formData.append("list_name", listName.trim());
        formData.append("file", selectedFile);

        try{
            const response = await axios.post(ApiConfig.tradeUnion.importRecipients, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bearer ${token}`
                }
            });


            if(response.data.status_code === 200){
                setMessage("Import recipients successfully.");
            } else {
                setMessage(response.data.error || "Failed to import recipients.");
            }
        } catch(error){
            console.error("Failed to import recipients", error);
            setMessage("Import failed. Please try again.");
        }

    }

    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2
                }}
            >
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setOpenImportDialog(true)}
                >
                    Add / Import 
                </Button>
            </Box>
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Gift campaigns
                </Typography>
                <ReusableTable
                    columns={columns}
                    data={recipientLists}
                    actionStatus={{ type: 'fetch', loading, error, message: tradeUnionMessage }}
                    page = {page}
                    rowsPerPage = {rowsPerPage}
                    total = {total}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Box>

            <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)}>
                <DialogTitle>Import Recipients</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Campaign name"
                        value={listName}
                        onChange={(e) => setListName(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        type="file"
                        onChange={handleFileChange}
                        sx={{ mb: 2 }}
                        slotProps={{ htmlInput: {accept: ".csv,.xlsx,.xls"} }}
                    />
                    {message && (
                        <Typography variant="body2" color="error" sx = {{ mb: 2 }}>
                            {message}
                        </Typography>
                    )}  
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenImportDialog(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleImport} color="primary">
                        Import
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default TradeUnionTransactions;