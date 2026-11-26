import React, { useState } from "react";
import { Avatar, Box, ButtonBase, Divider, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { Check, Logout, UnfoldMore } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { changeLanguage, currentLanguage, LANGUAGES } from "../../i18n/i18n";
import { useAuth } from "../../contexts/AuthContext";
import { BRAND } from "../../config/ThemeConfig";

const UserMenu: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
    const { user, logout } = useAuth();
    const { t } = useTranslation();
    const language = currentLanguage();
    const [ anchorEl, setAnchorEl ] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || t("nav.shell.signedIn");
    const initials = `${user?.first_name?.charAt(0) ?? ""}${user?.last_name?.charAt(0) ?? ""}`.toUpperCase() || "?";

    const avatar = (
        <Avatar
            sx={{
                width: 28,
                height: 28,
                bgcolor: BRAND.soft,
                color: BRAND.dark,
                typography: "caption",
                fontWeight: 600,
            }}
        >
            {initials}
        </Avatar>
    );

    return (
        <>
            <Tooltip title={collapsed ? name : ""} placement="right">
                <ButtonBase
                    onClick={(event) => setAnchorEl(event.currentTarget)}
                    aria-label={t("nav.shell.accountMenu", { name })}
                    aria-haspopup="menu"
                    aria-expanded={open ? "true" : undefined}
                    aria-controls={open ? "user-menu" : undefined}
                    sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : "flex-start",
                        gap: 1.25,
                        p: 0.75,
                        borderRadius: 1,
                        textAlign: "left",
                        "&:hover": { bgcolor: "action.hover" },
                    }}
                >
                    {avatar}
                    {!collapsed && (
                        <>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{name}</Typography>
                                <Typography variant="caption" component="div" noWrap sx={{ color: "text.secondary" }}>
                                    {user?.role}
                                </Typography>
                            </Box>
                            <UnfoldMore sx={{ fontSize: 16, color: "text.secondary" }} />
                        </>
                    )}
                </ButtonBase>
            </Tooltip>

            <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "top", horizontal: collapsed ? "right" : "left" }}
                transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                slotProps={{ paper: { sx: { minWidth: 220, mt: -0.5 } } }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{name}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{user?.role}</Typography>
                </Box>
                <Divider />
                <ListSubheader disableSticky sx={{ typography: "overline", lineHeight: 2.5, bgcolor: "transparent" }}>
                    {t("common.language.label")}
                </ListSubheader>
                {LANGUAGES.map((code) => (
                    <MenuItem
                        key={code}
                        lang={code}
                        selected={code === language}
                        onClick={() => {
                            setAnchorEl(null);
                            changeLanguage(code);
                        }}
                        sx={{ typography: "body2" }}
                    >
                        <ListItemText slotProps={{ primary: { variant: "body2" } }}>{t(`common.language.${code}`)}</ListItemText>
                        {code === language && <Check fontSize="small" sx={{ ml: 2, color: "primary.main" }} />}
                    </MenuItem>
                ))}
                <Divider />
                <MenuItem
                    onClick={() => {
                        setAnchorEl(null);
                        logout();
                    }}
                    sx={{ typography: "body2" }}
                >
                    <ListItemIcon>
                        <Logout fontSize="small" />
                    </ListItemIcon>
                    {t("nav.shell.logout")}
                </MenuItem>
            </Menu>
        </>
    );
};

export default UserMenu;
