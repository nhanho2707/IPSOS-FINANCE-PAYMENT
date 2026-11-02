import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Breadcrumbs, Link, Typography } from "@mui/material";
import { NavigateNext } from "@mui/icons-material";

export interface Crumb {
    label: string;
    to?: string;
}

interface PageHeaderProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    breadcrumbs?: Crumb[];
    status?: React.ReactNode;
    // At most one variant="contained" button; other actions are outlined, text, or in a ⋯ menu.
    actions?: React.ReactNode;
    // Lets a layout own the header while the routed page portals its own actions into it.
    actionsRef?: React.Ref<HTMLDivElement>;
}

const crumbSx = {
    display: "block",
    maxWidth: 320,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
};

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, breadcrumbs, status, actions, actionsRef }) => (
    <Box component="header" sx={{ mb: 3 }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs
                aria-label="Breadcrumb"
                separator={<NavigateNext sx={{ fontSize: 14 }} />}
                sx={{ mb: 0.75, typography: "caption", "& .MuiBreadcrumbs-li": { minWidth: 0 } }}
            >
                {breadcrumbs.map((crumb, index) =>
                    crumb.to ? (
                        <Link
                            key={index}
                            component={RouterLink}
                            to={crumb.to}
                            underline="hover"
                            sx={{ ...crumbSx, color: "text.secondary" }}>
                            {crumb.label}
                        </Link>
                    ) : (
                        <Typography key={index} variant="caption" sx={{ ...crumbSx, color: "text.secondary" }}>
                            {crumb.label}
                        </Typography>
                    )
                )}
            </Breadcrumbs>
        )}

        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1.25, rowGap: 0.5 }}>
                    <Typography component="h1" variant="h1" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        {title}
                    </Typography>
                    {status}
                </Box>
                {description && (
                    <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                        {description}
                    </Typography>
                )}
            </Box>

            <Box
                ref={actionsRef}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                    flexShrink: 0,
                    "&:empty": { display: "none" },
                }}
            >
                {actions}
            </Box>
        </Box>
    </Box>
);

export default PageHeader;
