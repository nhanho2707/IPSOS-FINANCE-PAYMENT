import React, { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import ProjectSidebar from '../components/Sidebar/ProjectSidebar';
import MobileNavToggle, { isMobileViewport } from '../components/Sidebar/MobileNavToggle';
import ProjectHeader from '../components/ProjectHeader';
import { useProjectDetail } from '../hook/useProjectDetail';
import { ProjectOutletContext } from '../hook/useProjectContext';

const ProjectLayout: React.FC = () => {
  const { id } = useParams<{id: string}>();
  const projectId = Number(id) || 0;
  const [ isSidebarOpen, setIsSidebarOpen ] = useState(() => !isMobileViewport());
  const { project, actionState, fetchProject } = useProjectDetail(projectId);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const outletContext: ProjectOutletContext = {
    projectId,
    project,
    refreshProject: fetchProject,
  };

  return (
    <div className="wrapper">
      <MobileNavToggle open={isSidebarOpen} onOpen={toggleSidebar} />
      <ProjectSidebar
        projectId={projectId}
        project={project}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className="content">
        <div className="content-detail">
          <ProjectHeader
            projectId={projectId}
            project={project}
            loading={actionState.loading ?? false}
            error={actionState.error ?? false}
            onRetry={fetchProject}
          />
          <Outlet context={outletContext} />
        </div>
      </div>
    </div>
  );
};

export default ProjectLayout;
