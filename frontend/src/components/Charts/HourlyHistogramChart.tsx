import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader } from '@mui/material';

interface HistogramDatum {
    name: string;
    value: number;
}

interface HourlyHistogramChartProps {
    title: string;
    data: HistogramDatum[];
    valueLabel: string;
}

const CHART_HEIGHT = 280;
const MARGIN = { top: 16, right: 16, bottom: 32, left: 36 };
const AXIS_FONT_SIZE = 11;

function roundedTopBarPath(x: number, y: number, width: number, height: number, radius: number): string {
    if (height <= 0) return '';

    const r = Math.min(radius, width / 2, height);

    return `
        M${x},${y + height}
        L${x},${y + r}
        Q${x},${y} ${x + r},${y}
        L${x + width - r},${y}
        Q${x + width},${y} ${x + width},${y + r}
        L${x + width},${y + height}
        Z
    `;
}

const HourlyHistogramChart: React.FC<HourlyHistogramChartProps> = ({ title, data, valueLabel }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);

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
        if (!svgRef.current || !containerRef.current || !tooltipRef.current || width === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const innerWidth = width - MARGIN.left - MARGIN.right;
        const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

        const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        const tooltip = d3.select(tooltipRef.current)
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('opacity', 0);

        if (data.length === 0) {
            g.append('text')
                .attr('x', innerWidth / 2)
                .attr('y', innerHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text-primary-color)')
                .style('font-size', `${AXIS_FONT_SIZE}px`)
                .text('Không có dữ liệu');

            return;
        }

        const maxValue = d3.max(data, d => d.value) || 0;
        const niceMax = Math.max(4, Math.ceil(maxValue / 4) * 4);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, innerWidth])
            .paddingInner(0.35)
            .paddingOuter(0.15);

        const yScale = d3.scaleLinear()
            .domain([0, niceMax])
            .range([innerHeight, 0]);

        const yTicks = yScale.ticks(4);

        g.append('g')
            .selectAll('line')
            .data(yTicks)
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', d => yScale(d))
            .attr('y2', d => yScale(d))
            .attr('stroke', 'var(--text-primary-color)')
            .attr('stroke-opacity', 0.15)
            .attr('stroke-width', 1);

        g.append('g')
            .selectAll('text')
            .data(yTicks)
            .enter()
            .append('text')
            .attr('x', -10)
            .attr('y', d => yScale(d))
            .attr('dy', '0.32em')
            .attr('text-anchor', 'end')
            .attr('fill', 'var(--text-primary-color)')
            .style('font-size', `${AXIS_FONT_SIZE}px`)
            .text(d => d);

        const barWidth = Math.min(24, xScale.bandwidth());
        const barOffset = (xScale.bandwidth() - barWidth) / 2;

        const bars = g.selectAll('.bar')
            .data(data)
            .enter()
            .append('path')
            .attr('class', 'bar')
            .attr('d', d => roundedTopBarPath(
                (xScale(d.name) || 0) + barOffset,
                yScale(d.value),
                barWidth,
                innerHeight - yScale(d.value),
                4
            ))
            .attr('fill', 'var(--main-color)')
            .style('cursor', 'pointer');

        bars.on('pointerenter pointermove', function (event, d) {
            d3.select(this).attr('opacity', 0.85);

            const [offsetX, offsetY] = d3.pointer(event, containerRef.current);

            tooltip
                .style('opacity', 1)
                .style('left', `${offsetX + 12}px`)
                .style('top', `${Math.max(offsetY - 54, 0)}px`)
                .html(`
                    <div style="font-weight:600;margin-bottom:4px;">${d.name}</div>
                    <div style="display:flex;align-items:center;gap:6px;white-space:nowrap;">
                        <span style="width:8px;height:8px;border-radius:2px;background:var(--main-color);display:inline-block;flex-shrink:0;"></span>
                        <span>${valueLabel}</span>
                        <strong style="margin-left:8px;">${d.value}</strong>
                    </div>
                `);
        }).on('pointerleave', function () {
            d3.select(this).attr('opacity', 1);
            tooltip.style('opacity', 0);
        });

        g.append('g')
            .selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .attr('x', d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
            .attr('y', innerHeight + 20)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-primary-color)')
            .style('font-size', `${AXIS_FONT_SIZE}px`)
            .text(d => d.name);
    }, [data, valueLabel, width]);

    return (
        <Card>
            <CardHeader title={title} sx={{ color: 'var(--font-secondary)' }} />
            <CardContent>
                <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
                    <svg
                        ref={svgRef}
                        width={width}
                        height={CHART_HEIGHT}
                        style={{ display: 'block' }}
                    />
                    <div
                        ref={tooltipRef}
                        style={{
                            position: 'absolute',
                            background: 'var(--background-color)',
                            color: 'var(--text-color)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                            pointerEvents: 'none',
                            minWidth: 130,
                            zIndex: 1
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default HourlyHistogramChart;
