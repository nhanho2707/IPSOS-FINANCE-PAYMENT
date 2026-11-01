import { useEffect, useState } from "react";
import { TextField } from "@mui/material";
import GenericDialog from "./GenericDialog";

interface RejectDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    title: string;
    message: string;
    submitText?: string;
}

const RejectDialog: React.FC<RejectDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    submitText = "Gửi lý do",
}) => {
    const [rejectReason, setRejectReason] = useState<string>('');

    useEffect(() => {
        if (open) setRejectReason('');
    }, [open]);

    const handleConfirm = () => {
        onConfirm(rejectReason.trim());
        onClose();
    };

    return (
        <GenericDialog
            open={open}
            title={title}
            onClose={onClose}
            onSubmit={handleConfirm}
            submitText={submitText}
            cancelText="Huỷ"
            submitDisabled={!rejectReason.trim()}
            tone="danger"
        >
            <TextField
                autoFocus
                placeholder={message}
                multiline
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                fullWidth
                sx={{ mt: 1 }}
            />
        </GenericDialog>
    );
};

export default RejectDialog;
