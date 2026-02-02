
import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Label
} from 'recharts';
import { 
  Settings2, 
  ArrowLeftRight, 
  ArrowLeft, 
  ArrowRight, 
  MoveHorizontal,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { normalCDF, normalPDF, generateNormalCurveData, zScore } from '../services/statsUtils';

type CalcMode = 'between' | 'below' | 'above' | 'outside';

const NormalCurveTool: React.FC = () => {
  const [mean, setMean] = useState<number>(0);
  const [sd, setSd] = useState<number>(1);
  const [val1, setVal1] = useState<string>('-1');
  const [val2, setVal2] = useState<string>('1');
  const [mode, setMode] = useState<CalcMode>('between');

  // Math Results
  const results = useMemo(() => {
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    const z1 = zScore(v1, mean, sd);
    const z2 = zScore(v2, mean, sd);
    const p1 = normalCDF(v1, mean, sd);
    const p2 = normalCDF(v2, mean, sd);

    let area = 0;
    switch (mode) {
      case 'between':
        area = Math.abs(p2 - p1);
        break;
      case 'below':
        area = p1;
        break;
      case 'above':
        area = 1 - p2;
        break;
      case 'outside':
        area = p1 + (1 - p2);
        break;
    }

    return { z1, z2, p1, p2, area };
  }, [mean, sd, val1, val2, mode]);

  // Chart Data
  const chartData = useMemo(() => {
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    let baseData = generateNormalCurveData(mean, sd);
    
    // Insert exact boundary points
    const boundaryPoints = [v1, v2].filter(v => !isNaN(v));
    
    // Check if boundary points exist in baseData
    for (const boundary of boundaryPoints) {
      const exists = baseData.some(p => Math.abs(p.x - boundary) < 0.0001);
      if (!exists) {
        const y = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((boundary - mean) / sd, 2));
        baseData.push({ x: boundary, y });
      }
    }
    
    baseData.sort((a, b) => a.x - b.x);
    
    const min = Math.min(v1, v2);
    const max = Math.max(v1, v2);
    
    // Map with shading
    let result = baseData.map((point) => {
      let isShaded = false;
      const x = point.x;

      switch (mode) {
        case 'between':
          isShaded = x > min && x < max;
          break;
        case 'below':
          isShaded = x < v1;
          break;
        case 'above':
          isShaded = x > v2;
          break;
        case 'outside':
          isShaded = (x < min) || (x > max);
          break;
      }

      return {
        ...point,
        shadedY: isShaded ? point.y : 0,
      };
    });

    // Insert edge points at exact boundaries
    const edgePoints = [];
    for (const boundary of boundaryPoints) {
      const y = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((boundary - mean) / sd, 2));
      
      // Add point just before boundary (unshaded)
      edgePoints.push({
        x: boundary - 0.00001,
        y: y,
        shadedY: 0,
      });
      
      // Add point just after boundary (unshaded initially, will be determined by logic)
      edgePoints.push({
        x: boundary + 0.00001,
        y: y,
        shadedY: 0,
      });
    }
    
    // Merge and recalculate shading for edge points
    result = [...result, ...edgePoints];
    result.sort((a, b) => a.x - b.x);
    
    result = result.map((point) => {
      let isShaded = false;
      const x = point.x;

      switch (mode) {
        case 'between':
          isShaded = x > min && x < max;
          break;
        case 'below':
          isShaded = x < v1;
          break;
        case 'above':
          isShaded = x > v2;
          break;
        case 'outside':
          isShaded = (x < min) || (x > max);
          break;
      }

      return {
        ...point,
        shadedY: isShaded ? point.y : 0,
      };
    });
    
    return result;
  }, [mean, sd, val1, val2, mode]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      {/* Top Section: Controls and Result Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Panel */}
        <div className="lg:col-span-4">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <Settings2 size={20} />
              <h3 className="font-bold text-slate-800">Population Parameters</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">Mean (μ)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={mean}
                      onChange={(e) => setMean(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200">
                      <button
                        onClick={() => setMean(Number((mean + 0.01).toFixed(2)))}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center border-b border-slate-200 rounded-tr-lg"
                      >
                        <ChevronUp size={14} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => setMean(Number((mean - 0.01).toFixed(2)))}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center rounded-br-lg"
                      >
                        <ChevronDown size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">SE (σ)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={sd}
                      onChange={(e) => setSd(Math.max(0.01, Number(e.target.value)))}
                      className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200">
                      <button
                        onClick={() => setSd(Number((sd + 0.01).toFixed(2)))}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center border-b border-slate-200 rounded-tr-lg"
                      >
                        <ChevronUp size={14} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => setSd(Math.max(0.01, Number((sd - 0.01).toFixed(2))))}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center rounded-br-lg"
                      >
                        <ChevronDown size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-4" />

              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <ArrowLeftRight size={20} />
                <h3 className="font-bold text-slate-800">Test Parameters</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">X₁ (Test Value 1)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={val1}
                      onChange={(e) => setVal1(e.target.value)}
                      className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200">
                      <button
                        onClick={() => setVal1(String(Number((parseFloat(val1) + 0.01).toFixed(2))))}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center border-b border-slate-200 rounded-tr-lg"
                      >
                        <ChevronUp size={14} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => setVal1(String(Number((parseFloat(val1) - 0.01).toFixed(2))))}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center rounded-br-lg"
                      >
                        <ChevronDown size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 tracking-wider">X₂ (Test Value 2)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={val2}
                      onChange={(e) => setVal2(e.target.value)}
                      className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200">
                      <button
                        onClick={() => setVal2(String(Number((parseFloat(val2) + 0.01).toFixed(2))))}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center border-b border-slate-200 rounded-tr-lg"
                      >
                        <ChevronUp size={14} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => setVal2(String(Number((parseFloat(val2) - 0.01).toFixed(2))))}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center rounded-br-lg"
                      >
                        <ChevronDown size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 my-4" />

              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <MoveHorizontal size={20} />
                <h3 className="font-bold text-slate-800">Calculation Mode</h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                  {/* Between */}
                  <button
                    onClick={() => setMode('between')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                      mode === 'between' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <svg width="20" height="16" viewBox="0 0 40 32" fill="none" className="flex-shrink-0">
                      <path d="M2 28 Q10 24, 15 16 T20 8 T25 16 Q30 24, 38 28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
                      <path d="M12 20 Q15 16, 17 13 T20 8 T23 13 Q25 16, 28 20 L28 28 L12 28 Z" fill="currentColor" opacity="0.3"/>
                    </svg>
                    <span>Between</span>
                    <span className="text-xs opacity-100 ml-auto">(x₁ ≤ x ≤ x₂)</span>
                  </button>

                  {/* Below */}
                  <button
                    onClick={() => setMode('below')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                      mode === 'below' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <svg width="20" height="16" viewBox="0 0 40 32" fill="none" className="flex-shrink-0">
                      <path d="M2 28 Q10 24, 15 16 T20 8 T25 16 Q30 24, 38 28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
                      <path d="M2 28 Q10 24, 15 16 T17 13 L17 28 L2 28 Z" fill="currentColor" opacity="0.3"/>
                    </svg>
                    <span>Below</span>
                    <span className="text-xs opacity-100 ml-auto">(x ≤ x₁)</span>
                  </button>

                  {/* Above */}
                  <button
                    onClick={() => setMode('above')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                      mode === 'above' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <svg width="20" height="16" viewBox="0 0 40 32" fill="none" className="flex-shrink-0">
                      <path d="M2 28 Q10 24, 15 16 T20 8 T25 16 Q30 24, 38 28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
                      <path d="M23 13 T25 16 Q30 24, 38 28 L38 28 L23 28 Z" fill="currentColor" opacity="0.3"/>
                    </svg>
                    <span>Above</span>
                    <span className="text-xs opacity-100 ml-auto">(x ≥ x₂)</span>
                  </button>

                  {/* Outside */}
                  <button
                    onClick={() => setMode('outside')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                      mode === 'outside' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <svg width="20" height="16" viewBox="0 0 40 32" fill="none" className="flex-shrink-0">
                      <path d="M2 28 Q10 24, 15 16 T20 8 T25 16 Q30 24, 38 28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4"/>
                      <path d="M2 28 Q10 24, 15 16 T17 13 L17 28 L2 28 Z M23 13 T25 16 Q30 24, 38 28 L38 28 L23 28 Z" fill="currentColor" opacity="0.3"/>
                    </svg>
                    <span>Outside</span>
                    <span className="text-xs opacity-100 ml-auto">(x ≤ x₁ and x ≥ x₂)</span>
                  </button>
                </div>
            </div>
          </section>

          {/* Interpretation Box */}
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-600 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
                <Info size={18} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-700">Interpretation</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  The shaded region represents <strong>{ (results.area * 100).toFixed(2) }%</strong> of the total population. 
                  In a normal distribution, the area under the entire curve is always exactly 1.0. 
                  This tool calculates the probability that a randomly selected observation falls within the specified range.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Result Cards and Chart */}
        <div className="lg:col-span-8 flex flex-col">
          {/* Result Cards - Top */}
          <div className="flex gap-8 justify-between mb-6">
            {/* Z-Score 1 Card */}
            <div className="flex-1 max-w-xs bg-white rounded-3xl p-4 shadow-md border border-slate-100 text-center">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-2">Z-Score 1</span>
              <div className="text-3xl font-bold text-slate-800 mb-1.5">
                {isNaN(results.z1) ? '—' : results.z1.toFixed(2)}
              </div>
              <p className="text-xs text-slate-500">Standard deviations</p>
            </div>

            {/* Z-Score 2 Card */}
            <div className="flex-1 max-w-xs bg-white rounded-3xl p-4 shadow-md border border-slate-100 text-center">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-2">Z-Score 2</span>
              <div className="text-3xl font-bold text-slate-800 mb-1.5">
                {isNaN(results.z2) ? '—' : results.z2.toFixed(2)}
              </div>
              <p className="text-xs text-slate-500">Standard deviations</p>
            </div>

            {/* Probability Card */}
            <div className="flex-1 max-w-xs bg-white rounded-3xl p-4 shadow-md border border-slate-100 text-center">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block mb-2">Probability</span>
              <div className="text-3xl font-bold text-indigo-600 mb-1.5">
                {isNaN(results.area) ? '—' : results.area.toFixed(4)}
              </div>
              <p className="text-xs text-slate-500">Probability of area</p>
            </div>
          </div>

          {/* Chart Panel */}
          {/* Chart Panel */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Normal Distribution Visualization</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-600" />
                  <span className="text-xs font-medium text-slate-500">Shaded Area</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                  <span className="text-xs font-medium text-slate-500">PDF Curve</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full flex flex-col">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 80, right: 30, left: 30, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="x" 
                    type="number" 
                    domain={[-4, 4]}
                    ticks={[-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]}
                    stroke="#94a3b8" 
                    fontSize={12}
                    tickFormatter={(v) => (Number.isInteger(v) ? v.toString() : '')}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ stroke: '#60a5fa', strokeWidth: 2 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const x = payload[0].payload.x;
                        const z = ((x - mean) / sd).toFixed(3);
                        const p = (payload[0].payload.y * sd).toFixed(4);
                        return (
                          <div className="bg-indigo-900 text-white rounded-3xl p-3 shadow-lg border border-indigo-700">
                            <p className="text-xs font-bold text-indigo-200">Z: {z}</p>
                            <p className="text-xs font-bold text-indigo-300">P: {p}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Background Curve */}
                  <Area
                    type="monotone"
                    dataKey="y"
                    stroke="#64748b"
                    strokeWidth={2.5}
                    fill="#f8fafc"
                    animationDuration={1000}
                  />
                  {/* Shaded Area Between Test Parameters */}
                  <Area
                    type="linear"
                    dataKey="shadedY"
                    stroke="none"
                    fill="#60a5fa"
                    fillOpacity={0.6}
                    animationDuration={0}
                    isAnimationActive={false}
                  />
                  
                  {/* Boundary Lines */}
                  {!isNaN(parseFloat(val1)) && (
                    <ReferenceLine x={parseFloat(val1)} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2}>
                      <Label value={`x1: ${parseFloat(val1).toFixed(2)}`} position="top" offset={25} fill="#3b82f6" fontSize={11} fontWeight="bold" />
                      <Label value={`z1: ${results.z1.toFixed(2)}`} position="top" offset={42} fill="#ef4444" fontSize={11} fontWeight="bold" />
                    </ReferenceLine>
                  )}
                  {!isNaN(parseFloat(val2)) && (
                    <ReferenceLine x={parseFloat(val2)} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2}>
                      <Label value={`x2: ${parseFloat(val2).toFixed(2)}`} position="top" offset={25} fill="#3b82f6" fontSize={11} fontWeight="bold" />
                      <Label value={`z2: ${results.z2.toFixed(2)}`} position="top" offset={42} fill="#ef4444" fontSize={11} fontWeight="bold" />
                    </ReferenceLine>
                  )}
                  <ReferenceLine x={mean} stroke="#94a3b8" strokeWidth={1.5} label={{ position: 'bottom', value: 'μ', fill: '#94a3b8', fontSize: 13, offset: 25 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NormalCurveTool;
