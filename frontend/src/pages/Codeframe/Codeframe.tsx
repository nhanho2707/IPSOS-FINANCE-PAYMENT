import { useState, ChangeEvent, useRef } from "react";
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from "@mui/material";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import ReusableTable from "../../components/Table/ReusableTable";
import { ColumnFormat } from "../../config/ColumnConfig";
import { useCodeframe } from "../../hook/useCodeframe";

const columns: ColumnFormat[] = [
    {
        label: "STT",
        name: "id",
        type: "number",
        align: "center",
        width: 60,
    },
    {
        label: "Respondent ID",
        name: "respondent_id",
        type: "string",
        width: 140,
    },
    {
        label: "Answer",
        name: "response_text",
        type: "string",
    },
    {
        label: "Code",
        name: "code",
        type: "string",
        align: "center",
        width: 140,
        renderCell: (row) =>
            row.code ? (
                <Chip label={row.code} size="small" color="primary" variant="outlined" />
            ) : (
                <Chip label="Not coded" size="small" variant="outlined" sx={{ color: "text.disabled" }} />
            ),
    },
    {
        label: "Coded by",
        name: "coded_by",
        type: "string",
        align: "center",
        width: 140,
        renderCell: (row) => row.coded_by ?? "—",
    },
    {
        label: "Coded at",
        name: "coded_at",
        type: "string",
        align: "center",
        width: 160,
        renderCell: (row) => row.coded_at ?? "—",
    },
];

export default function Codeframe() {
    const { rows, actionState, importData } = useCodeframe();

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) return;
        await importData(selectedFile);
        setOpenDialog(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Codeframe
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<FileUploadOutlinedIcon />}
                    onClick={() => setOpenDialog(true)}
                    sx={{ textTransform: "none" }}
                >
                    Import Data
                </Button>
            </Box>

            <ReusableTable
                columns={columns}
                data={rows}
                actionStatus={actionState}
                total={rows.length}
            />

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Import Data</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                        Choose an Excel file (.xlsx) with open-ended answers to start coding.
                    </Typography>
                    <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        sx={{ py: 3, borderStyle: "dashed", textTransform: "none" }}
                    >
                        {selectedFile ? selectedFile.name : "Choose .xlsx file"}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx"
                            hidden
                            onChange={handleFileChange}
                        />
                    </Button>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialog} sx={{ textTransform: "none" }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleImport}
                        disabled={!selectedFile || actionState.loading}
                        sx={{ textTransform: "none" }}
                    >
                        {actionState.loading ? "Importing..." : "Import"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
