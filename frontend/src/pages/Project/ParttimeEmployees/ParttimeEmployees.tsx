import { Alert, Box, Button, IconButton, Paper, Snackbar } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { EmployeeCellConfig, EmployeeData } from "../../../config/EmployeeFieldsConfig";
import useDialog from "../../../hook/useDialog";
import UniversalInputDialog from "../../../components/Dialogs/UniversalInputDialog";
import AlertDialog from "../../../components/AlertDialog/AlertDialog";
import { useVisibility } from "../../../hook/useVisibility";
import SearchTextBox from "../../../components/SearchTextBox";
import { useEmployees } from "../../../hook/useEmployees";
import ReusableTable from "../../../components/Table/ReusableTable";
import { ColumnFormat } from "../../../config/ColumnConfig";
import { useProjects } from "../../../hook/useProjects";
import { ProjectData } from "../../../config/ProjectFieldsConfig";

const ParttimeEmployees = () => {
    const { id } = useParams<{id: string}>();
    const projectId = Number(id) || 0;
    const [ projectSelected, setProjectSelected ] = useState<ProjectData | null>(null);

    const { getProject } = useProjects();
    const { employees, meta, total, page, setPage, rowsPerPage, setRowsPerPage, searchTerm, setSearchTerm, loading: loadingEmployees, error: errorEmployees, message: messageEmployees, addEmployees, removeEmployee } = useEmployees(projectId);
    
    const { canView } = useVisibility();
    
    const [ employeeCellConfig, setEmployeeCellConfig ] = useState(EmployeeCellConfig)
    const { open, title, message, showConfirmButton, openDialog, closeDialog, confirmDialog } = useDialog();
    const [ selectedEmployee, setSelectedEmployee ] = useState<EmployeeData | null>(null);
    
    const handleRemoveClick = (employee: EmployeeData) => {
        setSelectedEmployee(employee);
        openDialog({
            title: "Delete Employee",
            message: "Are you sure that you want to remove " + employee.employee_id + " from this project?",
            showConfirmButton: true
        });
    };

    const handleCancel = () => {
        closeDialog();
        setSelectedEmployee(null);
    }

    const handleConfirm = async () => {
        if(!selectedEmployee || !id) return

        try{
            await removeEmployee(parseInt(id), selectedEmployee.id);
        } catch(error){
            console.error('Failed to remove employee', error);
        }finally{
            closeDialog();
            setSelectedEmployee(null);
        }
    }

    const [openImportEmployeesDialog, setOpenImportEmployeesDialog ] = useState(false);
        
    const handleImportEmployeesCancel = () => {
        setOpenImportEmployeesDialog(false);
    }

    const handleImportEmployees = async (value: string) => {
        
        if (!id || !value){
            setOpenImportEmployeesDialog(false);
            return;
        } 
        
        setPage(0);

        const employee_ids = value.split("\n").map(x => x.trim().replace(/[^a-zA-Z0-9]/g, "")).filter(Boolean);
        
        await addEmployees(parseInt(id), employee_ids.join(','));

        setOpenImportEmployeesDialog(false);
    }

    const handleSearchChange = (value: string) => {
        setSearchTerm(value.toLocaleLowerCase());
        setPage(0);
    }

    const columns: ColumnFormat[] = [
        ...employeeCellConfig,
        {
            label: "Transactions",
            name: "transactions",
            type: "string",
            align: "center",
            flex: 1,
            renderHeader: () => (
                <div style={{ whiteSpace: "normal", lineHeight: 1.2, textAlign: "center" }}>
                    Transactions <br />
                    (Vinnet / Gotit / Refuse / Total)
                </div>
            ),
            renderCell: (row : any) => {
                return `${row.vinnet_total ?? 0} / ${row.gotit_total ?? 0} / ${row.other_total ?? 0} / ${row.transaction_total ?? 0}`;
            }
        },
        {
            label: "Actions",
            name: "actions",
            type: "menu",
            align: "center",
            flex: 1,
            renderAction: (row: any) => {
                const disabled = loadingEmployees || row.transaction_total > 0;

                return (
                    <IconButton
                        color="error"
                        size="small"
                        disabled={disabled}
                        onClick={() => handleRemoveClick(row)}
                    >
                        <DeleteIcon />
                    </IconButton>
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                {/* Project Info */}
                <Box>
                    <div><strong>Project Name:</strong> {projectSelected?.project_name}</div>
                    <div><strong>Symphony:</strong> {projectSelected?.symphony}</div>
                </Box>

                {/* Add Employee Button */}
                {canView("employees.functions.visible_import_employees") && (
                    <Button variant="contained" color="primary" onClick={() => setOpenImportEmployeesDialog(true)}>
                    Add / Import Employees
                    </Button>
                )}
                </Box>
            <Box
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor: "#f5f5f5",
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap"
                }}
            >
                <SearchTextBox placeholder="Search id, name,..." onSearchChange={handleSearchChange} />
            </Box>
            <ReusableTable
                title="Employees"
                columns={columns}
                data={employees}
                actionStatus={{
                    type: 'fetch',
                    loading: loadingEmployees,
                    error: errorEmployees,
                    message: messageEmployees
                }}
                page = {page}
                rowsPerPage = {rowsPerPage}
                total = {total}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />

            <AlertDialog
                open={open}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                showConfirmButton={showConfirmButton}
                title={title}
                message={message}
            />

            <UniversalInputDialog
                open={openImportEmployeesDialog}
                onClose={handleImportEmployeesCancel}
                onSubmit={handleImportEmployees}
                title="Add Employees"
                label="Import Employee IDs"
                placeholder="Paste codes here"
            />
        </Box>
        // <Box className="box-table">
        //     <div className="filter">
        //         <div className="filter-left">
        //             <div className="project-info">
        //                 <div>
        //                     <strong>Project Name:</strong> {projectSelected?.project_name}
        //                 </div>
        //                 <div>
        //                     <strong>Symphony:</strong> {projectSelected?.symphony}
        //                 </div>
        //             </div>
        //         </div>
        //         <div className="filter-right">
        //         {canView("employees.functions.visible_import_employees") && (
        //             <Button className="btn btn-primary" onClick={() => setOpenImportEmployeesDialog(true)}>
        //                 Import New Employees
        //             </Button>
        //         )}
        //         </div>
        //     </div>
        //     <div className="filter">
        //         {/* LEFT: Add button */}
        //         <div className="filter-left">
                    
        //         </div>
    
        //         {/* RIGHT: Search + Date filter */}
        //         <div className="filter-right">
        //             <SearchTextBox placeholder="Search id, name,..." onSearchChange={handleSearchChange} />
        //         </div>
        //     </div>
           
            
        // </Box>
    )
}

export default ParttimeEmployees;