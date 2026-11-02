import { useEffect, useState } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import NPSDonutChart from './NPSDonutChart';
import RankedFactorTable from './RankedFactorTable';
import YearComparisonBarChart from './YearComparisonBarChart';
import ProductComparisonList from './ProductComparisonList';
import DashboardFilters, { DashboardFilterState } from './DashboardFilters';
import {
    npsData,
    rankedFactors,
    spendAverage,
    spendDistribution,
    productSampleSize,
    productsConsumed,
    cityOptions,
    userOptions,
    needstateOptions,
    weightOptions
} from './umeDashboardData';
import { UME_COLORS, UME_FONTS } from './umeDashboardTheme';

const FREDOKA_FONT_URL = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap';

// Fredoka is only used by this dashboard, so it is loaded here instead of in global.css.
const useFredokaFont = () => {
  useEffect(() => {
    if (document.querySelector(`link[href="${FREDOKA_FONT_URL}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FREDOKA_FONT_URL;
    document.head.appendChild(link);
  }, []);
};

const UMEDashboard = () => {
  useFredokaFont();
    const [filters, setFilters] = useState<DashboardFilterState>({
        cities: [],
        users: [],
        needstates: [],
        weights: []
    });

    return (
        <Box sx={{ p: 3, backgroundColor: UME_COLORS.cream, minHeight: '100%' }}>
            <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: UME_COLORS.y2026, fontFamily: UME_FONTS.heading, mb: 3 }}>
                UME Dashboard
            </Typography>

            <DashboardFilters
                cityOptions={cityOptions}
                userOptions={userOptions}
                needstateOptions={needstateOptions}
                weightOptions={weightOptions}
                value={filters}
                onChange={setFilters}
            />

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <NPSDonutChart title="NPS" data={npsData} />
                </Grid>
                <Grid size={{ xs: 12, md: 7 }}>
                    <RankedFactorTable title="Ranked factors" data={rankedFactors} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <YearComparisonBarChart
                        title="Spend distribution"
                        subheader={`Average: 2025: ${spendAverage.y2025} | 2026: ${spendAverage.y2026} (VND millions)`}
                        data={spendDistribution}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <ProductComparisonList
                        title="Products consumed"
                        data={productsConsumed}
                        sampleSize={productSampleSize}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default UMEDashboard;
