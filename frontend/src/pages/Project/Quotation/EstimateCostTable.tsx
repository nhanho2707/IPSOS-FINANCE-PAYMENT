import React from "react";
import { Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import PostAddIcon from "@mui/icons-material/PostAdd";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";

export interface EstimateCostItemData {
    type: 'item';
    id: string;
    chi_phi: string;
    unit: string;
    quantity: number | '';
    price: number | '';
    amount: number;
    actual_expense: number | '';
    note: string;
}

export interface EstimateCostGroupData {
    type: 'group';
    id: string;
    label: string;
    children: EstimateCostNode[];
}

export type EstimateCostNode = EstimateCostGroupData | EstimateCostItemData;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizeNodes = (data: any[]): EstimateCostNode[] =>
    (data ?? []).map(item => {
        if (item?.type === 'group') {
            return {
                type: 'group' as const,
                id: item.id ?? crypto.randomUUID(),
                label: item.label ?? '',
                children: normalizeNodes(item.children ?? [])
            };
        }
        return {
            type: 'item' as const,
            id: item.id ?? crypto.randomUUID(),
            chi_phi: item.chi_phi ?? '',
            unit: item.unit ?? '',
            quantity: item.quantity ?? '',
            price: item.price ?? '',
            amount: item.amount ?? 0,
            actual_expense: item.actual_expense ?? '',
            note: item.note ?? ''
        };
    });

const uid = () => crypto.randomUUID();

const newItem = (): EstimateCostItemData => ({
    type: 'item', id: uid(),
    chi_phi: '', unit: '', quantity: '', price: '', amount: 0, actual_expense: '', note: ''
});

const newGroup = (): EstimateCostGroupData => ({
    type: 'group', id: uid(), label: 'New Group', children: []
});

const fmt = (val: number | ''): string => {
    if (val === '' || val === null || val === undefined) return '-';
    const n = Number(val);
    return isNaN(n) ? '-' : n.toLocaleString('vi-VN');
};

const calcTotal = (nodes: EstimateCostNode[]): { amount: number; actual: number } =>
    nodes.reduce((acc, node) => {
        if (node.type === 'item') {
            return { amount: acc.amount + (Number(node.amount) || 0), actual: acc.actual + (Number(node.actual_expense) || 0) };
        }
        const sub = calcTotal(node.children);
        return { amount: acc.amount + sub.amount, actual: acc.actual + sub.actual };
    }, { amount: 0, actual: 0 });

const updateItemField = (
    nodes: EstimateCostNode[],
    id: string,
    field: keyof EstimateCostItemData,
    raw: string
): EstimateCostNode[] =>
    nodes.map(node => {
        if (node.type === 'group') return { ...node, children: updateItemField(node.children, id, field, raw) };
        if (node.id !== id) return node;
        const next: EstimateCostItemData = { ...node, [field]: raw };
        if (field === 'quantity' || field === 'price') {
            const qty = Number(field === 'quantity' ? raw : node.quantity);
            const prc = Number(field === 'price'    ? raw : node.price);
            next.amount = !isNaN(qty) && !isNaN(prc) ? qty * prc : 0;
        }
        return next;
    });

const updateGroupLabel = (nodes: EstimateCostNode[], id: string, label: string): EstimateCostNode[] =>
    nodes.map(node => {
        if (node.type === 'group' && node.id === id) return { ...node, label };
        if (node.type === 'group') return { ...node, children: updateGroupLabel(node.children, id, label) };
        return node;
    });

const deleteNode = (nodes: EstimateCostNode[], id: string): EstimateCostNode[] =>
    nodes
        .filter(n => n.id !== id)
        .map(n => n.type === 'group' ? { ...n, children: deleteNode(n.children, id) } : n);

const addToGroup = (nodes: EstimateCostNode[], groupId: string, child: EstimateCostNode): EstimateCostNode[] =>
    nodes.map(n => {
        if (n.type === 'group' && n.id === groupId) return { ...n, children: [...n.children, child] };
        if (n.type === 'group') return { ...n, children: addToGroup(n.children, groupId, child) };
        return n;
    });

const ITEM_COLS = [
    { key: 'chi_phi' as const,        label: 'Cost',        type: 'text' as const,   width: 200 },
    { key: 'unit' as const,           label: 'Unit',           type: 'text' as const,   width: 80  },
    { key: 'quantity' as const,       label: 'Quantity',       type: 'number' as const, width: 90  },
    { key: 'price' as const,          label: 'Price',          type: 'number' as const, width: 120 },
    { key: 'amount' as const,         label: 'Amount',         type: 'number' as const, width: 140, readOnly: true },
    { key: 'actual_expense' as const, label: 'Actual Expense', type: 'number' as const, width: 140 },
    { key: 'note' as const,           label: 'Note',           type: 'text' as const,   width: 180 },
];

interface Props {
    value: EstimateCostNode[];
    isEditing: boolean;
    onChange: (nodes: EstimateCostNode[]) => void;
}

const EstimateCostTable: React.FC<Props> = ({ value, isEditing, onChange }) => {
    const nodes = value || [];
    const cellSx = { fontSize: "0.8125rem", padding: "4px 10px", color: "var(--text-color)" };

    const renderNodes = (nodeList: EstimateCostNode[], depth: number): React.ReactNode[] =>
        nodeList.flatMap(node => {
            if (node.type === 'group') {
                const { amount: subAmt, actual: subActual } = calcTotal(node.children);
                const bg = depth === 0
                    ? 'rgba(0,157,156,0.1)'
                    : depth === 1
                    ? 'rgba(0,157,156,0.06)'
                    : 'rgba(0,157,156,0.03)';
                return [
                    <TableRow key={node.id} sx={{ backgroundColor: bg }}>
                        <TableCell
                            colSpan={4}
                            sx={{
                                ...cellSx,
                                paddingLeft: `${10 + depth * 20}px`,
                                fontWeight: 700,
                                borderBottom: "1px solid rgba(0,157,156,0.2)"
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <FolderOpenIcon sx={{ fontSize: "1rem", color: "var(--main-color)", flexShrink: 0 }} />
                                {isEditing ? (
                                    <TextField
                                        size="small"
                                        value={node.label}
                                        onChange={e => onChange(updateGroupLabel(nodes, node.id, e.target.value))}
                                        sx={{ "& .MuiInputBase-input": { fontSize: "0.8125rem", padding: "2px 6px", fontWeight: 700 } }}
                                    />
                                ) : (
                                    <span>{node.label}</span>
                                )}
                            </Box>
                        </TableCell>
                        <TableCell sx={{ ...cellSx, fontWeight: 700 }}>{fmt(subAmt)}</TableCell>
                        <TableCell sx={{ ...cellSx, fontWeight: 700 }}>
                            {subActual > 0 ? fmt(subActual) : '-'}
                        </TableCell>
                        <TableCell sx={cellSx} />
                        {isEditing && (
                            <TableCell sx={{ padding: "2px 4px", whiteSpace: "nowrap" }}>
                                <Tooltip title="Add sub-group">
                                    <IconButton size="small" onClick={() => onChange(addToGroup(nodes, node.id, newGroup()))}>
                                        <CreateNewFolderIcon fontSize="small" sx={{ color: "var(--main-color)" }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Add item">
                                    <IconButton size="small" onClick={() => onChange(addToGroup(nodes, node.id, newItem()))}>
                                        <PostAddIcon fontSize="small" sx={{ color: "var(--main-color)" }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete group">
                                    <IconButton size="small" color="error" onClick={() => onChange(deleteNode(nodes, node.id))}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        )}
                    </TableRow>,
                    ...renderNodes(node.children, depth + 1)
                ];
            }

            return [
                <TableRow key={node.id} sx={{ "&:hover": { backgroundColor: "rgba(0,157,156,0.04)" } }}>
                    {ITEM_COLS.map(col => (
                        <TableCell
                            key={col.key}
                            sx={{
                                ...cellSx,
                                ...(col.key === 'chi_phi' ? { paddingLeft: `${10 + depth * 20}px` } : {})
                            }}
                        >
                            {isEditing && !col.readOnly ? (
                                <TextField
                                    size="small"
                                    type={col.type}
                                    value={node[col.key] ?? ''}
                                    onChange={e => onChange(updateItemField(nodes, node.id, col.key, e.target.value))}
                                    sx={{ "& .MuiInputBase-input": { fontSize: "0.8125rem", padding: "4px 8px" } }}
                                    fullWidth
                                />
                            ) : (
                                <span style={{ color: (col.readOnly && isEditing) ? "var(--text-secondary-color)" : undefined }}>
                                    {col.type === 'number'
                                        ? fmt(node[col.key] as number | '')
                                        : ((node[col.key] as string) || '-')}
                                </span>
                            )}
                        </TableCell>
                    ))}
                    {isEditing && (
                        <TableCell sx={{ padding: "4px" }}>
                            <IconButton size="small" color="error" onClick={() => onChange(deleteNode(nodes, node.id))}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </TableCell>
                    )}
                </TableRow>
            ];
        });

    const grandTotal = calcTotal(nodes);

    return (
        <Box>
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, mb: 1, color: "var(--text-color)" }}>
                Estimate Cost
            </Typography>
            <Paper
                elevation={0}
                sx={{
                    border: "1px solid",
                    borderColor: "var(--body-color)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "var(--background-color)"
                }}
            >
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "var(--body-color)" }}>
                                {ITEM_COLS.map(col => (
                                    <TableCell
                                        key={col.key}
                                        sx={{ fontWeight: 600, fontSize: "0.75rem", width: col.width, whiteSpace: "nowrap", color: "var(--text-color)" }}
                                    >
                                        {col.label}
                                    </TableCell>
                                ))}
                                {isEditing && <TableCell sx={{ width: 120 }} />}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {nodes.length === 0 && !isEditing && (
                                <TableRow>
                                    <TableCell
                                        colSpan={ITEM_COLS.length}
                                        sx={{ textAlign: "center", color: "var(--text-secondary-color)", fontSize: "0.8125rem", py: 3 }}
                                    >
                                        No data
                                    </TableCell>
                                </TableRow>
                            )}

                            {renderNodes(nodes, 0)}

                            {nodes.length > 0 && (
                                <TableRow sx={{
                                    backgroundColor: "rgba(0,157,156,0.07)",
                                    borderTop: "2px solid rgba(0,157,156,0.25)"
                                }}>
                                    <TableCell colSpan={4} sx={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-color)" }}>
                                        Total
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-color)" }}>
                                        {grandTotal.amount.toLocaleString('vi-VN')}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-color)" }}>
                                        {grandTotal.actual > 0 ? grandTotal.actual.toLocaleString('vi-VN') : '-'}
                                    </TableCell>
                                    <TableCell />
                                    {isEditing && <TableCell />}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {isEditing && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button
                        startIcon={<CreateNewFolderIcon />}
                        size="small"
                        onClick={() => onChange([...nodes, newGroup()])}
                        sx={{ fontSize: "0.75rem", color: "var(--main-color)", textTransform: "none" }}
                    >
                        Add Group
                    </Button>
                    <Button
                        startIcon={<AddIcon />}
                        size="small"
                        onClick={() => onChange([...nodes, newItem()])}
                        sx={{ fontSize: "0.75rem", color: "var(--main-color)", textTransform: "none" }}
                    >
                        Add Item
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default EstimateCostTable;
