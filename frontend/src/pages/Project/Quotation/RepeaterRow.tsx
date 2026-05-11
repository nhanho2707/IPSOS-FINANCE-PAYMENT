import { Autocomplete, Box, Checkbox, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@mui/material";
import { memo, useEffect, useMemo, useState } from "react";
import { FieldSchema } from "./QuotationDynamicForm";
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { BorderRight, Rowing } from "@mui/icons-material";
import { RowType } from "./EditableRow";

export interface RepeaterRowData {
    [key: string]: any
};

type Option = { value: string, label: string };

type Props = {
    row: {
        id: string,
        label: string,
        value: RepeaterRowData[],
        fields: FieldSchema[]
    };
    isEditing: boolean;
    onChange: (id: string, data: RepeaterRowData[]) => void;
};

const RepeaterRow = memo(({ row, isEditing, onChange}: Props) => {

    const [ draft, setDraft ] = useState<RepeaterRowData>({});
    
    const repeaterRows = row.value || [];

    const isDraftValid = useMemo(() => {
        return row.fields.every(field => {
            const value = draft[field.name];

            if(field.required){
                if(Array.isArray(value)){
                    return value.length > 0;
                } else {
                    return value && String(value).length > 0;
                }
            }

            return true;
        });
    },[draft, row.fields]);

    const handleFieldChange = (fieldName: string, value: any) => {
        setDraft(prev => ({
            ...prev,
            [fieldName]: value
        }));
    }

    const handleSave = () => {
        const newRows = [...(row.value || []), draft];

        onChange(row.id, newRows);

        setDraft({});
    }

    const handleDelete = (index: number) => {
        const newRows = (row.value || []).filter((_,i) => i != index);

        onChange(row.id, newRows);
    }

    const renderSavedField = (field: FieldSchema, rowItem: RepeaterRowData, cellStyle: any) => {
        const value = rowItem[field.name];

        if(Object.keys(rowItem).includes(field.name)){
            return (
                <Box
                    key={field.name}
                    sx={cellStyle}
                >
                    {Array.isArray(value)
                        ? value.map(v => v.label).join(',')
                        : value.label || value}
                </Box>
            );
        } else {
            return (
                <Box
                    key={field.name}
                    sx={cellStyle}
                >
                </Box>
            );
        }
        
    }

    const renderField = (field: FieldSchema, cellStyle: any) => {
        switch(field.type){
            case "number":
                return (
                    <Box
                        key={field.name}
                        sx={cellStyle}
                    >
                        <TextField
                            fullWidth
                            autoFocus
                            size="small"
                            disabled={!isEditing}
                            type={field.type}
                            value={draft[field.name] ?? ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                    </Box>
                )
            case "text":
                return (
                    <Box
                        key={field.name}
                        sx={cellStyle}
                    >
                        <TextField
                            fullWidth
                            autoFocus
                            size="small"
                            disabled={!isEditing}
                            type={field.type}
                            value={draft[field.name] ?? ""}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                    </Box>
                )
            default:
                return (
                    <Box
                        key={field.name}
                        sx={cellStyle}
                    >
                        <Autocomplete
                            multiple
                            fullWidth
                            disableCloseOnSelect //Khi chọn 1 option thì dropdown không bị đóng lại
                            options={field.options || []} 
                            value={draft[field.name] || []}
                            disabled={!isEditing}
                            onChange={(event, newValue) => handleFieldChange(field.name, newValue)}
                            getOptionLabel={(option) => option.label} //quyết định hiển thị label
                            isOptionEqualToValue={(option, value) => (
                                option.value === value.value
                            )} //tick checkbox nếu đúng value
                            renderOption={(props, option, { selected }) => (
                                <li {...props}>
                                    <Checkbox
                                        style={{ marginRight: 8 }}
                                        checked={selected}
                                    />
                                    {option.label}
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    placeholder="Select..."
                                />
                            )}
                        />
                    </Box>
                );
        }
    }

    const renderMiniTable = (fields: FieldSchema[]) => { 
        const gridTemplate = `${fields.map(() => "1fr").join(" ")} auto`;
        const cellStyle = {
            padding: "8px 12px",
            BorderRight: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
            minHeight: 40
        };

        return (isEditing || repeaterRows.length > 0) ? (
            <Box
                sx={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    overflow: "hidden"
                }}
            >
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: gridTemplate,
                        backgroundColor: "#f5f5f5",
                        borderBottom: "1px solid #e0e0e0"
                    }}
                >
                    {fields.map((subField) => (
                        <Box
                            sx={cellStyle}
                        >
                            {subField.label}
                        </Box>
                    ))}
                    <Box
                        sx={{
                            textAlign: "center",
                            width: 120,
                            padding: "8px 12px",
                            minHeight: 40
                        }}
                    >
                        Actions
                    </Box>
                </Box>
                {repeaterRows.map((rowItem, rowIndex) => (
                    <Box
                        key={rowIndex}
                        sx={{
                            display: "grid",
                            gridTemplateColumns: gridTemplate,
                            borderBottom: "1px solid #e0e0e0",
                            '&:hover': {backgroundColor: '#fafafa'},
                            '& > div:last-child': { borderRight: 'none' }
                        }}
                    >
                        {row.fields.map((subField) => (
                            renderSavedField(subField, rowItem, cellStyle)
                        ))}
                        <Box
                            sx={{...cellStyle, justifyContent: "center", width: 120}}
                        >
                            <IconButton
                                color="error"
                                disabled={!isEditing}
                                onClick={() => handleDelete(rowIndex)}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    </Box>
                ))}
                {isEditing && (
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: gridTemplate
                        }}
                    >
                        {fields.map((subField) => (
                            renderField(subField, cellStyle)
                        ))}
                        <Box
                            sx={{...cellStyle, justifyContent: "center", width: 120}}
                        >
                            <IconButton
                                color="primary"
                                disabled={!isDraftValid}
                                onClick={handleSave}
                            >
                                <SaveIcon />
                            </IconButton>
                        </Box>
                    </Box>
                )}
            </Box>
        ) : (
            <div
                dangerouslySetInnerHTML={{ __html: (row.value || []).map((option) => option.label).join(', ') || "-" }}
                style={{ cursor: "pointer" }}
            ></div>
        )
    };

    return (
        <TableRow>
            <TableCell 
                width={400}
                sx={{
                    fontWeight: 600
                }}
            >
                {row.label}
            </TableCell>
            <TableCell>
                { renderMiniTable(row.fields) }
            </TableCell>
        </TableRow>
    )
});

export default RepeaterRow;