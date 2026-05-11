import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import SearchTextBox from "../../components/SearchTextBox";
import { Box, IconButton } from "@mui/material";
import ReusableTable from "../../components/Table/ReusableTable";
import { useTransactions } from "../../hook/useTransactions";
import { TransactionCellConfig, TransactionData } from "../../config/TransactionFieldsConfig";
import { ColumnFormat } from "../../config/ColumnConfig";
import { useProjects } from "../../hook/useProjects";
import SmsIcon from "@mui/icons-material/Sms";

const Transactions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id) || 0;
  const [ projectSelected, setProjectSelected ] = useState<ProjectData | null>(null);

  const { getProject } = useProjects();
  const { transactions, loading: loadingTransactions, error: errorTransactions, message: messageTransactions, page, setPage, rowsPerPage, setRowsPerPage, total, setSearchTerm } = useTransactions(projectId);
  const [ transactionCellConfig, setTransactionCellConfig ] = useState(TransactionCellConfig);
  
  const handleSearchChange = (value: string) => {
    setSearchTerm(value.toLocaleLowerCase());
  }

  const handleSendSMS = (transaction: TransactionData) => {

  }

  const columns: ColumnFormat[] = [
    ...transactionCellConfig,
    {
      label: "Actions",
      name: "actions",
      type: "menu",
      align: "center",
      width: 100,
      renderAction: (row: any) => {
        const disabled = true;
        
        return (
          <IconButton
              color="error"
              size="small"
              disabled={disabled}
              onClick={() => handleSendSMS(row)}
          >
              <SmsIcon />
          </IconButton>
        )
      }
    }
  ]

  const handleChangePage = (event: any, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    async function fetchProject() {
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
            {/* {canView("employees.functions.visible_import_employees") && (
                <Button className="btn btn-primary" onClick={() => setOpenImportEmployeesDialog(true)}>
                  Import New Employees
                </Button>
            )} */}
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
            data={transactions}
            actionStatus={{
              type: 'fetch',
              loading: loadingTransactions,
              error: errorTransactions,
              message: messageTransactions
            }}
            page = {page}
            rowsPerPage = {rowsPerPage}
            total = {total}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
        ></ReusableTable>

        {/* <AlertDialog
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
        /> */}
      </Box>
    </>
  )
}

export default Transactions;