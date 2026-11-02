import React from "react";
import { Breakpoint, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";

interface GenericDialogProps {
    open: boolean,
    title: string,
    children: React.ReactNode,
    onClose: () => void,
    onSubmit: () => void,
    submitText?: string,
    cancelText?: string,
    submitDisabled?: boolean,
    loading?: boolean,
    tone?: "default" | "danger",
    maxWidth?: Breakpoint,
}

const GenericDialog: React.FC<GenericDialogProps> = ({
    open,
    title,
    children,
    onClose,
    onSubmit,
    submitText = "Submit",
    cancelText = "Cancel",
    submitDisabled = false,
    loading = false,
    tone = "default",
    maxWidth = "sm",
}) => {

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth={maxWidth}>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent sx={{ width: '100%', pt: 2 }}>
                {children}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>{cancelText}</Button>
                <Button
                    onClick={onSubmit}
                    variant="contained"
                    color={tone === "danger" ? "error" : "primary"}
                    disabled={submitDisabled}
                    loading={loading}
                >
                    {submitText}
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default GenericDialog;
