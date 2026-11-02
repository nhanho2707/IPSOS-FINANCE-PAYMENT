import React from "react";
import { useLocation } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import { ProjectData } from "../config/ProjectFieldsConfig";
import { findProjectNavItem, getProjectHomePath } from "../config/ProjectNavConfig";
import { PROJECTS_PATH } from "../config/AppNavConfig";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "./PageHeader";

interface ProjectHeaderProps {
    projectId: number;
    project: ProjectData | null;
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    actionsRef: React.Ref<HTMLDivElement>;
}

// The project itself (name, code, status) is shown by the sidebar's project switcher;
// this header names the page and keeps the project in the breadcrumb for small screens.
const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectId, project, loading, error, onRetry, actionsRef }) => {
    const location = useLocation();
    const { user } = useAuth();
    const currentPage = findProjectNavItem(location.pathname);
    const projectName = project?.project_name || (loading ? "…" : `Project #${projectId}`);

    return (
        <>
            <PageHeader
                breadcrumbs={[
                    { label: "Projects", to: PROJECTS_PATH },
                    { label: projectName, to: currentPage ? getProjectHomePath(projectId, user?.role) : undefined },
                ]}
                title={currentPage ? currentPage.title ?? currentPage.label : projectName}
                description={currentPage?.description}
                actionsRef={actionsRef}
            />

            {error && !project && (
                <Alert
                    severity="error"
                    sx={{ mb: 2.5 }}
                    action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}
                >
                    Could not load project details.
                </Alert>
            )}

            {project?.disabled && (
                <Alert severity="info" sx={{ mb: 2.5 }}>
                    This project is disabled. It is hidden from the project list until an admin enables it again.
                </Alert>
            )}
        </>
    );
};

export default ProjectHeader;
