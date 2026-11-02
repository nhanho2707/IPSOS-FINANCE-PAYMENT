import { Box, Button, LinearProgress, Link, Tooltip, Typography } from "@mui/material";
import { Add, Block, CheckCircleOutline, ContentCopy } from "@mui/icons-material";
import ResourceTable from "../../components/Table/ResourceTable";
import RowActions from "../../components/Table/RowActions";
import { DateRangeFilter } from "../../components/Table/FilterChip";
import FilterChip from "../../components/Table/FilterChip";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import StatusChip from "../../components/StatusChip";
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
import ModalAddProject from "../../components/Modals/Project/ModalAddProject";
import ModalCloneProject from "../../components/Modals/Project/ModalCloneProject";
import { Dayjs } from "dayjs";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { formatDateRange, formatStatus } from "../../utils/format";
import { NEUTRAL } from "../../config/ThemeConfig";

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
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

  const STATUS = {
    PLANNED: 'planned',
    IN_COMING: 'in coming',
    ON_GOING: 'on going',
    COMPLETED: 'completed',
    ON_HOLD: 'on hold',
    CANCELLED: 'cancelled'
  }

  const openProject = (project: ProjectData) => navigate(getProjectHomePath(project.id ?? 0, user?.role));

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Tooltip title={row.project_name} placement="top-start" enterDelay={600}>
            <Link
              component={RouterLink}
              to={getProjectHomePath(row.id ?? 0, user?.role)}
              underline="hover"
              sx={{ fontWeight: 500, color: row.disabled ? 'text.secondary' : 'text.primary', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {row.project_name}
            </Link>
          </Tooltip>
          {row.disabled && <StatusChip label="Disabled" tone="neutral" />}
        </Box>
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
    ...(canClone || canToggleDisabled ? [{
      label: "",
      name: "action",
      type: "menu" as const,
      align: "right" as const,
      width: 56,
      renderCell: (row: ProjectData) => (
        <RowActions
          menuLabel={`Actions for ${row.project_name}`}
          items={[
            { label: "Clone project", icon: ContentCopy, onClick: () => setCloneTarget(row), hidden: !canClone },
            {
              label: row.disabled ? "Enable project" : "Disable project",
              icon: row.disabled ? CheckCircleOutline : Block,
              tone: row.disabled ? "default" : "danger",
              onClick: () => handleUpdateDisabled(row, !row.disabled),
              disabled: updatingId === row.id,
              hidden: !canToggleDisabled,
            },
          ]}
        />
      )
    }] : [])
  ];

  const [openModalAdd, setOpenModalAdd] = useState<boolean>(false);

  const handleCloseModal = () => {
    setOpenModalAdd(false);
  };

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
      showToast(disabled ? "Project disabled." : "Project enabled.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast(error.response?.status === 403
          ? "You do not have permission to perform this action."
          : "Something went wrong. Please try again.",
          "error"
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  const handleUpdateStatus = async (project: ProjectData, status: string) => {
    if(status === STATUS.IN_COMING && !project.has_submitted_quotation){
      return showToast(
        `Submit the quotation before moving the project to "${formatStatus(STATUS.IN_COMING)}".`,
        "warning"
      );
    }

    if(project.count_employees === 0 && status === STATUS.ON_GOING){
      return showToast(
        `Add interviewers before moving the project to "${formatStatus(STATUS.ON_GOING)}".`,
        "warning"
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
      showToast(`Status changed to "${formatStatus(status)}".`);
    } catch(error){
      if(axios.isAxiosError(error)){
        const statusCode = error.response?.status;

        if(statusCode === 403){
          showToast("You do not have permission to change the status.", "error");
        } else {
          showToast("Something went wrong. Please try again.", "error");
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
    setPage(0);
  }

  const handleDateChange = (from: Dayjs | null, to: Dayjs | null) => {
    setSearchFromDate(from);
    setSearchToDate(to);
    setPage(0);
  };

  const fieldStartRange = formatDateRange(searchFromDate, searchToDate);
  const isFiltered = Boolean(searchTerm || fieldStartRange);

  const emptyState = isFiltered ? (
    <EmptyState
      title="No projects found"
      description={[
        searchTerm && `Nothing matches “${searchTerm}”`,
        fieldStartRange && `${searchTerm ? "with" : "No project has"} fieldwork starting ${fieldStartRange}`,
      ].filter(Boolean).join(" ") + "."}
      action={fieldStartRange ? (
        <Button variant="outlined" color="inherit" onClick={() => handleDateChange(null, null)}>
          Search all start dates
        </Button>
      ) : undefined}
    />
  ) : (
    <EmptyState
      title="No projects yet"
      description="Create a project to start planning its quotation and fieldwork."
      action={<Button variant="contained" startIcon={<Add />} onClick={() => setOpenModalAdd(true)}>New project</Button>}
    />
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="Research projects you have access to. Projects in field are listed first."
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenModalAdd(true)}>
            New project
          </Button>
        }
      />

      <ResourceTable
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
          onRowClick={openProject}
          stickyColumns={{ last: canClone || canToggleDisabled }}
          search={{
            placeholder: "Search name, code or Symphony",
            defaultValue: searchTerm,
            onChange: handleSearchChange,
          }}
          filters={
            <>
              <DateRangeFilter
                label="Field start"
                from={searchFromDate}
                to={searchToDate}
                onChange={handleDateChange}
              />
              {canToggleDisabled && (
                <FilterChip
                  label="Include disabled"
                  active={showDisabled}
                  onClick={() => {
                    setShowDisabled(!showDisabled);
                    setPage(0);
                  }}
                />
              )}
            </>
          }
          emptyState={emptyState}
      />

      <ConfirmDialog {...dialogProps} />

      {/* Mounted only while open: the modal's own useProjects() would otherwise fetch the list a second time. */}
      {openModalAdd && (
        <ModalAddProject
          openModal={openModalAdd}
          onClose={handleCloseModal}
          metadata={data}
        />
      )}

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
