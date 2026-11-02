import React from "react";
import { Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import PostAddIcon from "@mui/icons-material/PostAdd";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { formatNumber } from "../../../utils/format";
import { alpha } from "@mui/material/styles";
import { BRAND } from "../../../config/ThemeConfig";

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

const fmt = (val: number | ''): string => formatNumber(val === '' ? null : val);

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
    const cellSx = { padding: "4px 10px" };

    const renderNodes = (nodeList: EstimateCostNode[], depth: number): React.ReactNode[] =>
        nodeList.flatMap(node => {
            if (node.type === 'group') {
                const { amount: subAmt, actual: subActual } = calcTotal(node.children);
                const bg = alpha(BRAND.accent, depth === 0 ? 0.1 : depth === 1 ? 0.06 : 0.03);
                return [
                    <TableRow key={node.id} sx={{ backgroundColor: bg }}>
                        <TableCell
                            colSpan={4}
                            sx={{
                                ...cellSx,
                                paddingLeft: `${10 + depth * 20}px`,
                                fontWeight: 700,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <FolderOpenIcon color="primary" sx={{ fontSize: 16, flexShrink: 0 }} />
                                {isEditing ? (
                                    <TextField
                                        size="small"
                                        value={node.label}
                                        onChange={e => onChange(updateGroupLabel(nodes, node.id, e.target.value))}
                                        sx={{ "& .MuiInputBase-input": { typography: "body2", padding: "2px 6px", fontWeight: 700 } }}
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
                                        <CreateNewFolderIcon fontSize="small" color="primary" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Add item">
                                    <IconButton size="small" onClick={() => onChange(addToGroup(nodes, node.id, newItem()))}>
                                        <PostAddIcon fontSize="small" color="primary" />
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
                <TableRow key={node.id} sx={{ "&:hover": { backgroundColor: "action.hover" } }}>
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
                                    sx={{ "& .MuiInputBase-input": { typography: "body2", padding: "4px 8px" } }}
                                    fullWidth
                                />
                            ) : (
                                <Box component="span" sx={{ color: (col.readOnly && isEditing) ? "secondary.main" : undefined }}>
                                    {col.type === 'number'
                                        ? fmt(node[col.key] as number | '')
                                        : ((node[col.key] as string) || '-')}
                                </Box>
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
            <Typography variant="h3" sx={{ mb: 1 }}>
                Estimate Cost
            </Typography>
            <Paper
                elevation={0}
                sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "background.paper"
                }}
            >
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {ITEM_COLS.map(col => (
                                    <TableCell
                                        key={col.key}
                                        sx={{ width: col.width, whiteSpace: "nowrap" }}
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
                                        sx={{ textAlign: "center", color: "text.secondary", py: 3 }}
                                    >
                                        No data
                                    </TableCell>
                                </TableRow>
                            )}

                            {renderNodes(nodes, 0)}

                            {nodes.length > 0 && (
                                <TableRow sx={{
                                    backgroundColor: alpha(BRAND.accent, 0.07),
                                    borderTop: "2px solid",
                                    borderTopColor: alpha(BRAND.accent, 0.25)
                                }}>
                                    <TableCell colSpan={4} sx={{ fontWeight: 700 }}>
                                        Total
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        {formatNumber(grandTotal.amount)}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>
                                        {grandTotal.actual > 0 ? formatNumber(grandTotal.actual) : '—'}
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
                    >
                        Add Group
                    </Button>
                    <Button
                        startIcon={<AddIcon />}
                        size="small"
                        onClick={() => onChange([...nodes, newItem()])}
                    >
                        Add Item
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default EstimateCostTable;
