import React from "react";
import dayjs from "dayjs";
import { Box, LinearProgress, Tooltip, Typography } from "@mui/material";
import { BRAND, NEUTRAL, STATUS_TONES } from "../config/ThemeConfig";
import { formatNumber } from "../utils/format";

interface SampleProgressProps {
    completed: number;
    target: number;
    fieldStart?: string | null;
    fieldEnd?: string | null;
    status?: string | null;
    // Inside a card that already shows the counts as its value.
    hideCounts?: boolean;
}

// Below the share of the field period already gone by more than this, a project in field counts as behind.
const BEHIND_TOLERANCE = 10;

// Where a project in field should be today if interviews came in evenly over the planned period.
export const expectedProgress = (fieldStart?: string | null, fieldEnd?: string | null): number | null => {
    const start = fieldStart ? dayjs(fieldStart) : null;
    const end = fieldEnd ? dayjs(fieldEnd) : null;
    if (!start?.isValid() || !end?.isValid() || !end.isAfter(start)) return null;

    const elapsed = dayjs().diff(start, "day", true) / end.diff(start, "day", true);
    return Math.round(Math.min(Math.max(elapsed, 0), 1) * 100);
};

const SampleProgress: React.FC<SampleProgressProps> = ({ completed, target, fieldStart, fieldEnd, status, hideCounts = false }) => {
    const percent = target > 0 ? Math.round((completed / target) * 100) : 0;
    const expected = status === "on going" ? expectedProgress(fieldStart, fieldEnd) : null;
    const behind = target > 0 && expected !== null && percent + BEHIND_TOLERANCE < expected;
    const inactive = status === "cancelled" || status === "on hold";

    const barColor = percent >= 100
        ? STATUS_TONES.success.dot
        : behind
            ? STATUS_TONES.warning.dot
            : inactive ? NEUTRAL[400] : BRAND.accent;

    const tooltip = target === 0
        ? "No sample size set"
        : behind
            ? `${percent}% done; about ${expected}% of the field period has passed`
            : `${percent}% of the target`;

    return (
        <Tooltip title={tooltip}>
            <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: hideCounts ? "flex-end" : "space-between", gap: 1 }}>
                    {!hideCounts && (
                        <Typography
                            component="span"
                            variant="body2"
                            sx={{ fontWeight: 500, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                            {formatNumber(completed)} / {formatNumber(target)}
                        </Typography>
                    )}
                    <Typography
                        component="span"
                        variant="caption"
                        sx={{
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                            fontWeight: behind ? 600 : 400,
                            color: behind ? STATUS_TONES.warning.fg : "text.secondary",
                        }}
                    >
                        {target > 0 ? `${percent}%` : "—"}{behind && " · behind"}
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={Math.min(percent, 100)}
                    aria-label="Sample progress"
                    sx={{
                        mt: 0.5,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: NEUTRAL[100],
                        "& .MuiLinearProgress-bar": { bgcolor: barColor, borderRadius: 2 },
                    }}
                />
            </Box>
        </Tooltip>
    );
};

export default SampleProgress;
