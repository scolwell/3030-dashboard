
import React from 'react';
import { SamplingMethod, SubMethod, SamplingConfig } from '../types';

interface MethodExplanationProps {
  config: SamplingConfig;
  randomStart?: number | number[];
}

const STRATA_LABELS = ["First Year", "Second Year", "Third Year", "Fourth Year"];

const MethodExplanation: React.FC<MethodExplanationProps> = ({ config, randomStart }) => {
  const { method, subMethod, sampleSize, populationSize, systematicInterval } = config;

  const getExplanation = () => {
    const isSubSystematic = subMethod === SubMethod.SYSTEMATIC;

    switch (method) {
      case SamplingMethod.SIMPLE_RANDOM:
        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            <p className="text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900">Simple Random Sampling (SRS)</span> means every unit in the population has an exactly equal chance of being selected.
            </p>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-800 uppercase mb-2">How it worked here:</p>
              <p className="text-sm text-indigo-700">
                The system pulled <span className="font-bold">{sampleSize}</span> individuals entirely at random from the total pool of {populationSize}. No priority was given to any specific row, cluster, or year level.
              </p>
            </div>
          </div>
        );

      case SamplingMethod.SYSTEMATIC:
        const startVal = Array.isArray(randomStart) ? randomStart[0] : (randomStart || '?');
        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            <p className="text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900">Systematic Sampling</span> follows a rigid selection rule across the entire population: select every <span className="italic">k-th</span> unit.
            </p>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-800 uppercase mb-2">How it worked here:</p>
              <p className="text-sm text-indigo-700">
                After picking a random starting individual (Individual <span className="font-bold">#{startVal}</span>), we jumped exactly every <span className="font-bold">{systematicInterval} individuals</span> through the list until your sample of {sampleSize} was filled.
              </p>
            </div>
          </div>
        );

      case SamplingMethod.STRATIFIED:
        const perLevel = Math.floor(sampleSize / 4);
        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            <p className="text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900">Stratified {isSubSystematic ? 'Systematic' : 'Random'} Sampling</span> ensures representation by dividing the population into mutually exclusive cohorts (strata) first.
            </p>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-800 uppercase mb-2">The {isSubSystematic ? 'Stratified Systematic' : 'Stratified Random'} Model:</p>
              <div className="text-sm text-indigo-700 space-y-3">
                <p>
                  <span className="font-bold">Step 1:</span> We divided the population into 4 year levels: <span className="font-bold">{STRATA_LABELS.join(', ')}</span> (100 individuals each).
                </p>
                <p>
                  <span className="font-bold">Step 2:</span> We ensured your sample of {sampleSize} was distributed proportionally, picking <span className="font-bold">{perLevel} individuals</span> from <span className="italic">every</span> year level.
                </p>
                <p>
                  <span className="font-bold">Step 3:</span> {isSubSystematic ? (
                    <>
                      Inside <span className="italic">each</span> year level, we applied a <span className="font-bold">Systematic</span> rule. For every group, a random start was chosen, and then every <span className="font-bold">{systematicInterval}th individual</span> was selected until the quota for that level was met.
                    </>
                  ) : (
                    "Random selection occurred independently within each year level."
                  )}
                </p>
                {isSubSystematic && Array.isArray(randomStart) && (
                  <div className="p-2 bg-white/50 rounded border border-indigo-200 text-[10px] font-mono overflow-x-auto">
                    Starts per Stratum: [{randomStart.join(', ')}]
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case SamplingMethod.CLUSTER:
        const unitsPerZone = 16;
        const zonesToPick = Math.ceil(sampleSize / unitsPerZone);
        const actualSampleTotal = zonesToPick * unitsPerZone;

        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            <p className="text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900">Cluster Sampling</span> treats groups (clusters) as the primary sampling unit rather than individuals from the population.
            </p>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-800 uppercase mb-2">The Cluster Strategy</p>
              <div className="text-sm text-indigo-700 space-y-3">
                <p>
                  <span className="font-bold">Step 1: Group the Population.</span> The population is divided into <span className="font-bold">25 Clusters</span>. Each cluster contains 16 individuals.
                </p>
                <p>
                  <span className="font-bold">Step 2: {isSubSystematic ? 'Systematic Cluster Selection' : 'Randomly Select Clusters'}.</span> 
                  {isSubSystematic ? (
                    `We applied a systematic jump across the cluster list. Starting at a random cluster, we picked every ${Math.max(1, Math.floor(25 / zonesToPick))}th cluster until we had ${zonesToPick} zones.`
                  ) : (
                    `We randomly selected ${zonesToPick} clusters from the 25 available.`
                  )}
                </p>
                <div className="p-3 bg-white/50 rounded border border-indigo-200 text-xs font-mono">
                  Calculation: {zonesToPick} clusters × {unitsPerZone} individuals = {actualSampleTotal} total sample size.
                </div>
                <p>
                  <span className="font-bold">Step 3: Census within Clusters.</span> Every individual within the selected clusters is included in the final sample.
                </p>
              </div>
            </div>
          </div>
        );

      case SamplingMethod.MULTI_STAGE:
        return (
          <div className="space-y-4 animate-in fade-in duration-500">
            <p className="text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-900">Multi-stage Sampling</span> is hierarchical. First, pick clusters from the population, then pick individuals from within those clusters.
            </p>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-800 uppercase mb-2">How it worked here:</p>
              <ol className="text-sm text-indigo-700 space-y-2 list-decimal pl-4">
                <li><span className="font-bold">Stage 1:</span> We randomly selected <span className="font-bold">5 clusters</span> from the population of 25.</li>
                <li><span className="font-bold">Stage 2:</span> Within each of those clusters, we performed a <span className="font-bold">{isSubSystematic ? 'Systematic' : 'Random'}</span> selection to reach your target sample size of {sampleSize}.</li>
              </ol>
            </div>
          </div>
        );

      default:
        return <p className="text-slate-400 italic">Select a method and click "Execute" to generate an explanation.</p>;
    }
  };

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm min-h-[420px] overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
          Methodology Logic
          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
            {method} {subMethod === SubMethod.SYSTEMATIC ? '(Systematic Sub-Type)' : ''}
          </span>
        </h3>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {getExplanation()}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span className="font-medium italic">All selections are derived from the population pool.</span>
        </div>
      </div>
    </div>
  );
};

export default MethodExplanation;
