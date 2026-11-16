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
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";

const PROJECT_TAB_STATUSES = ["on going", "in coming", "planned", "on hold", "completed", "cancelled"];

const Projects = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  const projectTabs = [
    { value: "all", label: t("projects.list.all") },
    ...PROJECT_TAB_STATUSES.map((status) => ({ value: status, label: formatStatus(status) })),
  ];

  const openProject = (project: ProjectData) => navigate(getProjectHomePath(project.id ?? 0, user?.role));

  const sampleTarget = (project: ProjectData) =>
    project.provinces?.reduce((sum: number, p: ProvinceData) => sum + (p.sample_size_main || 0) + (p.sample_size_booters || 0), 0) ?? 0;

  const columns: ColumnFormat[] = [
    {
      label: t("projects.list.columns.project"),
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
          {row.disabled && <StatusChip label={t("projects.list.disabled")} tone="neutral" />}
        </Box>
      )
    },
    {
      label: t("projects.list.columns.fieldPeriod"),
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
      label: t("projects.list.columns.sample"),
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
      label: t("projects.list.columns.status"),
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
      label: t("projects.list.columns.owner"),
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
          menuLabel={t("projects.list.actionsFor", { name: row.project_name })}
          items={[
            { label: t("projects.list.clone"), icon: ContentCopy, onClick: () => setCloneTarget(row), hidden: !canClone },
            {
              label: row.disabled ? t("projects.list.enable") : t("projects.list.disable"),
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
        title: options.title ?? t("projects.list.confirm.statusTitle"),
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
    const confirmed = await showConfirm(
      disabled ? t("projects.list.confirm.disableMessage") : t("projects.list.confirm.enableMessage"),
      {
        title: disabled ? t("projects.list.confirm.disableTitle") : t("projects.list.confirm.enableTitle"),
        tone: disabled ? "danger" : "default",
        confirmText: disabled ? t("projects.list.confirm.disable") : t("projects.list.confirm.enable"),
      }
    );

    if (!confirmed) return;
    if (!project.id) return;

    setUpdatingId(project.id);

    try {
      await updateDisabled(project.id, disabled);
      showToast(disabled ? t("projects.list.toast.disabled") : t("projects.list.toast.enabled"));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast(error.response?.status === 403
          ? t("projects.list.toast.noPermission")
          : t("projects.list.toast.genericError"),
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
        t("projects.list.toast.needQuotation", { status: formatStatus(STATUS.IN_COMING) }),
        "warning"
      );
    }

    if(project.count_employees === 0 && status === STATUS.ON_GOING){
      return showToast(
        t("projects.list.toast.needInterviewers", { status: formatStatus(STATUS.ON_GOING) }),
        "warning"
      );
    }

    const confirmed = await showConfirm(
      t("projects.list.confirm.statusMessage", { status: formatStatus(status) })
    )

    if(!confirmed) return;
    if(!project.id) return;

    setUpdatingId(project.id);

    try
    {
      await updateProjectStatus(project.id, status);
      showToast(t("projects.list.toast.statusChanged", { status: formatStatus(status) }));
    } catch(error){
      if(axios.isAxiosError(error)){
        const statusCode = error.response?.status;

        if(statusCode === 403){
          showToast(t("projects.list.toast.noStatusPermission"), "error");
        } else {
          showToast(t("projects.list.toast.genericError"), "error");
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
  // Vietnamese keeps the capital; status names there are not ordinary words in the sentence.
  const statusLabel = statusFilter !== "all" ? formatStatus(statusFilter) : "";

  const emptyState = !isFiltered && statusFilter !== "all" ? (
    <EmptyState title={t("projects.list.empty.statusTitle", { status: i18n.language === "vi" ? statusLabel : statusLabel.toLowerCase() })} description={t("projects.list.empty.statusDescription")} />
  ) : isFiltered ? (
    <EmptyState
      title={t("projects.list.empty.notFound")}
      description={[
        searchTerm && t("projects.list.empty.nothingMatches", { term: searchTerm }),
        fieldStartRange && (searchTerm
          ? t("projects.list.empty.withStart", { range: fieldStartRange })
          : t("projects.list.empty.noneStart", { range: fieldStartRange })),
      ].filter(Boolean).join(" ") + "."}
      action={fieldStartRange ? (
        <Button variant="outlined" color="inherit" onClick={() => handleDateChange(null, null)}>
          {t("projects.list.empty.allStartDates")}
        </Button>
      ) : undefined}
    />
  ) : (
    <EmptyState
      title={t("projects.list.empty.noneTitle")}
      description={t("projects.list.empty.noneDescription")}
      action={<Button variant="contained" startIcon={<Add />} onClick={() => setOpenModalAdd(true)}>{t("projects.list.newProject")}</Button>}
    />
  );

  return (
    <>
      <PageHeader
        title={t("projects.list.title")}
        description={t("projects.list.description")}
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenModalAdd(true)}>
            {t("projects.list.newProject")}
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
          tabs={projectTabs.map((tab) => ({
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
            placeholder: t("projects.list.searchPlaceholder"),
            defaultValue: searchTerm,
            onChange: handleSearchChange,
          }}
          filters={
            <>
              <DateRangeFilter
                label={t("projects.list.fieldStart")}
                from={searchFromDate}
                to={searchToDate}
                onChange={handleDateChange}
              />
              {canToggleDisabled && (
                <FilterChip
                  label={t("projects.list.includeDisabled")}
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
