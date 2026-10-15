import React from 'react';
import { Box, Typography } from '@mui/material';
import { UME_COLORS, UME_FONTS } from './umeDashboardTheme';

interface DashboardCardHeaderProps {
    title: string;
}

const DashboardCardHeader: React.FC<DashboardCardHeaderProps> = ({ title }) => (
    <Box sx={{ backgroundColor: UME_COLORS.y2026, color: '#fff', px: 2.5, py: 1.25 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: UME_FONTS.heading }}>
            {title}
        </Typography>
    </Box>
);

export default DashboardCardHeader;
