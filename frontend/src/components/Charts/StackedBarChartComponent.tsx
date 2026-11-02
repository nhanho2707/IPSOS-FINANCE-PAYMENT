// src/components/StackedBarChart.tsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface ChartData {
  month: string;
  Replenishment: number;
  NewRecruitment: number;
}

interface StackedBarChartProps{
  legend_title?: string
  data: ChartData[];
  width?: number;
  height?: number;
}

const COLORS = [
  'var(--chart-color-secondary)',
  'var(--chart-color-sixth)'
];

const FONT_COLORS = [
  'var(--chart-font-color-primary)',
  'var(--chart-font-color-secondary)'
];

const StackedBarChartComponent: React.FC<StackedBarChartProps> = ({data}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null); // Tooltip reference
  const legendRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !tooltipRef.current)  return;

    if (!data || data.length === 0) {
      console.error("Data is undefined or empty");
      return;
    }
    
    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const keys = Object.keys(data[0]).slice(1); // Get keys for stack (Replenishment, NewRecruitment)

    const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Replenishment + d.NewRecruitment)!])
        .nice()
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(keys)
        .range([COLORS[0], COLORS[1]]); // Color for each stack

    const stack = d3.stack<ChartData>()
        .keys(keys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    const series = stack(data);

    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y));

    // Create a tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('position', 'absolute')
      .style('background-color', '#fff')
      .style('border', '1px solid #ccc')
      .style('padding', '5px')
      .style('border-radius', '3px')
      .style('pointer-events', 'none')
      .style('opacity', 0)

    // Add the bars
    svg.selectAll('g.layer')
        .data(series)
        .join('g')
        .attr('class', 'layer')
        .attr('fill', d => color(d.key) as string)
        .selectAll('rect')
        .data(d => d)
        .join('rect')
        .attr('x', d => x(d.data.month)!)
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .attr('width', x.bandwidth())
        .attr('rx', 5)
        .attr('ry', 5)
        .on('mouseover', function (event, d) {
          //tooltip.style('visibility', 'visible');
          tooltip.transition().duration(200).style('opacity', 1);

          const container = containerRef.current!;
          const [offsetX, offsetY] = d3.pointer(event, container);

          tooltip.transition().duration(200).style('opacity', 1);
          tooltip.html(`
            <span style='color:var(--chart-color-primary)'><b>${d.data.month}</b><span>:<br/>New Recruitment:  <b>${d.data.NewRecruitment}</b><br/>Replenishment: <b>${d.data.Replenishment}</b>
          `)
              .style('left', `${offsetX + 10}px`)
              .style('top', `${offsetY - 40}px`);
        })
        .on('mousemove', function (event, d) {
          const container = containerRef.current!;
                const [offsetX, offsetY] = d3.pointer(event, container);

                tooltip.style('left', `${offsetX + 10}px`)
                    .style('top', `${offsetY - 40}px`);
        })
        .on('mouseout', function () {
            //tooltip.style('visibility', 'hidden');
            tooltip.transition().duration(200).style('opacity', 0);
        });

    // Add value labels
    svg.selectAll('g.layer')
        .selectAll('text')
        .data(d => d as d3.SeriesPoint<ChartData>[]) // Explicitly typing d
        .join('text')
        .attr('x', d => x(d.data.month)! + x.bandwidth() / 2)
        .attr('y', d => y(d[1]) + (y(d[0]) - y(d[1])) / 2)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', 'black')
        .style('font-size', '12px')
        .text(d => d[1] - d[0]);

  }, [data]);

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

        {/* <table ref={legendRef} className='legend-table'>
            <thead>
                <tr>
                    <th>{legend_title}</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table> */}
    </div>
  );
};

export default StackedBarChartComponent;
