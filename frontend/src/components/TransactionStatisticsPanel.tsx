import React from "react";
import dayjs from "dayjs";
import { Alert, Box, Grid, Tooltip, Typography } from "@mui/material";
import { ArrowDownward, ArrowUpward } from "@mui/icons-material";
import { CHANNELS, EmployeeStatistics, formatMinutes, ProjectStatistics, TransactionStatisticsData } from "../config/StatisticsConfig";
import { PROVIDER_STYLES, STATUS_TONES } from "../config/ThemeConfig";
import { useStatisticsFilters } from "../hook/useStatisticsFilters";
import { useTransactionStatistics } from "../hook/useTransactionStatistics";
import { formatDateRange, formatMoney, formatNumber, formatPercent } from "../utils/format";
import StatCard from "./StatCard";
import BreakdownTable, { BreakdownRow } from "./Statistics/BreakdownTable";
import HourChart from "./Statistics/HourChart";
import InterviewsTable from "./Statistics/InterviewsTable";
import StatisticsFilterBar from "./Statistics/StatisticsFilterBar";
import TrendChart from "./Statistics/TrendChart";
import WaitDistribution from "./Statistics/WaitDistribution";
import WeekHourHeatmap from "./Statistics/WeekHourHeatmap";

const UNKNOWN_INTERVIEWER = "No interviewer";

const employeeRows = (employees: EmployeeStatistics[]): BreakdownRow[] => employees.map((employee) => ({
    ...employee,
    key: employee.employee_id ?? "",
    primary: employee.employee_id || UNKNOWN_INTERVIEWER,
    secondary: employee.employee_name || undefined,
}));

const projectRows = (projects: ProjectStatistics[]): BreakdownRow[] => projects.map((project) => ({
    ...project,
    key: String(project.project_id),
    primary: project.internal_code || `Project ${project.project_id}`,
    secondary: project.project_name ?? undefined,
}));

interface DeltaProps {
    current: number | null | undefined;
    previous: number | null | undefined;
    // Waits and reviews are better when they go down; volumes are neither good nor bad.
    upIs?: "bad" | "neutral";
    format?: "percent" | "minutes";
    // "previous 30 days", with the exact dates in the tooltip.
    period: { label: string; dates: string };
}

const Delta: React.FC<DeltaProps> = ({ current, previous, upIs = "neutral", format = "percent", period }) => {
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    if (format === "percent" && previous === 0) return null;

    const change = current - previous;
    const text = format === "minutes" ? formatMinutes(Math.abs(change)) : formatPercent(Math.abs(change) / previous);
    const Icon = change > 0 ? ArrowUpward : ArrowDownward;
    const tone = upIs === "neutral" || change === 0 ? undefined : STATUS_TONES[change > 0 ? "danger" : "success"].fg;

    return (
        <Typography variant="caption" component="p" sx={{ display: "flex", alignItems: "center", gap: 0.25, mt: "auto", pt: 0.5, color: "text.secondary" }}>
            {change === 0 ? "No change" : (
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600, color: tone ?? "text.primary" }}>
                    <Icon sx={{ fontSize: 14 }} />
                    {text}
                </Box>
            )}
            <Tooltip title={period.dates} placement="bottom-start">
                <Box component="span" sx={{ ml: 0.25, whiteSpace: "nowrap" }}>vs {period.label}</Box>
            </Tooltip>
        </Typography>
    );
};

interface TransactionStatisticsPanelProps {
    // 0 shows every project.
    projectId: number;
    // The range shown when the URL names none; null means all time.
    defaultDays?: number | null;
    leading?: React.ReactNode;
    onSelectProject?: (projectId: number) => void;
}

const share = (part: number, whole: number) => (whole > 0 ? formatPercent(part / whole) : "—");

const channelCaption = (statistics: TransactionStatisticsData | null) =>
    CHANNELS.filter((channel) => (statistics?.by_channel[channel]?.interviews ?? 0) > 0)
        .map((channel) => `${PROVIDER_STYLES[channel].label} ${formatNumber(statistics?.by_channel[channel].interviews)}`)
        .join(" · ");

// Interviews and gifts for one project or all of them: headline numbers, charts that filter each
// other, the breakdown by interviewer and the interviews themselves.
const TransactionStatisticsPanel: React.FC<TransactionStatisticsPanelProps> = ({ projectId, defaultDays = null, leading, onSelectProject }) => {
    const { filters, dateFrom, dateTo, setDateRange, setChannel, toggleEmployee, toggleWait, toggleSlot, clearSlot, reset, isFiltered } = useStatisticsFilters(defaultDays);
    const { statistics, actionState } = useTransactionStatistics(projectId, filters);

    const loading = Boolean(actionState.loading);
    const previous = statistics?.previous ?? null;
    const previousDays = previous ? dayjs(previous.date_to).diff(dayjs(previous.date_from), "day") + 1 : 0;
    const period = {
        label: previousDays === 1 ? "the day before" : `previous ${previousDays} days`,
        dates: previous ? formatDateRange(previous.date_from, previous.date_to) ?? "" : "",
    };
    const interviews = statistics?.interviews ?? 0;
    const gifts = statistics?.gifts ?? 0;
    const measured = statistics?.wait.measured ?? 0;
    const reviewTotal = statistics?.review_total ?? 0;
    const tolerance = statistics?.wait.tolerance_minutes ?? 5;

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <StatisticsFilterBar
                filters={filters}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateRangeChange={setDateRange}
                onChannelChange={setChannel}
                onClearEmployee={() => filters.employee && toggleEmployee(filters.employee)}
                onClearWait={() => filters.wait && toggleWait(filters.wait)}
                onClearSlot={clearSlot}
                onReset={reset}
                isFiltered={isFiltered}
                leading={leading}
            />

            {actionState.error && <Alert severity="error">{actionState.message}</Alert>}

            {/* While new numbers load the previous ones stay in place, slightly faded, so nothing jumps. */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, opacity: loading && statistics ? 0.6 : 1, transition: "opacity 0.15s" }} aria-busy={loading}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                        <StatCard label="Interviews" value={formatNumber(interviews)} caption={channelCaption(statistics)} loading={loading && !statistics}>
                            {previous && <Delta current={interviews} previous={previous.interviews} period={period} />}
                        </StatCard>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                        <StatCard label="Gifts sent" value={formatNumber(gifts)} caption={`${share(gifts, interviews)} of interviews`} loading={loading && !statistics}>
                            {previous && <Delta current={gifts} previous={previous.gifts} period={period} />}
                        </StatCard>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                        <StatCard
                            label="Gift value"
                            value={formatMoney(statistics?.amount)}
                            caption={gifts > 0 ? `${formatMoney((statistics?.amount ?? 0) / gifts)} per gift` : undefined}
                            loading={loading && !statistics}
                        >
                            {previous && <Delta current={statistics?.amount} previous={previous.amount} period={period} />}
                        </StatCard>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 2.4 }}>
                        <StatCard
                            label="Median wait for the gift"
                            value={formatMinutes(statistics?.wait.median_minutes)}
                            caption={`Measured on ${formatNumber(measured)} ${measured === 1 ? "gift" : "gifts"}`}
                            loading={loading && !statistics}
                        >
                            {previous && <Delta current={statistics?.wait.median_minutes} previous={previous.median_wait_minutes} upIs="bad" format="minutes" period={period} />}
                        </StatCard>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 12, md: 6, lg: 2.4 }}>
                        <StatCard
                            label="To review"
                            value={formatNumber(reviewTotal)}
                            tone={reviewTotal > 0 ? "danger" : "default"}
                            caption={`Sent before the interview ended${measured > 0 ? ` · ${share(reviewTotal, measured)} of measured gifts` : ""}`}
                            loading={loading && !statistics}
                        >
                            {previous && <Delta current={reviewTotal} previous={previous.review_total} upIs="bad" period={period} />}
                        </StatCard>
                    </Grid>
                </Grid>

                <TrendChart
                    title="Over time"
                    daily={statistics?.daily ?? []}
                    dateFrom={filters.dateFrom ?? null}
                    dateTo={filters.dateTo ?? null}
                    onSelectRange={setDateRange}
                />

                <BreakdownTable
                    title="By interviewer"
                    description="Interviews and gifts for each interviewer code. Pick a row to filter everything else."
                    nameLabel="Interviewer ID"
                    secondaryLabel="Interviewer"
                    rows={employeeRows(statistics?.by_employee ?? [])}
                    loading={loading}
                    selectedKey={filters.employee ?? null}
                    onSelect={(row) => row.key && toggleEmployee(row.key)}
                    selectHint="show only this interviewer"
                    searchPlaceholder="Search interviewer"
                    exportFileName="interviews_by_interviewer.xlsx"
                />

                {projectId === 0 && (
                    <BreakdownTable
                        title="By project"
                        description="Interviews and gifts for each project. Pick a row to open that project here."
                        nameLabel="Project code"
                        secondaryLabel="Project name"
                        rows={projectRows(statistics?.by_project ?? [])}
                        loading={loading}
                        onSelect={(row) => onSelectProject?.(Number(row.key))}
                        selectHint="show only this project"
                        searchPlaceholder="Search project"
                        exportFileName="interviews_by_project.xlsx"
                    />
                )}

                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, lg: 7 }}>
                        <HourChart
                            interviewHours={statistics?.interview_hours ?? []}
                            giftHours={statistics?.gift_hours ?? []}
                            selectedHour={filters.hour ?? null}
                            onSelectHour={(hour) => toggleSlot(null, hour)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, lg: 5 }}>
                        <WaitDistribution
                            wait={statistics?.wait ?? { median_minutes: null, measured: 0, unknown: 0, offline: 0, tolerance_minutes: tolerance, buckets: [] }}
                            selected={filters.wait ?? null}
                            onSelect={toggleWait}
                        />
                    </Grid>
                </Grid>

                <WeekHourHeatmap
                    weekdayHours={statistics?.weekday_hours ?? []}
                    selectedWeekday={filters.weekday ?? null}
                    selectedHour={filters.hour ?? null}
                    onSelect={toggleSlot}
                />
            </Box>

            <InterviewsTable
                projectId={projectId}
                filters={filters}
                toleranceMinutes={tolerance}
                activeEmployee={filters.employee ?? null}
                onFilterEmployee={toggleEmployee}
            />
        </Box>
    );
};

export default TransactionStatisticsPanel;
