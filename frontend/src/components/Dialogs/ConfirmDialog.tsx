import React from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";
import T from "../../i18n/T";

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
    confirmText,
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
            <DialogTitle id="confirm-dialog-title">
                {title}
            </DialogTitle>
            <DialogContent>
                <DialogContentText
                    id="confirm-dialog-description"
                    component="div"
                    sx={{ whiteSpace: "pre-line" }}
                >
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>
                    {cancelText ?? <T k={hasConfirm ? "common.actions.cancel" : "common.actions.close"} />}
                </Button>
                {hasConfirm && (
                    <Button
                        onClick={onConfirm}
                        variant="contained"
                        color={tone === "danger" ? "error" : "primary"}
                        loading={loading}
                        autoFocus={tone !== "danger"}
                    >
                        {confirmText ?? <T k="common.actions.confirm" />}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
