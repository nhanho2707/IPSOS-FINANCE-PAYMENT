import React from "react";
import { Box } from "@mui/material";
import { line, scaleBand, scaleLinear } from "d3";
import { BRAND, NEUTRAL } from "../../config/ThemeConfig";
import { formatHourRange } from "../../config/StatisticsConfig";
import { formatNumber } from "../../utils/format";
import SectionCard from "../SectionCard";
import { AXIS_TEXT, axisFormatter, axisTicks, ChartEmpty, ChartLegend, ChartTooltip, columnPath, DIMMED_OPACITY, GRID_STROKE, useActiveMark, useElementWidth } from "./chartKit";

const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 26, left: 36 };
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const INTERVIEW_COLOR = BRAND.accent;
const GIFT_COLOR = NEUTRAL[700];

interface HourChartProps {
    interviewHours: number[];
    giftHours: number[];
    selectedHour: number | null;
    onSelectHour: (hour: number) => void;
}

// Interviews and gifts on one count axis: bars for when interviews start, a line for when gifts arrive.
const HourChart: React.FC<HourChartProps> = ({ interviewHours, giftHours, selectedHour, onSelectHour }) => {
    const { ref, width } = useElementWidth<HTMLDivElement>();
    const { active, setActive, containerProps } = useActiveMark({ count: 24, onSelect: onSelectHour });

    const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const { ticks, top } = axisTicks(Math.max(0, ...interviewHours, ...giftHours));
    const formatTick = axisFormatter(top);
    const x = scaleBand<number>().domain(HOURS).range([0, innerWidth]).paddingInner(0.3).paddingOuter(0.15);
    const y = scaleLinear().domain([0, top]).range([innerHeight, 0]);
    const barWidth = Math.max(2, Math.min(24, x.bandwidth()));
    const center = (hour: number) => (x(hour) ?? 0) + x.bandwidth() / 2;
    const giftLine = line<number>().x((_value, hour) => center(hour)).y((value) => y(value))(giftHours.slice(0, 24)) ?? "";
    const hasData = interviewHours.some((value) => value > 0) || giftHours.some((value) => value > 0);
    const labelEvery = innerWidth < 420 ? 6 : 3;

    return (
        <SectionCard title="Time of day" description="When interviews start and when gifts arrive (Vietnam time). Pick an hour to filter.">
            <Box sx={{ mb: 1 }}>
                <ChartLegend items={[
                    { label: "Interviews started", color: INTERVIEW_COLOR },
                    { label: "Gifts received", color: GIFT_COLOR, line: true },
                ]} />
            </Box>
            <Box
                ref={ref}
                {...containerProps}
                role="group"
                aria-label="Interviews started and gifts received by hour. Use the arrow keys to read each hour, Enter to filter."
                sx={{ position: "relative", outlineOffset: 4, borderRadius: "4px" }}
            >
                {!hasData ? <ChartEmpty height={HEIGHT} /> : (
                    <svg width={width} height={HEIGHT} role="img" aria-label="Interviews started and gifts received by hour" style={{ display: "block" }}>
                        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                            {ticks.map((tick) => (
                                <g key={tick}>
                                    <line x1={0} x2={innerWidth} y1={y(tick)} y2={y(tick)} stroke={GRID_STROKE} strokeWidth={1} />
                                    <text x={-8} y={y(tick)} dy="0.32em" textAnchor="end" style={AXIS_TEXT}>{formatTick(tick)}</text>
                                </g>
                            ))}

                            {HOURS.map((hour) => {
                                const dimmed = selectedHour !== null && selectedHour !== hour;
                                const value = interviewHours[hour] ?? 0;

                                return (
                                    <g key={hour}>
                                        {active === hour && (
                                            <rect x={(x(hour) ?? 0) - (x.step() - x.bandwidth()) / 2} y={0} width={x.step()} height={innerHeight} fill={NEUTRAL[100]} />
                                        )}
                                        <path
                                            d={columnPath((x(hour) ?? 0) + (x.bandwidth() - barWidth) / 2, y(value), barWidth, innerHeight - y(value), true)}
                                            fill={INTERVIEW_COLOR}
                                            opacity={dimmed ? DIMMED_OPACITY : 1}
                                        />
                                        {hour % labelEvery === 0 && (
                                            <text x={center(hour)} y={innerHeight + 18} textAnchor="middle" style={AXIS_TEXT}>
                                                {String(hour).padStart(2, "0")}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            <path d={giftLine} fill="none" stroke={GIFT_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                            {active !== null && (
                                <circle cx={center(active)} cy={y(giftHours[active] ?? 0)} r={4} fill={GIFT_COLOR} stroke={NEUTRAL[0]} strokeWidth={2} />
                            )}

                            {HOURS.map((hour) => (
                                <rect
                                    key={hour}
                                    x={(x(hour) ?? 0) - (x.step() - x.bandwidth()) / 2}
                                    y={0}
                                    width={x.step()}
                                    height={innerHeight}
                                    fill="transparent"
                                    style={{ cursor: "pointer" }}
                                    onPointerEnter={() => setActive(hour)}
                                    onClick={() => onSelectHour(hour)}
                                />
                            ))}
                        </g>
                    </svg>
                )}

                {hasData && active !== null && (
                    <ChartTooltip
                        x={MARGIN.left + center(active)}
                        containerWidth={width}
                        title={formatHourRange(active)}
                        rows={[
                            { label: "Interviews started", value: formatNumber(interviewHours[active] ?? 0), color: INTERVIEW_COLOR },
                            { label: "Gifts received", value: formatNumber(giftHours[active] ?? 0), color: GIFT_COLOR, line: true },
                        ]}
                    />
                )}
                <Box aria-live="polite" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
                    {active !== null ? `${formatHourRange(active)}: ${interviewHours[active] ?? 0} interviews started, ${giftHours[active] ?? 0} gifts received` : ""}
                </Box>
            </Box>
        </SectionCard>
    );
};

export default HourChart;
