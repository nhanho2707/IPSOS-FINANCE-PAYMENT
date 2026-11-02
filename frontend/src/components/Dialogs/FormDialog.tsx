import React from "react";
import {
    Alert,
    Box,
    Breakpoint,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";

interface FormDialogProps {
    open: boolean;
    title: string;
    description?: React.ReactNode;
    // Server or validation error for the whole form, shown above the fields.
    error?: string | null;
    children: React.ReactNode;
    onClose: () => void;
    onSubmit: () => void;
    submitText?: string;
    cancelText?: string;
    submitDisabled?: boolean;
    loading?: boolean;
    tone?: "default" | "danger";
    maxWidth?: Breakpoint;
}

// A short form in a dialog. The content is a real <form>, so Enter in a field submits it.
const FormDialog: React.FC<FormDialogProps> = ({
    open,
    title,
    description,
    error,
    children,
    onClose,
    onSubmit,
    submitText = "Save",
    cancelText = "Cancel",
    submitDisabled = false,
    loading = false,
    tone = "default",
    maxWidth = "sm",
}) => (
    <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        fullWidth
        maxWidth={maxWidth}
    >
        {/* display: contents keeps the dialog's own flex layout (scrolling content, fixed actions). */}
        <Box
            component="form"
            noValidate
            onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                if (!submitDisabled && !loading) onSubmit();
            }}
            sx={{ display: "contents" }}
        >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
            {description && (
                <DialogContentText variant="body2" sx={{ mb: 2 }}>
                    {description}
                </DialogContentText>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 2, whiteSpace: "pre-line" }}>
                    {error}
                </Alert>
            )}
            {/* Room for the floating label of the first outlined field. */}
            <Box sx={{ pt: description || error ? 0 : 1 }}>{children}</Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} color="inherit" disabled={loading}>
                {cancelText}
            </Button>
            <Button
                type="submit"
                variant="contained"
                color={tone === "danger" ? "error" : "primary"}
                disabled={submitDisabled}
                loading={loading}
            >
                {submitText}
            </Button>
        </DialogActions>
        </Box>
    </Dialog>
);

export default FormDialog;
