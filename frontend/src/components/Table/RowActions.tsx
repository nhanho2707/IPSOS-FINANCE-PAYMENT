import React, { useState } from "react";
import { Box, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { MoreHoriz } from "@mui/icons-material";

export interface RowActionItem {
    label: string;
    onClick: () => void;
    icon?: React.ElementType;
    tone?: "default" | "danger";
    disabled?: boolean;
    // Shown under a disabled item so the user knows why it cannot be used.
    disabledReason?: string;
    hidden?: boolean;
}

interface RowActionsProps {
    // One light action shown inline, e.g. a small outlined "Send gift" button.
    primary?: React.ReactNode;
    items?: RowActionItem[];
    menuLabel?: string;
}

// Rows can be clickable (ResourceTable onRowClick); clicks on the actions must not open the row too.
// React bubbles events through the portaled Menu as well, so one handler covers both.
const stopRowClick = (event: React.SyntheticEvent) => event.stopPropagation();

const RowActions: React.FC<RowActionsProps> = ({ primary, items = [], menuLabel = "More actions" }) => {
    const [ anchorEl, setAnchorEl ] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    const visible = items.filter((item) => !item.hidden);
    const regular = visible.filter((item) => item.tone !== "danger");
    const danger = visible.filter((item) => item.tone === "danger");

    const renderItem = (item: RowActionItem) => {
        const Icon = item.icon;
        const isDanger = item.tone === "danger";

        return (
            <MenuItem
                key={item.label}
                disabled={item.disabled}
                onClick={() => {
                    setAnchorEl(null);
                    item.onClick();
                }}
                sx={{ typography: "body2", color: isDanger ? "error.main" : "text.primary", alignItems: "flex-start" }}
            >
                {Icon && (
                    <ListItemIcon sx={{ color: "inherit", mt: 0.25 }}>
                        <Icon fontSize="small" />
                    </ListItemIcon>
                )}
                <ListItemText
                    primary={item.label}
                    secondary={item.disabled ? item.disabledReason : undefined}
                    sx={{ my: 0 }}
                    slotProps={{ primary: { variant: "body2" }, secondary: { variant: "caption" } }}
                />
            </MenuItem>
        );
    };

    const menuChildren = [
        ...regular.map(renderItem),
        ...(regular.length > 0 && danger.length > 0 ? [<Divider key="danger-divider" />] : []),
        ...danger.map(renderItem),
    ];

    return (
        <Box
            onClick={stopRowClick}
            sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5, width: "100%" }}
        >
            {primary}
            {visible.length > 0 && (
                <>
                    <Tooltip title={menuLabel}>
                        <IconButton
                            size="small"
                            aria-label={menuLabel}
                            aria-haspopup="menu"
                            aria-expanded={open ? "true" : undefined}
                            onClick={(event) => setAnchorEl(event.currentTarget)}
                            sx={{ color: "text.secondary" }}
                        >
                            <MoreHoriz fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={() => setAnchorEl(null)}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        slotProps={{ paper: { sx: { minWidth: 200 } } }}
                    >
                        {menuChildren}
                    </Menu>
                </>
            )}
        </Box>
    );
};

export default RowActions;
