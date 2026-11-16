import React from "react";
import { Box } from "@mui/material";
import { interpolateRgb } from "d3";
import { BRAND, NEUTRAL } from "../../config/ThemeConfig";
import { formatHourRange, weekdayLabel, WEEKDAYS } from "../../config/StatisticsConfig";
import { formatNumber } from "../../utils/format";
import SectionCard from "../SectionCard";
import { AXIS_TEXT, ChartEmpty, ChartTooltip, useActiveMark, useElementWidth } from "./chartKit";
import { useTranslation } from "react-i18next";

const LABEL_WIDTH = 36;
const HEADER_HEIGHT = 18;
const ROW_HEIGHT = 26;
const CELL_GAP = 2;
const HEIGHT = HEADER_HEIGHT + ROW_HEIGHT * 7;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

// One hue from light to dark. The ramp starts a step in, so a single interview is clearly darker
// than the grey of an empty hour and "none" never reads as "few".
const RAMP_START = 0.18;
const ramp = interpolateRgb(BRAND.soft, BRAND.dark);
const cellColor = (value: number, max: number) =>
    value <= 0 ? NEUTRAL[100] : ramp(RAMP_START + (1 - RAMP_START) * (max > 0 ? value / max : 0));

interface WeekHourHeatmapProps {
    // Seven rows (Monday first) of 24 hourly counts.
    weekdayHours: number[][];
    selectedWeekday: number | null;
    selectedHour: number | null;
    onSelect: (weekday: number, hour: number) => void;
}

const WeekHourHeatmap: React.FC<WeekHourHeatmapProps> = ({ weekdayHours, selectedWeekday, selectedHour, onSelect }) => {
    const { t } = useTranslation();
    const { ref, width } = useElementWidth<HTMLDivElement>();
    const select = (index: number) => onSelect(Math.floor(index / 24) + 1, index % 24);
    const { active, setActive, containerProps } = useActiveMark({ count: 7 * 24, onSelect: select, columns: 24 });

    const cellWidth = Math.max(0, (width - LABEL_WIDTH) / 24);
    const max = Math.max(0, ...weekdayHours.flat());
    const activeRow = active !== null ? Math.floor(active / 24) : null;
    const activeHour = active !== null ? active % 24 : null;
    const hasSelection = selectedHour !== null;
    const isSelected = (row: number, hour: number) =>
        hasSelection && selectedHour === hour && (selectedWeekday === null || selectedWeekday === row + 1);
    const labelEvery = cellWidth < 18 ? 6 : 3;

    return (
        <SectionCard
            title={t("statistics.heatmap.title")}
            description={t("statistics.heatmap.description")}
            action={max > 0 ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, typography: "caption", color: "text.secondary", flexShrink: 0 }}>
                    1
                    <Box sx={{ width: 72, height: 8, borderRadius: "2px", background: `linear-gradient(90deg, ${ramp(RAMP_START)}, ${BRAND.dark})` }} />
                    {formatNumber(max)}
                </Box>
            ) : undefined}
        >
            <Box
                ref={ref}
                {...containerProps}
                role="group"
                aria-label={t("statistics.heatmap.groupLabel")}
                sx={{ position: "relative", outlineOffset: 4, borderRadius: "4px" }}
            >
                {max === 0 ? <ChartEmpty height={HEIGHT} /> : (
                    <svg width={width} height={HEIGHT} role="img" aria-label={t("statistics.heatmap.imgLabel")} style={{ display: "block" }}>
                        {HOURS.filter((hour) => hour % labelEvery === 0).map((hour) => (
                            <text key={hour} x={LABEL_WIDTH + hour * cellWidth + cellWidth / 2} y={11} textAnchor="middle" style={AXIS_TEXT}>
                                {String(hour).padStart(2, "0")}
                            </text>
                        ))}
                        {WEEKDAYS.map((weekday, row) => (
                            <g key={weekday} transform={`translate(0,${HEADER_HEIGHT + row * ROW_HEIGHT})`}>
                                <text x={0} y={ROW_HEIGHT / 2} dy="0.32em" style={AXIS_TEXT}>{weekdayLabel(weekday)}</text>
                                {HOURS.map((hour) => {
                                    const value = weekdayHours[row]?.[hour] ?? 0;
                                    const index = row * 24 + hour;
                                    const selected = isSelected(row, hour);
                                    const emphasised = selected || active === index;

                                    return (
                                        <rect
                                            key={hour}
                                            x={LABEL_WIDTH + hour * cellWidth + CELL_GAP / 2}
                                            y={CELL_GAP / 2}
                                            width={Math.max(0, cellWidth - CELL_GAP)}
                                            height={ROW_HEIGHT - CELL_GAP}
                                            rx={3}
                                            fill={cellColor(value, max)}
                                            stroke={emphasised ? NEUTRAL[900] : "none"}
                                            strokeWidth={selected ? 2 : 1}
                                            opacity={hasSelection && !selected ? 0.45 : 1}
                                            style={{ cursor: "pointer" }}
                                            onPointerEnter={() => setActive(index)}
                                            onClick={() => select(index)}
                                        />
                                    );
                                })}
                            </g>
                        ))}
                    </svg>
                )}

                {max > 0 && activeRow !== null && activeHour !== null && (
                    <ChartTooltip
                        x={LABEL_WIDTH + activeHour * cellWidth + cellWidth}
                        containerWidth={width}
                        top={Math.max(0, HEADER_HEIGHT + activeRow * ROW_HEIGHT - 56)}
                        title={`${weekdayLabel(activeRow + 1)}, ${formatHourRange(activeHour)}`}
                        rows={[{ label: t("statistics.hours.started"), value: formatNumber(weekdayHours[activeRow]?.[activeHour] ?? 0) }]}
                    />
                )}
                <Box aria-live="polite" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
                    {activeRow !== null && activeHour !== null
                        ? t("statistics.heatmap.announce", { slot: `${weekdayLabel(activeRow + 1)}, ${formatHourRange(activeHour)}`, count: weekdayHours[activeRow]?.[activeHour] ?? 0 })
                        : ""}
                </Box>
            </Box>
        </SectionCard>
    );
};

export default WeekHourHeatmap;
