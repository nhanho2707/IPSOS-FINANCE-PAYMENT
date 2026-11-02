import React from "react";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import { BRAND } from "../../config/ThemeConfig";

interface BulkActionBarProps {
    // e.g. "3 respondents selected"
    label: React.ReactNode;
    summary?: React.ReactNode;
    // The main bulk action (one contained button) plus anything secondary.
    actions?: React.ReactNode;
    // e.g. a text button "Select all 380 pending".
    extra?: React.ReactNode;
    onClear?: () => void;
    // While a bulk run is in progress: 0–100 and a line saying how far it got.
    progress?: { value: number; label: React.ReactNode };
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({ label, summary, actions, extra, onClear, progress }) => (
    <Box
        role="region"
        aria-label="Bulk actions"
        sx={{ bgcolor: BRAND.soft, borderBottom: 1, borderColor: "divider" }}
    >
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                columnGap: 1.5,
                rowGap: 1,
                minHeight: 52,
                px: 2,
                py: 1,
            }}
        >
            <Box sx={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 1.25, minWidth: 0 }} aria-live="polite">
                <Typography variant="body2" fontWeight={600}>
                    {progress ? progress.label : label}
                </Typography>
                {!progress && summary && (
                    <Typography variant="body2" color="text.secondary">
                        {summary}
                    </Typography>
                )}
            </Box>
            {!progress && extra}
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {!progress && onClear && (
                    <Button color="inherit" size="small" onClick={onClear}>
                        Clear selection
                    </Button>
                )}
                {actions}
            </Box>
        </Box>
        {progress && (
            <LinearProgress
                variant="determinate"
                value={progress.value}
                aria-label="Bulk progress"
                sx={{ height: 3 }}
            />
        )}
    </Box>
);

export default BulkActionBar;
