import React from 'react';

interface AssumptionsCardProps {
  nullHypothesis: string;
  popStdDev: number;
  sampleSize: number;
  testType: 'one-tailed' | 'two-tailed';
  alpha: number;
}

const AssumptionsCard: React.FC<AssumptionsCardProps> = ({
  nullHypothesis,
  popStdDev,
  sampleSize,
  testType,
  alpha
}) => {
  return (
    <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4">
        Test Assumptions
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Null Hypothesis:</span>
          <span className="font-bold text-slate-900">{nullHypothesis}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Population σ:</span>
          <span className="font-bold text-slate-900">{popStdDev}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Sample Size (n):</span>
          <span className="font-bold text-slate-900">{sampleSize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Test Type:</span>
          <span className="font-bold text-slate-900 capitalize">{testType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Significance (α):</span>
          <span className="font-bold text-blue-600">{alpha.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default AssumptionsCard;
