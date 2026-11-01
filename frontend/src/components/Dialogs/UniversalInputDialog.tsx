import { TextField } from "@mui/material";
import { useEffect, useState } from "react";
import GenericDialog from "./GenericDialog";

interface UniversalInputProps {
    open: boolean,
    onClose: () => void,
    onSubmit: (value: string) => void,
    defaultValue?: string,
    title: string,
    label: string,
    placeholder?: string,
    submitText?: string,
}

const UniversalInputDialog: React.FC<UniversalInputProps> = ({ open, onClose, onSubmit, defaultValue = "", title, label, placeholder, submitText }) => {
    const [ value, setValue ] = useState("");

    useEffect(() => {
        if (open) setValue(defaultValue)
    }, [open, defaultValue]);

    const handleSubmit = () => {
        onSubmit(value);
        setValue("");
    }

    return (
        <GenericDialog
            open={open}
            title={title}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitText={submitText}
            submitDisabled={!value.trim()}
        >
            <TextField
                autoFocus
                label={label}
                multiline
                rows={10}
                fullWidth
                value={value}
                placeholder={placeholder}
                onChange={(e) => setValue(e.target.value)}
                sx={{ mt: 1 }}
            />
        </GenericDialog>
    );
}

export default UniversalInputDialog;
