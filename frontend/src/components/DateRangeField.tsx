import React, { useState } from "react";
import { InputAdornment, Popover, TextField } from "@mui/material";
import { CalendarMonthOutlined } from "@mui/icons-material";
import { Dayjs } from "dayjs";
import { DateRangeForm, DateRangePreset, recentPresets } from "./Table/FilterChip";
import { formatDateRange } from "../utils/format";

interface DateRangeFieldProps {
    label: string;
    from: Dayjs | null;
    to: Dayjs | null;
    onChange: (from: Dayjs, to: Dayjs) => void;
    presets?: DateRangePreset[];
    fullWidth?: boolean;
}

// One field for a date range ("1 – 31 Oct 2026") instead of separate From and To pickers.
const DateRangeField: React.FC<DateRangeFieldProps> = ({ label, from, to, onChange, presets = recentPresets(), fullWidth }) => {
    const [ anchorEl, setAnchorEl ] = useState<HTMLElement | null>(null);

    return (
        <>
            <TextField
                size="small"
                label={label}
                value={formatDateRange(from, to) ?? ""}
                placeholder="Choose dates"
                fullWidth={fullWidth}
                onClick={(event) => setAnchorEl(event.currentTarget)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                        event.preventDefault();
                        setAnchorEl(event.currentTarget);
                    }
                }}
                sx={{ minWidth: 240, "& .MuiInputBase-root, & input": { cursor: "pointer" } }}
                slotProps={{
                    input: {
                        readOnly: true,
                        endAdornment: (
                            <InputAdornment position="end">
                                <CalendarMonthOutlined fontSize="small" />
                            </InputAdornment>
                        ),
                    },
                    htmlInput: { "aria-haspopup": "dialog" },
                    inputLabel: { shrink: true },
                }}
            />
            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{ paper: { sx: { mt: 0.75 } } }}
            >
                <DateRangeForm
                    from={from}
                    to={to}
                    presets={presets}
                    onApply={(nextFrom, nextTo) => {
                        onChange(nextFrom, nextTo);
                        setAnchorEl(null);
                    }}
                />
            </Popover>
        </>
    );
};

export default DateRangeField;
