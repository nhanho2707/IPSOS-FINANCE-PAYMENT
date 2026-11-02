import {
    Button,
    Paper,
    Table,
    TableBody,
    TableContainer
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DynamicFormProps, renderField } from "../../../utils/renderFields";

const QuotationDynamicForm: React.FC<DynamicFormProps> = ({ schema, initialData, isEditting, onSubmit, onProjectTypeChange, feedbacks, onFeedbackSave, onFeedbackResponse }) => {

    const [ rows, setRows ] = useState<any>({});

    useEffect(() => {
        if(initialData) {
            setRows(initialData);
        }
    }, [initialData]);

    const updateRow = useCallback((id: string, value: any) => {
        setRows((prev: any) => ({
            ...prev,
            [id]: value
        }));
        if (id === 'project_types' && onProjectTypeChange) {
            const type = Array.isArray(value) ? value[0] : value;
            if (type) onProjectTypeChange(type);
        }
    }, [onProjectTypeChange]);
    
    const shouldShowBoosterCondition = rows['sam']

    // Derive target_audience options from target_audiences repeater data
    const enrichedSchema = useMemo(() => {
        const raw = rows['target_audiences'];
        const audiences: any[] = Array.isArray(raw) ? raw : [];
        const audienceOptions = audiences
            .filter((a: any) => a?.target_audience)
            .map((a: any) => ({ value: a.target_audience, label: a.target_audience }));

        if (audienceOptions.length === 0) return schema;

        return schema.map((field: any) => {
            if (field.name !== 'implementation_area') return field;
            return {
                ...field,
                fields: (field.fields || []).map((subField: any) =>
                    subField.name === 'target_audience'
                        ? { ...subField, options: audienceOptions }
                        : subField
                )
            };
        });
    }, [schema, rows['target_audiences']]);

    const [ editingId, setEditingId ] = useState<string | null>(null);

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(rows);
            }}
        >
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
                <TableContainer>
                    <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '250px' }} />
                            <col />
                        </colgroup>
                        <TableBody>
                            {enrichedSchema
                                .filter((field) => !field.hidden)
                                .map((field) => renderField({
                                    field,
                                    rows,
                                    isEditting,
                                    editingId,
                                    setEditingId,
                                    updateRow,
                                    feedbacks,
                                    onFeedbackSave,
                                    onFeedbackResponse,
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            <Button
                variant="contained"
                type="submit"
                sx={{ mt: 2 }}
                disabled={!isEditting}
            >
                Save
            </Button>
        </form>
    )
}

export default QuotationDynamicForm;