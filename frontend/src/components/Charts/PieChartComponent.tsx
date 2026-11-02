import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface PieChartProps{
  title: string
  data: { name: string; value: number }[];
  width?: number;
  height?: number;
}

const COLORS = [
  'var(--chart-color-sixth)',
  'var(--chart-color-seventh)',
  'var(--chart-color-eighth)',
  'var(--chart-color-nineth)',
  'var(--chart-color-tenth)',
  'var(--chart-color-eleventh)'
];

const PieChartComponent:React.FC<PieChartProps> = ({ title, data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLTableElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null); // Tooltip reference

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !legendRef.current || !tooltipRef.current) return;
    
    if (!data || data.length === 0) {
      console.error("Data is undefined or empty");
      return;
    }

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetWidth;
    const radius = Math.min(width, height) / 2 * 0.8;

    const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height);

    svg.selectAll('*').remove(); // Clear existing content

    const g = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie<{ name: string, value: number}>().value((d: any) => d.value);
    const arc = d3.arc().outerRadius(radius - 10).innerRadius(radius * 0.5);
    const outerArc = d3.arc().outerRadius(radius * 0.9).innerRadius(radius * 0.9);
    
    const maxObject = data.reduce((max, obj) => (obj.value > max.value ? obj : max), data[0]);
    const total = data.reduce((sum, item) => sum + item.value, 0);

    const dataReady = pie(data);

    // Tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style('position', 'absolute')
      .style('background-color', '#fff')
      .style('border', '1px solid #ccc')
      .style('padding', '5px')
      .style('border-radius', '3px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      
    g.selectAll('path')
      .data(dataReady)
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', (d: any, i: number) => d.value === maxObject.value ? 'var(--chart-color-secondary)' : COLORS[i]) 
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .on('mouseenter', function (event, d) {
        tooltip.style('opacity', 1);
      })
      .on('mousemove', function (event, d) {
        const container = containerRef.current!;
        const [offsetX, offsetY] = d3.pointer(event, container);

        tooltip
          .html(`<span style='color:var(--chart-color-primary)'>${d.data.name}<span>: <b>${d.data.value}</b>`)
          .style('left', (offsetX + 10) + 'px')
          .style('top', (offsetY - 20) + 'px');
      })
      .on('mouseleave', function () {
        tooltip.style('opacity', 0);
      });

    // Add value labels inside each slice
    g.selectAll("text")
      .data(dataReady)
      .enter()
      .append("text")
      .attr("transform", (d: any) => `translate(${arc.centroid(d)})`)  // Center the text inside each slice
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text((d: any) => `${Math.round(d.data.value / total * 100)}%`)  // Display the value
      .style("fill", "white")  // Set text color to white for better visibility
      .style("font-size", "12px")  // Adjust font size as needed
      .style("font-weight", "bold");

      const legend = d3.select(legendRef.current);

        // Clear existing rows in <tbody> but keep <thead>
        legend.select('ul').selectAll('li').remove();

        const items = legend.select('ul')
                        .selectAll('li')
                        .data(data)
                        .enter().append('li');

        items.html((d: {name: string, value: number}, i: number) => {
            const colorLegend = d.value == maxObject.value ? 'var(--chart-color-secondary)' : COLORS[i];

            return `
                <span class='legend-square' style='background-color: ${colorLegend};'></span>
                <span>${d.name}</span> 
            `
        })
  }, [data]);

  return (
    <div className='widget-col-item'>
        <div>
            <h3 style={{ color: 'var(--font-secondary)'}}>{title}</h3>
        </div>
        <div ref={containerRef} className="chart-container" >
            <svg ref={svgRef}></svg>
            <div ref={tooltipRef} className="tooltip"></div>
        </div>
        <div ref={legendRef} className='legend-container'>
            <ul className='legend-horizontal'>
                <li></li>
            </ul>
        </div>
    </div>
  );
}

export default PieChartComponent;
