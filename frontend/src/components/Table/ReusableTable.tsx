import React, { useEffect, useState } from "react";
import { ColumnFormat } from "../../config/ColumnConfig";
import CloseIcon from "@mui/icons-material/Close";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
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
    Typography,
} from "@mui/material";

export type ActionType = 'add' | 'fetch' | 'store' | 'clone' | 'approve' | 'submit' | 'import' | 'export' | 'update' | 'delete' | 'idle';

export interface ActionState {
    loading?: boolean;
    error?: boolean;
    message?: string;
    type?: ActionType;
}

interface ReusableTableProps<T extends object> {
    columns: ColumnFormat[];
    data: T[];
    actionStatus: ActionState;
    total?: number;
    page?: number;
    rowsPerPage?: number;
    onPageChange?: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
    onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    topToolbar?: React.ReactNode;
    getRowKey?: (row: T, index: number) => React.Key;
    emptyText?: string;
}

const SKELETON_ROWS = 5;
const MIN_FLEX_COLUMN_PX = 64;

const defaultRowKey = (row: object, index: number): React.Key => {
    const id = (row as { id?: unknown }).id;
    return typeof id === "string" || typeof id === "number" ? id : index;
};

// table-layout: fixed only honours explicit widths, so `flex` columns share the space
// left over by fixed-width columns in proportion to their flex value.
const resolveColumnWidths = (columns: ColumnFormat[]) => {
    const fixedPx = columns.reduce((sum, col) => sum + (col.width ?? 0), 0);
    const flexColumns = columns.filter((col) => col.width === undefined);
    const totalFlex = flexColumns.reduce((sum, col) => sum + (col.flex ?? 1), 0);

    const widths = columns.map((col) => {
        if (col.width !== undefined) return `${col.width}px`;
        const share = (col.flex ?? 1) / (totalFlex || 1);
        return `calc((100% - ${fixedPx}px) * ${share.toFixed(4)})`;
    });

    const minTableWidth = fixedPx + flexColumns.length * MIN_FLEX_COLUMN_PX;
    return { widths, minTableWidth };
};

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
    getRowKey = defaultRowKey,
    emptyText = "No data",
}: ReusableTableProps<T>) => {
    const [openAlert, setOpenAlert] = useState(false);
    const { widths, minTableWidth } = resolveColumnWidths(columns);
    const isLoading = Boolean(actionStatus.loading);
    const showSkeleton = isLoading && data.length === 0;

    useEffect(() => {
        setOpenAlert(Boolean(actionStatus.message));
    }, [actionStatus]);

    return (
        <Box sx={{ px: 2 }}>
            {openAlert && actionStatus.message && (
                <Alert
                    severity={actionStatus.error ? "error" : "success"}
                    sx={{ mb: 1.5, borderRadius: "8px", fontSize: "0.875rem", whiteSpace: "pre-line" }}
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
                    borderColor: "var(--body-color)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    backgroundColor: "var(--background-color)",
                }}
            >
                {topToolbar && (
                    <>
                        <Box sx={{ px: 2, py: 1.25 }}>{topToolbar}</Box>
                        <Divider />
                    </>
                )}

                <Box sx={{ height: 3 }}>
                    {isLoading && !showSkeleton && <LinearProgress sx={{ height: 3 }} />}
                </Box>

                <TableContainer sx={{ maxHeight: "calc(100vh - 240px)", overflowX: "auto" }}>
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
                                            backgroundColor: "var(--body-color)",
                                            fontWeight: 600,
                                            fontSize: "0.8125rem",
                                            color: "var(--text-color)",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            width: widths[idx],
                                            py: 1.25,
                                            px: 1.5,
                                            borderBottom: "2px solid",
                                            borderBottomColor: "rgba(0, 157, 156, 0.2)",
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
                                                <Skeleton variant="text" sx={{ fontSize: "0.8125rem" }} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        align="center"
                                        sx={{ py: 6, border: 0 }}
                                    >
                                        <InboxOutlinedIcon
                                            sx={{ fontSize: 40, color: "var(--text-primary-color)", mb: 1, opacity: 0.5 }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{ color: "var(--text-primary-color)", fontSize: "0.875rem" }}
                                        >
                                            {emptyText}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row, i) => (
                                    <TableRow
                                        key={getRowKey(row, i)}
                                        sx={{
                                            transition: "background-color 0.15s ease",
                                            "&:hover": {
                                                backgroundColor: "rgba(0, 157, 156, 0.05)",
                                            },
                                            "&:last-child td": { border: 0 },
                                        }}
                                    >
                                        {columns.map((col, idx) => (
                                            <TableCell
                                                key={col.name || idx}
                                                align={col.align ?? "left"}
                                                sx={{
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    fontSize: "0.8125rem",
                                                    color: "var(--text-color)",
                                                    py: 1,
                                                    px: 1.5,
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

                <Divider />
                <TablePagination
                    component="div"
                    page={page}
                    count={total}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    rowsPerPage={rowsPerPage}
                    onPageChange={onPageChange ?? (() => {})}
                    onRowsPerPageChange={onRowsPerPageChange ?? (() => {})}
                    sx={{
                        fontSize: "0.8125rem",
                        "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                            fontSize: "0.8125rem",
                        },
                    }}
                />
            </Paper>
        </Box>
    );
};

export default ReusableTable;
