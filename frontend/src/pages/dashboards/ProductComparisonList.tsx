import React from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { ProductComparisonItem } from './umeDashboardData';
import { UME_COLORS } from './umeDashboardTheme';
import DashboardCardHeader from './DashboardCardHeader';

interface ProductComparisonListProps {
    title: string;
    data: ProductComparisonItem[];
    sampleSize: { y2025: number; y2026: number };
}

const BAR_HEIGHT = 8;
const BAR_GAP = 3;

const ProductComparisonList: React.FC<ProductComparisonListProps> = ({ title, data, sampleSize }) => {
    const maxValue = Math.max(...data.flatMap((d) => [d.y2025, d.y2026]), 1);

    return (
        <Card sx={{ height: '100%', overflow: 'hidden' }}>
            <DashboardCardHeader title={title} />

            <CardContent>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: UME_COLORS.y2025 }} />
                        <Typography variant="caption" sx={{ color: UME_COLORS.ink }}>
                            2025 (n={sampleSize.y2025.toLocaleString()})
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: UME_COLORS.y2026 }} />
                        <Typography variant="caption" sx={{ color: UME_COLORS.ink }}>
                            2026 (n={sampleSize.y2026.toLocaleString()})
                        </Typography>
                    </Stack>
                </Stack>

                <Stack spacing={1.5}>
                    {data.map((item) => (
                        <Stack key={item.label} direction="row" spacing={1.5} alignItems="center">
                            <Typography variant="body2" sx={{ color: UME_COLORS.ink, width: 170, flexShrink: 0 }}>
                                {item.label}
                            </Typography>

                            <Box sx={{ flexGrow: 1 }}>
                                <Stack spacing={`${BAR_GAP}px`}>
                                    {([
                                        { key: 'y2025', value: item.y2025, color: UME_COLORS.y2025 },
                                        { key: 'y2026', value: item.y2026, color: UME_COLORS.y2026 }
                                    ] as const).map((series) => (
                                        <Stack key={series.key} direction="row" spacing={1} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: `${(series.value / maxValue) * 100}%`,
                                                    height: BAR_HEIGHT,
                                                    minWidth: 4,
                                                    backgroundColor: series.color,
                                                    borderRadius: '2px'
                                                }}
                                            />
                                            <Typography variant="caption" fontWeight={700} sx={{ color: UME_COLORS.ink }}>
                                                {series.value}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                        </Stack>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
};

export default ProductComparisonList;
