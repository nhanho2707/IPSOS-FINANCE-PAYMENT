// BarChart.tsx
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import "../../assets/css/techcombank.css";

interface BarChartProps{
    legend_title?: string
    data: { name: string; value: number }[];
    sorted: boolean; //Sort item theo thứ tự tăng hoặc giảm dần
    sortedList?: string[];
    width?: number;
    height?: number;
}

const COLORS = [
    'var(--chart-color-sixth)',
    'var(--chart-color-seventh)',
    'var(--chart-color-eighth)',
    'var(--chart-color-nineth)',
    'var(--chart-color-tenth)',
    'var(--chart-color-eleventh)',
    'var(--chart-color-twenthteen)'
];
  
const BarChartComponent: React.FC<BarChartProps> = ({ legend_title, data, sorted, sortedList }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const legendRef = useRef<HTMLTableElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null); // Tooltip reference

    useEffect(() => {
        if (!svgRef.current || !legendRef.current || !containerRef.current || !tooltipRef.current)  return;

        const svg = d3.select(svgRef.current);
        const width = svg.node()?.clientWidth || 0;
        const height = svg.node()?.clientHeight || 0;
        
        const sortedData = sorted ? [...data].sort((a, b) => b.value - a.value) : data;

        const sortedByListData = sortedList ? (sortedData.sort((a, b) => {
            return sortedList.indexOf(a.name) - sortedList.indexOf(b.name);
        })) : (sortedData)

        const total = sortedByListData.reduce((sum, item) => sum + item.value, 0);

        // Clear previous content
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const xScale = d3.scaleBand()
            .domain(sortedByListData.map(d => d.name))
            .range([0, innerWidth])
            .padding(0.1);

        const maxValue = d3.max(data, d => d.value) || 0;
        const yMax = maxValue / total * 100 <= 50 ? 50 : 100;

        const yScale = d3.scaleLinear()
            .domain([0, yMax])
            .nice()
            .range([innerHeight, 0]);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Tooltip
        const tooltip = d3.select(tooltipRef.current)
            .style('position', 'absolute')
            .style('background-color', '#fff')
            .style('border', '1px solid #ccc')
            .style('padding', '5px')
            .style('border-radius', '3px')
            .style('pointer-events', 'none')
            .style('opacity', 0)

        g.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.name) || 0)
            .attr('y', d => yScale(d.value / total * 100))
            .attr('width', 60) //xScale.bandwidth()
            .attr('height', d => innerHeight - yScale(d.value / total * 100))
            .attr('fill', (d, i) => d.value == maxValue ? 'var(--chart-color-secondary)' : COLORS[i]) // Use a different color for each bar
            .attr('rx', 5)
            .attr('ry', 5)
            .on('mouseover', (event, d) => {
                const container = containerRef.current!;
                const [offsetX, offsetY] = d3.pointer(event, container);

                tooltip.transition().duration(200).style('opacity', 1);
                tooltip.html(`
                    <span style='color:var(--chart-color-primary)'>${d.name}<span>: <b>${d.value}</b>
                `)
                    .style('left', `${offsetX + 10}px`)
                    .style('top', `${offsetY - 40}px`);
            })
            .on('mousemove', (event) => {
                const container = containerRef.current!;
                const [offsetX, offsetY] = d3.pointer(event, container);

                tooltip.style('left', `${offsetX + 10}px`)
                    .style('top', `${offsetY - 40}px`);
            })
            .on('mouseout', () => {
                tooltip.transition().duration(200).style('opacity', 0);
            });
        
        // Add value labels
        g.selectAll('.bar-label')
            .data(data)
            .enter().append('text')
            .attr('class', 'bar-label')
            .attr('x', d => xScale(d.name)! + 60 / 2) //xScale.bandwidth()
            .attr('y', d => yScale(d.value / total * 100) - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#000') // Label color
            .text(d => Math.round(d.value / total * 100) + '%');

        // X axis with no labels
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale)
                .tickSize(0)  // Remove ticks
                .tickPadding(0) // Remove padding for ticks
            )
            .selectAll('.tick text')
            .remove(); // Remove tick labels

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));
        
        // Debugging logs
        //console.log('Data length:', data.length);
        //data.forEach((item, index) => console.log(`Item ${index}:`, item));

        const legend = d3.select(legendRef.current);

        // Clear existing rows in <tbody> but keep <thead>
        legend.select('ul').selectAll('li').remove();

        const items = legend.select('ul')
                        .selectAll('li')
                        .data(data)
                        .enter().append('li');

        items.html((d: {name: string, value: number}, i: number) => {
            const colorLegend = d.value == maxValue ? 'var(--chart-color-secondary)' : COLORS[i];

            return `
                <span class='legend-square' style='background-color: ${colorLegend};'></span>
                <span>${d.name}</span> 
            `
        })

    }, [data]);
    
    console.log(data);

    return (
        <div className='widget-row-item'>
            <div ref={containerRef} className="chart-container">
                <svg ref={svgRef} width={500} height={300} />
                <div ref={tooltipRef} className="tooltip"></div>
            </div>
            
            <div ref={legendRef} className='legend-container'>
                <ul className='legend'>
                    <li></li>
                </ul>
            </div>
        </div>
    );
};

export default BarChartComponent;
