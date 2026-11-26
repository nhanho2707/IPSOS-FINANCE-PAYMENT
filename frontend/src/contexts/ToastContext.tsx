import React, { createContext, useCallback, useContext, useState } from "react";
import { Alert, AlertColor, Box, Button, IconButton, Snackbar, SnackbarCloseReason } from "@mui/material";
import { Close } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastState {
    key: number;
    message: string;
    severity: AlertColor;
    action?: ToastAction;
}

interface ToastContextValue {
    showToast: (message: string, severity?: AlertColor, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useTranslation();
    const [toast, setToast] = useState<ToastState | null>(null);
    const [open, setOpen] = useState(false);

    const showToast = useCallback((message: string, severity: AlertColor = "success", action?: ToastAction) => {
        setToast({ key: Date.now(), message, severity, action });
        setOpen(true);
    }, []);

    const handleClose = (_event?: React.SyntheticEvent | Event | null, reason?: SnackbarCloseReason) => {
        if (reason === "clickaway") return;
        setOpen(false);
    };

    // A toast with an action (e.g. Undo) stays longer so there is time to reach the button.
    const autoHideDuration = toast?.action ? 10000 : 4000;

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Snackbar
                key={toast?.key}
                open={open}
                autoHideDuration={autoHideDuration}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={handleClose}
                    severity={toast?.severity ?? "success"}
                    variant="filled"
                    sx={{ fontSize: "0.875rem", minWidth: 280, alignItems: "center" }}
                    action={toast?.action ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => {
                                    setOpen(false);
                                    toast.action?.onClick();
                                }}
                                sx={{ fontWeight: 600 }}
                            >
                                {toast.action.label}
                            </Button>
                            <IconButton color="inherit" size="small" aria-label={t("common.actions.close")} onClick={() => setOpen(false)}>
                                <Close fontSize="small" />
                            </IconButton>
                        </Box>
                    ) : undefined}
                >
                    {toast?.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
