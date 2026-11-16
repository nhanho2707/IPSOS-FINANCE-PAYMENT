import React from "react";
import { Box, Button } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { CHANNELS, formatHourRange, StatisticsFilters, TransactionChannel, waitBucketLabel, weekdayLabel } from "../../config/StatisticsConfig";
import { getProviderStyle } from "../../config/ThemeConfig";
import FilterChip, { DateRangeFilter, DateRangePreset, SelectFilter } from "../Table/FilterChip";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";

const statisticsPresets = (): DateRangePreset[] => {
    const now = dayjs();
    const lastDays = (days: number) => ({ label: i18n.t("common.filters.presets.lastDays", { count: days }), from: now.subtract(days - 1, "day").startOf("day"), to: now.endOf("day") });

    return [
        lastDays(7),
        lastDays(30),
        lastDays(90),
        { label: i18n.t("common.filters.presets.thisMonth"), from: now.startOf("month"), to: now.endOf("month") },
        { label: i18n.t("common.filters.presets.lastMonth"), from: now.subtract(1, "month").startOf("month"), to: now.subtract(1, "month").endOf("month") },
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
const StatisticsFilterBar: React.FC<StatisticsFilterBarProps> = ({ filters, dateFrom, dateTo, onDateRangeChange, onChannelChange, onClearEmployee, onClearWait, onClearSlot, onReset, isFiltered, leading }) => {
    const { t } = useTranslation();

    return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        {leading}
        <DateRangeFilter label={t("statistics.filters.interviewDate")} from={dateFrom} to={dateTo} onChange={onDateRangeChange} presets={statisticsPresets()} />
        <SelectFilter
            label={t("statistics.filters.channel")}
            value={filters.channel ?? ""}
            options={CHANNELS.map((channel) => ({ value: channel, label: getProviderStyle(channel).label }))}
            onChange={onChannelChange}
        />
        {filters.employee && <FilterChip label={t("statistics.filters.interviewer")} value={filters.employee} onClear={onClearEmployee} />}
        {filters.wait && <FilterChip label={t("statistics.filters.wait")} value={waitBucketLabel(filters.wait)} onClear={onClearWait} />}
        {filters.hour !== null && filters.hour !== undefined && (
            <FilterChip
                label={t("statistics.filters.time")}
                value={`${filters.weekday ? `${weekdayLabel(filters.weekday)}, ` : ""}${formatHourRange(filters.hour)}`}
                onClear={onClearSlot}
            />
        )}
        {isFiltered && <Button size="small" color="inherit" onClick={onReset}>{t("statistics.filters.reset")}</Button>}
    </Box>
    );
};

export default StatisticsFilterBar;
