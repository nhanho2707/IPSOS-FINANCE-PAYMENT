import { useEffect, useState } from "react";
import { Button, Paper, Table, TableBody, TableContainer } from "@mui/material";
import { DynamicFormProps, renderField } from "../../../utils/renderFields";

const OperationsDynamicForm: React.FC<DynamicFormProps> = ({
    schema,
    initialData,
    isEditting,
    onSubmit
}) => {
    const [ rows, setRows ] = useState<any>({});

    useEffect(() => {
        if(initialData) {
            setRows(initialData);
        }
    }, [initialData]);

    const updateRow = (id: string, value: any) => {
        setRows((prev: any) => ({
            ...prev,
            [id]: value
        }));
    };

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
                    <Table size="small">
                        <TableBody>
                            {schema.map((field) => renderField({
                                field,
                                rows,
                                isEditting,
                                editingId,
                                setEditingId,
                                updateRow
                            }))}
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

export default OperationsDynamicForm;