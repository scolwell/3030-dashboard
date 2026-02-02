'use client';

import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Info } from 'lucide-react';
import { normalCDF, normalPDF } from '../../services/statsUtils';

type QuestionType = 'less-than' | 'greater-than' | 'between';

const ProbabilityStatementBuilder: React.FC = () => {
  const [questionType, setQuestionType] = useState<QuestionType>('less-than');
  const [mean, setMean] = useState(100);
  const [sd, setSd] = useState(15);
  const [a, setA] = useState('100');
  const [b, setB] = useState('115');

  const calculations = useMemo(() => {
    const aVal = parseFloat(a);
    const bVal = parseFloat(b);
    
    if (isNaN(aVal)) return null;
    if (questionType === 'between' && isNaN(bVal)) return null;

    let probability = 0;
    let statement = '';
    let interpretation = '';

    const zA = (aVal - mean) / sd;
    const pA = normalCDF(aVal, mean, sd);

    if (questionType === 'less-than') {
      probability = pA;
      statement = `P(X ≤ ${aVal.toFixed(1)})`;
      interpretation = `There is a ${(probability * 100).toFixed(2)}% chance that a randomly selected value is ${aVal.toFixed(1)} or less. The shaded area represents ${(probability * 100).toFixed(2)}% of the total area under the curve.`;
    } else if (questionType === 'greater-than') {
      probability = 1 - pA;
      statement = `P(X ≥ ${aVal.toFixed(1)})`;
      interpretation = `There is a ${(probability * 100).toFixed(2)}% chance that a randomly selected value is ${aVal.toFixed(1)} or greater. The shaded area represents ${(probability * 100).toFixed(2)}% of the total area under the curve.`;
    } else {
      const zB = (bVal - mean) / sd;
      const pB = normalCDF(bVal, mean, sd);
      probability = pB - pA;
      statement = `P(${aVal.toFixed(1)} ≤ X ≤ ${bVal.toFixed(1)})`;
      interpretation = `There is a ${(probability * 100).toFixed(2)}% chance that a randomly selected value falls between ${aVal.toFixed(1)} and ${bVal.toFixed(1)}. The shaded area represents ${(probability * 100).toFixed(2)}% of the total area under the curve.`;
    }

    return {
      probability,
      statement,
      interpretation,
      aVal,
      bVal: questionType === 'between' ? bVal : null
    };
  }, [questionType, mean, sd, a, b]);

  const chartData = useMemo(() => {
    const data = [];
    const xMin = mean - 4 * sd;
    const xMax = mean + 4 * sd;
    const step = (xMax - xMin) / 200;

    const aVal = calculations?.aVal ?? mean;
    const bVal = calculations?.bVal;

    for (let x = xMin; x <= xMax; x += step) {
      const z = (x - mean) / sd;
      const y = normalPDF(z);
      
      let isShaded = false;
      if (questionType === 'less-than') {
        isShaded = x <= aVal;
      } else if (questionType === 'greater-than') {
        isShaded = x >= aVal;
      } else {
        isShaded = bVal !== null && x >= aVal && x <= bVal;
      }

      data.push({
        x: parseFloat(x.toFixed(4)),
        y: parseFloat(y.toFixed(6)),
        shaded: isShaded ? y : 0
      });
    }

    return data;
  }, [mean, sd, questionType, calculations]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel - Controls */}
        <div className="w-80 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Question Type</h3>
            
            <div className="flex flex-col gap-2 mb-8">
              <button
                onClick={() => setQuestionType('less-than')}
                className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
                  questionType === 'less-than'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                P(X ≤ a)
              </button>
              <button
                onClick={() => setQuestionType('greater-than')}
                className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
                  questionType === 'greater-than'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                P(X ≥ a)
              </button>
              <button
                onClick={() => setQuestionType('between')}
                className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
                  questionType === 'between'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                P(a ≤ X ≤ b)
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

            <h4 className="text-sm font-semibold text-slate-700 mb-4">Values</h4>

            {/* Value a */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-600 block mb-2">
                {questionType === 'between' ? 'Lower bound (a)' : 'Value (a)'}
              </label>
              <input
                type="number"
                value={a}
                onChange={(e) => setA(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>

            {/* Value b (only for between) */}
            {questionType === 'between' && (
              <div className="mb-6">
                <label className="text-xs font-medium text-slate-600 block mb-2">Upper bound (b)</label>
                <input
                  type="number"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            )}

            {/* Preset Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setMean(100);
                  setSd(15);
                  setA('100');
                  setB('115');
                }}
                className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-medium"
              >
                IQ Scale (μ=100, σ=15)
              </button>
              <button
                onClick={() => {
                  setMean(500);
                  setSd(100);
                  setA('500');
                  setB('600');
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
              <h4 className="text-sm font-semibold text-slate-800 mb-4">Probability</h4>
              
              <div className="bg-white border border-indigo-100 rounded-lg p-4 mb-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Statement</div>
                <div className="text-lg font-bold text-indigo-600 mb-3">{calculations.statement}</div>
                <div className="text-2xl font-bold text-purple-600">
                  {calculations.probability.toFixed(4)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  = {(calculations.probability * 100).toFixed(2)}%
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
                  <linearGradient id="probabilityShade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[mean - 4 * sd, mean + 4 * sd]}
                  stroke="#64748b"
                  tickFormatter={(v) => v.toFixed(0)}
                  label={{ value: 'X', position: 'insideBottom', offset: -35, textAnchor: 'middle' }}
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
                  <>
                    <ReferenceLine
                      x={calculations.aVal}
                      stroke="#2563eb"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{
                        value: `a = ${calculations.aVal.toFixed(1)}`,
                        position: 'top',
                        fill: '#2563eb',
                        fontWeight: 'bold',
                        fontSize: 11
                      }}
                    />
                    {calculations.bVal !== null && (
                      <ReferenceLine
                        x={calculations.bVal}
                        stroke="#7c3aed"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        label={{
                          value: `b = ${calculations.bVal.toFixed(1)}`,
                          position: 'top',
                          fill: '#7c3aed',
                          fontWeight: 'bold',
                          fontSize: 11
                        }}
                      />
                    )}
                  </>
                )}
                
                <Area
                  type="monotone"
                  dataKey="shaded"
                  stroke="none"
                  fill="url(#probabilityShade)"
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
                    {calculations.interpretation}
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

export default ProbabilityStatementBuilder;
