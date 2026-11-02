import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, ButtonBase, Drawer, IconButton, Tooltip, Typography, useMediaQuery } from "@mui/material";
import { Close, KeyboardDoubleArrowLeft, KeyboardDoubleArrowRight, Menu, Search } from "@mui/icons-material";
import logo from "../../assets/img/Ipsos logo.png";
import CommandPalette, { CommandPaletteMode } from "./CommandPalette";
import Kbd, { SEARCH_SHORTCUT_LABEL } from "./Kbd";
import UserMenu from "./UserMenu";

const SIDEBAR_WIDTH = 248;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const MOBILE_DRAWER_WIDTH = 280;
// Below 768px the sidebar becomes a temporary drawer opened from the top bar.
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const COLLAPSED_STORAGE_KEY = "ipsos.sidebar.collapsed";

const readCollapsed = (): boolean => {
    try {
        return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
};

const writeCollapsed = (collapsed: boolean) => {
    try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
        // Storage can be blocked; the sidebar then simply opens expanded next time.
    }
};

export interface AppShellSidebarState {
    collapsed: boolean;
    openPalette: (mode?: CommandPaletteMode) => void;
}

interface AppShellProps {
    sidebar: (state: AppShellSidebarState) => React.ReactNode;
    mobileTitle?: React.ReactNode;
    children: React.ReactNode;
}

// The logo file has wide white margins; the mark is cropped to its square.
export const BrandMark: React.FC<{ showName?: boolean; inverse?: boolean }> = ({ showName = true, inverse = false }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: 1, overflow: "hidden", flexShrink: 0, position: "relative" }}>
            <Box
                component="img"
                src={logo}
                alt="Ipsos"
                sx={{ position: "absolute", height: 44, left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
            />
        </Box>
        {showName && (
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: inverse ? "common.white" : "text.primary" }}>
                    Finance Payment
                </Typography>
                <Typography variant="caption" component="div" noWrap sx={{ color: inverse ? "common.white" : "text.secondary", opacity: inverse ? 0.8 : 1 }}>
                    Ipsos Vietnam
                </Typography>
            </Box>
        )}
    </Box>
);

export const SidebarSearchButton: React.FC<{ collapsed: boolean; onClick: () => void }> = ({ collapsed, onClick }) =>
    collapsed ? (
        <Tooltip title={`Search (${SEARCH_SHORTCUT_LABEL})`} placement="right">
            <IconButton aria-label="Search" onClick={onClick} sx={{ alignSelf: "center", mb: 1.5, color: "text.secondary" }}>
                <Search sx={{ fontSize: 18 }} />
            </IconButton>
        </Tooltip>
    ) : (
        <ButtonBase
            onClick={onClick}
            sx={{
                width: "100%",
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 1,
                px: 1.25,
                mb: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "background.default",
                color: "text.secondary",
                typography: "body2",
                "&:hover": { borderColor: "text.disabled" },
            }}
        >
            <Search sx={{ fontSize: 18 }} />
            Search projects…
            <Kbd sx={{ ml: "auto" }}>{SEARCH_SHORTCUT_LABEL}</Kbd>
        </ButtonBase>
    );

const AppShell: React.FC<AppShellProps> = ({ sidebar, mobileTitle, children }) => {
    const location = useLocation();
    const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY, { noSsr: true });
    const [ collapsed, setCollapsed ] = useState<boolean>(readCollapsed);
    const [ mobileOpen, setMobileOpen ] = useState(false);
    const [ palette, setPalette ] = useState<{ open: boolean; mode: CommandPaletteMode }>({ open: false, mode: "search" });

    const openPalette = useCallback((mode: CommandPaletteMode = "search") => {
        setMobileOpen(false);
        setPalette({ open: true, mode });
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                openPalette("search");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [openPalette]);

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        writeCollapsed(next);
    };

    const renderSidebar = (isCollapsed: boolean) => (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isCollapsed ? "center" : "space-between",
                    gap: 1,
                    height: 60,
                    px: isCollapsed ? 0 : 2,
                    flexShrink: 0,
                }}
            >
                {!isCollapsed && <BrandMark />}
                {isMobile ? (
                    <IconButton aria-label="Close navigation" size="small" onClick={() => setMobileOpen(false)} sx={{ color: "text.secondary" }}>
                        <Close fontSize="small" />
                    </IconButton>
                ) : (
                    <Tooltip title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
                        <IconButton
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            size="small"
                            onClick={toggleCollapsed}
                            sx={{ color: "text.secondary" }}
                        >
                            {isCollapsed ? <KeyboardDoubleArrowRight fontSize="small" /> : <KeyboardDoubleArrowLeft fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    overflowX: "hidden",
                    px: isCollapsed ? 1 : 1.5,
                    pt: 0.5,
                    pb: 1.5,
                }}
            >
                {sidebar({ collapsed: isCollapsed, openPalette })}
            </Box>

            <Box sx={{ px: isCollapsed ? 1 : 1.5, py: 1, borderTop: 1, borderColor: "divider", flexShrink: 0 }}>
                <UserMenu collapsed={isCollapsed} />
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
            {isMobile ? (
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    slotProps={{ paper: { sx: { width: MOBILE_DRAWER_WIDTH, maxWidth: "85vw" } } }}
                >
                    {renderSidebar(false)}
                </Drawer>
            ) : (
                <Box
                    component="aside"
                    sx={{
                        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
                        flexShrink: 0,
                        position: "sticky",
                        top: 0,
                        height: "100vh",
                        bgcolor: "background.paper",
                        borderRight: 1,
                        borderColor: "divider",
                        transition: (theme) => theme.transitions.create("width", { duration: theme.transitions.duration.shorter }),
                    }}
                >
                    {renderSidebar(collapsed)}
                </Box>
            )}

            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                {isMobile && (
                    <Box
                        component="header"
                        sx={{
                            position: "sticky",
                            top: 0,
                            zIndex: (theme) => theme.zIndex.appBar,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            height: 56,
                            px: 1,
                            bgcolor: "background.paper",
                            borderBottom: 1,
                            borderColor: "divider",
                        }}
                    >
                        <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
                            <Menu />
                        </IconButton>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {mobileTitle ?? <BrandMark />}
                        </Box>
                        <IconButton aria-label="Search" onClick={() => openPalette("search")}>
                            <Search />
                        </IconButton>
                    </Box>
                )}

                <Box
                    component="main"
                    sx={{
                        flex: 1,
                        width: "100%",
                        maxWidth: 1600,
                        mx: "auto",
                        px: { xs: 2, md: 3 },
                        pt: { xs: 2, md: 3 },
                        pb: 5,
                    }}
                >
                    {children}
                </Box>
            </Box>

            <CommandPalette
                open={palette.open}
                mode={palette.mode}
                onClose={() => setPalette((current) => ({ ...current, open: false }))}
            />
        </Box>
    );
};

export default AppShell;
