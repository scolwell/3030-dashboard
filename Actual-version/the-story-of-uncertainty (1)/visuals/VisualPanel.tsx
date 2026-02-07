import React from 'react';
import { StoryStep } from '../types';
import NormalDistribution from '../components/NormalDistribution';
import SampleScene from './scenes/SampleScene';
import ComparisonScene from './scenes/ComparisonScene';

interface VisualPanelProps {
  step: StoryStep;
  popMean: number;
  popStdDev: number;
  sampleSize: number;
  sampleMean: number;
  stdErr: number;
  alpha: number;
  testType: 'one-tailed' | 'two-tailed';
  onSampleDrawn: (mean: number) => void;
}

const VisualPanel: React.FC<VisualPanelProps> = ({
  step,
  popMean,
  popStdDev,
  sampleSize,
  sampleMean,
  stdErr,
  alpha,
  testType,
  onSampleDrawn
}) => {
  switch (step.visualType) {
    case 'sample':
      return <SampleScene onSampleDrawn={onSampleDrawn} popMean={popMean} popStdDev={popStdDev} sampleSize={sampleSize} />;
    
    case 'sample-on-dist':
      return (
        <NormalDistribution 
          mean={popMean} 
          stdDev={stdErr} 
          alpha={alpha} 
          sampleMean={sampleMean} 
          showCriticalRegion={false} 
          testType={testType} 
        />
      );
    
    case 'comparison':
      return <ComparisonScene popMean={popMean} sampleMean={sampleMean} />;
    
    case 'logic':
      return (
        <div className="flex flex-col items-center justify-center gap-6 py-4 animate-in fade-in zoom-in duration-500 w-full max-w-lg h-full">
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-xl mb-4 shadow-lg shadow-red-100">
                <i className="fas fa-gavel"></i>
              </div>
              <h4 className="text-red-600 font-black uppercase tracking-widest text-xs mb-2">Verdict A</h4>
              <p className="text-red-900 font-black text-xl mb-2 leading-none">REJECT H₀</p>
            </div>
            <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-slate-400 rounded-full flex items-center justify-center text-white text-xl mb-4 shadow-lg shadow-slate-100">
                <i className="fas fa-question"></i>
              </div>
              <h4 className="text-slate-500 font-black uppercase tracking-widest text-xs mb-2">Verdict B</h4>
              <p className="text-slate-900 font-black text-xl mb-2 leading-none">FAIL TO REJECT</p>
            </div>
          </div>
          <div className="bg-slate-900 text-white p-6 rounded-3xl w-full shadow-xl flex flex-col items-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] mb-2 opacity-80 text-center">The Legal Analogy</p>
            <p className="text-xl font-black text-center leading-tight italic">
              "Statistical tests don't prove innocence.<br/>They only search for guilt."
            </p>
          </div>
        </div>
      );
    
    case 'errors':
      return (
        <div className="flex flex-col items-center justify-center w-full animate-in fade-in duration-700 py-4 max-w-2xl h-full">
          <div className="grid grid-cols-3 grid-rows-3 gap-3 w-full">
            <div className="col-start-2 text-center text-[10px] font-black uppercase text-slate-400 flex items-center justify-center">If Truth is H₀</div>
            <div className="col-start-3 text-center text-[10px] font-black uppercase text-slate-400 flex items-center justify-center">If Truth is Hₐ</div>
            <div className="row-start-2 text-right text-[10px] font-black uppercase text-slate-400 flex items-center justify-end pr-2">Decision: REJECT</div>
            <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex flex-col items-center text-center">
              <p className="text-red-900 font-black text-xs uppercase mb-1">Type I Error</p>
              <p className="text-[10px] text-red-700 font-bold italic">False Positive</p>
            </div>
            <div className="bg-green-50 border-2 border-green-100 p-4 rounded-2xl flex flex-col items-center text-center">
              <p className="text-green-900 font-black text-xs uppercase mb-1">Correct</p>
              <p className="text-[10px] text-green-700">Power Found</p>
            </div>
            <div className="row-start-3 text-right text-[10px] font-black uppercase text-slate-400 flex items-center justify-end pr-2">Decision: STAY</div>
            <div className="bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl flex flex-col items-center text-center">
              <p className="text-slate-900 font-black text-xs uppercase mb-1">Correct</p>
              <p className="text-[10px] text-slate-700">Safety</p>
            </div>
            <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex flex-col items-center text-center">
              <p className="text-amber-900 font-black text-xs uppercase mb-1">Type II Error</p>
              <p className="text-[10px] text-amber-700 font-bold italic">False Negative</p>
            </div>
          </div>
        </div>
      );
    
    case 'alternative':
      return (
        <div className="flex flex-col items-center justify-center gap-8 py-4 w-full max-w-lg h-full">
          <div className="relative flex items-center justify-center w-full py-10">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white border-2 border-red-500 text-red-500 w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg rotate-12">
                <i className="fas fa-times"></i>
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Reject H₀</span>
            </div>
            <div className="h-[2px] w-24 bg-gradient-to-r from-red-200 to-green-200 mx-4"></div>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-green-500 text-white w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-xl animate-pulse">
                <i className="fas fa-check"></i>
              </div>
              <span className="text-sm font-black text-green-600 uppercase tracking-widest">Support Hₐ</span>
            </div>
          </div>
        </div>
      );
    
    case 'distribution':
      return (
        <NormalDistribution 
          mean={popMean} 
          stdDev={stdErr} 
          alpha={0.05} 
          testType={testType} 
          showCentralRegion={true} 
        />
      );
    
    case 'threshold':
      return (
        <NormalDistribution 
          mean={popMean} 
          stdDev={stdErr} 
          alpha={alpha} 
          showCriticalRegion={true} 
          highlightAlpha={true} 
          testType={testType} 
        />
      );
    
    case 'conclusion':
      return (
        <NormalDistribution 
          mean={popMean} 
          stdDev={stdErr} 
          alpha={alpha} 
          sampleMean={sampleMean} 
          showCriticalRegion={true} 
          highlightAlpha={true} 
          testType={testType} 
        />
      );
    
    default:
      return null;
  }
};

export default VisualPanel;
