'use client';

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Info } from 'lucide-react';
import { normalCDF, normalPDF, inverseNormalCDF } from '../../services/statsUtils';

type Mode = 'raw-to-percentile' | 'percentile-to-raw';

const ZPercentileTranslator: React.FC = () => {
  const [mode, setMode] = useState<Mode>('raw-to-percentile');
  const [mean, setMean] = useState(100);
  const [sd, setSd] = useState(15);
  const [rawScore, setRawScore] = useState('100');
  const [percentile, setPercentile] = useState('50');

  const calculations = useMemo(() => {
    if (mode === 'raw-to-percentile') {
      const raw = parseFloat(rawScore);
      if (isNaN(raw)) return null;
      
      const z = (raw - mean) / sd;
      const p = normalCDF(raw, mean, sd);
      const pct = p * 100;
      
      return {
        raw,
        z,
        percentile: pct,
        cdf: p
      };
    } else {
      const pct = parseFloat(percentile);
      if (isNaN(pct) || pct < 0 || pct > 100) return null;
      
      const p = pct / 100;
      const z = inverseNormalCDF(p);
      const raw = mean + z * sd;
      
      return {
        raw,
        z,
        percentile: pct,
        cdf: p
      };
    }
  }, [mode, mean, sd, rawScore, percentile]);

  const chartData = useMemo(() => {
    const data = [];
    const xMin = mean - 4 * sd;
    const xMax = mean + 4 * sd;
    const step = (xMax - xMin) / 200;

    const shadeBoundary = calculations?.raw ?? mean;

    for (let x = xMin; x <= xMax; x += step) {
      const z = (x - mean) / sd;
      const y = normalPDF(z);
      
      const isShaded = x <= shadeBoundary;

      data.push({
        x: parseFloat(x.toFixed(4)),
        y: parseFloat(y.toFixed(6)),
        shaded: isShaded ? y : 0
      });
    }

    return data;
  }, [mean, sd, calculations]);

  const interpretation = useMemo(() => {
    if (!calculations) return '';
    
    const { raw, z, percentile: pct } = calculations;
    
    if (mode === 'raw-to-percentile') {
      return `A score of ${raw.toFixed(2)} is ${z.toFixed(2)} standard deviations ${z >= 0 ? 'above' : 'below'} the mean. This score is at the ${pct.toFixed(1)}th percentile, meaning it is higher than ${pct.toFixed(1)}% of all scores.`;
    } else {
      return `The ${pct.toFixed(1)}th percentile corresponds to a z-score of ${z.toFixed(2)}, which translates to a raw score of ${raw.toFixed(2)}. This score is ${z.toFixed(2)} standard deviations ${z >= 0 ? 'above' : 'below'} the mean.`;
    }
  }, [calculations, mode]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel - Controls */}
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Mode</h3>
            
            <div className="flex flex-col gap-2 mb-8">
              <button
                onClick={() => setMode('raw-to-percentile')}
                className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
                  mode === 'raw-to-percentile'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Raw → z → Percentile
              </button>
              <button
                onClick={() => setMode('percentile-to-raw')}
                className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
                  mode === 'percentile-to-raw'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Percentile → z → Raw
              </button>
            </div>

            <h4 className="text-sm font-semibold text-slate-700 mb-4">Distribution Parameters</h4>
            
            {/* Mean Input */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-600 block mb-2">Mean (μ)</label>
              <input
                type="number"
                value={mean}
                onChange={(e) => setMean(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>

            {/* SD Input */}
            <div className="mb-6">
              <label className="text-xs font-medium text-slate-600 block mb-2">Std Dev (σ)</label>
              <input
                type="number"
                value={sd}
                onChange={(e) => setSd(Math.max(0.1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>

            <h4 className="text-sm font-semibold text-slate-700 mb-4">Input</h4>

            {mode === 'raw-to-percentile' ? (
              <div className="mb-6">
                <label className="text-xs font-medium text-slate-600 block mb-2">Raw Score (X)</label>
                <input
                  type="number"
                  value={rawScore}
                  onChange={(e) => setRawScore(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="Enter raw score"
                />
              </div>
            ) : (
              <div className="mb-6">
                <label className="text-xs font-medium text-slate-600 block mb-2">Percentile (%)</label>
                <input
                  type="number"
                  value={percentile}
                  onChange={(e) => setPercentile(e.target.value)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="0-100"
                />
              </div>
            )}

            {/* Preset Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setMean(100);
                  setSd(15);
                }}
                className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium"
              >
                IQ Scale (μ=100, σ=15)
              </button>
              <button
                onClick={() => {
                  setMean(500);
                  setSd(100);
                }}
                className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium"
              >
                SAT Scale (μ=500, σ=100)
              </button>
            </div>
          </div>

          {/* Results Card */}
          {calculations && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h4 className="text-sm font-semibold text-slate-800 mb-4">Results</h4>
              
              <div className="space-y-3">
                <div className="bg-white border border-indigo-100 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Raw Score</div>
                  <div className="text-lg font-bold text-indigo-600">{calculations.raw.toFixed(2)}</div>
                </div>
                
                <div className="bg-white border border-indigo-100 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">z-Score</div>
                  <div className="text-lg font-bold text-purple-600">{calculations.z.toFixed(3)}</div>
                </div>
                
                <div className="bg-white border border-indigo-100 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Percentile</div>
                  <div className="text-lg font-bold text-green-600">{calculations.percentile.toFixed(2)}%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Chart */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Visual Representation</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 60, bottom: 60 }}>
                <defs>
                  <linearGradient id="shadedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[mean - 4 * sd, mean + 4 * sd]}
                  stroke="#64748b"
                  tickFormatter={(v) => v.toFixed(0)}
                  label={{ value: 'Score', position: 'insideBottom', offset: -35, textAnchor: 'middle' }}
                />
                <YAxis
                  domain={[0, 'auto']}
                  stroke="#64748b"
                  tickFormatter={(v) => v.toFixed(2)}
                  label={{ value: 'Density', angle: -90, position: 'insideLeft', offset: 10, textAnchor: 'middle' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                
                {calculations && (
                  <ReferenceLine
                    x={calculations.raw}
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: `X = ${calculations.raw.toFixed(1)}`,
                      position: 'top',
                      fill: '#2563eb',
                      fontWeight: 'bold'
                    }}
                  />
                )}
                
                <Area
                  type="monotone"
                  dataKey="shaded"
                  stroke="none"
                  fill="url(#shadedArea)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="none"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {calculations && (
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-600 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
                  <Info size={18} />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-700">Interpretation</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {interpretation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZPercentileTranslator;
