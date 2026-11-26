import React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { STATUS_TONES } from "../config/ThemeConfig";

export type StatCardTone = "default" | "success" | "warning" | "danger";

interface StatCardProps {
    label: React.ReactNode;
    value: React.ReactNode;
    caption?: React.ReactNode;
    // Colours the value only when it needs attention; most cards stay "default".
    tone?: StatCardTone;
    loading?: boolean;
    // Top-right slot, e.g. a warning chip or a small link.
    action?: React.ReactNode;
    // Below the value, e.g. a progress bar.
    children?: React.ReactNode;
}

const TONE_COLOR: Record<StatCardTone, string | undefined> = {
    default: undefined,
    success: STATUS_TONES.success.fg,
    warning: STATUS_TONES.warning.fg,
    danger: STATUS_TONES.danger.fg,
};

const StatCard: React.FC<StatCardProps> = ({ label, value, caption, tone = "default", loading = false, action, children }) => (
    <Box
        sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            minWidth: 0,
            height: "100%",
            p: 2.5,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            borderRadius: "12px",
        }}
    >
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, minHeight: 24 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{label}</Typography>
            {action}
        </Box>
        {loading ? (
            <Skeleton variant="text" width="55%" sx={{ typography: "h1" }} />
        ) : (
            <Typography
                variant="h1"
                component="p"
                sx={{ fontVariantNumeric: "tabular-nums", color: TONE_COLOR[tone], overflowWrap: "anywhere" }}
            >
                {value}
            </Typography>
        )}
        {caption && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {caption}
            </Typography>
        )}
        {children}
    </Box>
);

export default StatCard;
