import React, { useState, useMemo, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Label,
  BarChart,
  Bar
} from 'recharts';
import { RotateCcw, Play } from 'lucide-react';

const CoinTossSimulation: React.FC = () => {
  const MAX_TOSSES = 1000;
  const [targetTosses, setTargetTosses] = useState<number>(50);
  const [numTosses, setNumTosses] = useState<number>(0);
  const [headsProb, setHeadsProb] = useState<number>(0.5);
  const [tosses, setTosses] = useState<number[]>([]);

  // Generate random tosses
  const generateTosses = useCallback(() => {
    const newTosses = Array.from({ length: MAX_TOSSES }, () => Math.random());
    setTosses(newTosses);
  }, []);

  // Perform the toss action
  const performToss = useCallback(() => {
    if (tosses.length === 0) {
      generateTosses();
    }
    const nextCount = Math.min(numTosses + targetTosses, MAX_TOSSES);
    setNumTosses(nextCount);
  }, [targetTosses, tosses.length, numTosses, generateTosses]);

  // Initialize on mount
  React.useEffect(() => {
    generateTosses();
  }, [generateTosses]);

  // Calculate proportions for the chart
  const chartData = useMemo(() => {
    if (tosses.length === 0 || numTosses === 0) {
      return [{ toss: 1, proportion: 0, dummy: 0 }]; // Dummy point for initial state
    }
    
    let headCount = 0;
    const data = [];
    
    for (let i = 0; i < numTosses; i++) {
      if (tosses[i] < headsProb) {
        headCount++;
      }
      const proportion = headCount / (i + 1);
      data.push({
        toss: i + 1,
        proportion: parseFloat(proportion.toFixed(4)),
      });
    }
    
    return data;
  }, [tosses, numTosses, headsProb]);

  const currentProportion = chartData.length > 0 
    ? chartData[chartData.length - 1].proportion 
    : 0;

  // Heads/Tails counts and proportions for bar plot
  const { headsCount, tailsCount, headsProp, tailsProp } = useMemo(() => {
    const slice = tosses.slice(0, numTosses);
    const heads = slice.filter((v) => v < headsProb).length;
    const tails = numTosses - heads;
    const denom = numTosses || 1; // avoid divide-by-zero
    return {
      headsCount: heads,
      tailsCount: tails,
      headsProp: heads / denom,
      tailsProp: tails / denom,
    };
  }, [tosses, numTosses, headsProb]);

  // Generate X-axis ticks with dynamic increment
  const xAxisTicks = useMemo(() => {
    const maxToss = Math.max(20, numTosses);
    const ticks = [];

    if (numTosses <= 20) {
      // 0 to 20 flips: increment by 1
      for (let i = 1; i <= maxToss; i++) {
        ticks.push(i);
      }
    } else if (numTosses <= 50) {
      // 21 to 50 flips: 1, 5, 10, 15, ...
      ticks.push(1);
      for (let i = 5; i <= maxToss; i += 5) {
        ticks.push(i);
      }
    } else if (numTosses <= 100) {
      // 51 to 100 flips: 1, 10, 20, 30, ...
      ticks.push(1);
      for (let i = 10; i <= maxToss; i += 10) {
        ticks.push(i);
      }
    } else {
      // 101+ flips: 1, 20, 40, 60, ...
      ticks.push(1);
      for (let i = 20; i <= maxToss; i += 20) {
        ticks.push(i);
      }
    }

    // Ensure max value included
    if (ticks[ticks.length - 1] !== maxToss) {
      ticks.push(maxToss);
    }

    return ticks;
  }, [numTosses]);

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column - Controls */}
        <div className="w-80 flex flex-col gap-6">
          {/* Controls Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Controls</h3>
            
            {/* Number of Tosses Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Number of Flips
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {targetTosses}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max={MAX_TOSSES}
                value={targetTosses}
                onChange={(e) => setTargetTosses(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-2">Select number of flips</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    if (numTosses < targetTosses) {
                      setNumTosses(numTosses + 1);
                    }
                  }}
                  disabled={numTosses >= targetTosses}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Flip 1 Coin
                </button>
                <button
                  onClick={performToss}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Flip {targetTosses}
                </button>
              </div>
            </div>

            {/* Probability Slider */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  P(Heads)
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {(headsProb * 100).toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={headsProb}
                onChange={(e) => setHeadsProb(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-2">Set probability of heads</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => {
                  generateTosses();
                  setNumTosses(0);
                  setTargetTosses(50);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
              >
                <RotateCcw size={16} />
                New Series
              </button>
              <button
                onClick={() => setHeadsProb(0.5)}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
              >
                Reset 50%
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-800">Statistics</h4>
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-white text-indigo-700 border border-indigo-200">
                {numTosses} flips
              </span>
            </div>

            <div className="bg-white border border-indigo-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Heads vs Tails</p>
              <div style={{ width: '100%', height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { label: 'Heads', value: headsProp },
                    { label: 'Tails', value: tailsProp }
                  ]} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#475569' }} />
                    <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 12, fill: '#475569' }} width={40} />
                    <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-xs text-slate-600 mt-2">
                <span>Heads: {headsCount}</span>
                <span>Tails: {tailsCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Chart */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-6 flex flex-col min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Convergence to True Probability</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 100, left: 60, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number"
                  dataKey="toss" 
                  stroke="#64748b"
                  domain={[1, Math.max(20, numTosses)]}
                  ticks={xAxisTicks}
                  hide={false}
                  label={{ value: 'Number of Coin Flips', position: 'insideBottom', offset: -20, textAnchor: 'middle' }}
                />
                <YAxis 
                  yAxisId="left"
                  type="number"
                  stroke="#64748b"
                  domain={[0, 1]}
                  ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  label={{ value: 'Proportion Landing Heads', angle: -90, position: 'left', offset: 10, textAnchor: 'middle' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                  formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
                  labelFormatter={(label: number) => `Flip: ${label}`}
                />
                <ReferenceLine 
                  yAxisId="left"
                  y={headsProb} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  label={{ value: `P(H) = ${(headsProb * 100).toFixed(1)}%`, position: 'right', fill: '#ef4444', fontSize: 12 }}
                />
                {numTosses > 0 && (
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="proportion" 
                  stroke="#4f46e5" 
                  dot={{ fill: '#4f46e5', r: 4 }}
                  isAnimationActive={false}
                  strokeWidth={2}
                />
                )}
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="dummy" 
                  stroke="transparent" 
                  dot={(props) => null}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinTossSimulation;
