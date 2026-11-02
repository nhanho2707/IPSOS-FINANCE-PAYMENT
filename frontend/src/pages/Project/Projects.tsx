import { Box, Button, Link } from "@mui/material";
import { Add, Block, CheckCircleOutlineOutlined, ContentCopy } from "@mui/icons-material";
import ResourceTable from "../../components/Table/ResourceTable";
import CellStack from "../../components/Table/CellStack";
import SampleProgress from "../../components/SampleProgress";
import UserAvatar from "../../components/UserAvatar";
import RowActions from "../../components/Table/RowActions";
import { DateRangeFilter } from "../../components/Table/FilterChip";
import FilterChip from "../../components/Table/FilterChip";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import StatusChip from "../../components/StatusChip";
import { useProjects } from "../../hook/useProjects";
import { useMetadata } from "../../hook/useMetadata";
import { ColumnFormat } from "../../config/ColumnConfig";
import { ProjectData, ProvinceData } from "../../config/ProjectFieldsConfig";
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
import { formatDateRange, formatFieldTiming, formatStatus } from "../../utils/format";

const PROJECT_TABS = [
  { value: "all", label: "All" },
  ...["on going", "in coming", "planned", "on hold", "completed", "cancelled"].map((status) => ({
    value: status,
    label: formatStatus(status),
  })),
];

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canToggleDisabled = hasRole(user?.role, ROLE_ACCESS.projectToggleDisabled);
  const canClone = hasRole(user?.role, ROLE_ACCESS.projectClone);

  const { projects, actionState, page, rowsPerPage, total, setPage, setRowsPerPage, searchTerm, setSearchTerm, searchFromDate, setSearchFromDate, searchToDate, setSearchToDate, updateProjectStatus, updateDisabled, showDisabled, setShowDisabled, statusFilter, setStatusFilter, statusCounts } = useProjects();
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

  const sampleTarget = (project: ProjectData) =>
    project.provinces?.reduce((sum: number, p: ProvinceData) => sum + (p.sample_size_main || 0) + (p.sample_size_booters || 0), 0) ?? 0;

  const columns: ColumnFormat[] = [
    {
      label: "Project",
      name: "project_name",
      type: "string",
      flex: 2.4,
      renderCell: (row: ProjectData) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <CellStack
            primary={
              <Link
                component={RouterLink}
                to={getProjectHomePath(row.id ?? 0, user?.role)}
                underline="hover"
                color={row.disabled ? 'text.secondary' : 'inherit'}
              >
                {row.project_name}
              </Link>
            }
            secondary={[row.internal_code, row.symphony].filter(Boolean).join(' · ')}
            title={row.project_name}
          />
          {row.disabled && <StatusChip label="Disabled" tone="neutral" />}
        </Box>
      )
    },
    {
      label: "Field period",
      name: "planned_field_start",
      type: "date",
      width: 208,
      renderCell: (row: ProjectData) => (
        <CellStack
          primary={formatDateRange(row.planned_field_start, row.planned_field_end) ?? "—"}
          secondary={formatFieldTiming(row.planned_field_start, row.planned_field_end, row.status) ?? undefined}
          numeric
        />
      )
    },
    {
      label: "Sample",
      name: "sample_size",
      type: "string",
      width: 176,
      renderCell: (row: ProjectData) => (
        <SampleProgress
          completed={row.count_respondents ?? 0}
          target={sampleTarget(row)}
          fieldStart={row.planned_field_start}
          fieldEnd={row.planned_field_end}
          status={row.status}
        />
      )
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
    {
      label: "Owner",
      name: "created_user_id",
      type: "string",
      align: "center",
      width: 72,
      renderCell: (row: ProjectData) => row.created_user_id?.name ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <UserAvatar name={row.created_user_id.name} />
        </Box>
      ) : "—"
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
              icon: row.disabled ? CheckCircleOutlineOutlined : Block,
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
  const statusLabel = statusFilter !== "all" ? formatStatus(statusFilter).toLowerCase() : "";

  const emptyState = !isFiltered && statusFilter !== "all" ? (
    <EmptyState title={`No ${statusLabel} projects`} description="Projects move between the tabs when their status changes." />
  ) : isFiltered ? (
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
          tabs={PROJECT_TABS.map((tab) => ({
            value: tab.value,
            label: tab.label,
            count: !statusCounts
              ? undefined
              : tab.value === "all"
                ? Object.values(statusCounts).reduce((sum, count) => sum + count, 0)
                : statusCounts[tab.value] ?? 0,
          }))}
          tab={statusFilter}
          onTabChange={(value) => {
            setStatusFilter(value);
            setPage(0);
          }}
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
