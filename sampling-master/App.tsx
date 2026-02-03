
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SamplingMethod, SubMethod, Unit, SamplingConfig } from './types';
import { generatePopulation, performSampling, calculateStats } from './utils/samplingLogic';
import Visualizer from './components/Visualizer';
import StatsBoard from './components/StatsBoard';
import MethodExplanation from './components/SampleDetails';

const App: React.FC = () => {
  const [config, setConfig] = useState<SamplingConfig>({
    populationSize: 400,
    sampleSize: 48,
    method: SamplingMethod.SIMPLE_RANDOM,
    subMethod: SubMethod.SIMPLE,
    systematicInterval: 10,
    strataCount: 4,
    clusterCount: 25
  });

  const [population, setPopulation] = useState<Unit[]>([]);
  const [randomStart, setRandomStart] = useState<number | number[] | undefined>();

  const stats = useMemo(() => calculateStats(population), [population]);

  const handleRegenerate = useCallback(() => {
    setPopulation(generatePopulation(config.populationSize));
    setRandomStart(undefined);
  }, [config.populationSize]);

  useEffect(() => {
    handleRegenerate();
  }, [handleRegenerate]);

  useEffect(() => {
    if (config.method === SamplingMethod.CLUSTER) {
      const snappedSize = Math.max(16, Math.round(config.sampleSize / 16) * 16);
      updateConfig({ sampleSize: snappedSize });
    }
    setPopulation(prev => prev.map(u => ({ ...u, isSelected: false, isPreSelected: false })));
    setRandomStart(undefined);
  }, [config.method]);

  const handleDrawSample = useCallback(() => {
    const { population: sampled, randomStart: start } = performSampling(population, config);
    setPopulation(sampled);
    setRandomStart(start);
  }, [population, config]);

  const updateConfig = (updates: Partial<SamplingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const isClusterMethod = config.method === SamplingMethod.CLUSTER;
  const isMultiStage = config.method === SamplingMethod.MULTI_STAGE;

  const showSubMethodToggle = 
    config.method === SamplingMethod.STRATIFIED || 
    isClusterMethod || 
    isMultiStage;

  const isSystematicActive = 
    config.method === SamplingMethod.SYSTEMATIC || 
    (showSubMethodToggle && config.subMethod === SubMethod.SYSTEMATIC);

  const sliderStep = isClusterMethod ? 16 : 5;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <aside className="w-full lg:w-96 bg-white border-r border-slate-200 p-8 flex flex-col gap-6 overflow-y-auto h-screen">
        <div className="pb-4 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sampling Master</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Population (N) = 400</p>
        </div>

        <section className="flex flex-col gap-6">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
             <button 
                onClick={handleRegenerate}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                Simulate New Population
              </button>
              <p className="mt-2 text-[10px] text-indigo-400 text-center uppercase font-bold tracking-wider">Reset individual data values</p>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Sample Settings</label>
            
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sample Size (n)</span>
                <span className="font-bold text-indigo-600">{config.sampleSize}</span>
              </div>
              <input 
                type="range" 
                min={isClusterMethod ? 16 : 10} 
                max={Math.min(200, config.populationSize)} 
                step={sliderStep}
                value={config.sampleSize}
                onChange={(e) => updateConfig({ sampleSize: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            {isSystematicActive && (
              <div className="space-y-1 animate-in slide-in-from-left-2 duration-300">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Interval (k)</span>
                  <span className="font-bold text-indigo-600">{config.systematicInterval}</span>
                </div>
                <input 
                  type="range" min="2" max="25" step="1"
                  value={config.systematicInterval}
                  onChange={(e) => updateConfig({ systematicInterval: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}
          </div>

          {showSubMethodToggle && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sub-Selection Rule</label>
              <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                {Object.values(SubMethod).map(sm => (
                  <button
                    key={sm}
                    onClick={() => updateConfig({ subMethod: sm })}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                      config.subMethod === sm ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {sm.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary Method</label>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(SamplingMethod).map(m => (
                <button
                  key={m}
                  onClick={() => updateConfig({ method: m })}
                  className={`px-4 py-3 rounded-xl text-left transition-all duration-200 border ${
                    config.method === m 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                    : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-semibold text-sm">{m}</div>
                  <div className="text-[10px] opacity-70">
                    {m === SamplingMethod.SIMPLE_RANDOM && "Pure random selection"}
                    {m === SamplingMethod.SYSTEMATIC && "Periodic interval jumps"}
                    {m === SamplingMethod.STRATIFIED && "Representative groups (Years)"}
                    {m === SamplingMethod.CLUSTER && "Pick entire zones"}
                    {m === SamplingMethod.MULTI_STAGE && "Zones then individuals"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleDrawSample}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/></svg>
            Execute Sampling
          </button>
        </section>
      </aside>

      <main className="flex-1 p-4 md:p-8 flex flex-col gap-8 overflow-y-auto">
        <StatsBoard stats={stats} method={config.method} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-800">Visual Population Map</h2>
            <Visualizer population={population} method={config.method} />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Sampling Logic
            </h2>
            <MethodExplanation config={config} randomStart={randomStart} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
