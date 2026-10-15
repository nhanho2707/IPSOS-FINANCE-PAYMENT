import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { YearComparisonBucket } from './umeDashboardData';
import { UME_COLORS } from './umeDashboardTheme';
import DashboardCardHeader from './DashboardCardHeader';

interface YearComparisonBarChartProps {
    title: string;
    subheader?: string;
    data: YearComparisonBucket[];
}

const CHART_HEIGHT = 260;
const MARGIN = { top: 28, right: 12, bottom: 56, left: 12 };
const FONT_SIZE = 11;

const YearComparisonBarChart: React.FC<YearComparisonBarChartProps> = ({ title, subheader, data }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (entry) {
                setWidth(entry.contentRect.width);
            }
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!svgRef.current || width === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const innerWidth = width - MARGIN.left - MARGIN.right;
        const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        const maxValue = d3.max(data, d => Math.max(d.y2025, d.y2026)) || 0;
        const yMax = Math.max(4, Math.ceil((maxValue * 1.25) / 4) * 4);

        const x0 = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, innerWidth])
            .paddingInner(0.35)
            .paddingOuter(0.1);

        const x1 = d3.scaleBand()
            .domain(['y2025', 'y2026'])
            .range([0, x0.bandwidth()])
            .padding(0.12);

        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([innerHeight, 0]);

        const seriesColor: Record<string, string> = { y2025: UME_COLORS.y2025, y2026: UME_COLORS.y2026 };

        const groups = g.selectAll('.bucket')
            .data(data)
            .enter()
            .append('g')
            .attr('transform', d => `translate(${x0(d.label)},0)`);

        (['y2025', 'y2026'] as const).forEach((key) => {
            groups.append('rect')
                .attr('x', x1(key) || 0)
                .attr('y', d => y(d[key]))
                .attr('width', x1.bandwidth())
                .attr('height', d => innerHeight - y(d[key]))
                .attr('rx', 3)
                .attr('fill', seriesColor[key]);

            groups.append('text')
                .attr('x', (x1(key) || 0) + x1.bandwidth() / 2)
                .attr('y', d => y(d[key]) - 6)
                .attr('text-anchor', 'middle')
                .attr('fill', UME_COLORS.ink)
                .style('font-size', `${FONT_SIZE}px`)
                .style('font-weight', 600)
                .text(d => d[key]);
        });

        g.append('g')
            .selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .attr('transform', d => {
                const x = (x0(d.label) || 0) + x0.bandwidth() / 2;
                return `translate(${x},${innerHeight + 12}) rotate(-30)`;
            })
            .attr('text-anchor', 'end')
            .attr('fill', UME_COLORS.mutedInk)
            .style('font-size', `${FONT_SIZE}px`)
            .text(d => d.label);
    }, [data, width]);

    return (
        <Card sx={{ height: '100%', overflow: 'hidden' }}>
            <DashboardCardHeader title={title} />
            <CardContent>
                {subheader && (
                    <Typography variant="caption" sx={{ color: UME_COLORS.mutedInk, display: 'block', mb: 1 }}>
                        {subheader}
                    </Typography>
                )}
                <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: UME_COLORS.y2025 }} />
                        <Typography variant="caption" sx={{ color: UME_COLORS.ink }}>2025</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: UME_COLORS.y2026 }} />
                        <Typography variant="caption" sx={{ color: UME_COLORS.ink }}>2026</Typography>
                    </Stack>
                </Stack>
                <div ref={containerRef} style={{ width: '100%' }}>
                    <svg ref={svgRef} width={width} height={CHART_HEIGHT} style={{ display: 'block' }} />
                </div>
            </CardContent>
        </Card>
    );
};

export default YearComparisonBarChart;
