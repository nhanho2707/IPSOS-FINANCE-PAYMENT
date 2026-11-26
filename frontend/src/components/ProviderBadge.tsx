import React from "react";
import { Box } from "@mui/material";
import { getProviderStyle } from "../config/ThemeConfig";

// "vinnet" / "gotit" from the API shown as the provider's name with its fixed colour.
const ProviderBadge: React.FC<{ provider: string | null | undefined }> = ({ provider }) => {
    const { label, color } = getProviderStyle(provider);

    return (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, typography: "body2", color: "text.primary" }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: color, flexShrink: 0 }} />
            {label}
        </Box>
    );
};

export default ProviderBadge;
