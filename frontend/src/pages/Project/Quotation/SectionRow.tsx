import { memo, useEffect, useState } from "react";
import { FieldSchema } from "./QuotationDynamicForm";
import { Box, FormControl, FormControlLabel, Paper, Radio, RadioGroup, Table, TableBody, TableCell, TableContainer, TableRow } from "@mui/material";
import RadioRow from "./RadioRow";
import RangeRow from "./RangeRow";
import MultiSelectRow from "./MultiSelectRow";
import RichTextRow from "./RichTextRow";
import EditableRow from "./EditableRow";

export interface SectionRowData {
    [key: string]: any
}

type Props = {
    row: {
        id: string,
        label: string,
        value: SectionRowData,
        fields: FieldSchema[]
    };
    isEditing: boolean,
    onChange: (id: string, value: SectionRowData) => void;
}

const SectionRow = memo(({row, isEditing, onChange}: Props) => {
    const [ draft, setDraft ] = useState<SectionRowData>(row.value || {});

    const handleFieldChange = (fieldName: string, value: any) => {
        const newDraft = {
            ...draft,
            [fieldName]: value
        };

        setDraft(newDraft);

        onChange(row.id, newDraft);
    }

    useEffect(() => {
        setDraft(row.value || {});
    }, [row.value]);

    const [ editingId, setEditingId ] = useState<string | null>(null);

    const renderField = (field: FieldSchema) => {
        if(field.type === 'number'){

            const rule = field.name === 'project_name' ? "uppercaseNoSpecial" : (field.name === 'internal_code' ? "maskXXXX_XXXX" : undefined);
            
            return (
                <EditableRow
                    key={field.name}
                    row={{
                        id: field.name, 
                        label: field.label, 
                        type: field.type,
                        value: draft[field.name], 
                        ...(rule ? { rule } : {})
                    }}
                    isEditing={isEditing}
                    isActive={editingId === field.name}
                    onStartEdit={() => setEditingId(field.name)}
                    onStopEdit={() => setEditingId(field.name)}
                    onChange={handleFieldChange}
                />
            )
        }
        if(field.type === 'textarea'){
            const placeholder = field.name.startsWith('qc') ? "Theo stardard" : "-";

            return (
                <RichTextRow
                    key={field.name}
                    row={{id: field.name, label: field.label, value: draft[field.name]}}
                    isEditing={isEditing}
                    isActive={editingId === field.name}
                    placeholder={placeholder}
                    onStartEdit={() => setEditingId(field.name)}
                    onStopEdit={() => setEditingId(field.name)}
                    onChange={handleFieldChange}
                />
            )
        }
        if(field.type === 'radio'){
            return (
                <RadioRow
                    key={field.name}
                    row={{id: field.name, label: field.label, value: draft[field.name], options: field.options ?? []}}
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                />
            )
        }
        if(field.type === 'range'){
            return (
                <RangeRow
                    key={field.name}
                    row={{id: field.name, label: field.label, value: draft[field.name]}}
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                />
            )
        }
        if(field.type === 'multi-select'){
            return (
                <MultiSelectRow
                    key={field.name}
                    row={{id: field.name, label: field.label, value: draft[field.name], options: field.options ?? []}}
                    isEditing={isEditing}
                    onChange={handleFieldChange} 
                />
            )
        }
        
    }

    const renderMiniTable = (fields: FieldSchema[]) => {
        return (
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableBody>
                        {fields
                            .filter((subField) => !subField.hidden)
                            .map((subField) => (
                            renderField(subField)
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        )
    }

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

export default SectionRow;