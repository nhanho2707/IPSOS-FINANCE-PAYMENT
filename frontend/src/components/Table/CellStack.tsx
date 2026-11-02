import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";

interface CellStackProps {
    primary: React.ReactNode;
    secondary?: React.ReactNode;
    // Full text for the tooltip when either line may be cut off.
    title?: string;
    // Codes and phone numbers line up better with tabular figures.
    numeric?: boolean;
}

const lineSx = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;

// Two lines in one cell: the thing itself, then what identifies it ("Name" over "code · Symphony").
const CellStack: React.FC<CellStackProps> = ({ primary, secondary, title, numeric = false }) => {
    const content = (
        <Box sx={{ minWidth: 0, py: 0.25, fontVariantNumeric: numeric ? "tabular-nums" : undefined }}>
            <Typography component="span" variant="body2" sx={{ ...lineSx, fontWeight: 500, color: "text.primary" }}>
                {primary}
            </Typography>
            {secondary && (
                <Typography component="span" variant="caption" color="text.secondary" sx={lineSx}>
                    {secondary}
                </Typography>
            )}
        </Box>
    );

    return title ? (
        <Tooltip title={title} placement="top-start" enterDelay={600}>
            {content}
        </Tooltip>
    ) : content;
};

export default CellStack;
