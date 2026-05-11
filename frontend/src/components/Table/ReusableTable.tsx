import React, { ReactNode, useEffect, useState } from "react";
import { ColumnFormat } from "../../config/ColumnConfig";
import CloseIcon from "@mui/icons-material/Close";
import { Alert, Box, CircularProgress, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from "@mui/material";

export type ActionType = 'fetch' | 'clone' | 'approve' | 'submit' | 'import' | 'export' | 'update' | 'delete' | 'idle';

export interface ActionState {
    loading?: boolean,
    error?: boolean,
    message?: string,
    type?: ActionType
}

interface ReusableTableProps {
    title: string;
    columns: ColumnFormat[];
    data: any[];
    actionStatus: ActionState;
    total?: number;
    page?: number;
    rowsPerPage?: number;
    onPageChange?: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
    onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    filters?: React.ReactNode;
    actions?: (row: any) => React.ReactNode;
    topToolbar?: React.ReactNode;
};

const ReusableTable: React.FC<ReusableTableProps> = ({
    title,
    columns,
    data=[],
    actionStatus,
    page = 0,
    rowsPerPage = 10,
    total = 0,
    onPageChange,
    onRowsPerPageChange,
    filters,
    actions,
    topToolbar
}) => {
    const [ openAlert, setOpenAlert] = useState(false);

    useEffect(() => {
        if(actionStatus.message){
            setOpenAlert(true);
        } else {
            setOpenAlert(false);
        }
    }, [actionStatus])

    return (
        <Box
            sx={{
                pr: 2,
                pl: 2
            }}
        >
            {openAlert && (
                <Box sx={{ p: 2 }}>
                    {(actionStatus.message) && (
                        <Alert 
                            severity= {actionStatus.error ? "error" : "success"} 
                            sx={{ width: "100%", alignItems: "center", mb: 2 }}
                            action={
                                <IconButton
                                    aria-label="close"
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
                </Box>
            )}

            <TableContainer 
                component={Paper}
                sx={{
                    maxHeight: 'calc(100vh - 100px)',
                    backgroundColor: 'var(--background-color) !important',
                    overflowX: "auto !important",
                    boxShadow: "none !important"
                }}
            >
                {topToolbar}

                <Table 
                    stickyHeader
                    sx={{ 
                        tableLayout: 'fixed', 
                        width: '100%'
                    }}
                >
                    <TableHead>
                        <TableRow>
                            {columns.map((col, idx) => (
                                <TableCell 
                                    key={idx}
                                    sx={{
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        width: col.width ?? "auto"
                                    }}
                                    align="left"
                                >
                                    { col.renderHeader ? col.renderHeader() : col.label }
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            actionStatus.loading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} align="center">
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row, i) => (
                                    <TableRow
                                        key={i}
                                    >
                                        {columns.map((col, idx) => (
                                            <TableCell
                                                key={idx}
                                                sx={{
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    width: col.width ?? "auto"
                                                }}
                                                align={ col.align ? col.align : "left" }
                                            >
                                                { col.renderCell ? (col.renderCell(row)) : (
                                                    col.renderAction ? (col.renderAction(row)) : (row[col.name]))}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )
                        }
                        
                    </TableBody>
                </Table>

                <TablePagination
                    component="div"
                    page={page}
                    count={total}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    rowsPerPage={rowsPerPage}
                    onPageChange={onPageChange ?? (() => {})}
                    onRowsPerPageChange={onRowsPerPageChange ?? (() => {})}
                ></TablePagination>
            </TableContainer>
        </Box>

    )
}

export default ReusableTable;