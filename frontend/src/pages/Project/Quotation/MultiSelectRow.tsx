import { Autocomplete, Box, Checkbox, TableCell, TableRow, TextField } from "@mui/material";
import { memo } from "react";
import { Theme } from "@mui/material/styles";

type Option = { value: string | number, label: string, parent?: string | number };

type Props = {
    row: {
        id: string,
        label: string,
        value: Option[],
        options: Option[],
        placeholder: string
    };
    isEditing: boolean;
    isDisabled?: boolean;
    onChange: (id: string, value: any) => void;
}

const MultiSelectRow = memo(({ row, isEditing, isDisabled, onChange}: Props) => {
    return (
        <TableRow>
            <TableCell
                width={200}
                sx={{ fontWeight: 600 }}
            >
                {row.label}
            </TableCell>
            <TableCell>
                <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={row.options || []}
                    value={row.value || []}
                    disabled={!isEditing || isDisabled}
                    onChange={(_, newValue) => onChange(row.id, newValue)}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    renderOption={(props, option, { selected }) => (
                        <li {...props}>
                            <Checkbox style={{ marginRight: 8 }} checked={selected} />
                            {option.label}
                        </li>
                    )}
                    renderInput={(params) => (
                        <TextField {...params} size="small" placeholder={row.placeholder} />
                    )}
                    sx={{
                        "& .Mui-disabled": { WebkitTextFillColor: (theme: Theme) => theme.palette.text.primary, opacity: 0.9 },
                    }}
                />
            </TableCell>
        </TableRow>
    );
});

export default MultiSelectRow;
