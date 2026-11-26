import { TableCell, TableRow, TextField } from "@mui/material";
import { memo } from "react";
import { InputRule, useInputRule } from "../../../hook/useInputRule";

export type RowType = "text" | "number";

type Props = {
    row: {
        id: string,
        label: string,
        value: any,
        type: RowType,
        placeholder?: string,
        rule?: InputRule
    };
    isEditing: boolean;
    isActive?: boolean;
    onStartEdit?: () => void;
    onStopEdit?: () => void;
    onChange: ( id: string, value: string ) => void;
}

const EditableRow = memo(({ row, isEditing, onChange }: Props) => {

    const { apply } = useInputRule();

    return (
        <TableRow
            sx={{
                "&:hover": { backgroundColor: "action.hover" },
                "&:last-child td": { border: 0 },
            }}
        >
            <TableCell
                width={200}
                sx={{ fontWeight: 600 }}
            >
                {row.label}
            </TableCell>
            <TableCell>
                <TextField
                    fullWidth
                    size="small"
                    type={row.type === "number" ? "number" : "text"}
                    disabled={!isEditing}
                    value={row.value ?? ""}
                    placeholder={row.placeholder || ""}
                    onChange={(e) => onChange(row.id, apply(e.target.value, row.rule))}
                />
            </TableCell>
        </TableRow>
    )
});

export default EditableRow;
