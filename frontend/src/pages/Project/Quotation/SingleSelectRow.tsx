import { Autocomplete, TableCell, TableRow, TextField } from "@mui/material";
import { memo, useState } from "react";
import ConfirmDialog from "../../../components/Dialogs/ConfirmDialog";
import { Theme } from "@mui/material/styles";

type Option = { value: string | number; label: string; parent?: string | number };

type Props = {
    row: {
        id: string;
        label: string;
        value: any;
        placeholder: string;
        options: Option[];
    };
    isEditing: boolean;
    isDisabled?: boolean;
    onChange: (id: string, value: string[]) => void;
    confirmMessage?: string;
};

const toSingleString = (value: any): string => {
    if (!value) return "";
    if (Array.isArray(value)) {
        const first = value[0];
        if (!first) return "";
        return typeof first === "string" ? first : (first.label ?? "");
    }
    if (typeof value === "string") return value;
    if (typeof value === "object" && value.label) return value.label;
    return "";
};

const SingleSelectRow = memo(({ row, isEditing, isDisabled, onChange, confirmMessage }: Props) => {
    const selected = toSingleString(row.value);
    const selectedOption = row.options.find((o) => o.label === selected) ?? null;

    const [pendingOption, setPendingOption] = useState<Option | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleChange = (_: any, newValue: Option | null) => {
        if (!newValue || newValue.label === selected) return;
        if (confirmMessage) {
            setPendingOption(newValue);
            setConfirmOpen(true);
        } else {
            onChange(row.id, [newValue.label]);
        }
    };

    const handleConfirm = () => {
        if (pendingOption) onChange(row.id, [pendingOption.label]);
        setConfirmOpen(false);
        setPendingOption(null);
    };

    const handleCancel = () => {
        setConfirmOpen(false);
        setPendingOption(null);
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
                    sx={{ fontWeight: 600 }}
                >
                    {row.label}
                </TableCell>
                <TableCell>
                    <Autocomplete
                        fullWidth
                        options={row.options}
                        value={selectedOption}
                        onChange={handleChange}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        disabled={!isEditing || isDisabled}
                        renderInput={(params) => (
                            <TextField {...params} size="small" placeholder={row.placeholder} />
                        )}
                        sx={{
                            "& .Mui-disabled": { WebkitTextFillColor: (theme: Theme) => theme.palette.text.primary, opacity: 0.9 },
                        }}
                    />
                </TableCell>
            </TableRow>

            {confirmMessage && (
                <ConfirmDialog
                    open={confirmOpen}
                    title="Confirm change"
                    message={confirmMessage.replace("{value}", pendingOption?.label ?? "")}
                    showConfirmButton={true}
                    onClose={handleCancel}
                    onConfirm={handleConfirm}
                />
            )}
        </>
    );
});

export default SingleSelectRow;
