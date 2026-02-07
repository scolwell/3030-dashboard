import React, { useMemo } from 'react';
import * as d3 from 'd3';

interface Props {
  mean: number;
  stdDev: number;
  alpha: number;
  sampleMean?: number;
  showCriticalRegion?: boolean;
  showCentralRegion?: boolean;
  highlightAlpha?: boolean;
  testType?: 'one-tailed' | 'two-tailed';
}

function getZScore(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  const t = Math.sqrt(-2.0 * Math.log(p < 0.5 ? p : 1.0 - p));
  const z = t - ((2.515517 + 0.802853 * t + 0.010328 * t * t) /
            (1.0 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t));
  return p < 0.5 ? -z : z;
}

const NormalDistribution: React.FC<Props> = ({ 
  mean, 
  stdDev, 
  alpha, 
  sampleMean, 
  showCriticalRegion,
  showCentralRegion,
  testType = 'two-tailed'
}) => {
  const width = 800;
  const height = 500; 
  const margin = { top: 120, right: 80, bottom: 120, left: 80 };

  const isTwoTailed = testType === 'two-tailed';
  const alphaInTail = isTwoTailed ? alpha / 2 : alpha;
  const zAlpha = useMemo(() => Math.abs(getZScore(alphaInTail)), [alphaInTail]);
  const xRange = [mean - 4 * stdDev, mean + 4 * stdDev];
  
  const xScale = useMemo(() => 
    d3.scaleLinear().domain(xRange).range([margin.left, width - margin.right]),
    [mean, stdDev]
  );
  
  const yScale = useMemo(() => {
    const maxDensity = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    return d3.scaleLinear().domain([0, maxDensity * 1.2]).range([height - margin.bottom, margin.top]);
  }, [stdDev]);

  const pdf = (x: number) => 
    (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));

  const lineData = useMemo(() => {
    const points = [];
    const step = (xRange[1] - xRange[0]) / 200;
    for (let x = xRange[0]; x <= xRange[1]; x += step) {
      points.push({ x, y: pdf(x) });
    }
    return points;
  }, [mean, stdDev]);

  const areaGenerator = d3.area<{ x: number; y: number }>()
    .x(d => xScale(d.x))
    .y0(yScale(0))
    .y1(d => yScale(d.y))
    .curve(d3.curveBasis);

  const lineGenerator = d3.line<{ x: number; y: number }>()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveBasis);

  const criticalXLeft = mean - zAlpha * stdDev;
  const criticalXRight = mean + zAlpha * stdDev;

  const leftTailData = lineData.filter(d => d.x <= criticalXLeft);
  const rightTailData = lineData.filter(d => d.x >= criticalXRight);
  const centralData = lineData.filter(d => d.x >= criticalXLeft && d.x <= criticalXRight);

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-full drop-shadow-sm overflow-visible">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <marker id="arrowhead-red-left" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="10 0, 0 3.5, 10 7" fill="#ef4444" />
          </marker>
          <marker id="arrowhead-red-right" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          <marker id="arrowhead-slate-left" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="10 0, 0 3.5, 10 7" fill="#94a3b8" />
          </marker>
          <marker id="arrowhead-slate-right" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
          <marker id="arrowhead-blue-left" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="10 0, 0 3.5, 10 7" fill="#2563eb" />
          </marker>
          <marker id="arrowhead-blue-right" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
          </marker>
        </defs>

        <path d={areaGenerator(lineData) || ""} fill="#f8fafc" />

        {showCentralRegion && (
          <g className="animate-in fade-in duration-700">
            <path d={areaGenerator(centralData) || ""} fill="#dbeafe" fillOpacity="0.6" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x={xScale(mean)} y={yScale(pdf(mean)) + 70} textAnchor="middle" fontSize="24" fontWeight="900" fill="#1e40af" className="drop-shadow-sm">
              {((1 - alpha) * 100).toFixed(0)}%
            </text>
            <text x={xScale(mean)} y={yScale(pdf(mean)) + 90} textAnchor="middle" fontSize="10" fontWeight="900" fill="#2563eb" className="uppercase tracking-[0.2em]">Expected Region</text>
            
            <line x1={xScale(criticalXLeft)} y1={yScale(0)} x2={xScale(criticalXLeft)} y2={yScale(pdf(criticalXLeft)) - 10} stroke="#2563eb" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={xScale(criticalXRight)} y1={yScale(0)} x2={xScale(criticalXRight)} y2={yScale(pdf(criticalXRight)) - 10} stroke="#2563eb" strokeWidth="1" strokeDasharray="3 3" />

            <g transform={`translate(0, ${height - margin.bottom + 50})`}>
               <line x1={xScale(criticalXLeft) + 5} y1="0" x2={xScale(criticalXRight) - 5} y2="0" stroke="#2563eb" strokeWidth="2" markerStart="url(#arrowhead-blue-left)" markerEnd="url(#arrowhead-blue-right)" />
            </g>
          </g>
        )}

        {showCriticalRegion && (
          <g className="animate-in fade-in duration-500">
            {isTwoTailed && (
              <path d={areaGenerator(leftTailData) || ""} fill="#fee2e2" fillOpacity="0.8" stroke="#ef4444" strokeWidth="1" />
            )}
            <path d={areaGenerator(rightTailData) || ""} fill="#fee2e2" fillOpacity="0.8" stroke="#ef4444" strokeWidth="1" />
            
            {isTwoTailed && (
              <text x={xScale(criticalXLeft)} y={yScale(pdf(criticalXLeft)) - 15} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ef4444">
                -{zAlpha.toFixed(2)}
              </text>
            )}
            <text x={xScale(criticalXRight)} y={yScale(pdf(criticalXRight)) - 15} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ef4444">
              +{zAlpha.toFixed(2)}
            </text>

            <g transform={`translate(0, ${height - margin.bottom + 100})`}>
               {isTwoTailed && (
                 <g>
                    <line x1={xScale(criticalXLeft) - 5} y1="0" x2={xScale(xRange[0]) + 10} y2="0" stroke="#ef4444" strokeWidth="2" markerStart="url(#arrowhead-red-left)" markerEnd="url(#arrowhead-red-right)" />
                    <text x={(xScale(criticalXLeft) - 5 + xScale(xRange[0]) + 10) / 2} y="-20" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ef4444" className="uppercase tracking-[0.1em]">Reject H₀</text>
                    <text x={(xScale(criticalXLeft) + xScale(xRange[0])) / 2} y="-35" textAnchor="middle" fontSize="8" fontWeight="800" fill="#ef4444">α/2</text>
                 </g>
               )}
               <g>
                  <line x1={xScale(criticalXRight) + 5} y1="0" x2={xScale(xRange[1]) - 10} y2="0" stroke="#ef4444" strokeWidth="2" markerStart="url(#arrowhead-red-left)" markerEnd="url(#arrowhead-red-right)" />
                  <text x={(xScale(criticalXRight) + 5 + xScale(xRange[1]) - 10) / 2} y="-20" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ef4444" className="uppercase tracking-[0.1em]">Reject H₀</text>
                  {isTwoTailed && <text x={(xScale(criticalXRight) + xScale(xRange[1])) / 2} y="-35" textAnchor="middle" fontSize="8" fontWeight="800" fill="#ef4444">α/2</text>}
               </g>
               <g>
                  <line 
                    x1={isTwoTailed ? xScale(criticalXLeft) + 5 : xScale(xRange[0]) + 20}
                    y1="0" 
                    x2={xScale(criticalXRight) - 5} 
                    y2="0" 
                    stroke="#94a3b8" 
                    strokeWidth="2" 
                    markerStart={isTwoTailed ? "url(#arrowhead-slate-left)" : ""}
                    markerEnd="url(#arrowhead-slate-right)" 
                  />
                  <text 
                    x={isTwoTailed ? (xScale(criticalXLeft) + xScale(criticalXRight)) / 2 : (xScale(xRange[0]) + xScale(criticalXRight)) / 2}
                    y="-20" 
                    textAnchor="middle" 
                    fontSize="9" 
                    fontWeight="800" 
                    fill="#64748b" 
                    className="uppercase tracking-[0.1em]"
                  >
                    Fail to Reject H₀
                  </text>
               </g>
            </g>
          </g>
        )}

        <path d={lineGenerator(lineData) || ""} fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />

        <line x1={xScale(mean)} y1={yScale(0)} x2={xScale(mean)} y2={margin.top - 40} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <text x={xScale(mean)} y={margin.top - 50} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#64748b" className="uppercase tracking-widest">Null Truth (μ₀)</text>

        <g transform={`translate(0, ${height - margin.bottom})`}>
          <line x1={margin.left} y1="0" x2={width - margin.right} y2="0" stroke="#334155" strokeWidth="2" />
          {[ -3, -2, -1, 0, 1, 2, 3 ].map(sd => {
            const val = mean + sd * stdDev;
            const pos = xScale(val);
            return (
              <g key={sd} transform={`translate(${pos}, 0)`}>
                <line y2="8" stroke="#334155" strokeWidth="1.5" />
                <text y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill={sd === 0 ? "#2563eb" : "#94a3b8"}>
                  {sd === 0 ? "0" : `${sd > 0 ? '+' : ''}${sd}σ`}
                </text>
                <text y="42" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#334155">
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}
        </g>

        {sampleMean !== undefined && !showCentralRegion && (
          <g className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            <line 
              x1={xScale(sampleMean)} 
              y1={yScale(0)} 
              x2={xScale(sampleMean)} 
              y2={yScale(pdf(sampleMean)) - 10} 
              stroke="#2563eb" 
              strokeWidth="3" 
              strokeDasharray="6 4" 
            />
            <circle cx={xScale(sampleMean)} cy={yScale(0)} r="6" fill="#2563eb" />
            <foreignObject x={xScale(sampleMean) - 60} y={yScale(pdf(sampleMean)) - 65} width="120" height="50">
              <div className="bg-slate-900 text-white rounded-2xl px-3 py-2 text-center shadow-xl border border-slate-700">
                <p className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Sample Mean</p>
                <p className="text-sm font-black tabular-nums leading-none">x̄ = {sampleMean.toFixed(1)}</p>
              </div>
            </foreignObject>
          </g>
        )}
      </svg>
    </div>
  );
};

export default NormalDistribution;