import React, { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { scaleLinear } from "d3";
import { NEUTRAL } from "../../config/ThemeConfig";

export const AXIS_TEXT = { fontSize: 11, fill: NEUTRAL[600], fontVariantNumeric: "tabular-nums" } as const;
export const GRID_STROKE = NEUTRAL[200];
// Marks that are not part of the current selection step back instead of disappearing.
export const DIMMED_OPACITY = 0.3;

export function useElementWidth<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [ width, setWidth ] = useState(0);

    useEffect(() => {
        if (!ref.current) return;

        const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
        observer.observe(ref.current);

        return () => observer.disconnect();
    }, []);

    return { ref, width };
}

// Round axis steps: at least 4 so a chart of very small counts does not show fractional ticks.
export const axisTicks = (max: number, count = 4) => {
    const scale = scaleLinear().domain([0, Math.max(max, count)]).nice(count);
    return { ticks: scale.ticks(count), top: scale.domain()[1] };
};

const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const fullFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// One style per axis: in full while the axis stays under 10,000, compact (10K, 2.5M) once it reaches it.
export const axisFormatter = (top: number) => (value: number) => (top >= 10000 ? compactFormat.format(value) : fullFormat.format(value));

// A column with a rounded data end that stays square on the baseline.
export const columnPath = (x: number, y: number, width: number, height: number, rounded: boolean): string => {
    if (height <= 0 || width <= 0) return "";

    const r = rounded ? Math.min(4, width / 2, height) : 0;

    return `M${x},${y + height}L${x},${y + r}Q${x},${y} ${x + r},${y}L${x + width - r},${y}Q${x + width},${y} ${x + width},${y + r}L${x + width},${y + height}Z`;
};

interface RovingOptions {
    count: number;
    onSelect?: (index: number) => void;
    // Marks per row for charts laid out as a grid, so the up and down arrows move between rows.
    columns?: number;
}

// One tab stop for the whole chart: arrow keys move between marks, Enter or Space picks one.
// Hover drives the same index, so pointer and keyboard users get the same tooltip.
export function useActiveMark({ count, onSelect, columns }: RovingOptions) {
    const [ active, setActive ] = useState<number | null>(null);

    const move = (delta: number) => setActive((current) => {
        if (current === null) return delta > 0 ? 0 : count - 1;
        return Math.min(count - 1, Math.max(0, current + delta));
    });

    const containerProps = {
        tabIndex: count > 0 ? 0 : -1,
        onKeyDown: (event: React.KeyboardEvent) => {
            const step: Record<string, number | undefined> = {
                ArrowRight: 1,
                ArrowLeft: -1,
                ArrowDown: columns,
                ArrowUp: columns ? -columns : undefined,
            };
            const delta = step[event.key];

            if (delta !== undefined) {
                event.preventDefault();
                move(delta);
            } else if ((event.key === "Enter" || event.key === " ") && active !== null && onSelect) {
                event.preventDefault();
                onSelect(active);
            } else if (event.key === "Escape") {
                setActive(null);
            }
        },
        onBlur: () => setActive(null),
        onPointerLeave: () => setActive(null),
    };

    return { active, setActive, containerProps };
}

export interface TooltipRow {
    label: string;
    value: string;
    // Colour of the short key in front of the label.
    color?: string;
    line?: boolean;
}

interface ChartTooltipProps {
    // Horizontal position of the mark inside the chart container, in px.
    x: number;
    containerWidth: number;
    top?: number;
    title: string;
    rows: TooltipRow[];
    footer?: string;
}

const TOOLTIP_WIDTH = 208;

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ x, containerWidth, top = 0, title, rows, footer }) => {
    // Kept inside the chart, flipping to the left of the mark near the right edge.
    const left = x + 12 + TOOLTIP_WIDTH > containerWidth ? Math.max(0, x - 12 - TOOLTIP_WIDTH) : x + 12;

    return (
        <Box
            role="status"
            sx={{
                position: "absolute",
                left,
                top,
                width: TOOLTIP_WIDTH,
                zIndex: 2,
                pointerEvents: "none",
                px: 1.25,
                py: 1,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: "8px",
                boxShadow: `0 4px 16px ${alpha(NEUTRAL[900], 0.12)}`,
            }}
        >
            <Typography variant="caption" component="p" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>{title}</Typography>
            {rows.map((row) => (
                <Box key={row.label} sx={{ display: "flex", alignItems: "center", gap: 0.75, typography: "caption", color: "text.secondary" }}>
                    {row.color && (
                        <Box component="span" sx={{ width: 10, height: row.line ? 2 : 8, borderRadius: "2px", bgcolor: row.color, flexShrink: 0 }} />
                    )}
                    <Box component="span" sx={{ flex: 1, minWidth: 0 }}>{row.label}</Box>
                    <Box component="span" sx={{ fontWeight: 600, color: "text.primary", fontVariantNumeric: "tabular-nums" }}>{row.value}</Box>
                </Box>
            ))}
            {footer && (
                <Typography variant="caption" component="p" sx={{ mt: 0.5, color: "text.secondary" }}>{footer}</Typography>
            )}
        </Box>
    );
};

interface LegendItem {
    label: string;
    color: string;
    line?: boolean;
}

export const ChartLegend: React.FC<{ items: LegendItem[] }> = ({ items }) => (
    <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
        {items.map((item) => (
            <Box key={item.label} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, typography: "caption", color: "text.secondary" }}>
                <Box component="span" sx={{ width: 10, height: item.line ? 2 : 10, borderRadius: "2px", bgcolor: item.color, flexShrink: 0 }} />
                {item.label}
            </Box>
        ))}
    </Box>
);

export const ChartEmpty: React.FC<{ height: number; text?: string }> = ({ height, text = "No data for these filters" }) => (
    <Box sx={{ height, display: "grid", placeItems: "center", typography: "body2", color: "text.secondary" }}>{text}</Box>
);
