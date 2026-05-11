import { Box, Button, IconButton } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { useProjects } from "../../hook/useProjects";
import { OfflineProjectRespondentCellConfig, OfflineProjectRespondentData, OfflineProjectRespondentImportData } from "../../config/OfflineProjectRespondentFieldsConfig";
import { ColumnFormat } from "../../config/ColumnConfig";
import SearchTextBox from "../../components/SearchTextBox";
import ReusableTable from "../../components/Table/ReusableTable";
import { useVisibility } from "../../hook/useVisibility";
import * as XLSX from "xlsx";
import AlertDialog from "../../components/AlertDialog/AlertDialog";
import useDialog from "../../hook/useDialog";
import { useOfflineProjectRespondents } from "../../hook/useOfflineProjectRespondents";
import DeleteIcon from "@mui/icons-material/Delete";
import LoadingButton from '@mui/lab/LoadingButton';
import SendIcon from '@mui/icons-material/Send';

const Gifts: React.FC = () => {
    const { id } = useParams<{id: string}>();
    const projectId = Number(id) || 0;
    const [ projectSelected, setProjectSelected] = useState<ProjectData | null>(null);

    const { canView } = useVisibility();
    
    const { open, title, message, showConfirmButton, openDialog, closeDialog, confirmDialog } = useDialog();
    
    const { getProject } = useProjects();
    const [ offlineProjectRespondentCellConfig, setOfflineProjectRespondentCellConfig ] = useState(OfflineProjectRespondentCellConfig);

    const { offineProjectRespondents, removeProjectRespondent, offlineTransactionSending, importOfflineProjectRespondents, loading: loadingOfflineProjectRespondents, error: errorOfflineProjectRespondents, message: messageOfflineProjectRespondents, page, rowsPerPage, searchTerm, total, setSearchTerm, setPage, setRowsPerPage } = useOfflineProjectRespondents(projectId);
    const [ loadingRowId, setLoadingRowId ] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    
    const handleRemoveCancelDialog = () => {
        closeDialog();
    }

    const handleRemoveConfirmDialog = async (row: OfflineProjectRespondentData) => {
        try{
            await removeProjectRespondent(projectId, row);
        } catch(error){
            console.error('Failed to remove employee', error);
        }finally{
            closeDialog();
        }
    }

    const handleRemoveClick = (row: OfflineProjectRespondentData) => {
        openDialog({
            title: "Remove Respondents",
            message: "Are you sure that you want to remove " + row.respondent_id + " from this project?",
            showConfirmButton: true,
            onClose: handleRemoveCancelDialog,
            onConfirm: () => handleRemoveConfirmDialog(row)
        });
    }

    const handleSendGiftClick = async (row: OfflineProjectRespondentData) => {
        try
        {
            setLoadingRowId(row.respondent_id);
            await offlineTransactionSending(projectId, row);
        }catch(error){
            console.error('Failed to send SMS', error);
        } finally {
            setLoadingRowId(null);
        }
    }

    const columns: ColumnFormat[] = [
        ...offlineProjectRespondentCellConfig,
        {
            label: "Status",
            name: "status",
            type: "string",
            align: "center",
            flex: 1,
            renderHeader: () => {
                return (
                    <div style={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "center" }}>
                        Status 
                    </div>
                );
            },
            renderCell: (row: any) => {
                return (
                    <div>
                        <span className={"box-status-button " + row.status.toLocaleLowerCase().replace(" ", "-")}>{row.status}</span>
                    </div>
                );
            }
        },
        {
            label: "Actions",
            name: "actions",
            type: "menu",
            align: "center",
            flex: 1,
            renderHeader: () => {
                return (
                    <div style={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "center" }}>
                        Actions 
                    </div>
                );
            },
            renderAction: (row: any) => {
                const disabled = (row.status != 'pending');

                return (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <IconButton
                            color="error"
                            size="small"
                            disabled={disabled}
                            onClick={() => handleRemoveClick(row)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </div>
                )
            }
        },
        {
            label: "",
            name: "functions",
            type: "menu",
            align: "center",
            flex: 1,
            renderAction: (row: OfflineProjectRespondentData) => {
                const disabled = (row.status != 'pending');
                const view_disabled = row.status == 'success';

                return (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <LoadingButton
                            onClick={() => handleSendGiftClick(row)}
                            size="small"
                            endIcon={<SendIcon />}
                            loading={(loadingRowId === row.respondent_id)}
                            loadingPosition="end"
                            variant="contained"
                            disabled={disabled}
                            className='btn bg-vinnet-primary'
                            >
                                <span>TẶNG QUÀ</span>
                        </LoadingButton>
                    </div>
                    
                )
            }
        }
    ];

    const handleSearchChange = (value: string) => {
        setSearchTerm(value.toLocaleLowerCase());
    }

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

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
                defval: ""
            });

            if (!jsonData.length) {
                openDialog({
                    title: "Import Respondents Failed",
                    message: 'File không có dữ liệu!',
                    showConfirmButton: false
                });
                return;
            }

            const REQUIRED_COLUMNS = [
                "InstanceID",	"Shell_ChainID", "SamplePoint",	"Province",	"InterviewerID", "RespondentPhoneNumber", "PhoneNumber", "Email", "PriceLevel"
            ]

            const hearders = Object.keys(jsonData[0]);

            const missingColumns = REQUIRED_COLUMNS.filter(
                col => !hearders.includes(col)
            );

            if(missingColumns.length > 0){
                openDialog({
                    title: "Import Respondents Failed",
                    message: `File thiếu cột bắt buộc: ${missingColumns.join(", ")} `,
                    showConfirmButton: false
                });
                return;
            }
            
            await importRespondents(jsonData);
        } catch (error) {
            console.error("Import error:", error);
        } finally {
            event.target.value = "";
        }

    };

    const importRespondents = async (rows:  OfflineProjectRespondentImportData[]) => {
        const payload = rows.map(r => ({
            instance_id: r.InstanceID.toString(),
            shell_chainid: r.Shell_ChainID.toString(),
            location_id: r.SamplePoint.toString(),
            province_name: r.Province.toString(),
            employee_id: r.InterviewerID.toString(),
            respondent_phone_number: r.RespondentPhoneNumber.toString() ?? null,
            phone_number: r.PhoneNumber.toString() ?? null,
            email: r.Email.toString() ?? null,
            price_level: r.PriceLevel.toString() ?? null
        }));

        await importOfflineProjectRespondents(payload);
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
        <>
            <Box className="box-table">
            <div className="filter">
                <div className="filter-left">
                    <div className="project-info">
                    <div>
                        <strong>Project Name:</strong> {projectSelected?.project_name}
                    </div>
                    <div>
                        <strong>Symphony:</strong> {projectSelected?.symphony}
                    </div>
                    </div>
                </div>
                <div className="filter-right">
                {canView("gifts.functions.visible_import_respondents") && (
                    <>
                        <Button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                            Import Respondents
                        </Button>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleImportFile}
                        />
                    </>
                )}
                </div>
            </div>
            <div className="filter">
                {/* LEFT: Add button */}
                <div className="filter-left">
                    
                </div>
    
                {/* RIGHT: Search + Date filter */}
                <div className="filter-right">
                    <SearchTextBox placeholder="Search phone number..." onSearchChange={handleSearchChange} />
                </div>
            </div>
            
            <ReusableTable
                title="Employees"
                columns={columns}
                data={offineProjectRespondents}
                actionStatus={{
                    type: 'import',
                    loading: loadingOfflineProjectRespondents,
                    error: errorOfflineProjectRespondents,
                    message: messageOfflineProjectRespondents
                }}
                page = {page}
                rowsPerPage = {rowsPerPage}
                total = {total}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            ></ReusableTable>
    
            <AlertDialog
                open={open}
                onClose={closeDialog}
                onConfirm={confirmDialog}
                showConfirmButton={showConfirmButton}
                title={title}
                message={message}
            />
            </Box>
        </>
    )
}

export default Gifts;