import React from "react";
import { Link as RouterLink, NavLink } from "react-router-dom";
import { Box, Divider, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { NEUTRAL } from "../../config/ThemeConfig";

export interface SidebarNavItem {
    key: string;
    label: string;
    to: string;
    icon: React.ElementType;
    end?: boolean;
}

export interface SidebarNavGroup {
    key: string;
    label?: string;
    items: SidebarNavItem[];
}

const navItemSx = (collapsed: boolean) => ({
    minHeight: 32,
    mb: 0.25,
    px: collapsed ? 0 : 1.25,
    gap: 1.25,
    justifyContent: collapsed ? "center" : "flex-start",
    borderRadius: 1,
    color: NEUTRAL[600],
    fontWeight: 500,
    "& .MuiListItemIcon-root": { minWidth: 0, color: NEUTRAL[500] },
    "&:hover": { bgcolor: "action.hover" },
    "&.active": {
        bgcolor: NEUTRAL[100],
        color: "text.primary",
        fontWeight: 600,
        "& .MuiListItemIcon-root": { color: "primary.main" },
    },
});

const NavLabel: React.FC<{ label: string; collapsed: boolean }> = ({ label, collapsed }) =>
    collapsed ? null : (
        <ListItemText
            primary={label}
            sx={{ my: 0 }}
            slotProps={{ primary: { variant: "body2", noWrap: true, sx: { fontWeight: "inherit" } } }}
        />
    );

// Collapsed, the label only lives in the tooltip, which MUI also sets as the link's aria-label.
const CollapsedTooltip: React.FC<{ label: string; collapsed: boolean; children: React.ReactElement }> = ({ label, collapsed, children }) => (
    <Tooltip
        title={label}
        placement="right"
        disableHoverListener={!collapsed}
        disableFocusListener={!collapsed}
        disableTouchListener
    >
        {children}
    </Tooltip>
);

export const SidebarNavLink: React.FC<{ item: SidebarNavItem; collapsed: boolean }> = ({ item, collapsed }) => {
    const Icon = item.icon;

    return (
        <CollapsedTooltip label={item.label} collapsed={collapsed}>
            <ListItemButton component={NavLink} to={item.to} end={item.end} sx={navItemSx(collapsed)}>
                <ListItemIcon>
                    <Icon sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <NavLabel label={item.label} collapsed={collapsed} />
            </ListItemButton>
        </CollapsedTooltip>
    );
};

export const SidebarBackLink: React.FC<{ to: string; label: string; collapsed: boolean }> = ({ to, label, collapsed }) => (
    <CollapsedTooltip label={label} collapsed={collapsed}>
        <ListItemButton
            component={RouterLink}
            to={to}
            // ListItemButton grows by default; as a direct child of the sidebar's flex column it would take all free height.
            sx={{ ...navItemSx(collapsed), flexGrow: 0, mb: 1, color: "text.secondary", fontWeight: 400 }}
        >
            <ListItemIcon>
                <ArrowBack sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <NavLabel label={label} collapsed={collapsed} />
        </ListItemButton>
    </CollapsedTooltip>
);

interface SidebarNavProps {
    groups: SidebarNavGroup[];
    collapsed: boolean;
    ariaLabel: string;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ groups, collapsed, ariaLabel }) => (
    <Box component="nav" aria-label={ariaLabel}>
        {groups.map((group, index) => (
            <Box key={group.key} sx={{ mt: index === 0 ? 0 : 1.5 }}>
                {group.label && !collapsed && (
                    <Typography
                        variant="overline"
                        component="div"
                        sx={{ display: "block", px: 1.25, pb: 0.5, color: NEUTRAL[500] }}
                    >
                        {group.label}
                    </Typography>
                )}
                {collapsed && index > 0 && <Divider sx={{ mx: 1, mb: 1.5 }} />}
                <List disablePadding>
                    {group.items.map((item) => (
                        <SidebarNavLink key={item.key} item={item} collapsed={collapsed} />
                    ))}
                </List>
            </Box>
        ))}
    </Box>
);

export default SidebarNav;
