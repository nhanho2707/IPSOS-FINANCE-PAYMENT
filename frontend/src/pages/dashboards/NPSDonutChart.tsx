import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { NPSData } from './umeDashboardData';
import { UME_COLORS, UME_FONTS } from './umeDashboardTheme';
import DashboardCardHeader from './DashboardCardHeader';

interface NPSDonutChartProps {
    title: string;
    data: NPSData;
}

const SIZE = 220;
const THICKNESS = 28;

const LEGEND_ITEMS = [
    { key: 'promoters', label: 'Promoters', color: UME_COLORS.promoter },
    { key: 'passives', label: 'Passives', color: UME_COLORS.passive },
    { key: 'detractors', label: 'Detractors', color: UME_COLORS.detractor }
] as const;

const NPSDonutChart: React.FC<NPSDonutChartProps> = ({ title, data }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!svgRef.current || !tooltipRef.current || !containerRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const radius = SIZE / 2;

        const g = svg.append('g').attr('transform', `translate(${radius},${radius})`);

        const segments = [
            { key: 'promoters', value: data.promoters, color: UME_COLORS.promoter, label: 'Promoters' },
            { key: 'passives', value: data.passives, color: UME_COLORS.passive, label: 'Passives' },
            { key: 'detractors', value: data.detractors, color: UME_COLORS.detractor, label: 'Detractors' }
        ];

        const pie = d3.pie<typeof segments[number]>()
            .value(d => d.value)
            .sort(null)
            .padAngle(0.02);

        const arc = d3.arc<d3.PieArcDatum<typeof segments[number]>>()
            .innerRadius(radius - THICKNESS)
            .outerRadius(radius)
            .cornerRadius(3);

        const tooltip = d3.select(tooltipRef.current)
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('opacity', 0);

        g.selectAll('path')
            .data(pie(segments))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .style('cursor', 'pointer')
            .on('pointerenter pointermove', function (event, d) {
                d3.select(this).attr('opacity', 0.85);

                const [offsetX, offsetY] = d3.pointer(event, containerRef.current);

                tooltip
                    .style('opacity', 1)
                    .style('left', `${offsetX + 12}px`)
                    .style('top', `${Math.max(offsetY - 40, 0)}px`)
                    .html(`
                        <div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">
                            <span style="width:8px;height:8px;border-radius:2px;background:${d.data.color};display:inline-block;"></span>
                            <span>${d.data.label}</span>
                            <strong style="margin-left:8px;">${d.data.value}%</strong>
                        </div>
                    `);
            })
            .on('pointerleave', function () {
                d3.select(this).attr('opacity', 1);
                tooltip.style('opacity', 0);
            });
    }, [data]);

    return (
        <Card sx={{ height: '100%', overflow: 'hidden' }}>
            <DashboardCardHeader title={title} />
            <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                    <Box ref={containerRef} sx={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
                        <svg ref={svgRef} width={SIZE} height={SIZE} />
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none'
                            }}
                        >
                            <Typography variant="h4" fontWeight={700} sx={{ color: UME_COLORS.y2026, fontFamily: UME_FONTS.heading }}>
                                {data.score}
                            </Typography>
                            <Typography variant="caption" sx={{ color: UME_COLORS.mutedInk }}>
                                NPS
                            </Typography>
                        </Box>
                        <div
                            ref={tooltipRef}
                            style={{
                                position: 'absolute',
                                background: '#fff',
                                border: '1px solid rgba(0,0,0,0.08)',
                                borderRadius: 8,
                                padding: '6px 10px',
                                fontSize: 12,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                pointerEvents: 'none',
                                zIndex: 1
                            }}
                        />
                    </Box>

                    <Stack spacing={1.25}>
                        {LEGEND_ITEMS.map((item) => {
                            const value = data[item.key as keyof NPSData] as number;

                            return (
                                <Stack key={item.key} direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: item.color }} />
                                    <Typography variant="body2" sx={{ color: UME_COLORS.ink, minWidth: 90 }}>
                                        {item.label}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} sx={{ color: UME_COLORS.ink }}>
                                        {value}%
                                    </Typography>
                                </Stack>
                            );
                        })}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default NPSDonutChart;
