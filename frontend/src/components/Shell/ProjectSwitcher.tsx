import React from "react";
import { Box, ButtonBase, Skeleton, Tooltip, Typography } from "@mui/material";
import { UnfoldMore } from "@mui/icons-material";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { getStatusTone, PROJECT_STATUS_TONE } from "../../config/ThemeConfig";
import { formatStatus } from "../../utils/format";
import { StatusDot } from "../StatusChip";

interface ProjectSwitcherProps {
    projectId: number;
    project: ProjectData | null;
    loading: boolean;
    collapsed: boolean;
    onClick: () => void;
}

const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({ projectId, project, loading, collapsed, onClick }) => {
    const name = project?.project_name || `Project #${projectId}`;
    const tone = getStatusTone(project?.status, PROJECT_STATUS_TONE);
    const meta = [project?.internal_code, project?.disabled ? "Disabled" : formatStatus(project?.status)]
        .filter(Boolean)
        .join(" · ");

    return (
        <Tooltip title={collapsed ? `${name} · Switch project` : ""} placement="right">
            <ButtonBase
                onClick={onClick}
                aria-label={`Current project: ${name}. Switch project`}
                sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: 1.25,
                    mb: 2,
                    p: collapsed ? 1 : 1.25,
                    textAlign: "left",
                    bgcolor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1.25,
                    "&:hover": { bgcolor: "action.hover" },
                }}
            >
                <StatusDot tone={project?.disabled ? "neutral" : tone} />
                {!collapsed && (
                    <>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {loading && !project ? (
                                <>
                                    <Skeleton variant="text" sx={{ typography: "body2" }} />
                                    <Skeleton variant="text" width="60%" sx={{ typography: "caption" }} />
                                </>
                            ) : (
                                <>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 600,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                            overflowWrap: "anywhere"
                                        }}>
                                        {name}
                                    </Typography>
                                    {meta && (
                                        <Typography variant="caption" component="div" noWrap sx={{ color: "text.secondary" }}>
                                            {meta}
                                        </Typography>
                                    )}
                                </>
                            )}
                        </Box>
                        <UnfoldMore sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                    </>
                )}
            </ButtonBase>
        </Tooltip>
    );
};

export default ProjectSwitcher;
