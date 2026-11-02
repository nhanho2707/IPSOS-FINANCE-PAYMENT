import { Box, Button, FormControlLabel, IconButton, LinearProgress, Link, Switch, Tooltip, Typography } from "@mui/material";
import ReusableTable from "../../components/Table/ReusableTable";
import { useProjects } from "../../hook/useProjects";
import { useMetadata } from "../../hook/useMetadata";
import { ColumnFormat } from "../../config/ColumnConfig";
import { ProjectCellConfig, ProjectData, ProvinceData } from "../../config/ProjectFieldsConfig";
import { hasRole, ROLE_ACCESS } from "../../config/RoleConfig";
import { getProjectHomePath } from "../../config/ProjectNavConfig";
import { StatusDropdown } from "../../components/Table/StatusDropdown";
import useDialog from "../../hook/useDialog";
import ConfirmDialog, { ConfirmDialogTone } from "../../components/Dialogs/ConfirmDialog";
import axios from "axios";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchDatePickerFromTo from "../../components/SearchDatePickerFromTo";
import SearchTextBox from "../../components/SearchTextBox";
import ModalAddProject from "../../components/Modals/Project/ModalAddProject";
import ModalCloneProject from "../../components/Modals/Project/ModalCloneProject";
import { Dayjs } from "dayjs";
import { useAuth } from "../../contexts/AuthContext";
import { formatStatus } from "../../utils/format";
import { NEUTRAL } from "../../config/ThemeConfig";

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canToggleDisabled = hasRole(user?.role, ROLE_ACCESS.projectToggleDisabled);
  const canClone = hasRole(user?.role, ROLE_ACCESS.projectClone);

  const { projects, actionState, page, rowsPerPage, total, setPage, setRowsPerPage, searchTerm, setSearchTerm, searchFromDate, setSearchFromDate, searchToDate, setSearchToDate, updateProjectStatus, updateDisabled, showDisabled, setShowDisabled } = useProjects();
  const { data } = useMetadata();
  const { openDialog, dialogProps } = useDialog();
  
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

  const actionIconSx = {
    backgroundColor: 'background.paper',
    borderRadius: '8px',
    border: '1px solid',
    borderColor: 'divider',
    '&:hover': {
      backgroundColor: 'action.hover',
    },
    padding: '5px',
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
      label: "ID",
      name: "id",
      type: "number",
      align: "left",
      width: 56,
      renderCell: (row: ProjectData) => (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          #{row.id}
        </Typography>
      )
    },
    ...ProjectCellConfig.map((col): ColumnFormat => col.name !== "project_name" ? col : {
      ...col,
      flex: 2,
      renderCell: (row: ProjectData) => (
        <Tooltip title={row.project_name} placement="top-start" enterDelay={600}>
          <Link
            component={RouterLink}
            to={getProjectHomePath(row.id ?? 0, user?.role)}
            underline="hover"
            sx={{ fontWeight: 500, color: 'text.primary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {row.project_name}
          </Link>
        </Tooltip>
      )
    }),
    {
      label: "Sample Size",
      name: "sample_size",
      type: "string",
      align: "left",
      width: 124,
      renderCell: (row: ProjectData) => {
        const completed = row.count_respondents ?? 0;
        const target = row.provinces?.reduce((sum: number, p: ProvinceData) => {
          return sum + (p.sample_size_main || 0) + (p.sample_size_booters || 0);
        }, 0) ?? 0;
        const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

        return (
          <Tooltip title={target > 0 ? `${percent}% of target` : "No sample size set"}>
            <Box>
              <Typography component="span" variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {completed} / {target}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={percent}
                aria-label="Sample progress"
                sx={{ mt: 0.5, height: 4, borderRadius: 2, backgroundColor: NEUTRAL[100] }}
              />
            </Box>
          </Tooltip>
        )
      }
    },
    {
      label: "Status",
      name: "status",
      type: "string",
      align: "left",
      width: 136,
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
    ...(canToggleDisabled ? [{
      label: "Active",
      name: "disabled",
      type: "boolean" as const,
      align: "left" as const,
      width: 72,
      renderCell: (row: ProjectData) => (
        <Tooltip title={row.disabled ? "Disabled — click to enable" : "Active — click to disable"}>
          <Switch
            checked={!row.disabled}
            onChange={() => handleUpdateDisabled(row, !row.disabled)}
            disabled={updatingId === row.id}
            size="small"
            inputProps={{ 'aria-label': row.disabled ? 'Enable project' : 'Disable project' }}
          />
        </Tooltip>
      )
    }]: []),
    {
      label: "",
      name: "action",
      type: "menu",
      align: "center",
      width: 96,
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
              <Tooltip title="Clone project">
                <IconButton
                  aria-label="Clone project"
                  onClick={() => setCloneTarget(row)}
                  sx={actionIconSx}
                >
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Open project">
              <IconButton
                aria-label="Open project"
                onClick={() =>
                  navigate(getProjectHomePath(row.id ?? 0, user?.role))
                }
                sx={actionIconSx}
              >
                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
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

  const showConfirm = (
    message: string,
    options: { title?: string; tone?: ConfirmDialogTone; confirmText?: string } = {}
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      openDialog({
        title: options.title ?? "Update Status",
        message: message,
        showConfirmButton: true,
        tone: options.tone,
        confirmText: options.confirmText,
        onConfirm: () => resolve(true),
        onClose: () => resolve(false)
      })
    });
  }

  const handleUpdateDisabled = async (project: ProjectData, disabled: boolean) => {
    const action = disabled ? 'disable' : 'enable';
    const confirmed = await showConfirm(
      `Are you sure you want to ${action} this project?`,
      {
        title: disabled ? "Disable Project" : "Enable Project",
        tone: disabled ? "danger" : "default",
        confirmText: disabled ? "Disable" : "Enable",
      }
    );

    if (!confirmed) return;
    if (!project.id) return;

    setUpdatingId(project.id);

    try {
      await updateDisabled(project.id, disabled);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showError(error.response?.status === 403
          ? "You do not have permission to perform this action."
          : "Something went wrong. Please try again."
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const handleUpdateStatus = async (project: ProjectData, status: string) => {
    if(status === STATUS.IN_COMING && !project.has_submitted_quotation){
      return showError(
        `Please submit the quotation before moving the project to "${formatStatus(STATUS.IN_COMING)}".`
      );
    }

    if(project.count_employees === 0 && status === STATUS.ON_GOING){
      return showError(
        `Please add interviewers before moving the project to "${formatStatus(STATUS.ON_GOING)}".`
      );
    }

    const confirmed = await showConfirm(
      `Are you sure you want to change the project status to "${formatStatus(status)}"?`
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
          showError("You do not have permission to change the status.");
        } else {
          showError("Something went wrong. Please try again.");
        }
      }
    } finally{
      setUpdatingId(null);
    }
  }
  
  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
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
                <Typography variant="h2">
                  Projects
                </Typography>
                <Button variant="contained" onClick={() => setOpenModalAdd(true)}>
                  Add New Project
                </Button>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <SearchDatePickerFromTo fromValue={searchFromDate} toValue={searchToDate} onSearchChange={handleDateChange} />
                  {canToggleDisabled && (
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={showDisabled}
                          onChange={(e) => setShowDisabled(e.target.checked)}
                        />
                      }
                      label="Show disabled projects"
                      sx={{ m: 0, gap: 0.5, '& .MuiFormControlLabel-label': { typography: 'body2', color: 'text.secondary' } }}
                    />
                  )}
                </Box>
                <SearchTextBox
                  placeholder="Search project name, internal code,..."
                  onSearchChange={handleSearchChange}
                />
              </Box>
            </Box>
          )}
      />


      <ConfirmDialog {...dialogProps} />

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
