import React, { createContext, useCallback, useContext, useState } from "react";
import { Alert, AlertColor, Snackbar, SnackbarCloseReason } from "@mui/material";

interface ToastState {
    key: number;
    message: string;
    severity: AlertColor;
}

interface ToastContextValue {
    showToast: (message: string, severity?: AlertColor) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ToastState | null>(null);
    const [open, setOpen] = useState(false);

    const showToast = useCallback((message: string, severity: AlertColor = "success") => {
        setToast({ key: Date.now(), message, severity });
        setOpen(true);
    }, []);

    const handleClose = (_event?: React.SyntheticEvent | Event | null, reason?: SnackbarCloseReason) => {
        if (reason === "clickaway") return;
        setOpen(false);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Snackbar
                key={toast?.key}
                open={open}
                autoHideDuration={4000}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={handleClose}
                    severity={toast?.severity ?? "success"}
                    variant="filled"
                    sx={{ fontSize: "0.875rem", minWidth: 280 }}
                >
                    {toast?.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
