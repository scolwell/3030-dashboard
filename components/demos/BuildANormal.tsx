'use client';

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { normalPDF } from '../../services/statsUtils';

const BuildANormal: React.FC = () => {
  const [mean, setMean] = useState(0);
  const [sd, setSd] = useState(1);
  const [showBands, setShowBands] = useState({
    one: true,
    two: true,
    three: true
  });

  const chartData = useMemo(() => {
    const data = [];
    const xMin = mean - 4 * sd;
    const xMax = mean + 4 * sd;
    const step = (xMax - xMin) / 200;

    for (let x = xMin; x <= xMax; x += step) {
      const y = normalPDF((x - mean) / sd);
      
      let inOneSigma = false;
      let inTwoSigma = false;
      let inThreeSigma = false;

      if (showBands.one && x >= mean - sd && x <= mean + sd) inOneSigma = true;
      if (showBands.two && x >= mean - 2 * sd && x <= mean + 2 * sd && !inOneSigma) inTwoSigma = true;
      if (showBands.three && x >= mean - 3 * sd && x <= mean + 3 * sd && !inOneSigma && !inTwoSigma) inThreeSigma = true;

      data.push({
        x: parseFloat(x.toFixed(4)),
        y: parseFloat(y.toFixed(6)),
        oneSigma: inOneSigma ? y : 0,
        twoSigma: inTwoSigma ? y : 0,
        threeSigma: inThreeSigma ? y : 0
      });
    }

    return data;
  }, [mean, sd, showBands]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel - Controls */}
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-white rounded-3xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Parameters</h3>
            
            {/* Mean Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Mean (μ)
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {mean.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={mean}
                onChange={(e) => setMean(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-2">Center of distribution</p>
            </div>

            {/* SD Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Std Dev (σ)
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {sd.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={sd}
                onChange={(e) => setSd(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-2">Spread of distribution</p>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setMean(0);
                setSd(1);
              }}
              className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-3xl hover:bg-slate-300 transition-colors text-sm font-medium"
            >
              Reset to Standard Normal
            </button>
          </div>

          {/* Band Toggles */}
          <div className="bg-indigo-900 text-white border border-indigo-700 rounded-3xl shadow-xl shadow-indigo-100 p-6">
            <h4 className="text-sm font-semibold text-white mb-4">Show Bands</h4>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBands.one}
                  onChange={(e) => setShowBands({ ...showBands, one: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-indigo-100">±1σ</div>
                  <div className="text-xs text-indigo-300">68.27% of data</div>
                </div>
                <div className="w-8 h-4 rounded" style={{ backgroundColor: 'rgba(79, 70, 229, 0.4)' }}></div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBands.two}
                  onChange={(e) => setShowBands({ ...showBands, two: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-indigo-100">±2σ</div>
                  <div className="text-xs text-indigo-300">95.45% of data</div>
                </div>
                <div className="w-8 h-4 rounded" style={{ backgroundColor: 'rgba(99, 102, 241, 0.3)' }}></div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBands.three}
                  onChange={(e) => setShowBands({ ...showBands, three: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-indigo-100">±3σ</div>
                  <div className="text-xs text-indigo-300">99.73% of data</div>
                </div>
                <div className="w-8 h-4 rounded" style={{ backgroundColor: 'rgba(129, 140, 248, 0.2)' }}></div>
              </label>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">Current Distribution</div>
            <div className="text-sm text-slate-600">
              N({mean.toFixed(2)}, {sd.toFixed(2)}²)
            </div>
          </div>
        </div>

        {/* Right Panel - Chart */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm p-6 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Normal Distribution</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 60, bottom: 60 }}>
                <defs>
                  <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[mean - 4 * sd, mean + 4 * sd]}
                  stroke="#64748b"
                  tickFormatter={(v) => v.toFixed(1)}
                  label={{ value: 'X', position: 'insideBottom', offset: -35, textAnchor: 'middle' }}
                />
                <YAxis
                  domain={[0, 'auto']}
                  stroke="#64748b"
                  tickFormatter={(v) => v.toFixed(2)}
                  label={{ value: 'Probability Density', angle: -90, position: 'insideLeft', offset: 10, textAnchor: 'middle' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                  formatter={(value: number) => [value.toFixed(4), 'Density']}
                  labelFormatter={(label) => `x = ${Number(label).toFixed(2)}`}
                />
                <ReferenceLine x={mean} stroke="#6366f1" strokeDasharray="3 3" label={{ value: 'μ', position: 'top', fill: '#6366f1' }} />
                
                {/* Shaded bands */}
                {showBands.three && (
                  <Area
                    type="monotone"
                    dataKey="threeSigma"
                    stroke="none"
                    fill="rgba(129, 140, 248, 0.2)"
                    isAnimationActive={false}
                  />
                )}
                {showBands.two && (
                  <Area
                    type="monotone"
                    dataKey="twoSigma"
                    stroke="none"
                    fill="rgba(99, 102, 241, 0.3)"
                    isAnimationActive={false}
                  />
                )}
                {showBands.one && (
                  <Area
                    type="monotone"
                    dataKey="oneSigma"
                    stroke="none"
                    fill="rgba(79, 70, 229, 0.4)"
                    isAnimationActive={false}
                  />
                )}
                
                {/* Main curve */}
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#curveFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildANormal;
