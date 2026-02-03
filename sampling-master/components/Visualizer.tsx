
import React from 'react';
import { Unit, SamplingMethod } from '../types';

interface VisualizerProps {
  population: Unit[];
  method: SamplingMethod;
}

const Visualizer: React.FC<VisualizerProps> = ({ population, method }) => {
  const isClusterMode = method === SamplingMethod.CLUSTER || method === SamplingMethod.MULTI_STAGE;
  const isStratified = method === SamplingMethod.STRATIFIED;
  const isSimpleOrSystematic = method === SamplingMethod.SIMPLE_RANDOM || method === SamplingMethod.SYSTEMATIC;

  // Colors for clusters
  const clusterColors = Array.from({ length: 25 }, (_, i) => `hsla(${(i * 137.5) % 360}, 45%, 95%, 1)`);
  const selectedClusterColors = Array.from({ length: 25 }, (_, i) => `hsla(${(i * 137.5) % 360}, 60%, 85%, 1)`);

  const getUnitStyles = (unit: Unit) => {
    let base = "w-3 h-3 md:w-3.5 md:h-3.5 rounded-[1px] transition-all duration-300 transform ";
    
    if (unit.isSelected) {
      return base + "bg-indigo-600 scale-110 shadow-lg z-30 ring-1 ring-white";
    }
    
    if (isStratified) {
      const colors = ['bg-rose-200', 'bg-emerald-200', 'bg-amber-200', 'bg-sky-200'];
      return base + (colors[unit.stratum] || 'bg-slate-200');
    }

    // Neutral for everything else (Cluster internal units, SRS, Systematic)
    return base + "bg-white/80 border border-slate-200/50";
  };

  // Group units by cluster (0-24)
  const clusters = Array.from({ length: 25 }, (_, i) => 
    population.filter(u => u.cluster === i)
  );

  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[550px]">
      <div className="mb-6 text-center">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Spatial Map: {isClusterMode ? '25 Clusters of 16 individuals' : isStratified ? 'Stratified Population' : 'Population (N=400)'}
        </h3>
      </div>

      <div className="relative p-3 bg-slate-50 rounded-xl border border-slate-200/60 shadow-inner overflow-hidden">
        {isClusterMode ? (
          /* CLUSTER DESIGN: 5x5 grid of 4x4 blocks */
          <div className="grid grid-cols-5 gap-2 animate-in zoom-in-95 duration-500">
            {clusters.map((clusterUnits, clusterIdx) => {
              const isAnyUnitSelected = clusterUnits.some(u => u.isSelected);
              const isPreSelected = clusterUnits.some(u => u.isPreSelected);
              
              return (
                <div 
                  key={clusterIdx}
                  className={`p-1.5 rounded-lg border transition-all duration-500 ${
                    isPreSelected || isAnyUnitSelected 
                    ? 'border-indigo-300 shadow-sm ring-2 ring-indigo-100 ring-offset-1' 
                    : 'border-slate-200'
                  }`}
                  style={{ 
                    backgroundColor: isPreSelected || isAnyUnitSelected 
                      ? selectedClusterColors[clusterIdx] 
                      : clusterColors[clusterIdx] 
                  }}
                >
                  <div className="grid grid-cols-4 gap-1">
                    {clusterUnits.map((unit) => (
                      <div key={unit.id} className={getUnitStyles(unit)} />
                    ))}
                  </div>
                  <div className="mt-1 text-[8px] font-bold text-center text-slate-400 uppercase opacity-60">
                    C{clusterIdx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* UNIFORM DESIGN: Single 20x20 grid */
          <div 
            className="grid gap-1 animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}
          >
            {population.map((unit) => (
              <div
                key={unit.id}
                className={`${getUnitStyles(unit)} ${isSimpleOrSystematic && !unit.isSelected ? 'bg-slate-200/50' : ''}`}
                title={`Unit ${unit.id + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-8 flex flex-wrap justify-center gap-y-4 gap-x-8 text-[11px] text-slate-500 font-bold bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100 max-w-2xl">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-indigo-600 rounded-sm shadow-sm"></div>
          <span className="uppercase tracking-wider text-indigo-700">Sampled (n)</span>
        </div>

        {isClusterMode && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-8">
            <div className="w-3.5 h-3.5 bg-indigo-200 border border-indigo-300 rounded-sm"></div>
            <span className="uppercase tracking-wider text-slate-600">Selected Clusters</span>
          </div>
        )}

        {isStratified && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-8">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-1.5 h-1.5 bg-rose-200"></div>
              <div className="w-1.5 h-1.5 bg-emerald-200"></div>
              <div className="w-1.5 h-1.5 bg-amber-200"></div>
              <div className="w-1.5 h-1.5 bg-sky-200"></div>
            </div>
            <span className="uppercase tracking-wider text-slate-600">Defined Strata</span>
          </div>
        )}

        <div className="flex items-center gap-2 border-l border-slate-200 pl-8">
          <div className="w-3.5 h-3.5 bg-slate-200 border border-slate-300 rounded-sm"></div>
          <span className="uppercase tracking-wider">Population Pool</span>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
