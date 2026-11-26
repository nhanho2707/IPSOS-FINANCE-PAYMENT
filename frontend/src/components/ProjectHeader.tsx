import React from "react";
import { useLocation } from "react-router-dom";
import { Alert, Button } from "@mui/material";
import { ProjectData } from "../config/ProjectFieldsConfig";
import { findProjectNavItem, getProjectHomePath } from "../config/ProjectNavConfig";
import { PROJECTS_PATH } from "../config/AppNavConfig";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "./PageHeader";
import { useTranslation } from "react-i18next";
import { tKey } from "../i18n/i18n";

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
    const { t } = useTranslation();
    const currentPage = findProjectNavItem(location.pathname);
    const projectName = project?.project_name || (loading ? "…" : t("nav.shell.projectNumber", { id: projectId }));

    return (
        <>
            <PageHeader
                breadcrumbs={[
                    { label: t("nav.pages.projects"), to: PROJECTS_PATH },
                    { label: projectName, to: currentPage ? getProjectHomePath(projectId, user?.role) : undefined },
                ]}
                title={currentPage ? tKey(currentPage.title ?? currentPage.label) : projectName}
                description={currentPage ? tKey(currentPage.description) : undefined}
                actionsRef={actionsRef}
            />

            {error && !project && (
                <Alert
                    severity="error"
                    sx={{ mb: 2.5 }}
                    action={<Button color="inherit" size="small" onClick={onRetry}>{t("common.actions.retry")}</Button>}
                >
                    {t("nav.shell.loadProjectFailed")}
                </Alert>
            )}

            {project?.disabled ? (
                <Alert severity="info" sx={{ mb: 2.5 }}>
                    {t("nav.shell.projectDisabled")}
                </Alert>
            ) : null}
        </>
    );
};

export default ProjectHeader;
