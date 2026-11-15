import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { WarningAmberOutlined } from "@mui/icons-material";
import { BRAND, NEUTRAL, STATUS_TONES } from "../../config/ThemeConfig";
import { TransactionStatisticsData, WAIT_BUCKET_LABELS, WaitBucketKey } from "../../config/StatisticsConfig";
import { formatNumber, formatPercent } from "../../utils/format";
import SectionCard from "../SectionCard";
import { ChartEmpty, DIMMED_OPACITY } from "./chartKit";

interface WaitDistributionProps {
    wait: TransactionStatisticsData["wait"];
    selected: WaitBucketKey | null;
    onSelect: (key: WaitBucketKey) => void;
}

// How long respondents waited for their gift after the interview ended, as a share of the measurable gifts.
const WaitDistribution: React.FC<WaitDistributionProps> = ({ wait, selected, onSelect }) => {
    const measured = wait.buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const max = Math.max(0, ...wait.buckets.map((bucket) => bucket.count));
    const excluded = [
        wait.unknown > 0 ? `${formatNumber(wait.unknown)} without an interview end time` : null,
        wait.offline > 0 ? `${formatNumber(wait.offline)} offline imports` : null,
    ].filter(Boolean).join(" and ");

    return (
        <SectionCard title="Wait for the gift" description="From the end of the interview to the gift. Pick a row to filter.">
            {measured === 0 ? <ChartEmpty height={216} /> : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    {wait.buckets.map((bucket) => {
                        const early = bucket.key === "early";
                        const isSelected = selected === bucket.key;
                        const share = measured > 0 ? bucket.count / measured : 0;

                        return (
                            <ButtonBase
                                key={bucket.key}
                                onClick={() => onSelect(bucket.key)}
                                aria-pressed={isSelected}
                                aria-label={`${WAIT_BUCKET_LABELS[bucket.key]}: ${formatNumber(bucket.count)} gifts, ${formatPercent(share)}`}
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "140px 1fr 88px", sm: "200px 1fr 96px" },
                                    alignItems: "center",
                                    columnGap: 1.5,
                                    width: "100%",
                                    px: 1,
                                    py: 0.875,
                                    borderRadius: "8px",
                                    textAlign: "left",
                                    bgcolor: isSelected ? BRAND.soft : "transparent",
                                    opacity: selected && !isSelected ? 0.6 : 1,
                                    "&:hover": { bgcolor: isSelected ? BRAND.soft : NEUTRAL[50] },
                                    "&.Mui-focusVisible": { outline: `2px solid ${BRAND.accent}`, outlineOffset: -2 },
                                }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: isSelected ? 600 : 400 }}>
                                        {early && <WarningAmberOutlined sx={{ fontSize: 16, color: STATUS_TONES.danger.dot }} />}
                                        {WAIT_BUCKET_LABELS[bucket.key]}
                                    </Typography>
                                    {early && (
                                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                                            More than {wait.tolerance_minutes} min early
                                        </Typography>
                                    )}
                                </Box>
                                <Box sx={{ height: 12 }}>
                                    <Box
                                        sx={{
                                            height: "100%",
                                            // A bucket with gifts stays visible even when it is a sliver of the largest one.
                                            width: bucket.count > 0 ? `max(3px, ${(bucket.count / max) * 100}%)` : 0,
                                            borderRadius: "0 4px 4px 0",
                                            bgcolor: early ? STATUS_TONES.danger.dot : BRAND.accent,
                                            opacity: selected && !isSelected ? DIMMED_OPACITY : 1,
                                        }}
                                    />
                                </Box>
                                <Typography variant="body2" sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>{formatNumber(bucket.count)}</Box>
                                    <Box component="span" sx={{ color: "text.secondary" }}> · {formatPercent(share)}</Box>
                                </Typography>
                            </ButtonBase>
                        );
                    })}
                </Box>
            )}
            {excluded && (
                <Typography variant="caption" component="p" sx={{ mt: 1.5, px: 1, color: "text.secondary" }}>
                    Not measured: {excluded}.
                </Typography>
            )}
        </SectionCard>
    );
};

export default WaitDistribution;
