import { Box, IconButton, List, ListItemButton, ListItemText, Popover } from "@mui/material";
import React, { useState } from "react";

type Props = {
    value: string;
    transitions: Record<string, string[]>;
    onChange: (newStatus: string) => void;
    disabled?: boolean
}

const formatClass = (status: string) =>
    status.toLowerCase().replace(/\s+/g, "-");
 
const toProperCase = (str: string) =>
    str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
 

export const StatusDropdown: React.FC<Props> = ({
    value,
    transitions,
    onChange,
    disabled
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
            {/* Button */}
            <IconButton size="small" onClick={handleOpen} disabled={disabled}>
                <Box className={`box-status-button ${formatClass(value)}`}>
                    {toProperCase(value)}
                </Box>
            </IconButton>
        
            {/* Popover */}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left"
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "center"
                }}
            >
                <List>
                    {options.map((status) => (
                        <ListItemButton
                            key={status}
                            disabled={status === value}
                            onClick={() => {
                                onChange(status);
                                handleClose();
                            }}
                        >
                            <ListItemText
                                primary={
                                    <Box className="box-status-popover">
                                        <Box className={`icon-status-project ${formatClass(status)}`} />
                                        <Box>{toProperCase(status)}</Box>
                                    </Box>
                                        }
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Popover>
        </>
    );
}