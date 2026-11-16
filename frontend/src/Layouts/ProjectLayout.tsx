import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import AppShell from '../components/Shell/AppShell';
import ProjectSwitcher from '../components/Shell/ProjectSwitcher';
import SidebarNav, { SidebarBackLink, SidebarNavGroup, SidebarNavItem } from '../components/Shell/SidebarNav';
import ProjectHeader from '../components/ProjectHeader';
import { PROJECTS_PATH } from '../config/AppNavConfig';
import { getProjectNavItemsForRole, PROJECT_NAV_GROUPS, ProjectNavItem, projectNavPath } from '../config/ProjectNavConfig';
import { useAuth } from '../contexts/AuthContext';
import { useProjectDetail } from '../hook/useProjectDetail';
import { ProjectOutletContext } from '../hook/useProjectContext';
import { useTranslation } from 'react-i18next';
import { tKey } from '../i18n/i18n';

const ProjectLayout: React.FC = () => {
  const { id } = useParams<{id: string}>();
  const projectId = Number(id) || 0;
  const { user } = useAuth();
  const { t } = useTranslation();
  const { project, actionState, fetchProject } = useProjectDetail(projectId);
  const [ headerActionsEl, setHeaderActionsEl ] = useState<HTMLDivElement | null>(null);

  const visibleItems = getProjectNavItemsForRole(user?.role).filter(
    (item) => !item.showIf || item.showIf(project)
  );

  const toSidebarItem = (item: ProjectNavItem): SidebarNavItem => ({
    key: item.path,
    label: tKey(item.label),
    to: projectNavPath(projectId, item.path),
    icon: item.icon,
  });

  const groups: SidebarNavGroup[] = PROJECT_NAV_GROUPS
    .map((group) => ({
      key: group.key,
      label: group.label ? tKey(group.label) : undefined,
      items: visibleItems.filter((item) => item.group === group.key).map(toSidebarItem),
    }))
    .filter((group) => group.items.length > 0);

  const bottomItems = visibleItems.filter((item) => item.group === "bottom").map(toSidebarItem);

  const outletContext: ProjectOutletContext = {
    projectId,
    project,
    refreshProject: fetchProject,
    headerActionsEl,
  };

  return (
    <AppShell
      mobileTitle={
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {project?.project_name ?? t("nav.shell.projectFallback")}
        </Typography>
      }
      sidebar={({ collapsed, openPalette }) => (
        <>
          <SidebarBackLink to={PROJECTS_PATH} label={t("nav.shell.allProjects")} collapsed={collapsed} />
          <ProjectSwitcher
            projectId={projectId}
            project={project}
            loading={actionState.loading ?? false}
            collapsed={collapsed}
            onClick={() => openPalette("switch-project")}
          />
          <SidebarNav ariaLabel={t("nav.shell.projectNav")} groups={groups} collapsed={collapsed} />
          {bottomItems.length > 0 && (
            <Box sx={{ mt: "auto", pt: 2 }}>
              <SidebarNav ariaLabel={t("nav.shell.projectSettingsNav")} groups={[{ key: "bottom", items: bottomItems }]} collapsed={collapsed} />
            </Box>
          )}
        </>
      )}
    >
      <ProjectHeader
        projectId={projectId}
        project={project}
        loading={actionState.loading ?? false}
        error={actionState.error ?? false}
        onRetry={fetchProject}
        actionsRef={setHeaderActionsEl}
      />
      <Outlet context={outletContext} />
    </AppShell>
  );
};

export default ProjectLayout;
