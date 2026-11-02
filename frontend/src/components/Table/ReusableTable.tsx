import React, { useEffect, useRef, useState } from "react";
import { ColumnFormat } from "../../config/ColumnConfig";
import CloseIcon from "@mui/icons-material/Close";
import {
    Alert,
    Box,
    Divider,
    IconButton,
    LinearProgress,
    Paper,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import { NEUTRAL } from "../../config/ThemeConfig";
import EmptyState from "../EmptyState";

export type ActionType = 'add' | 'fetch' | 'store' | 'clone' | 'approve' | 'submit' | 'import' | 'export' | 'update' | 'delete' | 'idle';

export interface ActionState {
    loading?: boolean;
    error?: boolean;
    message?: string;
    type?: ActionType;
}

export interface ReusableTableProps<T extends object> {
    columns: ColumnFormat[];
    data: T[];
    actionStatus: ActionState;
    total?: number;
    page?: number;
    rowsPerPage?: number;
    onPageChange?: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
    onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    // Padded bar above the table; ResourceTable uses `header` instead to lay out tabs, toolbar and bulk bar itself.
    topToolbar?: React.ReactNode;
    header?: React.ReactNode;
    getRowKey?: (row: T, index: number) => React.Key;
    emptyText?: string;
    emptyState?: React.ReactNode;
    dense?: boolean;
    onRowClick?: (row: T) => void;
    // Keeps e.g. the selection or action column in view while a wide table scrolls sideways.
    stickyColumns?: { first?: boolean; last?: boolean };
    // Horizontal page gutter around the card; pages laid out by AppShell already have one.
    inset?: boolean;
}

const SKELETON_ROWS = 5;
const MIN_FLEX_COLUMN_PX = 64;

const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, label, [role='button'], [role='checkbox'], [role='switch'], [role='menuitem'], [role='combobox']";

const defaultRowKey = (row: object, index: number): React.Key => {
    const id = (row as { id?: unknown }).id;
    return typeof id === "string" || typeof id === "number" ? id : index;
};

// table-layout: fixed only honours explicit widths, and browsers treat calc(% - px) on a cell as auto,
// which gave every flex column the same width. Flex columns are therefore sized in px from the measured
// container width, sharing what the fixed-width columns leave in proportion to their flex value.
const resolveColumnWidths = (columns: ColumnFormat[], availableWidth: number) => {
    const fixedPx = columns.reduce((sum, col) => sum + (col.width ?? 0), 0);
    const flexColumns = columns.filter((col) => col.width === undefined);
    const totalFlex = flexColumns.reduce((sum, col) => sum + (col.flex ?? 1), 0) || 1;
    const flexSpace = Math.max(availableWidth - fixedPx, 0);

    const widths = columns.map((col) => {
        if (col.width !== undefined) return `${col.width}px`;
        if (!availableWidth) return undefined;
        const share = (col.flex ?? 1) / totalFlex;
        return `${Math.max(MIN_FLEX_COLUMN_PX, Math.floor(flexSpace * share))}px`;
    });

    const minTableWidth = fixedPx + flexColumns.length * MIN_FLEX_COLUMN_PX;
    return { widths, minTableWidth };
};

// Checkbox, switch and action columns hold controls, not text: clipping them with an ellipsis draws a stray "…".
const isControlColumn = (col: ColumnFormat) => col.type === "boolean" || col.type === "menu";

const cellOverflowSx = (col: ColumnFormat, dense: boolean) =>
    isControlColumn(col)
        ? { overflow: "visible", px: 1 }
        : { overflow: "hidden", textOverflow: "ellipsis", px: dense ? 1 : 1.5 };

const denseTextSx = { fontSize: (theme: Theme) => theme.typography.caption.fontSize };

const renderCellContent = <T extends object>(col: ColumnFormat, row: T): React.ReactNode => {
    if (col.renderCell) return col.renderCell(row);
    if (col.renderAction) return col.renderAction(row);
    const value = (row as Record<string, unknown>)[col.name];
    if (value === null || value === undefined || typeof value === "boolean") return "";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
};

const ReusableTable = <T extends object>({
    columns,
    data = [],
    actionStatus,
    page = 0,
    rowsPerPage = 10,
    total = 0,
    onPageChange,
    onRowsPerPageChange,
    topToolbar,
    header,
    getRowKey = defaultRowKey,
    emptyText = "No data",
    emptyState,
    dense = false,
    onRowClick,
    stickyColumns,
    inset = true,
}: ReusableTableProps<T>) => {
    const [openAlert, setOpenAlert] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [availableWidth, setAvailableWidth] = useState(0);
    const { widths, minTableWidth } = resolveColumnWidths(columns, availableWidth);
    const isLoading = Boolean(actionStatus.loading);
    const showSkeleton = isLoading && data.length === 0;
    const lastIndex = columns.length - 1;

    useEffect(() => {
        setOpenAlert(Boolean(actionStatus.message));
    }, [actionStatus]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(([entry]) => setAvailableWidth(Math.floor(entry.contentRect.width)));
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const stickySx = (index: number, isHeader: boolean) => {
        const isFirst = Boolean(stickyColumns?.first) && index === 0;
        const isLast = Boolean(stickyColumns?.last) && index === lastIndex;
        if (!isFirst && !isLast) return {};

        return {
            position: "sticky",
            [isFirst ? "left" : "right"]: 0,
            zIndex: isHeader ? 3 : 1,
            bgcolor: isHeader ? NEUTRAL[50] : "background.paper",
            boxShadow: `inset ${isFirst ? -1 : 1}px 0 0 ${NEUTRAL[200]}`,
            ...(isHeader ? {} : { ".MuiTableRow-hover:hover > &": { bgcolor: NEUTRAL[50] } }),
        };
    };

    const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>, row: T) => {
        if (!onRowClick) return;

        const target = event.target as HTMLElement;
        // Clicks inside a popover or menu opened from a cell (status dropdown, ⋯ menu, their backdrops)
        // bubble here through the React tree although the element sits outside the row.
        if (!event.currentTarget.contains(target)) return;

        const interactive = target.closest(INTERACTIVE_SELECTOR);
        if (interactive && event.currentTarget.contains(interactive)) return;
        // Selecting text in a cell (e.g. to copy a phone number) is not a request to open the row.
        if (window.getSelection()?.toString()) return;

        onRowClick(row);
    };

    return (
        <Box sx={{ px: inset ? 2 : 0 }}>
            {openAlert && actionStatus.message && (
                <Alert
                    severity={actionStatus.error ? "error" : "success"}
                    sx={{ mb: 1.5, whiteSpace: "pre-line" }}
                    action={
                        <IconButton
                            aria-label="Close"
                            color="inherit"
                            size="small"
                            onClick={() => setOpenAlert(false)}
                        >
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                >
                    {actionStatus.message}
                </Alert>
            )}

            <Paper
                elevation={0}
                sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "background.paper",
                }}
            >
                {header}

                {topToolbar && (
                    <>
                        <Box sx={{ px: 2, py: 1.25 }}>{topToolbar}</Box>
                        <Divider />
                    </>
                )}

                <Box sx={{ height: 3 }}>
                    {isLoading && !showSkeleton && <LinearProgress sx={{ height: 3 }} />}
                </Box>

                <TableContainer ref={containerRef} sx={{ maxHeight: "calc(100vh - 240px)", overflowX: "auto" }}>
                    <Table
                        stickyHeader
                        aria-busy={isLoading}
                        sx={{ tableLayout: "fixed", width: "100%", minWidth: minTableWidth }}
                    >
                        <TableHead>
                            <TableRow>
                                {columns.map((col, idx) => (
                                    <TableCell
                                        key={col.name || idx}
                                        align={col.align ?? "left"}
                                        sx={{
                                            whiteSpace: "nowrap",
                                            width: widths[idx],
                                            py: 1.25,
                                            ...cellOverflowSx(col, dense),
                                            ...stickySx(idx, true),
                                        }}
                                    >
                                        {col.renderHeader ? col.renderHeader() : col.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {showSkeleton ? (
                                Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
                                    <TableRow key={`skeleton-${rowIdx}`}>
                                        {columns.map((col, idx) => (
                                            <TableCell key={col.name || idx} sx={{ py: 1.25, px: 1.5 }}>
                                                <Skeleton variant="text" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} sx={{ border: 0, p: 0 }}>
                                        {emptyState ?? <EmptyState title={emptyText} dense />}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row, i) => (
                                    <TableRow
                                        key={getRowKey(row, i)}
                                        hover
                                        onClick={onRowClick ? (event) => handleRowClick(event, row) : undefined}
                                        sx={{
                                            transition: "background-color 0.15s ease",
                                            cursor: onRowClick ? "pointer" : undefined,
                                            "&:last-child td": { border: 0 },
                                        }}
                                    >
                                        {columns.map((col, idx) => (
                                            <TableCell
                                                key={col.name || idx}
                                                align={col.align ?? "left"}
                                                sx={{
                                                    whiteSpace: "nowrap",
                                                    py: 1,
                                                    ...cellOverflowSx(col, dense),
                                                    ...(dense ? denseTextSx : {}),
                                                    ...stickySx(idx, false),
                                                }}
                                            >
                                                {renderCellContent(col, row)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {total > 0 && (
                    <>
                        <Divider />
                        <TablePagination
                            component="div"
                            page={page}
                            count={total}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                            rowsPerPage={rowsPerPage}
                            onPageChange={onPageChange ?? (() => {})}
                            onRowsPerPageChange={onRowsPerPageChange ?? (() => {})}
                        />
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default ReusableTable;
