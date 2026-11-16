import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Box,
    Dialog,
    InputBase,
    LinearProgress,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Typography,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { AppNavItem, getAppNavGroupsForRole } from "../../config/AppNavConfig";
import { ProjectData } from "../../config/ProjectFieldsConfig";
import { findProjectNavItem, getProjectHomePath, getProjectNavItemsForRole, projectNavPath } from "../../config/ProjectNavConfig";
import { getStatusTone, PROJECT_STATUS_TONE } from "../../config/ThemeConfig";
import { useProjectSearch } from "../../hook/useProjectSearch";
import { formatStatus } from "../../utils/format";
import { StatusDot } from "../StatusChip";
import Kbd from "./Kbd";
import { useTranslation } from "react-i18next";
import { tKey } from "../../i18n/i18n";

export type CommandPaletteMode = "search" | "switch-project";

interface CommandPaletteProps {
    open: boolean;
    mode: CommandPaletteMode;
    onClose: () => void;
}

type PaletteEntry =
    | { kind: "page"; key: string; item: AppNavItem }
    | { kind: "project"; key: string; project: ProjectData };

const PROJECT_PATH_PATTERN = /^\/project-management\/projects\/(\d+)/;

const matches = (query: string, ...values: (string | undefined)[]) => {
    const needle = query.trim().toLowerCase();
    return !needle || values.some((value) => value?.toLowerCase().includes(needle));
};

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, mode, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [ query, setQuery ] = useState("");
    const [ activeIndex, setActiveIndex ] = useState(0);
    const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const { projects, actionState } = useProjectSearch(query, open);

    const currentProjectId = Number(location.pathname.match(PROJECT_PATH_PATTERN)?.[1] ?? 0);

    const pages = useMemo(() => {
        if (mode !== "search") return [];
        return getAppNavGroupsForRole(user?.role)
            .flatMap((group) => group.items)
            .filter((item) => matches(query, t(item.label) as string, ...(item.keywords ?? [])));
    }, [mode, query, user?.role, t]);

    const entries: PaletteEntry[] = useMemo(() => [
        ...pages.map((item): PaletteEntry => ({ kind: "page", key: `page-${item.to}`, item })),
        ...projects.map((project): PaletteEntry => ({ kind: "project", key: `project-${project.id}`, project })),
    ], [pages, projects]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query, mode, projects]);

    useEffect(() => {
        optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    const select = (entry: PaletteEntry | undefined) => {
        if (!entry) return;

        if (entry.kind === "page") {
            navigate(entry.item.to);
        } else {
            const projectId = entry.project.id ?? 0;
            const currentPage = findProjectNavItem(location.pathname);
            const canOpenSamePage = mode === "switch-project"
                && currentPage
                && getProjectNavItemsForRole(user?.role).some((item) => item.path === currentPage.path);

            navigate(canOpenSamePage ? projectNavPath(projectId, currentPage.path) : getProjectHomePath(projectId, user?.role));
        }

        onClose();
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (entries.length === 0) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => (index + 1) % entries.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => (index - 1 + entries.length) % entries.length);
        } else if (event.key === "Enter") {
            event.preventDefault();
            select(entries[activeIndex]);
        }
    };

    const optionProps = (index: number, entry: PaletteEntry) => ({
        id: `command-palette-option-${index}`,
        role: "option",
        "aria-selected": index === activeIndex,
        selected: index === activeIndex,
        ref: (element: HTMLDivElement | null) => { optionRefs.current[index] = element; },
        onMouseMove: () => setActiveIndex(index),
        onClick: () => select(entry),
        sx: { mx: 1, borderRadius: 1, gap: 1.5, py: 0.75 },
    });

    const hasQuery = query.trim().length > 0;
    const showEmpty = !actionState.loading && !actionState.error && projects.length === 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            sx={{ "& .MuiDialog-container": { alignItems: "flex-start" } }}
            slotProps={{
                transition: { onEntered: () => inputRef.current?.focus(), onExited: () => setQuery("") },
                paper: { sx: { mt: { xs: 2, sm: "12vh" }, overflow: "hidden" } }
            }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, height: 52, borderBottom: 1, borderColor: "divider" }}>
                <Search sx={{ fontSize: 20, color: "text.secondary" }} />
                <InputBase
                    autoFocus
                    inputRef={inputRef}
                    fullWidth
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={mode === "switch-project" ? t("nav.palette.switchPlaceholder") : t("nav.palette.searchPlaceholder")}
                    inputProps={{
                        role: "combobox",
                        "aria-label": mode === "switch-project" ? t("nav.palette.switchLabel") : t("nav.shell.search"),
                        "aria-expanded": true,
                        "aria-controls": "command-palette-list",
                        "aria-activedescendant": entries.length ? `command-palette-option-${activeIndex}` : undefined,
                    }}
                />
                <Kbd>Esc</Kbd>
            </Box>
            <Box sx={{ height: 2 }}>
                {actionState.loading && <LinearProgress sx={{ height: 2 }} />}
            </Box>

            <List
                id="command-palette-list"
                role="listbox"
                aria-label={t("nav.palette.results")}
                dense
                sx={{ maxHeight: "min(420px, 60vh)", overflowY: "auto", pt: 0, pb: 1 }}
            >
                {pages.length > 0 && (
                    <ListSubheader disableSticky sx={{ typography: "overline", lineHeight: 2.5 }}>{t("nav.palette.goTo")}</ListSubheader>
                )}
                {pages.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <ListItemButton key={item.to} {...optionProps(index, entries[index])}>
                            <ListItemIcon sx={{ minWidth: 0, color: "text.secondary" }}>
                                <Icon sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText primary={tKey(item.label)} slotProps={{ primary: { variant: "body2", sx: { fontWeight: 500 } } }} />
                        </ListItemButton>
                    );
                })}

                <ListSubheader disableSticky sx={{ typography: "overline", lineHeight: 2.5 }}>{t("nav.palette.projects")}</ListSubheader>
                {projects.map((project, projectIndex) => {
                    const index = pages.length + projectIndex;
                    const isCurrent = project.id === currentProjectId;
                    return (
                        <ListItemButton key={project.id} {...optionProps(index, entries[index])}>
                            <ListItemIcon sx={{ minWidth: 0 }}>
                                <StatusDot tone={getStatusTone(project.status, PROJECT_STATUS_TONE)} />
                            </ListItemIcon>
                            <ListItemText
                                primary={project.project_name}
                                secondary={[project.internal_code, project.symphony].filter(Boolean).join(" · ")}
                                sx={{ minWidth: 0 }}
                                slotProps={{
                                    primary: { variant: "body2", noWrap: true, sx: { fontWeight: 500 } },
                                    secondary: { variant: "caption", noWrap: true },
                                }}
                            />
                            <Typography variant="caption" sx={{ color: "text.secondary", flexShrink: 0 }}>
                                {isCurrent ? t("nav.palette.current") : formatStatus(project.status)}
                            </Typography>
                        </ListItemButton>
                    );
                })}
                {actionState.error && (
                    <Typography variant="body2" color="error" sx={{ px: 2, py: 1.5 }}>
                        {t("nav.palette.loadError")}
                    </Typography>
                )}
                {showEmpty && (
                    <Typography variant="body2" sx={{ color: "text.secondary", px: 2, py: 1.5 }}>
                        {hasQuery ? t("nav.palette.noMatch", { query: query.trim() }) : t("nav.palette.noProjects")}
                    </Typography>
                )}
            </List>

            <Box
                sx={{
                    display: { xs: "none", sm: "flex" },
                    alignItems: "center",
                    gap: 2,
                    px: 2,
                    py: 1,
                    borderTop: 1,
                    borderColor: "divider",
                    bgcolor: "background.default",
                    typography: "caption",
                    color: "text.secondary",
                }}
            >
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}><Kbd>↑</Kbd><Kbd>↓</Kbd>{t("nav.palette.toMove")}</Box>
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}><Kbd>Enter</Kbd>{t("nav.palette.toOpen")}</Box>
            </Box>
        </Dialog>
    );
};

export default CommandPalette;
