import React from "react";
import { Box, SxProps, Theme } from "@mui/material";

const IS_APPLE = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);

export const SEARCH_SHORTCUT_LABEL = IS_APPLE ? "⌘K" : "Ctrl K";

const Kbd: React.FC<{ children: React.ReactNode; sx?: SxProps<Theme> }> = ({ children, sx }) => (
    <Box
        component="kbd"
        sx={[
            {
                display: "inline-flex",
                alignItems: "center",
                height: 20,
                px: 0.75,
                fontFamily: "inherit",
                typography: "caption",
                lineHeight: 1,
                color: "text.secondary",
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                whiteSpace: "nowrap",
            },
            ...(Array.isArray(sx) ? sx : [sx]),
        ]}
    >
        {children}
    </Box>
);

export default Kbd;
