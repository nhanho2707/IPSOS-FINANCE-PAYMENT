import { memo, useState } from "react";
import {
    Box, Button, Collapse, Dialog, DialogActions, DialogContent,
    DialogTitle, IconButton, Table, TableBody, TableCell, TableContainer,
    TableRow, TextField, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditableRow from "./EditableRow";
import MultiSelectRow from "./MultiSelectRow";
import SingleSelectRow from "./SingleSelectRow";
import RadioRow from "./RadioRow";
import RichTextRow from "./RichTextRow";
import RangeRow from "./RangeRow";
import { FieldSchema } from "../../../utils/renderFields";

export type GroupItem = {
    group_name: string;
    [key: string]: any;
};

type GroupFormProps = {
    item: GroupItem;
    fields: FieldSchema[];
    isEditing: boolean;
    onUpdate: (updated: GroupItem) => void;
    onDelete: () => void;
};

const GroupForm: React.FC<GroupFormProps> = ({ item, fields, isEditing, onUpdate, onDelete }) => {
    const [expanded, setExpanded] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleChange = (fieldName: string, value: any) => {
        onUpdate({ ...item, [fieldName]: value });
    };

    const renderField = (field: FieldSchema) => {
        switch (field.type) {
            case "text":
            case "number":
                return (
                    <EditableRow
                        key={field.name}
                        row={{
                            id: field.name,
                            label: field.label,
                            type: field.type as "text" | "number",
                            placeholder: field.placeholder,
                            value: item[field.name],
                        }}
                        isEditing={isEditing}
                        isActive={editingId === field.name}
                        onStartEdit={() => setEditingId(field.name)}
                        onStopEdit={() => setEditingId(null)}
                        onChange={handleChange}
                    />
                );
            case "textarea":
                return (
                    <RichTextRow
                        key={field.name}
                        row={{
                            id: field.name,
                            label: field.label,
                            value: item[field.name],
                            placeholder: field.placeholder,
                        }}
                        isEditing={isEditing}
                        isActive={editingId === field.name}
                        onStartEdit={() => setEditingId(field.name)}
                        onStopEdit={() => setEditingId(null)}
                        onChange={handleChange}
                    />
                );
            case "radio":
                return (
                    <RadioRow
                        key={field.name}
                        row={{
                            id: field.name,
                            label: field.label,
                            value: item[field.name],
                            options: field.options ?? [],
                        }}
                        isEditing={isEditing}
                        onChange={handleChange}
                    />
                );
            case "range":
                return (
                    <RangeRow
                        key={field.name}
                        row={{ id: field.name, label: field.label, value: item[field.name] }}
                        isEditing={isEditing}
                        onChange={handleChange}
                    />
                );
            case "multi-select":
                return (
                    <MultiSelectRow
                        key={field.name}
                        row={{
                            id: field.name,
                            label: field.label,
                            value: item[field.name],
                            options: field.options ?? [],
                            placeholder: field.placeholder,
                        }}
                        isEditing={isEditing}
                        onChange={handleChange}
                    />
                );
            case "single-select":
                return (
                    <SingleSelectRow
                        key={field.name}
                        row={{
                            id: field.name,
                            label: field.label,
                            value: item[field.name],
                            options: field.options ?? [],
                            placeholder: field.placeholder,
                        }}
                        isEditing={isEditing}
                        onChange={handleChange}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Box
            sx={{
                mb: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px",
                overflow: "hidden",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 2,
                    py: 1.25,
                    cursor: "pointer",
                    backgroundColor: "background.default",
                    borderBottom: expanded ? "1px solid" : "none",
                    borderBottomColor: "divider",
                    "&:hover": { backgroundColor: "action.hover" },
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <IconButton size="small" sx={{ mr: 1, p: 0 }}>
                    {expanded ? (
                        <ExpandLessIcon fontSize="small" />
                    ) : (
                        <ExpandMoreIcon fontSize="small" />
                    )}
                </IconButton>
                <Typography
                    sx={{
                        flexGrow: 1,
                        fontWeight: 600,
                    }}
                >
                    {item.group_name}
                </Typography>
                {isEditing && (
                    <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>
            <Collapse in={expanded}>
                <TableContainer>
                    <Table size="small">
                        <colgroup>
                            <col style={{ width: "250px" }} />
                            <col />
                        </colgroup>
                        <TableBody>
                            {fields
                                .filter((f) => !f.hidden)
                                .map((field) => renderField(field))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Collapse>
        </Box>
    );
};

type Props = {
    row: {
        id: string;
        label: string;
        value: GroupItem[];
        fields: FieldSchema[];
    };
    isEditing: boolean;
    onChange: (id: string, value: GroupItem[]) => void;
};

const GroupRepeaterRow = memo(({ row, isEditing, onChange }: Props) => {
    const groups = Array.isArray(row.value) ? row.value : [];

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");

    const handleAdd = () => {
        if (!newGroupName.trim()) return;
        onChange(row.id, [...groups, { group_name: newGroupName.trim() }]);
        setNewGroupName("");
        setAddDialogOpen(false);
    };

    const handleUpdate = (index: number, updated: GroupItem) => {
        const next = [...groups];
        next[index] = updated;
        onChange(row.id, next);
    };

    const handleDelete = (index: number) => {
        onChange(row.id, groups.filter((_, i) => i !== index));
    };

    const handleCloseDialog = () => {
        setAddDialogOpen(false);
        setNewGroupName("");
    };

    return (
        <>
            <TableRow
                sx={{
                    "&:hover": { backgroundColor: "action.hover" },
                    "&:last-child td": { border: 0 },
                }}
            >
                <TableCell
                    width={200}
                    sx={{
                        fontWeight: 600,
                        verticalAlign: "top",
                        pt: 2,
                    }}
                >
                    {row.label}
                </TableCell>
                <TableCell>
                    {groups.length === 0 && !isEditing && (
                        <Typography variant="body2" color="text.secondary">
                            -
                        </Typography>
                    )}
                    {groups.map((item, i) => (
                        <GroupForm
                            key={i}
                            item={item}
                            fields={row.fields}
                            isEditing={isEditing}
                            onUpdate={(updated) => handleUpdate(i, updated)}
                            onDelete={() => handleDelete(i)}
                        />
                    ))}
                    {isEditing && (
                        <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setAddDialogOpen(true)}
                            sx={{ mt: groups.length > 0 ? 0.5 : 0 }}
                        >
                            Add Group
                        </Button>
                    )}
                </TableCell>
            </TableRow>

            <Dialog
                open={addDialogOpen}
                onClose={handleCloseDialog}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Add Respondent Group</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        label="Group name"
                        placeholder="e.g. Main, Booster..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                        }}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={!newGroupName.trim()}
                        onClick={handleAdd}
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
});

export default GroupRepeaterRow;
