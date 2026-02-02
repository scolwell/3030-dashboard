'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { normalCDF, normalPDF, inverseNormalCDF } from '../services/statsUtils';

type TailMode = 'two' | 'left' | 'right';

const HypothesisTestTool: React.FC = () => {
  // State: Parameters
  const [mu0, setMu0] = useState(100); // Null hypothesis mean
  const [sampleMean, setSampleMean] = useState(102);
  const [sigma, setSigma] = useState(15);
  const [n, setN] = useState(25);
  const [alpha, setAlpha] = useState(0.05);
  const [tailMode, setTailMode] = useState<TailMode>('two');

  const zRange = 3.6; // mirror legacy Figure7.9 z-limits

  // Calculations
  const calculations = useMemo(() => {
    const standardError = sigma / Math.sqrt(n);
    const z = (sampleMean - mu0) / standardError;

    // Critical value(s)
    let zCritical: number;
    if (tailMode === 'two') {
      zCritical = -inverseNormalCDF(alpha / 2);
    } else {
      zCritical = -inverseNormalCDF(alpha);
    }

    // P-value
    let pValue: number;
    if (tailMode === 'two') {
      pValue = 2 * (1 - normalCDF(Math.abs(z)));
    } else if (tailMode === 'left') {
      pValue = normalCDF(z);
    } else {
      pValue = 1 - normalCDF(z);
    }

    // Decision
    let reject = false;
    if (tailMode === 'two') {
      reject = Math.abs(z) > Math.abs(zCritical);
    } else if (tailMode === 'left') {
      reject = z < -Math.abs(zCritical);
    } else {
      reject = z > Math.abs(zCritical);
    }

    return {
      z,
      zCritical,
      pValue,
      reject,
      standardError,
    };
  }, [mu0, sampleMean, sigma, n, alpha, tailMode]);

  // Clamp sample mean when mu0/sigma/n change so slider stays in view
  useEffect(() => {
    const standardError = sigma / Math.sqrt(n);
    const minSample = mu0 - zRange * standardError;
    const maxSample = mu0 + zRange * standardError;
    if (sampleMean < minSample) setSampleMean(minSample);
    if (sampleMean > maxSample) setSampleMean(maxSample);
  }, [mu0, sigma, n, sampleMean, zRange]);

  // Generate curve data for visualization with shaded regions
  const curveData = useMemo(() => {
    const data: Array<{
      z: number;
      pdf: number;
      pdfReject: number;
      pdfAccept: number;
    }> = [];
    const step = 0.05;
    const zMin = -4;
    const zMax = 4;
    const crit = Math.abs(calculations.zCritical);

    for (let z = zMin; z <= zMax; z += step) {
      const pdf = normalPDF(z);
      let inReject = false;
      if (tailMode === 'two') {
        inReject = Math.abs(z) >= crit;
      } else if (tailMode === 'left') {
        inReject = z <= -crit;
      } else {
        inReject = z >= crit;
      }

      data.push({
        z,
        pdf,
        pdfReject: inReject ? pdf : 0,
        pdfAccept: inReject ? 0 : pdf,
      });
    }

    return data;
  }, [tailMode, calculations.zCritical]);

  // Helper: Hypothesis statements
  const getHypothesisText = () => {
    if (tailMode === 'two') {
      return { h0: `H₀: μ = ${mu0}`, ha: `H_A: μ ≠ ${mu0}` };
    } else if (tailMode === 'left') {
      return { h0: `H₀: μ = ${mu0}`, ha: `H_A: μ < ${mu0}` };
    } else {
      return { h0: `H₀: μ = ${mu0}`, ha: `H_A: μ > ${mu0}` };
    }
  };

  const hyp = getHypothesisText();

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column - Controls */}
        <div className="w-80 flex flex-col gap-6 overflow-y-auto">
          {/* Controls Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Controls</h3>

            {/* Tail Mode Selection */}
            <div className="mb-8">
              <label className="text-sm font-medium text-slate-700 block mb-3">
                Test Type
              </label>
              <div className="flex flex-col gap-2">
                {(['two', 'left', 'right'] as TailMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTailMode(mode)}
                    className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                      tailMode === mode
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {mode === 'two' ? '↔ Two-Tailed' : mode === 'left' ? '← Left-Tailed' : '→ Right-Tailed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Alpha Level Selection */}
            <div className="mb-8">
              <label className="text-sm font-medium text-slate-700 block mb-3">
                Significance Level (α)
              </label>
              <div className="flex flex-col gap-2">
                {[0.01, 0.05, 0.1].map((alph) => (
                  <button
                    key={alph}
                    onClick={() => setAlpha(alph)}
                    className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                      alpha === alph
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    α = {alph.toFixed(3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Null Mean (μ₀) Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Null Mean (μ₀)
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {mu0.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="1"
                value={mu0}
                onChange={(e) => setMu0(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Sample Mean (x̄) Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Sample Mean (x̄)
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {sampleMean.toFixed(2)}
                </span>
              </div>
              {(() => {
                const standardError = sigma / Math.sqrt(n);
                const minSample = mu0 - zRange * standardError;
                const maxSample = mu0 + zRange * standardError;
                const step = Math.max(standardError / 20, 0.001);
                return (
                  <input
                    type="range"
                    min={minSample}
                    max={maxSample}
                    step={step}
                    value={sampleMean}
                    onChange={(e) => setSampleMean(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                );
              })()}
              <p className="text-xs text-slate-500 mt-2">Range: μ₀ ± {zRange.toFixed(1)}·SE</p>
            </div>

            {/* Standard Deviation (σ) Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Std Dev (σ)
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {sigma.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={sigma}
                onChange={(e) => setSigma(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {/* Sample Size (n) Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Sample Size (n)
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {n}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="200"
                step="1"
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Statistics Card */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-800">Test Results</h4>
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-white text-indigo-700 border border-indigo-200">
                {tailMode === 'two' ? '2-tailed' : (tailMode === 'left' ? 'Left' : 'Right')}
              </span>
            </div>

            <div className="space-y-3">
              {/* Hypotheses */}
              <div className="bg-white border border-indigo-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Hypotheses</p>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>{hyp.h0}</div>
                  <div>{hyp.ha}</div>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-white border border-indigo-100 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700 mb-2">Statistics</p>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">z-statistic:</span>
                  <span className="font-bold text-indigo-600">{calculations.z.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Critical:</span>
                  <span className="font-bold text-red-600">
                    {tailMode === 'two'
                      ? `±${Math.abs(calculations.zCritical).toFixed(3)}`
                      : (tailMode === 'left'
                        ? `-${Math.abs(calculations.zCritical).toFixed(3)}`
                        : `${Math.abs(calculations.zCritical).toFixed(3)}`)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">p-value:</span>
                  <span className="font-bold text-purple-600">{calculations.pValue.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Std. Error:</span>
                  <span className="font-bold text-slate-700">{calculations.standardError.toFixed(4)}</span>
                </div>
              </div>

              {/* Decision */}
              <div className={`rounded-lg p-3 ${
                calculations.reject 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                <p className={`text-xs font-semibold mb-2 ${
                  calculations.reject ? 'text-red-800' : 'text-green-800'
                }`}>
                  Decision
                </p>
                <div className={`text-sm font-bold ${
                  calculations.reject ? 'text-red-600' : 'text-green-600'
                }`}>
                  {calculations.reject ? '✗ Reject H₀' : '✓ Fail to Reject H₀'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Chart */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Standard Normal Distribution</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 10, right: 80, left: 60, bottom: 60 }}>
                <defs>
                  <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="z"
                  domain={[-4, 4]}
                  stroke="#64748b"
                  label={{ value: 'z-score', position: 'insideBottom', offset: -30, textAnchor: 'middle' }}
                />
                <YAxis
                  stroke="#64748b"
                  domain={[0, 0.45]}
                  tickFormatter={(v) => v.toFixed(2)}
                  label={{ value: 'Probability Density', angle: -90, position: 'left', offset: 10, textAnchor: 'middle' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                  formatter={(value: number) => (typeof value === 'number' ? value.toFixed(4) : value)}
                />

                {/* Reference lines */}
                <ReferenceLine x={0} stroke="#666" strokeDasharray="3 3" opacity={0.6} label={{ value: 'z = 0', position: 'insideTop', fill: '#475569', fontSize: 11 }} />
                {tailMode === 'two' && (
                  <>
                    <ReferenceLine
                      x={-Math.abs(calculations.zCritical)}
                      stroke="#dc2626"
                      strokeDasharray="5 5"
                      label={{
                        value: `z_c = ${(-Math.abs(calculations.zCritical)).toFixed(3)}`,
                        position: 'top',
                        fill: '#dc2626',
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      x={Math.abs(calculations.zCritical)}
                      stroke="#dc2626"
                      strokeDasharray="5 5"
                      label={{
                        value: `z_c = ${(Math.abs(calculations.zCritical)).toFixed(3)}`,
                        position: 'top',
                        fill: '#dc2626',
                        fontSize: 11,
                      }}
                    />
                  </>
                )}
                {tailMode === 'left' && (
                  <ReferenceLine
                    x={-Math.abs(calculations.zCritical)}
                    stroke="#dc2626"
                    strokeDasharray="5 5"
                    label={{
                      value: `z_c = ${(-Math.abs(calculations.zCritical)).toFixed(3)}`,
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 11,
                    }}
                  />
                )}
                {tailMode === 'right' && (
                  <ReferenceLine
                    x={Math.abs(calculations.zCritical)}
                    stroke="#dc2626"
                    strokeDasharray="5 5"
                    label={{
                      value: `z_c = ${(Math.abs(calculations.zCritical)).toFixed(3)}`,
                      position: 'top',
                      fill: '#dc2626',
                      fontSize: 11,
                    }}
                  />
                )}

                {/* Sample marker */}
                <ReferenceDot
                  x={calculations.z}
                  y={normalPDF(calculations.z)}
                  r={5}
                  fill="#2563eb"
                  stroke="none"
                  label={{
                    value: `z = ${calculations.z.toFixed(3)}`,
                    position: 'top',
                    fill: '#2563eb',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                />

                {/* Shaded regions under curve */}
                <Area
                  type="monotone"
                  dataKey="pdfAccept"
                  stroke="none"
                  fill="#e5e7eb"
                  fillOpacity={0.6}
                  isAnimationActive={false}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="pdfReject"
                  stroke="none"
                  fill="#dc2626"
                  fillOpacity={0.32}
                  isAnimationActive={false}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="pdf"
                  stroke="#4f46e5"
                  fill="url(#curveFill)"
                  isAnimationActive={false}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="text-xs text-slate-600 mt-3">
              Red = rejection region (α); Gray = fail-to-reject region; blue marker = sample z.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HypothesisTestTool;
