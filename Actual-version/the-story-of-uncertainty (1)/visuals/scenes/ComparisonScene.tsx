import React from 'react';

interface ComparisonSceneProps {
  popMean: number;
  sampleMean: number;
}

const ComparisonScene: React.FC<ComparisonSceneProps> = ({ popMean, sampleMean }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-8 h-full py-4">
      <div className="flex items-center gap-12 sm:gap-20">
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-tighter">Population μ</span>
          <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-600 font-black text-3xl border-4 border-slate-200">
            {popMean}
          </div>
        </div>
        <div className="text-4xl text-slate-200">
          <i className="fas fa-arrows-left-right animate-pulse"></i>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-blue-500 mb-2 uppercase tracking-tighter">Sample x̄</span>
          <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 font-black text-3xl border-4 border-blue-400 shadow-xl shadow-blue-100">
            {sampleMean}
          </div>
        </div>
      </div>
      <div className="text-center bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 max-w-sm">
        <p className="text-slate-500 text-sm">
          Difference observed: <span className="text-blue-600 font-bold">{(sampleMean - popMean).toFixed(1)}</span>.
        </p>
        <p className="text-slate-400 text-xs mt-1 uppercase font-bold tracking-tighter">
          Noise or Discovery?
        </p>
      </div>
    </div>
  );
};

export default ComparisonScene;
