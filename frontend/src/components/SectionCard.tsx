import React from "react";
import { Box, Paper, Typography } from "@mui/material";

interface SectionCardProps {
    title: string;
    description?: React.ReactNode;
    // Right side of the header, e.g. a legend, a toggle or an export button.
    action?: React.ReactNode;
    children: React.ReactNode;
    // The body fills the card, for content that brings its own padding.
    flush?: boolean;
}

// A titled card for one block of a page: a chart, a form section, a short list.
const SectionCard: React.FC<SectionCardProps> = ({ title, description, action, children, flush = false }) => (
    <Paper elevation={0} sx={{ height: "100%", display: "flex", flexDirection: "column", border: 1, borderColor: "divider", borderRadius: "12px", bgcolor: "background.paper", overflow: "hidden" }}>
        <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 1.5, justifyContent: "space-between", px: 2.5, py: 1.75, borderBottom: 1, borderColor: "divider" }}>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h2" component="h2">{title}</Typography>
                {description && <Typography variant="body2" sx={{ color: "text.secondary" }}>{description}</Typography>}
            </Box>
            {action}
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, p: flush ? 0 : 2.5 }}>{children}</Box>
    </Paper>
);

export default SectionCard;
