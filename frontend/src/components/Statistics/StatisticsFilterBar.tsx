import React from "react";
import { Box, Button } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { CHANNELS, formatHourRange, StatisticsFilters, TransactionChannel, WAIT_BUCKET_LABELS, WEEKDAY_LABELS } from "../../config/StatisticsConfig";
import { PROVIDER_STYLES } from "../../config/ThemeConfig";
import FilterChip, { DateRangeFilter, DateRangePreset, SelectFilter } from "../Table/FilterChip";

const statisticsPresets = (): DateRangePreset[] => {
    const now = dayjs();
    const lastDays = (days: number) => ({ label: `Last ${days} days`, from: now.subtract(days - 1, "day").startOf("day"), to: now.endOf("day") });

    return [
        lastDays(7),
        lastDays(30),
        lastDays(90),
        { label: "This month", from: now.startOf("month"), to: now.endOf("month") },
        { label: "Last month", from: now.subtract(1, "month").startOf("month"), to: now.subtract(1, "month").endOf("month") },
    ];
};

interface StatisticsFilterBarProps {
    filters: StatisticsFilters;
    dateFrom: Dayjs | null;
    dateTo: Dayjs | null;
    onDateRangeChange: (from: Dayjs | null, to: Dayjs | null) => void;
    onChannelChange: (channel: TransactionChannel | "") => void;
    onClearEmployee: () => void;
    onClearWait: () => void;
    onClearSlot: () => void;
    onReset: () => void;
    isFiltered: boolean;
    // In front of the filters, e.g. the project picker on the Finance page.
    leading?: React.ReactNode;
}

// One row above everything it scopes: the date range and channel, then whatever was picked in the charts.
const StatisticsFilterBar: React.FC<StatisticsFilterBarProps> = ({ filters, dateFrom, dateTo, onDateRangeChange, onChannelChange, onClearEmployee, onClearWait, onClearSlot, onReset, isFiltered, leading }) => (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        {leading}
        <DateRangeFilter label="Interview date" from={dateFrom} to={dateTo} onChange={onDateRangeChange} presets={statisticsPresets()} />
        <SelectFilter
            label="Channel"
            value={filters.channel ?? ""}
            options={CHANNELS.map((channel) => ({ value: channel, label: PROVIDER_STYLES[channel].label }))}
            onChange={onChannelChange}
        />
        {filters.employee && <FilterChip label="Interviewer" value={filters.employee} onClear={onClearEmployee} />}
        {filters.wait && <FilterChip label="Wait" value={WAIT_BUCKET_LABELS[filters.wait]} onClear={onClearWait} />}
        {filters.hour !== null && filters.hour !== undefined && (
            <FilterChip
                label="Time"
                value={`${filters.weekday ? `${WEEKDAY_LABELS[filters.weekday - 1]}, ` : ""}${formatHourRange(filters.hour)}`}
                onClear={onClearSlot}
            />
        )}
        {isFiltered && <Button size="small" color="inherit" onClick={onReset}>Reset</Button>}
    </Box>
);

export default StatisticsFilterBar;
