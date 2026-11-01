import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";

export type ConfirmDialogTone = "default" | "danger";

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: React.ReactNode;
    onClose: () => void;
    onConfirm?: () => void;
    showConfirmButton?: boolean;
    confirmText?: string;
    cancelText?: string;
    tone?: ConfirmDialogTone;
    loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    message,
    onClose,
    onConfirm,
    showConfirmButton = true,
    confirmText = "Confirm",
    cancelText,
    tone = "default",
    loading = false,
}) => {
    const hasConfirm = showConfirmButton && Boolean(onConfirm);

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="xs"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
        >
            <DialogTitle id="confirm-dialog-title" sx={{ fontSize: "1.0625rem", fontWeight: 600 }}>
                {title}
            </DialogTitle>
            <DialogContent>
                <DialogContentText
                    id="confirm-dialog-description"
                    component="div"
                    sx={{ whiteSpace: "pre-line", fontSize: "0.875rem" }}
                >
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>
                    {cancelText ?? (hasConfirm ? "Cancel" : "Close")}
                </Button>
                {hasConfirm && (
                    <LoadingButton
                        onClick={onConfirm}
                        variant="contained"
                        color={tone === "danger" ? "error" : "primary"}
                        loading={loading}
                        autoFocus={tone !== "danger"}
                    >
                        {confirmText}
                    </LoadingButton>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
