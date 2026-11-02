import React, { useId } from "react";
import { Box, Drawer, IconButton, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";

interface DetailDrawerProps {
    open: boolean;
    onClose: () => void;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: number;
}

// Right-hand panel for details and long forms: the list stays visible behind it,
// and the body scrolls while the header and footer stay put.
const DetailDrawer: React.FC<DetailDrawerProps> = ({ open, onClose, title, subtitle, children, footer, width = 560 }) => {
    const titleId = useId();

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    role: "dialog",
                    "aria-modal": true,
                    "aria-labelledby": titleId,
                    sx: { width: { xs: "100%", sm: width }, maxWidth: "100%", display: "flex", flexDirection: "column" },
                }
            }}
        >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, px: 3, py: 2, borderBottom: 1, borderColor: "divider" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography id={titleId} variant="h2" component="h2">
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <IconButton aria-label="Close" edge="end" onClick={onClose} sx={{ mt: -0.5 }}>
                    <Close fontSize="small" />
                </IconButton>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 3, py: 2.5 }}>{children}</Box>

            {footer && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 3, py: 1.5, borderTop: 1, borderColor: "divider" }}>
                    {footer}
                </Box>
            )}
        </Drawer>
    );
};

export default DetailDrawer;
