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
  Bar,
  Area,
  AreaChart
} from 'recharts';
import { RotateCcw, Play } from 'lucide-react';

const ConfidenceFunnelChart: React.FC = () => {
  const MAX_SAMPLES = 1000;
  const POPULATION_MEAN = 50;
  const POPULATION_SD = 15;
  
  const [targetSamples, setTargetSamples] = useState<number>(50);
  const [numSamples, setNumSamples] = useState<number>(0);
  const [samples, setSamples] = useState<number[]>([]);
  const [showCI, setShowCI] = useState<boolean>(true);
  const [hoveredSample, setHoveredSample] = useState<number | null>(null);

  // Box-Muller transform to generate normal random values
  const generateNormalRandom = (mean: number, sd: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * sd + mean;
  };

  // Generate random samples from normal distribution
  const generateSamples = useCallback(() => {
    const newSamples = Array.from({ length: MAX_SAMPLES }, () => 
      generateNormalRandom(POPULATION_MEAN, POPULATION_SD)
    );
    setSamples(newSamples);
  }, []);

  // Perform the sample action
  const performSample = useCallback(() => {
    if (samples.length === 0) {
      generateSamples();
    }
    const nextCount = Math.min(numSamples + targetSamples, MAX_SAMPLES);
    setNumSamples(nextCount);
  }, [targetSamples, samples.length, numSamples, generateSamples]);

  // Initialize on mount
  React.useEffect(() => {
    generateSamples();
  }, [generateSamples]);

  // Calculate sample means for the chart
  const chartData = useMemo(() => {
    if (samples.length === 0 || numSamples === 0) {
      return []; // Empty when no samples
    }
    
    let runningSum = 0;
    const data = [];
    const zScore = 1.96; // 95% confidence
    
    for (let i = 0; i < numSamples; i++) {
      runningSum += samples[i];
      const sampleMean = runningSum / (i + 1);
      const n = i + 1;
      
      // Standard error of the mean
      const standardError = POPULATION_SD / Math.sqrt(n);
      const marginOfError = zScore * standardError;
      
      const ciLower = sampleMean - marginOfError;
      const ciUpper = sampleMean + marginOfError;
      
      data.push({
        sample: i + 1,
        sampleMean: parseFloat(sampleMean.toFixed(2)),
        standardError: parseFloat(standardError.toFixed(2)),
        ciUpper: parseFloat(ciUpper.toFixed(2)),
        ciLower: parseFloat(ciLower.toFixed(2)),
      });
    }
    
    return data;
  }, [samples, numSamples]);

  const currentMean = chartData.length > 0 
    ? chartData[chartData.length - 1].sampleMean 
    : 50;

  // Sample statistics for display
  const { sampleMin, sampleMax, sampleMean: displayMean, sampleSD } = useMemo(() => {
    const slice = samples.slice(0, numSamples);
    if (slice.length === 0) {
      return { sampleMin: 0, sampleMax: 0, sampleMean: 0, sampleSD: 0 };
    }
    const mean = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
    const sd = Math.sqrt(variance);
    return {
      sampleMin: Math.min(...slice),
      sampleMax: Math.max(...slice),
      sampleMean: mean,
      sampleSD: sd,
    };
  }, [samples, numSamples]);

  // Generate X-axis ticks with dynamic increment
  const xAxisTicks = useMemo(() => {
    const maxSample = Math.max(20, numSamples);
    const ticks = [];

    if (numSamples <= 20) {
      // 0 to 20 samples: increment by 1
      for (let i = 1; i <= maxSample; i++) {
        ticks.push(i);
      }
    } else if (numSamples <= 50) {
      // 21 to 50 samples: 1, 5, 10, 15, ...
      ticks.push(1);
      for (let i = 5; i <= maxSample; i += 5) {
        ticks.push(i);
      }
    } else if (numSamples <= 100) {
      // 51 to 100 samples: 1, 10, 20, 30, ...
      ticks.push(1);
      for (let i = 10; i <= maxSample; i += 10) {
        ticks.push(i);
      }
    } else {
      // 101+ samples: 1, 20, 40, 60, ...
      ticks.push(1);
      for (let i = 20; i <= maxSample; i += 20) {
        ticks.push(i);
      }
    }

    // Ensure max value included
    if (ticks[ticks.length - 1] !== maxSample) {
      ticks.push(maxSample);
    }

    return ticks;
  }, [numSamples]);

  // Custom tooltip component that shows both chart values
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border-none rounded-lg p-3 text-white shadow-lg">
        <p className="font-semibold mb-2">Sample: {data.sample}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-300">Sample Mean:</span>
            <span className="font-semibold">{data.sampleMean?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-300">Std Error:</span>
            <span className="font-semibold">{data.standardError?.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Column - Controls */}
        <div className="w-80 flex flex-col gap-6 min-h-0">
          {/* Controls Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Controls</h3>
            
            {/* Number of Samples Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  Number of Samples
                </label>
                <span className="text-lg font-semibold text-indigo-600">
                  {targetSamples}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max={MAX_SAMPLES}
                value={targetSamples}
                onChange={(e) => setTargetSamples(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-slate-500 mt-2">Select number of samples to draw</p>
              <div className="flex gap-1.5 mt-4">
                <button
                  onClick={() => {
                    if (numSamples < MAX_SAMPLES) {
                      setNumSamples(numSamples + 1);
                    }
                  }}
                  disabled={numSamples >= MAX_SAMPLES}
                  className="flex-1 px-2 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Draw 1 Sample
                </button>
                <button
                  onClick={performSample}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Draw {targetSamples} Samples
                </button>
              </div>
            </div>

            {/* Show Confidence Interval Checkbox */}
            <div className="mb-6 flex items-center gap-2">
              <input
                type="checkbox"
                id="showCI"
                checked={showCI}
                onChange={(e) => setShowCI(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
              <label htmlFor="showCI" className="text-sm font-medium text-slate-700 cursor-pointer">
                Show 95% CI
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-auto">
              <button
                onClick={() => {
                  generateSamples();
                  setNumSamples(0);
                  setTargetSamples(50);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs font-medium whitespace-nowrap"
              >
                <RotateCcw size={14} />
                New Series
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-800">Sample Statistics</h4>
            </div>

            <div className="bg-white border border-indigo-100 rounded-lg p-3 flex-1 flex flex-col min-h-0">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sample Mean:</span>
                  <span className="font-semibold text-slate-800">{displayMean.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Sample SD:</span>
                  <span className="font-semibold text-slate-800">{sampleSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Std Error of Mean:</span>
                  <span className="font-semibold text-slate-800">{numSamples > 0 ? (POPULATION_SD / Math.sqrt(numSamples)).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Min Value:</span>
                  <span className="font-semibold text-slate-800">{sampleMin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Max Value:</span>
                  <span className="font-semibold text-slate-800">{sampleMax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 mt-2 border-t border-slate-200">
                  <span className="text-slate-600">n (samples):</span>
                  <span className="font-semibold text-slate-800">{numSamples}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">True μ:</span>
                  <span className="font-semibold text-indigo-600">{POPULATION_MEAN}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">True σ:</span>
                  <span className="font-semibold text-indigo-600">{POPULATION_SD}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Split into Two Cards */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Top Card - Sample Mean Convergence */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-4 flex flex-col min-h-0">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Sample Mean Convergence</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData} 
                  margin={{ top: 15, right: 80, left: 50, bottom: 35 }}
                  onMouseMove={(e: any) => {
                    if (e && e.activeLabel) {
                      setHoveredSample(e.activeLabel);
                    }
                  }}
                  onMouseLeave={() => setHoveredSample(null)}
                >
                  <defs>
                    <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    type="number"
                    dataKey="sample" 
                    stroke="#64748b"
                    domain={[1, Math.max(20, numSamples)]}
                    ticks={xAxisTicks}
                    hide={false}
                    allowDataOverflow={true}
                    label={{ value: 'Number of Samples', position: 'insideBottom', offset: -20, textAnchor: 'middle' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    type="number"
                    stroke="#64748b"
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 50, 60, 80, 100]}
                    interval={0}
                    hide={false}
                    allowDataOverflow={true}
                    label={{ value: 'Sample Mean', angle: -90, position: 'left', offset: 10, textAnchor: 'middle' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    yAxisId="left"
                    y={POPULATION_MEAN} 
                    stroke="#ef4444" 
                    strokeDasharray="5 5"
                    label={{ value: `μ = ${POPULATION_MEAN}`, position: 'right', fill: '#ef4444', fontSize: 12 }}
                  />
                  {hoveredSample !== null && (
                    <ReferenceLine
                      x={hoveredSample}
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  )}
                  {numSamples > 0 && (
                    <ReferenceLine
                      x={numSamples}
                      stroke="#10b981"
                      strokeWidth={2}
                      label={{ value: 'Current', position: 'top', fill: '#10b981', fontSize: 11, fontWeight: 600 }}
                    />
                  )}
                  {showCI && (
                    <Area 
                      yAxisId="left"
                      type="basis" 
                      dataKey="ciUpper" 
                      fill="url(#ciGradient)" 
                      stroke="none"
                      isAnimationActive={false}
                      fillOpacity={1}
                    />
                  )}
                  {showCI && (
                    <Area 
                      yAxisId="left"
                      type="basis" 
                      dataKey="ciLower" 
                      fill="white" 
                      stroke="none"
                      isAnimationActive={false}
                      fillOpacity={1}
                    />
                  )}
                  {numSamples > 0 && (
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="sampleMean" 
                    stroke="#4f46e5" 
                    dot={{ fill: '#4f46e5', r: 2 }}
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Card - Standard Error of the Mean */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-4 flex flex-col min-h-0">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Standard Error of the Mean</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={chartData} 
                  margin={{ top: 5, right: 80, left: 50, bottom: 35 }}
                  onMouseMove={(e: any) => {
                    if (e && e.activeLabel) {
                      setHoveredSample(e.activeLabel);
                    }
                  }}
                  onMouseLeave={() => setHoveredSample(null)}
                >
                  <defs>
                    <linearGradient id="ciGradient2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93c5fd" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    type="number"
                    dataKey="sample" 
                    stroke="#64748b"
                    domain={[1, Math.max(20, numSamples)]}
                    ticks={xAxisTicks}
                    hide={false}
                    allowDataOverflow={true}
                    label={{ value: 'Number of Samples', position: 'insideBottom', offset: -20, textAnchor: 'middle' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    type="number"
                    stroke="#64748b"
                    domain={[0, 20]}
                    ticks={[0, 5, 10, 15, 20]}
                    hide={false}
                    allowDataOverflow={true}
                    label={{ value: 'S.E. of the Mean', angle: -90, position: 'left', offset: 10, textAnchor: 'middle' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {hoveredSample !== null && (
                    <ReferenceLine
                      x={hoveredSample}
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                  )}
                  {numSamples > 0 && (
                    <ReferenceLine
                      x={numSamples}
                      stroke="#10b981"
                      strokeWidth={2}
                      label={{ value: 'Current', position: 'top', fill: '#10b981', fontSize: 11, fontWeight: 600 }}
                    />
                  )}
                  {numSamples > 0 && (
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="standardError" 
                    stroke="#4f46e5" 
                    dot={false}
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Explainer Boxes - Bottom */}
          <div className="flex gap-4">
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">The Power of Sample Size: Understanding Standard Error</h3>
              <p className="text-xs text-slate-600">
                The <strong>Standard Error (SE)</strong> measures the accuracy with which a sample represents a population. The most powerful way to reduce standard error is to increase your <strong>sample size (n)</strong>. Observe this "law of diminishing returns" in the interactive plot below.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-cyan-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-cyan-800 mb-1">KEY OBSERVATION</h3>
              <p className="text-xs text-slate-600 mb-1">
                Notice the steep drop at smaller sample sizes—this is where you get the most "bang for your buck." As sample size increases, the curve flattens (diminishing returns).
              </p>
              <p className="text-xs text-slate-500 italic">Formula: SE = σ / √n</p>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfidenceFunnelChart;
