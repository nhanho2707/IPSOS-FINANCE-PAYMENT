import React from "react";
import { Box, Typography } from "@mui/material";
import { InboxOutlined } from "@mui/icons-material";
import { NEUTRAL } from "../config/ThemeConfig";

interface EmptyStateProps {
    title: string;
    description?: React.ReactNode;
    // Usually one button that gets the user out of the empty state, e.g. "Import respondents" or "Clear filters".
    action?: React.ReactNode;
    icon?: React.ElementType;
    dense?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon: Icon = InboxOutlined, dense = false }) => (
    <Box
        sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            px: 2,
            py: dense ? 4 : 7,
        }}
    >
        <Box
            sx={{
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                mb: 1.5,
                borderRadius: "50%",
                bgcolor: NEUTRAL[100],
                color: NEUTRAL[500],
            }}
        >
            <Icon sx={{ fontSize: 22 }} />
        </Box>
        <Typography variant="h3" component="p">
            {title}
        </Typography>
        {description && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, maxWidth: 440, whiteSpace: "normal" }}>
                {description}
            </Typography>
        )}
        {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
);

export default EmptyState;
