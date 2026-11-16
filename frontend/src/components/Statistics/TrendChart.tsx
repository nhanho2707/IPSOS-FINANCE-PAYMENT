import React, { useMemo, useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { scaleBand, scaleLinear } from "d3";
import dayjs, { Dayjs } from "dayjs";
import { CHANNELS, DailyStatistics, TransactionChannel } from "../../config/StatisticsConfig";
import { getProviderStyle, NEUTRAL, PROVIDER_STYLES } from "../../config/ThemeConfig";
import { formatDate, formatDateRange, formatMoney, formatNumber } from "../../utils/format";
import SectionCard from "../SectionCard";
import { AXIS_TEXT, axisFormatter, axisTicks, ChartEmpty, ChartLegend, ChartTooltip, columnPath, GRID_STROKE, useActiveMark, useElementWidth } from "./chartKit";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";

export type TrendMetric = "interviews" | "gifts" | "amount";


type Granularity = "day" | "week" | "month";

interface Bucket {
    key: string;
    from: Dayjs;
    to: Dayjs;
    values: Record<TransactionChannel, number>;
    total: number;
}

const HEIGHT = 240;
const MARGIN = { top: 12, right: 8, bottom: 26, left: 44 };
const SEGMENT_GAP = 2;
const DATE_KEY = "YYYY-MM-DD";

// Whole weeks (Monday first) and whole months keep long ranges readable; picking a bar then zooms in.
const granularityFor = (days: number): Granularity => (days <= 62 ? "day" : days <= 370 ? "week" : "month");

const bucketStart = (date: Dayjs, granularity: Granularity): Dayjs => {
    if (granularity === "month") return date.startOf("month");
    if (granularity === "week") return date.subtract((date.day() + 6) % 7, "day").startOf("day");
    return date.startOf("day");
};

const bucketEnd = (start: Dayjs, granularity: Granularity): Dayjs => {
    if (granularity === "month") return start.endOf("month");
    if (granularity === "week") return start.add(6, "day").endOf("day");
    return start.endOf("day");
};

const nextBucket = (start: Dayjs, granularity: Granularity): Dayjs => start.add(1, granularity);

const buildBuckets = (daily: DailyStatistics[], metric: TrendMetric, from: string | null, to: string | null) => {
    const first = from ?? daily[0]?.date;
    const last = to ?? daily[daily.length - 1]?.date;

    if (!first || !last) return { buckets: [] as Bucket[], granularity: "day" as Granularity };

    const start = dayjs(first);
    const end = dayjs(last);
    const granularity = granularityFor(end.diff(start, "day") + 1);
    const buckets = new Map<string, Bucket>();

    // Days without interviews still take their place, so gaps in fieldwork show as gaps.
    for (let cursor = bucketStart(start, granularity); !cursor.isAfter(end); cursor = nextBucket(cursor, granularity)) {
        const key = cursor.format(DATE_KEY);
        buckets.set(key, { key, from: cursor, to: bucketEnd(cursor, granularity), values: { vinnet: 0, gotit: 0, other: 0 }, total: 0 });
    }

    daily.forEach((day) => {
        const bucket = buckets.get(bucketStart(dayjs(day.date), granularity).format(DATE_KEY));
        if (!bucket) return;

        CHANNELS.forEach((channel) => {
            const value = Number(day[metric][channel]) || 0;
            bucket.values[channel] += value;
            bucket.total += value;
        });
    });

    return { buckets: Array.from(buckets.values()), granularity };
};

// Vietnamese dates stay numeric (dd/mm), as everywhere else in the app.
const axisDateFormat = (granularity: Granularity): string => {
    if (i18n.language === "vi") return granularity === "month" ? "MM/YY" : "DD/MM";
    return granularity === "month" ? "MMM YY" : "D MMM";
};

const bucketLabel = (bucket: Bucket, granularity: Granularity): string => {
    const vietnamese = i18n.language === "vi";
    if (granularity === "month") return bucket.from.format(vietnamese ? "MM/YYYY" : "MMMM YYYY");
    if (granularity === "week") return formatDateRange(bucket.from, bucket.to) ?? "";
    return bucket.from.format(vietnamese ? "ddd, DD/MM/YYYY" : "ddd, D MMM YYYY");
};

interface TrendChartProps {
    title: string;
    daily: DailyStatistics[];
    dateFrom: string | null;
    dateTo: string | null;
    metrics?: TrendMetric[];
    defaultMetric?: TrendMetric;
    // Picking a bar narrows the date range to that day, week or month.
    onSelectRange?: (from: Dayjs, to: Dayjs) => void;
}

const TrendChart: React.FC<TrendChartProps> = ({ title, daily, dateFrom, dateTo, metrics = ["interviews", "gifts", "amount"], defaultMetric = metrics[0], onSelectRange }) => {
    const { t } = useTranslation();
    const [ metric, setMetric ] = useState<TrendMetric>(defaultMetric);
    const { ref, width } = useElementWidth<HTMLDivElement>();
    const { buckets, granularity } = useMemo(() => buildBuckets(daily, metric, dateFrom, dateTo), [daily, metric, dateFrom, dateTo]);

    // A single day cannot be narrowed any further.
    const canSelect = Boolean(onSelectRange) && (granularity !== "day" || buckets.length > 1);
    const select = (index: number) => {
        if (canSelect) onSelectRange?.(buckets[index].from, buckets[index].to);
    };
    const { active, setActive, containerProps } = useActiveMark({ count: buckets.length, onSelect: select });

    const formatValue = metric === "amount" ? formatMoney : formatNumber;
    const presentChannels = CHANNELS.filter((channel) => buckets.some((bucket) => bucket.values[channel] > 0));
    const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const { ticks, top } = axisTicks(Math.max(0, ...buckets.map((bucket) => bucket.total)));
    const formatTick = axisFormatter(top);
    const x = scaleBand<string>().domain(buckets.map((bucket) => bucket.key)).range([0, innerWidth]).paddingInner(0.3).paddingOuter(0.15);
    const y = scaleLinear().domain([0, top]).range([innerHeight, 0]);
    const barWidth = Math.max(2, Math.min(24, x.bandwidth()));
    const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(1, Math.floor(innerWidth / 72))));
    const activeBucket = active !== null ? buckets[active] : null;
    const unit = t(`statistics.trend.units.${granularity}`);
    const metricLabel = t(`statistics.trend.metrics.${metric}`);
    const hasData = buckets.some((bucket) => bucket.total > 0);

    return (
        <SectionCard
            title={title}
            description={[t("statistics.trend.description", { metric: metricLabel, unit }), canSelect ? t("statistics.trend.zoomHint") : ""].filter(Boolean).join(" ")}
            action={metrics.length > 1 ? (
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={metric}
                    onChange={(_event, value: TrendMetric | null) => value && setMetric(value)}
                    aria-label={t("statistics.trend.measure")}
                    sx={{ flexShrink: 0 }}
                >
                    {metrics.map((option) => (
                        <ToggleButton key={option} value={option} sx={{ px: 1.25, py: 0.25, textTransform: "none", typography: "body2" }}>
                            {t(`statistics.trend.metrics.${option}`)}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            ) : undefined}
        >
            <Box sx={{ mb: 1, minHeight: 16 }}>
                <ChartLegend items={presentChannels.map((channel) => ({ label: getProviderStyle(channel).label, color: PROVIDER_STYLES[channel].color }))} />
            </Box>
            <Box
                ref={ref}
                {...containerProps}
                role="group"
                aria-label={t(canSelect ? "statistics.trend.groupLabelZoom" : "statistics.trend.groupLabel", { title, metric: metricLabel, unit })}
                sx={{ position: "relative", outlineOffset: 4, borderRadius: "4px" }}
            >
                {!hasData ? <ChartEmpty height={HEIGHT} /> : (
                    <svg width={width} height={HEIGHT} role="img" aria-label={t("statistics.trend.imgLabel", { metric: metricLabel, unit })} style={{ display: "block" }}>
                        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                            {ticks.map((tick) => (
                                <g key={tick}>
                                    <line x1={0} x2={innerWidth} y1={y(tick)} y2={y(tick)} stroke={GRID_STROKE} strokeWidth={1} />
                                    <text x={-8} y={y(tick)} dy="0.32em" textAnchor="end" style={AXIS_TEXT}>{formatTick(tick)}</text>
                                </g>
                            ))}

                            {buckets.map((bucket, index) => {
                                const bandX = x(bucket.key) ?? 0;
                                const barX = bandX + (x.bandwidth() - barWidth) / 2;
                                const stacked = CHANNELS.filter((channel) => bucket.values[channel] > 0);
                                let baseline = 0;

                                return (
                                    <g key={bucket.key}>
                                        {active === index && (
                                            <rect x={bandX - x.step() * 0.15} y={0} width={x.step()} height={innerHeight} fill={NEUTRAL[100]} />
                                        )}
                                        {stacked.map((channel, position) => {
                                            const bottom = y(baseline);
                                            baseline += bucket.values[channel];
                                            const isTop = position === stacked.length - 1;
                                            // The gap between segments is surface colour, not a stroke; the top segment keeps its full height.
                                            const height = Math.max(1, bottom - y(baseline) - (isTop ? 0 : SEGMENT_GAP));

                                            return (
                                                <path
                                                    key={channel}
                                                    d={columnPath(barX, bottom - height, barWidth, height, isTop)}
                                                    fill={PROVIDER_STYLES[channel].color}
                                                />
                                            );
                                        })}
                                        {index % labelEvery === 0 && (
                                            <text x={bandX + x.bandwidth() / 2} y={innerHeight + 18} textAnchor="middle" style={AXIS_TEXT}>
                                                {bucket.from.format(axisDateFormat(granularity))}
                                            </text>
                                        )}
                                        <rect
                                            x={bandX - (x.step() - x.bandwidth()) / 2}
                                            y={0}
                                            width={x.step()}
                                            height={innerHeight}
                                            fill="transparent"
                                            style={{ cursor: canSelect ? "pointer" : "default" }}
                                            onPointerEnter={() => setActive(index)}
                                            onClick={() => select(index)}
                                        />
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                )}

                {hasData && activeBucket && (
                    <ChartTooltip
                        x={MARGIN.left + (x(activeBucket.key) ?? 0) + x.bandwidth() / 2}
                        containerWidth={width}
                        title={bucketLabel(activeBucket, granularity)}
                        rows={[
                            ...presentChannels.map((channel) => ({
                                label: getProviderStyle(channel).label,
                                value: formatValue(activeBucket.values[channel]),
                                color: PROVIDER_STYLES[channel].color,
                            })),
                            ...(presentChannels.length > 1 ? [{ label: t("statistics.trend.total"), value: formatValue(activeBucket.total) }] : []),
                        ]}
                    />
                )}
                <Box aria-live="polite" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
                    {activeBucket ? `${granularity === "day" ? formatDate(activeBucket.from) : bucketLabel(activeBucket, granularity)}: ${formatValue(activeBucket.total)}` : ""}
                </Box>
            </Box>
        </SectionCard>
    );
};

export default TrendChart;
