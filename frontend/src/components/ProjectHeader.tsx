import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { Alert, Box, Breadcrumbs, Button, Chip, Link, Skeleton, Typography } from "@mui/material";
import { NavigateNext } from "@mui/icons-material";
import { ProjectData } from "../config/ProjectFieldsConfig";
import { findProjectNavItem, projectNavPath } from "../config/ProjectNavConfig";
import { getStatusTone, PROJECT_STATUS_TONE } from "../config/ThemeConfig";
import { toProperCase } from "../utils/format";
import StatusChip from "./StatusChip";

interface ProjectHeaderProps {
    projectId: number;
    project: ProjectData | null;
    loading: boolean;
    error: boolean;
    onRetry: () => void;
}

const MetaItem: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
    if (!value) return null;

    return (
        <Typography component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
            {label}:{" "}
            <Box component="span" sx={{ color: "text.primary", fontWeight: 500 }}>
                {value}
            </Box>
        </Typography>
    );
};

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectId, project, loading, error, onRetry }) => {
    const location = useLocation();
    const currentPage = findProjectNavItem(location.pathname);
    const projectName = project?.project_name || `Project #${projectId}`;

    const fieldPeriod = project?.planned_field_start && project?.planned_field_end
        ? `${project.planned_field_start} → ${project.planned_field_end}`
        : null;

    return (
        <Box component="header" sx={{ mb: 2.5, pb: 2, borderBottom: 1, borderColor: "divider" }}>
            <Breadcrumbs
                separator={<NavigateNext sx={{ fontSize: "1rem" }} />}
                aria-label="breadcrumb"
                sx={{ fontSize: "0.8125rem", "& .MuiBreadcrumbs-li": { minWidth: 0 } }}
            >
                <Link component={RouterLink} to="/project-management/projects" underline="hover" color="text.secondary">
                    Projects
                </Link>
                {currentPage ? (
                    <Link
                        component={RouterLink}
                        to={projectNavPath(projectId, "quotation")}
                        underline="hover"
                        color="text.secondary"
                        sx={{ display: "block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                        {loading && !project ? "…" : projectName}
                    </Link>
                ) : (
                    <Typography sx={{ fontSize: "inherit", color: "text.primary" }}>{projectName}</Typography>
                )}
                {currentPage && (
                    <Typography sx={{ fontSize: "inherit", color: "text.primary", fontWeight: 500 }} aria-current="page">
                        {currentPage.label}
                    </Typography>
                )}
            </Breadcrumbs>

            {error && !project ? (
                <Alert
                    severity="error"
                    sx={{ mt: 1.5, fontSize: "0.875rem" }}
                    action={<Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}
                >
                    Không tải được thông tin dự án.
                </Alert>
            ) : loading && !project ? (
                <Box sx={{ mt: 1 }}>
                    <Skeleton variant="text" width={280} sx={{ fontSize: "1.25rem" }} />
                    <Skeleton variant="text" width={420} sx={{ fontSize: "0.8125rem" }} />
                </Box>
            ) : (
                <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap", mt: 1 }}>
                        <Typography component="h1" sx={{ fontSize: "1.25rem", fontWeight: 600, color: "text.primary", lineHeight: 1.3 }}>
                            {projectName}
                        </Typography>
                        {project?.status && (
                            <StatusChip
                                label={toProperCase(project.status)}
                                tone={getStatusTone(project.status, PROJECT_STATUS_TONE)}
                            />
                        )}
                        {project?.disabled && (
                            <Chip size="small" label="Disabled" color="error" variant="outlined" sx={{ height: 24, fontSize: "0.75rem" }} />
                        )}
                    </Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2.5, rowGap: 0.5, mt: 0.75 }}>
                        <MetaItem label="Internal code" value={project?.internal_code} />
                        <MetaItem label="Symphony" value={project?.symphony} />
                        <MetaItem label="Field" value={fieldPeriod} />
                        <MetaItem label="Platform" value={project?.platform} />
                    </Box>
                </>
            )}
        </Box>
    );
};

export default ProjectHeader;
