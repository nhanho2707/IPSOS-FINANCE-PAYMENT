import { Accordion, AccordionDetails, AccordionSummary, Autocomplete, Box, Button, Card, CardContent, CardHeader, Checkbox, FormControl, FormControlLabel, FormLabel, Grid, IconButton, MenuItem, Paper, Radio, RadioGroup, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProjectData } from "../../../config/ProjectFieldsConfig";
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EditableRow from "./EditableRow";
import RichTextRow from "./RichTextRow";
import RadioRow from "./RadioRow";
import MultiSelectRow from "./MultiSelectRow";
import RepeaterRow from "./RepeaterRow";
import SectionRow from "./SectionRow";

interface LayoutSchema {
    xs: number,
    sm: number,
    md: number
}

export interface FieldSchema {
    name: string;
    label: string;
    type: string;
    required?: boolean;
    default?: string | number;
    layout?: LayoutSchema,
    hidden: boolean,
    options?: {value: string, label: string}[];
    fields?: FieldSchema[];
}

interface DynamicFormProps {
    schema: FieldSchema[];
    onSubmit: (data: any) => void;
    initialQuotationData?: any,
    isEditting: boolean,
}

const QuotationDynamicForm: React.FC<DynamicFormProps> = ({ schema, initialQuotationData, isEditting, onSubmit }) => {

    const [ rows, setRows ] = useState<any>({}); 

    useEffect(() => {
        if(initialQuotationData) {
            setRows(initialQuotationData);
        }
    }, [initialQuotationData]);

    const updateRow = useCallback((id: string, value: any) => {
        setRows((prev: any) => ({
            ...prev,
            [id]: value
        }));
    }, []);

    const shouldShowBoosterCondition = rows['sam']

    const [ editingId, setEditingId ] = useState<string | null>(null);

    const renderField = (field: FieldSchema) => {
        if(field.type === 'text' || field.type === 'number'){
            let disabled = field.name == 'internal_code' ? true : !isEditting;
            
            const rule = field.name === 'project_name' ? "uppercaseNoSpecial" : (field.name === 'internal_code' ? "maskXXXX_XXXX" : undefined);

            return (
                <EditableRow
                    key={field.name}
                    row={{
                        id: field.name, 
                        label: field.label, 
                        type: field.type,
                        value: rows[field.name], 
                        ...(rule ? { rule } : {})
                    }}
                    isEditing={isEditting}
                    isActive={editingId === field.name}
                    onStartEdit={() => setEditingId(field.name)}
                    onStopEdit={() => setEditingId(field.name)}
                    onChange={updateRow}
                />
            )
        }

        if(field.type === 'textarea'){
            return (
                <RichTextRow
                    key={field.name}
                    row={{id: field.name, label: field.label, value: rows[field.name]}}
                    isEditing={isEditting}
                    isActive={editingId === field.name}
                    onStartEdit={() => setEditingId(field.name)}
                    onStopEdit={() => setEditingId(field.name)}
                    onChange={updateRow}
                />
            )
        }

        if(field.type === 'radio'){
            return (
                <RadioRow
                    key={field.name}
                    row={{id: field.name, label: field.label, value: rows[field.name], options: field.options ?? []}}
                    isEditing={isEditting}
                    onChange={updateRow}
                />
            )
        }

        if(field.type === 'multi-select'){
            return (
                <MultiSelectRow
                    key={field.name}
                    row={{id: field.name, label: field.label, value: rows[field.name], options: field.options ?? []}}
                    isEditing={isEditting}
                    onChange={updateRow} 
                />
            )
        }

        if(field.type === 'repeater'){
            return (
                <RepeaterRow
                    key={field.name}
                    row={{id:field.name, label: field.label, value: rows[field.name], fields: field.fields ?? []}}
                    isEditing={isEditting}
                    onChange={updateRow}
                />
            )
        }

        if(field.type === 'section'){
            return (
                <SectionRow
                    key={field.name}
                    row={{id: field.name, label: field.label, value: rows[field.name], fields: field.fields ?? []}}
                    isEditing={isEditting}
                    onChange={updateRow}
                />
            )
        }
    }

    return (
        <form
            onSubmit={(e) => {
                console.log(rows)
                e.preventDefault();
                onSubmit(rows);
            }}
        >
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableBody> 
                        {schema.map((field) => {
                            return renderField(field)
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <Button
                type="submit"
                variant="contained"
                sx={{mt: 3}}
                disabled={!isEditting}
            >
                Save
            </Button>
        </form>
    )
}

export default QuotationDynamicForm;