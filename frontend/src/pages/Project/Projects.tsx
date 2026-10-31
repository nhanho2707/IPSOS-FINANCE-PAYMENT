import { Avatar, Box, Button, IconButton, Switch, Tooltip, Typography } from "@mui/material";
import ReusableTable from "../../components/Table/ReusableTable";
import { useProjects } from "../../hook/useProjects";
import { useMetadata } from "../../hook/useMetadata";
import { ColumnFormat } from "../../config/ColumnConfig";
import { CLONE_PROJECT_ROLES, ProjectCellConfig, ProjectData, ProvinceData } from "../../config/ProjectFieldsConfig";
import { StatusDropdown } from "../../components/Table/StatusDropdown";
import useDialog from "../../hook/useDialog";
import AlertDialog from "../../components/AlertDialog/AlertDialog";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchDatePickerFromTo from "../../components/SearchDatePickerFromTo";
import SearchTextBox from "../../components/SearchTextBox";
import ModalAddProject from "../../components/Modals/Project/ModalAddProject";
import ModalCloneProject from "../../components/Modals/Project/ModalCloneProject";
import { Dayjs } from "dayjs";
import { formatClass } from "../../utils/format";
import { useAuth } from "../../contexts/AuthContext";

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const canClone = CLONE_PROJECT_ROLES.includes(user?.role ?? '');

  const { projects, actionState, page, rowsPerPage, total, setPage, setRowsPerPage, searchTerm, setSearchTerm, searchFromDate, setSearchFromDate, searchToDate, setSearchToDate, updateProjectStatus, updateDisabled, showDisabled, setShowDisabled } = useProjects();
  const { data } = useMetadata();
  const { open, title, message, showConfirmButton, openDialog, closeDialog, confirmDialog } = useDialog();
  
  const [ updatingId, setUpdatingId ] = useState<number | null>(null);
  const [ cloneTarget, setCloneTarget ] = useState<ProjectData | null>(null);

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
          <Avatar
            className={formatClass(row.status || "")}
            sx={{
              width: '28px',
              height: '28px',
              fontSize: '8px'
            }}
          >
            {row.id}
          </Avatar>
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
            disabled={updatingId === row.id}
          />
        )
      }
    },
    ...(isAdmin ? [{
      label: "Disabled",
      name: "disabled",
      type: "boolean" as const,
      align: "left" as const,
      width: 100,
      renderCell: (row: ProjectData) => (
        <Tooltip title={row.disabled ? "Click to enable" : "Click to disable"}>
          <Switch
            checked={!!row.disabled}
            onChange={() => handleUpdateDisabled(row, !row.disabled)}
            disabled={updatingId === row.id}
            color="error"
            size="small"
          />
        </Tooltip>
      )
    }]: []),
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
              justifyContent: "center",
              gap: 1
            }}
          >
            {canClone && (
              <Tooltip title="Clone dự án">
                <IconButton
                  aria-label="clone"
                  onClick={() => setCloneTarget(row)}
                  sx={{
                    backgroundColor: 'var(--body-color)',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'rgba(0,0,0,0.08)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 157, 156, 0.08)',
                    },
                    padding: '5px',
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              aria-label="actions"
              onClick={() =>
                navigate(`/project-management/projects/${row.id}/quotation`)
              }
              sx={{
                backgroundColor: 'var(--body-color)',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 157, 156, 0.08)',
                },
                padding: '5px',
              }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: '0.875rem' }} />
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

  const handleUpdateDisabled = async (project: ProjectData, disabled: boolean) => {
    const action = disabled ? 'disable' : 'enable';
    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn ${action} dự án này không?`
    );

    if (!confirmed) return;
    if (!project.id) return;

    setUpdatingId(project.id);

    try {
      await updateDisabled(project.id, disabled);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showError(error.response?.status === 403
          ? "Bạn không có quyền thực hiện thao tác này."
          : "Có lỗi xảy ra. Vui lòng thử lại."
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const handleUpdateStatus = async (project: ProjectData, status: string) => {
    if(status === STATUS.IN_COMING && !project.has_submitted_quotation){
      return showError(
        'Vui lòng submit quotation trước khi chuyển dự án sang "in coming"!'
      );
    }

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
    <>
      <ReusableTable
          columns={columns}
          data={projects}
          actionStatus={{
              type: 'fetch',
              loading: actionState.loading,
              error: actionState.error,
              message: actionState.message
          }}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          topToolbar={(
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-color)' }}>
                  Projects
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isAdmin && (
                    <Tooltip title={showDisabled ? "Ẩn các dự án đã disable" : "Hiện các dự án đã disable"}>
                      <Button
                        variant={showDisabled ? "contained" : "outlined"}
                        color="error"
                        size="small"
                        onClick={() => setShowDisabled(prev => !prev)}
                        sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                      >
                        {showDisabled ? "Đang hiển thị: Tất cả" : "Hiện dự án đã ẩn"}
                      </Button>
                    </Tooltip>
                  )}
                  <Button className="btn" onClick={() => setOpenModalAdd(true)}>
                    Add New Project
                  </Button>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <SearchDatePickerFromTo fromValue={searchFromDate} toValue={searchToDate} onSearchChange={handleDateChange} />
                <SearchTextBox
                  placeholder="Search project name, internal code,..."
                  onSearchChange={handleSearchChange}
                />
              </Box>
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

      {cloneTarget && (
        <ModalCloneProject
          project={cloneTarget}
          onClose={() => setCloneTarget(null)}
        />
      )}
    </>
  );
};

export default Projects;
