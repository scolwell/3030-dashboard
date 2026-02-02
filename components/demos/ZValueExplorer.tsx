'use client';

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Info } from 'lucide-react';

type ExplorerMode = 'cumulative' | 'confidence' | 'hypothesis' | 'raw-score';

const ZValueExplorer: React.FC = () => {
  const [mode, setMode] = useState<ExplorerMode>('cumulative');
  const [zValue, setZValue] = useState(1.96);
  const [mean, setMean] = useState(100);
  const [sd, setSD] = useState(15);
  const [rawScore, setRawScore] = useState(129.4);

  // Standard Normal CDF approximation
  const normalCDF = (x: number) => {
    const erf = (z: number) => {
      const a1 = 0.254829592;
      const a2 = -0.284496736;
      const a3 = 1.421413741;
      const a4 = -1.453152027;
      const a5 = 1.061405429;
      const p = 0.3275911;
      
      const sign = z < 0 ? -1 : 1;
      z = Math.abs(z);
      
      const t = 1.0 / (1.0 + p * z);
      const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
      
      return sign * y;
    };
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
  };

  // ===== MODE 1: CUMULATIVE PROBABILITY =====
  const cumulativeData = useMemo(() => {
    const data = [];
    const step = 0.1;
    for (let x = -4; x <= 4; x += step) {
      const y = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
      data.push({ 
        x: parseFloat(x.toFixed(2)), 
        y: parseFloat(y.toFixed(4)),
        shaded: x <= zValue ? parseFloat(y.toFixed(4)) : null
      });
    }
    return data;
  }, [zValue]);

  const cumulativeProbability = useMemo(() => {
    return parseFloat((normalCDF(zValue) * 100).toFixed(2));
  }, [zValue]);

  // ===== MODE 2: CONFIDENCE INTERVALS =====
  const confidenceData = useMemo(() => {
    const data = [];
    const step = 0.1;
    const z = Math.abs(zValue);
    for (let x = -4; x <= 4; x += step) {
      const y = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
      data.push({ 
        x: parseFloat(x.toFixed(2)), 
        y: parseFloat(y.toFixed(4)),
        shaded: Math.abs(x) <= z ? parseFloat(y.toFixed(4)) : null
      });
    }
    return data;
  }, [zValue]);

  const confidenceLevel = useMemo(() => {
    const z = Math.abs(zValue);
    return parseFloat(((normalCDF(z) - normalCDF(-z)) * 100).toFixed(2));
  }, [zValue]);

  // ===== MODE 3: HYPOTHESIS TESTING (TWO-TAILED) =====
  const hypothesisData = useMemo(() => {
    const data = [];
    const step = 0.1;
    const z = Math.abs(zValue);
    for (let x = -4; x <= 4; x += step) {
      const y = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
      const absX = Math.abs(x);
      data.push({ 
        x: parseFloat(x.toFixed(2)), 
        y: parseFloat(y.toFixed(4)),
        shaded: absX >= z ? parseFloat(y.toFixed(4)) : null
      });
    }
    return data;
  }, [zValue]);

  const alphaLevel = useMemo(() => {
    const z = Math.abs(zValue);
    const tailProb = (1 - normalCDF(z));
    return parseFloat((tailProb * 2 * 100).toFixed(2));
  }, [zValue]);

  // ===== MODE 4: RAW SCORE CONVERTER =====
  const calculatedZ = useMemo(() => {
    return parseFloat(((rawScore - mean) / sd).toFixed(2));
  }, [rawScore, mean, sd]);

  const rawScoreData = useMemo(() => {
    const data = [];
    const step = 0.1;
    const displayZ = calculatedZ;
    for (let x = -4; x <= 4; x += step) {
      const y = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
      data.push({ 
        x: parseFloat(x.toFixed(2)), 
        y: parseFloat(y.toFixed(4)),
        shaded: x <= displayZ ? parseFloat(y.toFixed(4)) : null
      });
    }
    return data;
  }, [calculatedZ]);

  const rawScoreProbability = useMemo(() => {
    return parseFloat((normalCDF(calculatedZ) * 100).toFixed(2));
  }, [calculatedZ]);

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header with Mode Toggle */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Info size={20} className="text-indigo-600 flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                z-Value Explorer: 4 Perspectives
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Explore z-scores from different angles to build deeper understanding
              </p>
            </div>
          </div>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setMode('cumulative')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'cumulative'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            1. Cumulative Probability
          </button>
          <button
            onClick={() => setMode('confidence')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'confidence'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2. Confidence Intervals
          </button>
          <button
            onClick={() => setMode('hypothesis')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'hypothesis'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            3. Hypothesis Testing
          </button>
          <button
            onClick={() => setMode('raw-score')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              mode === 'raw-score'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            4. Raw Score Converter
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column - Chart */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            {mode === 'cumulative' && 'Cumulative Probability'}
            {mode === 'confidence' && 'Confidence Interval (Two-Sided)'}
            {mode === 'hypothesis' && 'Critical Regions (Two-Tailed Test)'}
            {mode === 'raw-score' && 'Convert Raw Score to Probability'}
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={
                  mode === 'cumulative' ? cumulativeData :
                  mode === 'confidence' ? confidenceData :
                  mode === 'hypothesis' ? hypothesisData :
                  rawScoreData
                }
                margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
              >
                <defs>
                  <linearGradient id="shadedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="x" 
                  label={{ value: 'z-value', position: 'insideBottom', offset: -10 }}
                  stroke="#94a3b8"
                  domain={[-4, 4]}
                />
                <YAxis 
                  label={{ value: 'Probability Density', angle: -90, position: 'insideLeft', offset: 0 }}
                  stroke="#94a3b8"
                />
                <Tooltip 
                  formatter={(value: any) => [parseFloat(value).toFixed(4), 'Density']}
                  labelFormatter={(label) => `z = ${label}`}
                  contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="shaded" 
                  stroke="#3b82f6" 
                  fill="url(#shadedArea)"
                  strokeWidth={0}
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="y" 
                  stroke="#1e40af" 
                  fill="transparent"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                {mode !== 'hypothesis' && (
                  <ReferenceLine 
                    x={mode === 'raw-score' ? calculatedZ : zValue}
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    label={{ value: `z = ${(mode === 'raw-score' ? calculatedZ : zValue).toFixed(2)}`, position: 'top', fill: '#ef4444', fontWeight: 'bold' }}
                  />
                )}
                {mode === 'hypothesis' && (
                  <>
                    <ReferenceLine 
                      x={-Math.abs(zValue)}
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                    />
                    <ReferenceLine 
                      x={Math.abs(zValue)}
                      stroke="#ef4444" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                      label={{ value: `±${Math.abs(zValue).toFixed(2)}`, position: 'top', fill: '#ef4444', fontWeight: 'bold' }}
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Key Observation */}
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-600 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
                <Info size={18} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-700">Key Insight</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {mode === 'cumulative' && 'The shaded area shows the cumulative probability (percentage of data) to the LEFT of your z-value. This is the probability of observing a value at or below this point.'}
                  {mode === 'confidence' && 'The shaded area shows your confidence interval. For example, z=1.96 gives a 95% confidence interval, meaning 95% of the data falls within this range.'}
                  {mode === 'hypothesis' && 'The shaded areas are your rejection regions (alpha level). If a test statistic falls in these tails, you would reject the null hypothesis at this significance level.'}
                  {mode === 'raw-score' && 'Convert any raw score to a z-score, then immediately see its percentile rank and probability. Useful for understanding where a score stands in a distribution.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Controls & Values */}
        <div className="w-80 flex flex-col gap-6 min-w-0">
          {/* Display Values */}
          <div className="bg-white rounded-lg shadow-sm p-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              {mode === 'cumulative' && 'Probability Values'}
              {mode === 'confidence' && 'Confidence Level'}
              {mode === 'hypothesis' && 'Significance Level (α)'}
              {mode === 'raw-score' && 'Results'}
            </h3>
            <div className="space-y-3">
              {mode === 'cumulative' && (
                <>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">z-Value</div>
                    <div className="text-2xl font-bold text-indigo-600">{zValue.toFixed(2)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">P(Z ≤ z)</div>
                    <div className="text-2xl font-bold text-green-600">{cumulativeProbability.toFixed(2)}%</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">Percentile</div>
                    <div className="text-2xl font-bold text-purple-600">{cumulativeProbability.toFixed(1)}th</div>
                  </div>
                </>
              )}
              {mode === 'confidence' && (
                <>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">z-Value (±)</div>
                    <div className="text-2xl font-bold text-indigo-600">±{Math.abs(zValue).toFixed(2)}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">Confidence Level</div>
                    <div className="text-2xl font-bold text-blue-600">{confidenceLevel.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">Tail Area</div>
                    <div className="text-2xl font-bold text-slate-600">{((100 - confidenceLevel) / 2).toFixed(2)}%</div>
                  </div>
                </>
              )}
              {mode === 'hypothesis' && (
                <>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">Critical Value (±)</div>
                    <div className="text-2xl font-bold text-indigo-600">±{Math.abs(zValue).toFixed(2)}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">α (Significance Level)</div>
                    <div className="text-2xl font-bold text-red-600">{alphaLevel.toFixed(2)}%</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">Power Region</div>
                    <div className="text-2xl font-bold text-slate-600">{(100 - alphaLevel).toFixed(2)}%</div>
                  </div>
                </>
              )}
              {mode === 'raw-score' && (
                <>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">Calculated z</div>
                    <div className="text-2xl font-bold text-indigo-600">{calculatedZ.toFixed(2)}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">Percentile Rank</div>
                    <div className="text-2xl font-bold text-green-600">{rawScoreProbability.toFixed(1)}th</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs text-slate-600 mb-1">Probability Below</div>
                    <div className="text-2xl font-bold text-purple-600">{rawScoreProbability.toFixed(2)}%</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col gap-4">
            {mode !== 'raw-score' ? (
              <>
                <h3 className="text-sm font-semibold text-slate-700">Adjust z-Value</h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Enter z-value:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={zValue}
                    onChange={(e) => setZValue(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Use slider:
                  </label>
                  <input
                    type="range"
                    min="-4"
                    max="4"
                    step="0.01"
                    value={zValue}
                    onChange={(e) => setZValue(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>-4</span>
                    <span>0</span>
                    <span>4</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-slate-700">Raw Score Parameters</h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Population Mean (μ):
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={mean}
                    onChange={(e) => setMean(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Standard Deviation (σ):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={sd}
                    onChange={(e) => setSD(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    Raw Score (X):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={rawScore}
                    onChange={(e) => setRawScore(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZValueExplorer;
