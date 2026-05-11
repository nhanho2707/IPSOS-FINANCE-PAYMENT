import { Autocomplete, Box, Button, IconButton, TextField, Typography } from "@mui/material";
import { ColumnFormat } from "../../config/ColumnConfig";
import { CATIBatchData, MiniCATIBatchCellConfig } from "../../config/MiniCATIFieldsConfig";
import { useCATIBatch } from "../../hook/useCATIBatch";
import { useParams } from "react-router-dom";
import ReusableTable from "../../components/Table/ReusableTable";
import { useProjects } from "../../hook/useProjects";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { useEffect, useRef, useState } from "react";
import { useVisibility } from "../../hook/useVisibility";
import * as XLSX from "xlsx";
import useDialog from "../../hook/useDialog";
import AlertDialog from "../../components/AlertDialog/AlertDialog";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle"

const CATISettings = () => {

    const { id } = useParams<{id: string}>();
    const projectId = Number(id) || 0;

    const { canView } = useVisibility();
    const { open, title, message, showConfirmButton, openDialog, closeDialog, confirmDialog } = useDialog();

    const [ projectSelected, setProjectSelected ] = useState<ProjectData | null>(null);
    
    const { getProject } = useProjects();

    const { batches, actionState, page, rowsPerPage, total, setPage, setRowsPerPage, fetchCATIBatches, importCATIBatch, destroyBatch, updateStatus } = useCATIBatch(projectId);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [ batchName, setBatchName ] = useState<string>("");
    const [ selectedBatch, setSelectedBatch ] = useState<CATIBatchData | null>(null);
    
    const handleRemoveClick = async (batch: CATIBatchData) => {
        await destroyBatch(batch.id);
    }

    const handleBlockClick = async (batch: CATIBatchData) => {
        await updateStatus(batch.id, batch.status === 'active' ? 'blocked' : 'active');
    }

    const columns: ColumnFormat[] = [
        ...MiniCATIBatchCellConfig,
        {
            label: "",
            name: "actions",
            type: "menu",
            align: "center",
            flex: 1,
            renderAction: (row: CATIBatchData) => {
                const disabled = row.to_used;

                return (
                    <Box sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1
                    }}>
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={disabled}
                            startIcon={ <DeleteIcon /> }
                            onClick={() => openDialog({
                                title: "Delete Batch",
                                message: "Bạn có chắc chắn muốn delete batch này?",
                                showConfirmButton: true,
                                onConfirm: () => handleRemoveClick(row)
                            })}
                        >
                            Delete
                        </Button>
                        <Button
                            variant="outlined"
                            color={ row.status === 'active' ? "secondary" : "info" }
                            size="small"
                            // disabled={disabled}
                            startIcon={ row.status === 'active' ? <BlockIcon /> : <CheckCircleIcon /> }
                            onClick={() => openDialog({
                                title: "Block Batch",
                                message: `ạn có chắc chắn muốn ${row.status === 'active' ? "block" : "activate" } batch này?`,
                                showConfirmButton: true,
                                onConfirm: () => handleBlockClick(row)
                            })}
                        >
                            { row.status === 'active' ? "Blocked" : "Activate" }
                        </Button>
                    </Box>
                    
                )
            }
        }
    ];

    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try 
        {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
                defval: ""
            });

            if (!jsonData.length) {
                openDialog({
                    title: "Import Batch Failed",
                    message: 'File không có dữ liệu!',
                    showConfirmButton: false
                });
                return;
            }

            const REQUIRED_COLUMNS = [
                "ID", "Phone", "Name", "Link", "Filter_1", "Filter_2", "Filter_3", "Filter_4"
            ]

            const hearders = Object.keys(jsonData[0]);

            const missingColumns = REQUIRED_COLUMNS.filter(
                col => !hearders.includes(col)
            );

            if(missingColumns.length > 0){
                openDialog({
                    title: "Import Batch Failed",
                    message: `File thiếu cột bắt buộc: ${missingColumns.join(", ")} `,
                    showConfirmButton: false
                });
                return;
            }
            
            await importCATIBatch(file, batchName);

            setSelectedBatch(null);
            setBatchName("");
        } catch (error) {
            console.error("Import error:", error);
        } finally {
            event.target.value = "";
        }
    };

    useEffect(() => {
        async function fetchProject(){
            try{
                const p = await getProject(projectId);
                setProjectSelected(p);
            }catch(error){
                console.log(error);
            }
        }

        fetchProject();
    }, [projectId]);
    
    return (
        <Box>
            <ReusableTable
                title="Batches"
                columns={columns}
                data={batches}
                actionStatus={actionState}
                page = {page}
                rowsPerPage = {rowsPerPage}
                total = {total}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                topToolbar={
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 2,
                            border: "1px solid #eee",
                            borderRadius: 2,
                            backgroundColor: "#fafafa"
                        }}
                    >
                        <Box>
                            <Typography variant="subtitle1" gutterBottom sx={{ mt: "4px"}}>
                                <strong>Project Name</strong>: {projectSelected?.project_name}
                            </Typography>
                            <Typography variant="subtitle1" gutterBottom sx={{ mt: "4px"}}>
                                <strong>Symphony:</strong> {projectSelected?.symphony}
                            </Typography>
                        </Box>
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2
                        }}>
                            <Autocomplete
                                freeSolo
                                size="small"
                                options={batches || []}
                                value={selectedBatch}
                                inputValue={batchName}
                                sx={{
                                    minWidth: 250
                                }}
                                getOptionLabel={(option) => 
                                    typeof option === "string" ? option : option.name
                                }
                                onInputChange={(event, value) => {
                                    setBatchName(value)
                                    setSelectedBatch(null);
                                }}
                                onChange={(event, value) => {
                                    if(typeof value === "string"){
                                        setBatchName(value);
                                        setSelectedBatch(null);
                                    } else {
                                        setSelectedBatch(value);
                                        setBatchName(value?.name || "");
                                    }
                                }}
                                renderOption={(props, option) => (
                                    <li {...props}>
                                        <Box>
                                            <strong>{option.name}</strong>
                                            <Typography variant="caption" color="text.secondary">
                                                {option.total_records} records
                                            </Typography>
                                        </Box>
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField {...params} label="Batch name" />
                                )}
                            />
                            <Button 
                                variant="contained"
                                startIcon={<UploadIcon />}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Import Batch
                            </Button>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                ref={fileInputRef}
                                style={{ display: "none" }}
                                onChange={handleImportFile}
                            />
                        </Box>
                    </Box>
                }
            />
            
            <AlertDialog
                open={open}
                title={title}
                message={message}
                showConfirmButton={showConfirmButton}
                onClose={closeDialog}
                onConfirm={confirmDialog}
            />
        </Box>
    )
}

export default CATISettings;