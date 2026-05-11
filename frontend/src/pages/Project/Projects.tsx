import { Box, Button, IconButton } from "@mui/material";
import ReusableTable from "../../components/Table/ReusableTable";
import TableProjects from "../../components/Table/TableProjects";
import { useProjects } from "../../hook/useProjects";
import { useMetadata } from "../../hook/useMetadata";
import { ColumnFormat } from "../../config/ColumnConfig";
import { ProjectCellConfig, ProjectData, ProvinceData } from "../../config/ProjectFieldsConfig";
import logo from "../../assets/img/Ipsos logo.svg";
import { StatusDropdown } from "../../components/Table/StatusDropdown";
import { useVisibility } from "../../hook/useVisibility";
import useDialog from "../../hook/useDialog";
import AlertDialog from "../../components/AlertDialog/AlertDialog";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import SearchDatePickerFromTo from "../../components/SearchDatePickerFromTo";
import SearchTextBox from "../../components/SearchTextBox";
import ModalAddProject from "../../components/Modals/Project/ModalAddProject";
import { Dayjs } from "dayjs";

const Projects = () => {
  const navigate = useNavigate();

  const { projects, actionState, page, rowsPerPage, total, setPage, setRowsPerPage, searchTerm, setSearchTerm, searchFromDate, setSearchFromDate, searchToDate, setSearchToDate, updateProjectStatus } = useProjects();
  const { data } = useMetadata();
  const { canView } = useVisibility();
  const { open, title, message, showConfirmButton, openDialog, closeDialog, confirmDialog } = useDialog();
  
  const [ updatingId, setUpdatingId ] = useState<number | null>(null);

  // Define allowed transitions for each status
  const statusTransitions: { [key: string] : string[] } = {
    'planned' : ['in coming', 'cancelled'], 
    'in coming' : ['on going', 'on hold', 'cancelled'], 
    'on going' : ['completed', 'on hold', 'cancelled'], 
    'completed' : ['on going', 'on hold', 'cancelled'], 
    'on hold' : ['on going', 'completed', 'cancelled'], 
    'cancelled' : ['on going', 'on hold', 'cancelled']
  };

  const STATUS = {
    PLANNED: 'planned',
    IN_COMING: 'in coming',
    ON_GOING: 'on going',
    COMPLETED: 'completed',
    ON_HOLD: 'on hold',
    CANCELLED: 'cancelled'
  }

  const columns: ColumnFormat[] = [
    {
      label: "",
      name: "flatform",
      type: "image",
      align: "center",
      width: 40,
      renderCell: (row: ProjectData) => {
          return (
            <Box
              component="img"
              src={logo}
              sx={{
                width: 32,
                height: 32,
                objectFit: "contain"
              }}
            />
          );
      }
    },
    ...ProjectCellConfig,
    {
      label: "Sample Size",
      name: "sample_size",
      type: "string",
      align: "left",
      width: 120,
      renderCell: (row: ProjectData) => {
        const count_respondents = row.count_respondents;

        const sample_size = row.provinces?.reduce((sum: number, p: ProvinceData) => {
          return sum + (p.sample_size_main || 0) + (p.sample_size_booters || 0);
        }, 0);

        return (
          <>{count_respondents} / {sample_size}</>
        )
      }
    },
    {
      label: "Status",
      name: "status",
      type: "string",
      align: "left",
      width: 100,
      renderCell: (row: ProjectData) => {
        return (
          <StatusDropdown
            value={row.status ?? STATUS.PLANNED}
            transitions={statusTransitions}
            onChange={(newStatus) => handleUpdateStatus(row, newStatus)}
            disabled={!canView("projects.functions.visible_change_status_of_project") || updatingId === row.id}
          />
        )
      }
    },
    {
      label: "",
      name: "action",
      type: "menu",
      align: "center",
      width: 120,
      renderCell: (row: ProjectData) => {
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center"
            }}
          >
            <IconButton
              aria-label="actions"
              onClick={() =>
                navigate(`/project-management/projects/${row.id}/quotation`)
              }
              sx={{
                backgroundColor: '#f6f6f6', 
                borderRadius: '8px',
                border: '1px solid #e8e8e8',
                '&:hover': {
                  backgroundColor: '#e0e0e0',
                },
                padding: '5px',
              }}
            >
              <ArrowForwardIosIcon />
            </IconButton>
          </Box>
        )
      }
    }
  ];

  const [openModalAdd, setOpenModalAdd] = useState<boolean>(false);
  
  const handleCloseModal = () => {
    setOpenModalAdd(false);
  };

  const showError = (message: string) => {
    openDialog({
      title: 'Update Status',
      message: message,
      showConfirmButton: false
    });
  }

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      openDialog({
        title: "Update Status",
        message: message,
        showConfirmButton: true,
        onConfirm: () => resolve(true),
        onClose: () => resolve(false)
      })
    });
  }

  const handleUpdateStatus = async (project: ProjectData, status: string) => {
    if(project.count_employees === 0 && status === STATUS.ON_GOING){
      return showError(
        'Vui lòng cập nhật danh sách phỏng vấn viên trước khi "on going" dự án!'
      );
    }

    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn thay đổi trạng thái dự án sang "${status}" không?`
    )

    if(!confirmed) return;
    if(!project.id) return;

    setUpdatingId(project.id);

    try
    {

      await updateProjectStatus(project.id, status);
    } catch(error){
      if(axios.isAxiosError(error)){
        const statusCode = error.response?.status;

        if(statusCode === 403){
          showError("Bạn không có quyền thay đổi trạng thái.");
        } else {
          showError("Có lỗi xảy ra. Vui lòng thử lại.");
        }
      }
    } finally{
      setUpdatingId(null);
    }
  }
  
  const handleChangePage = (event: any, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: any) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value.toLocaleLowerCase());
  }

  const handleDateChange = (from: Dayjs | null, to: Dayjs | null) => {
    if (!from || !to) return;

    if (from && to) {
        setSearchFromDate(from);
        setSearchToDate(to);
    }
  };
  
  return (
    <Box>
      <ReusableTable
          title="Projects"
          columns={columns}
          data={projects}
          actionStatus={{
              type: 'fetch',
              loading: actionState.loading,
              error: actionState.error,
              message: actionState.message
          }}
          page = {page}
          rowsPerPage = {rowsPerPage}
          total = {total}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          topToolbar={(
            <Box>
              <div className="filter">
                <div className="filter-left">
                  <h2 className="filter-title">Projects</h2>
                </div>
                <div className="filter-right">
                  {canView("projects.functions.visible_add_new_project") && (
                    <Button className="btn btn-primary" onClick={() => setOpenModalAdd(true)}>
                      Add New Project
                    </Button>
                  )}
                </div>
              </div>
              <div className="filter">
                {/* LEFT: Add button */}
                <div className="filter-left">
                  <SearchDatePickerFromTo fromValue={searchFromDate} toValue={searchToDate} onSearchChange={handleDateChange}/>
                </div>

                {/* RIGHT: Search + Date filter */}
                <div className="filter-right">
                  <SearchTextBox
                    placeholder="Search project name, internal code,..."
                    onSearchChange={handleSearchChange}
                  />
                </div>
              </div>
            </Box>
          )}
      />

      <AlertDialog
        open={open}
        title={title}
        message={message}
        showConfirmButton={showConfirmButton}
        onClose={closeDialog}
        onConfirm={confirmDialog}
      />

      <ModalAddProject 
        openModal={openModalAdd} 
        onClose={handleCloseModal} 
        metadata={data}
      />
    </Box>
  );
};

export default Projects;
