import React from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { WarningAmberOutlined } from "@mui/icons-material";
import { BRAND, NEUTRAL, STATUS_TONES } from "../../config/ThemeConfig";
import { TransactionStatisticsData, waitBucketLabel, WaitBucketKey } from "../../config/StatisticsConfig";
import { formatNumber, formatPercent } from "../../utils/format";
import SectionCard from "../SectionCard";
import { ChartEmpty, DIMMED_OPACITY } from "./chartKit";
import { useTranslation } from "react-i18next";

interface WaitDistributionProps {
    wait: TransactionStatisticsData["wait"];
    selected: WaitBucketKey | null;
    onSelect: (key: WaitBucketKey) => void;
}

// How long respondents waited for their gift after the interview ended, as a share of the measurable gifts.
const WaitDistribution: React.FC<WaitDistributionProps> = ({ wait, selected, onSelect }) => {
    const { t } = useTranslation();
    const measured = wait.buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const max = Math.max(0, ...wait.buckets.map((bucket) => bucket.count));
    const excluded = [
        wait.unknown > 0 ? t("statistics.waitChart.noEnd", { n: formatNumber(wait.unknown) }) : null,
        wait.offline > 0 ? t("statistics.waitChart.offline", { n: formatNumber(wait.offline) }) : null,
    ].filter(Boolean).join(t("statistics.waitChart.and"));

    return (
        <SectionCard title={t("statistics.waitChart.title")} description={t("statistics.waitChart.description")}>
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
                                aria-label={t("statistics.waitChart.aria", { label: waitBucketLabel(bucket.key), gifts: formatNumber(bucket.count), share: formatPercent(share) })}
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
                                        {waitBucketLabel(bucket.key)}
                                    </Typography>
                                    {early && (
                                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                                            {t("statistics.waitChart.earlyNote", { minutes: wait.tolerance_minutes })}
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
                    {t("statistics.waitChart.notMeasured", { items: excluded })}
                </Typography>
            )}
        </SectionCard>
    );
};

export default WaitDistribution;
