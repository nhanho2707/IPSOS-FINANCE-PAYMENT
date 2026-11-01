import { List, ListItemButton, ListItemIcon, ListItemText, Popover } from "@mui/material";
import React, { useState } from "react";
import { toProperCase } from "../../utils/format";
import { getStatusTone, PROJECT_STATUS_TONE, StatusTone } from "../../config/ThemeConfig";
import StatusChip, { StatusDot } from "../StatusChip";

type Props = {
    value: string;
    transitions: Record<string, string[]>;
    onChange: (newStatus: string) => void;
    disabled?: boolean;
    toneMap?: Record<string, StatusTone>;
}

export const StatusDropdown: React.FC<Props> = ({
    value,
    transitions,
    onChange,
    disabled,
    toneMap = PROJECT_STATUS_TONE
}) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const open = Boolean(anchorEl);

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
        if (disabled) return;
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const options = transitions[value] ?? [];

    return (
        <>
            <StatusChip
                label={toProperCase(value)}
                tone={getStatusTone(value, toneMap)}
                onClick={options.length > 0 ? handleOpen : undefined}
                showCaret={options.length > 0}
                disabled={disabled}
            />

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{ paper: { sx: { mt: 0.5, minWidth: 160 } } }}
            >
                <List dense disablePadding sx={{ py: 0.5 }}>
                    {options.map((status) => (
                        <ListItemButton
                            key={status}
                            disabled={status === value}
                            onClick={() => {
                                onChange(status);
                                handleClose();
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 20 }}>
                                <StatusDot tone={getStatusTone(status, toneMap)} />
                            </ListItemIcon>
                            <ListItemText
                                primary={toProperCase(status)}
                                primaryTypographyProps={{ fontSize: "0.8125rem" }}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Popover>
        </>
    );
}
