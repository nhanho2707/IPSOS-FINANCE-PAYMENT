// BarChart.tsx
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Rows } from '@phosphor-icons/react';

interface VennChartProps{
    legend_title?: string
    data: { sets: string[]; size: number }[];
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
  
  const FONT_COLORS = [
    'var(--chart-font-color-primary)',
    'var(--chart-font-color-secondary)', 
    'var(--chart-font-color-third)', 
    'var(--chart-font-color-forth)', 
    'var(--chart-font-color-fifth)', 
    'var(--chart-font-color-sixth)',
    'var(--chart-font-color-seventh)',
    'var(--chart-font-color-eighth)'
];
  
const colors = d3.schemeCategory10; // Use D3's color scheme for distinct colors

const VennChartComponent: React.FC<VennChartProps> = ({ legend_title, data, sorted, sortedList }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const legendRef = useRef<HTMLTableElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null); // Tooltip reference

    useEffect(() => {
        if (!svgRef.current || !legendRef.current || !containerRef.current || !tooltipRef.current)  return;

        const svg = d3.select(svgRef.current);
        const width = svg.node()?.clientWidth || 0;
        const height = svg.node()?.clientHeight || 0;
        
        // Clear previous content
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Calculate the positions and sizes of the circles
        const sets = ["BANCA", "Credit", "CASA/ Debit", "TD"];
        const circleData = sets.map((set, index) => ({
            name: set,
            radius: 50, // Adjust the radius for your needs
            x: 150 + index * 100, // Adjust positioning for overlapping
            y: height / 2,
            color: d3.schemeCategory10[index],
        }));

        // Draw the circles
        const circles = svg.selectAll("circle")
            .data(circleData)
            .enter()
            .append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", (d) => d.radius)
            .style("fill", (d) => d.color)
            .style("fill-opacity", 0.5)
            .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(200).style("fill-opacity", 0.7);
            })
            .on("mouseout", function (event, d) {
            d3.select(this).transition().duration(200).style("fill-opacity", 0.5);
            });

        // Draw labels
        svg.selectAll("text")
            .data(circleData)
            .enter()
            .append("text")
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y)
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .text((d) => d.name);

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

export default VennChartComponent;
