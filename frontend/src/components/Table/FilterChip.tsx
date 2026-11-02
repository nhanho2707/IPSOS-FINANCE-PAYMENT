import React, { useState } from "react";
import { Box, Button, Chip, ListItemText, MenuItem, MenuList, Popover, Stack, Typography } from "@mui/material";
import { AddCircleOutlineOutlined, Check, Close } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { NEUTRAL } from "../../config/ThemeConfig";
import { formatDateRange } from "../../utils/format";

interface FilterChipProps {
    label: string;
    // When set, the chip reads "Label: value" and can be cleared.
    value?: React.ReactNode;
    onClear?: () => void;
    // Popover content; call close() once the filter is applied.
    children?: (close: () => void) => React.ReactNode;
    // Toggle filters have no popover: the chip itself switches on and off.
    active?: boolean;
    onClick?: () => void;
}

// Stripe-style filter: an unset filter is a dashed "+ Label" chip, a set one shows its value.
const FilterChip: React.FC<FilterChipProps> = ({ label, value, onClear, children, active, onClick }) => {
    const [ anchorEl, setAnchorEl ] = useState<HTMLElement | null>(null);
    const isToggle = active !== undefined;
    const isSet = isToggle ? active : value !== undefined && value !== null && value !== "";
    const close = () => setAnchorEl(null);

    const icon = isToggle
        ? (active ? <Check /> : <AddCircleOutlineOutlined />)
        : (isSet ? undefined : <AddCircleOutlineOutlined />);

    return (
        <>
            <Chip
                variant="outlined"
                icon={icon}
                label={
                    isSet && value ? (
                        <>
                            {label}: <Box component="span" sx={{ fontWeight: 600 }}>{value}</Box>
                        </>
                    ) : label
                }
                onClick={children ? (event) => setAnchorEl(event.currentTarget) : onClick}
                onDelete={!isToggle && isSet && onClear ? onClear : undefined}
                deleteIcon={<Close aria-label={`Clear ${label} filter`} />}
                aria-haspopup={children ? "dialog" : undefined}
                aria-pressed={isToggle ? active : undefined}
                sx={{
                    height: 32,
                    maxWidth: "100%",
                    typography: "body2",
                    borderStyle: isSet ? "solid" : "dashed",
                    borderColor: isSet ? NEUTRAL[300] : NEUTRAL[400],
                    bgcolor: "background.paper",
                    color: isSet ? "text.primary" : "text.secondary",
                    "& .MuiChip-icon": { fontSize: 16, color: isSet ? "primary.main" : "inherit", ml: 1 },
                    "& .MuiChip-deleteIcon": { fontSize: 16, color: "text.secondary", "&:hover": { color: "text.primary" } },
                }}
            />
            {children && (
                <Popover
                    open={Boolean(anchorEl)}
                    anchorEl={anchorEl}
                    onClose={close}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                    slotProps={{ paper: { sx: { mt: 0.75 } } }}
                >
                    {children(close)}
                </Popover>
            )}
        </>
    );
};

export interface DateRangePreset {
    label: string;
    from: Dayjs;
    to: Dayjs;
}

export const recentPresets = (): DateRangePreset[] => {
    const now = dayjs();
    return [
        { label: "This month", from: now.startOf("month"), to: now.endOf("month") },
        { label: "Last month", from: now.subtract(1, "month").startOf("month"), to: now.subtract(1, "month").endOf("month") },
        { label: "Last 30 days", from: now.subtract(29, "day").startOf("day"), to: now.endOf("day") },
    ];
};

export const yearPresets = (): DateRangePreset[] => {
    const now = dayjs();
    return [
        { label: "This year", from: now.startOf("year"), to: now.endOf("year") },
        { label: "Last year", from: now.subtract(1, "year").startOf("year"), to: now.subtract(1, "year").endOf("year") },
        { label: "Next year", from: now.add(1, "year").startOf("year"), to: now.add(1, "year").endOf("year") },
    ];
};

export const DateRangeForm: React.FC<{
    from: Dayjs | null;
    to: Dayjs | null;
    presets: DateRangePreset[];
    onApply: (from: Dayjs, to: Dayjs) => void;
}> = ({ from, to, presets, onApply }) => {
    const [ draftFrom, setDraftFrom ] = useState<Dayjs | null>(from);
    const [ draftTo, setDraftTo ] = useState<Dayjs | null>(to);
    const outOfOrder = Boolean(draftFrom && draftTo && draftFrom.isAfter(draftTo));
    const canApply = Boolean(draftFrom?.isValid() && draftTo?.isValid()) && !outOfOrder;

    return (
        <Box sx={{ p: 2, width: 300 }}>
            {presets.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>
                    {presets.map((preset) => (
                        <Chip
                            key={preset.label}
                            size="small"
                            label={preset.label}
                            onClick={() => onApply(preset.from, preset.to)}
                        />
                    ))}
                </Box>
            )}
            <Stack spacing={1.5}>
                <DatePicker
                    label="From"
                    value={draftFrom}
                    onChange={setDraftFrom}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
                <DatePicker
                    label="To"
                    value={draftTo}
                    onChange={setDraftTo}
                    slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
            </Stack>
            {outOfOrder && (
                <Typography variant="caption" color="error" component="p" sx={{ mt: 1 }}>
                    The start date must be on or before the end date.
                </Typography>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                    variant="contained"
                    size="small"
                    disabled={!canApply}
                    onClick={() => draftFrom && draftTo && onApply(draftFrom, draftTo)}
                >
                    Apply
                </Button>
            </Box>
        </Box>
    );
};

interface DateRangeFilterProps {
    label: string;
    from: Dayjs | null;
    to: Dayjs | null;
    onChange: (from: Dayjs | null, to: Dayjs | null) => void;
    presets?: DateRangePreset[];
    // Without it the range cannot be removed, only changed.
    clearable?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ label, from, to, onChange, presets = yearPresets(), clearable = true }) => (
    <FilterChip
        label={label}
        value={formatDateRange(from, to) ?? undefined}
        onClear={clearable ? () => onChange(null, null) : undefined}
    >
        {(close) => (
            <DateRangeForm
                from={from}
                to={to}
                presets={presets}
                onApply={(nextFrom, nextTo) => {
                    onChange(nextFrom, nextTo);
                    close();
                }}
            />
        )}
    </FilterChip>
);

export interface SelectFilterOption<T extends string | number> {
    value: T;
    label: string;
}

interface SelectFilterProps<T extends string | number> {
    label: string;
    // "" means no filter.
    value: T | "";
    options: SelectFilterOption<T>[];
    onChange: (value: T | "") => void;
}

export const SelectFilter = <T extends string | number>({ label, value, options, onChange }: SelectFilterProps<T>) => {
    const selected = options.find((option) => option.value === value);

    return (
        <FilterChip label={label} value={selected?.label} onClear={() => onChange("")}>
            {(close) => (
                <MenuList dense autoFocusItem sx={{ minWidth: 200, maxHeight: 320, overflowY: "auto" }}>
                    {options.length === 0 && (
                        <MenuItem disabled sx={{ typography: "body2" }}>No options</MenuItem>
                    )}
                    {options.map((option) => (
                        <MenuItem
                            key={option.value}
                            selected={option.value === value}
                            onClick={() => {
                                onChange(option.value);
                                close();
                            }}
                        >
                            <ListItemText slotProps={{ primary: { variant: "body2" } }}>{option.label}</ListItemText>
                            {option.value === value && <Check fontSize="small" sx={{ ml: 2, color: "primary.main" }} />}
                        </MenuItem>
                    ))}
                </MenuList>
            )}
        </FilterChip>
    );
};

export default FilterChip;
