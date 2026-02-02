'use client';

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { Info } from 'lucide-react';

const LawOfLargeNumbers: React.FC = () => {
  const [sampleSize, setSampleSize] = useState(100);
  const populationStdDev = 20;

  // Generate data points for the curve
  const curveData = useMemo(() => {
    const data = [];
    for (let n = 1; n <= 300; n += 5) {
      const se = populationStdDev / Math.sqrt(n);
      data.push({ n, se: parseFloat(se.toFixed(2)) });
    }
    return data;
  }, []);

  // Calculate current SE
  const currentSE = parseFloat((populationStdDev / Math.sqrt(sampleSize)).toFixed(2));

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <Info size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800">
            The Power of Sample Size: Understanding Standard Error
          </h1>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          The <span className="font-semibold text-slate-800">Standard Error (SE)</span> measures the accuracy with which a sample represents a population. The most powerful way to reduce standard error is to increase your <span className="font-semibold text-slate-800">sample size (n)</span>. Observe this "law of diminishing returns" in the interactive plot below.
        </p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column - Chart */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Sample Size vs. Standard Error</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 110 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="n" 
                  domain={[0, 300]}
                  label={{ value: 'Sample Size (n)', position: 'insideBottomRight', offset: -10 }}
                  stroke="#94a3b8"
                  type="number"
                />
                <YAxis 
                  label={{ value: 'Standard Error', angle: -90, position: 'insideLeft', offset: 10 }}
                  stroke="#94a3b8"
                />
                <Tooltip 
                  formatter={(value) => (value as number).toFixed(2)}
                  contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="se" 
                  stroke="#3b82f6" 
                  dot={false} 
                  strokeWidth={3}
                  isAnimationActive={false}
                />
                <ReferenceDot x={sampleSize} y={currentSE} r={6} fill="#3b82f6" stroke="#1e40af" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Key Observation below chart */}
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-600 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
                <Info size={18} />
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-700">Key Observation</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Notice the steep drop at smaller sample sizes—this is where you get the most "bang for your buck." As sample size increases, the curve flattens (diminishing returns).
                </p>
                <div className="pt-3 border-t border-sky-200">
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Formula:</span> SE = σ / √n
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Info Panel */}
        <div className="w-80 flex flex-col gap-6">
          {/* Value Display Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Current Values</h3>
            
            <div className="space-y-3">
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Sample Size (N)</div>
                <div className="text-2xl font-bold text-indigo-600">{sampleSize}</div>
              </div>
              
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Standard Error</div>
                <div className="text-2xl font-bold text-indigo-600">{currentSE.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Slider Control Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Adjust Sample Size</h3>
            
            <div className="flex items-center gap-4 mb-3">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Sample Size:</label>
              <input
                type="number"
                min="1"
                max="300"
                value={sampleSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= 300) {
                    setSampleSize(val);
                  }
                }}
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <input
              type="range"
              min="1"
              max="300"
              value={sampleSize}
              onChange={(e) => setSampleSize(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>1</span>
              <span>300</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LawOfLargeNumbers;
