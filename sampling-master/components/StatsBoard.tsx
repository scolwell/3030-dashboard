
import React from 'react';
import { Stats, SamplingMethod } from '../types';

interface StatsBoardProps {
  stats: Stats;
  method: SamplingMethod;
}

const STRATA_LABELS = ["First Year", "Second Year", "Third Year", "Fourth Year"];

const StatsBoard: React.FC<StatsBoardProps> = ({ stats, method }) => {
  const diff = Math.abs(stats.popMean - stats.sampleMean);
  const errorPct = ((diff / stats.popMean) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Population Mean</p>
        <div className="text-3xl font-bold text-slate-900">{stats.popMean}</div>
        <p className="text-[10px] text-slate-500 mt-2">N = {stats.popCount} Total Individuals</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Sample Mean</p>
        <div className="text-3xl font-bold text-indigo-600">{stats.sampleMean || '--'}</div>
        <p className="text-[10px] text-slate-500 mt-2">n = {stats.sampleCount} Selected Individuals</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Sampling Error</p>
        <div className={`text-3xl font-bold ${Number(errorPct) < 5 ? 'text-emerald-500' : 'text-amber-500'}`}>
          {stats.sampleCount > 0 ? `${errorPct}%` : '--'}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Deviation from Population Mean</p>
      </div>

      {method === SamplingMethod.STRATIFIED && (
        <div className="col-span-1 md:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            Stratum Representation
            <span className="text-[10px] font-normal text-slate-400 italic">Ensuring every population cohort is represented</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.entries(stats.strataDistribution) as [string, { pop: number; sample: number }][]).map(([id, dist]) => {
              const popPct = (dist.pop / stats.popCount) * 100;
              const samplePct = stats.sampleCount > 0 ? (dist.sample / stats.sampleCount) * 100 : 0;
              const colors = ['bg-rose-400', 'bg-emerald-400', 'bg-amber-400', 'bg-sky-400'];
              const idx = parseInt(id);
              
              return (
                <div key={id} className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                    <span>{STRATA_LABELS[idx]}</span>
                    <span>{dist.sample} n</span>
                  </div>
                  <div className="relative h-4 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                    <div 
                      className={`${colors[idx]} h-full transition-all duration-1000 ease-out absolute left-0 top-0`} 
                      style={{ width: `${samplePct}%` }}
                    />
                    <div 
                      className="border-r-2 border-slate-400 h-full absolute top-0 pointer-events-none z-10 opacity-30"
                      style={{ left: `${popPct}%` }}
                      title="Proportion in Population"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 flex justify-between">
                    <span>Pop: {popPct.toFixed(0)}%</span>
                    <span>Sample: {samplePct.toFixed(0)}%</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsBoard;
