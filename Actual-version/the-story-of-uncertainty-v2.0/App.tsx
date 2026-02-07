
import React, { useState, useMemo } from 'react';
import { STORY_STEPS, INITIAL_STATE } from './constants';
import { StoryStep } from './types';
import NormalDistribution from './components/NormalDistribution';
import SampleCloud from './components/SampleCloud';

function normDist(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

const App: React.FC = () => {
  const [state, setState] = useState(INITIAL_STATE);
  
  const step = STORY_STEPS[state.currentStep];
  const stdErr = state.popStdDev / Math.sqrt(state.sampleSize);

  const nextStep = () => {
    if (state.currentStep < STORY_STEPS.length - 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const prevStep = () => {
    if (state.currentStep > 0) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const resetStory = () => {
    setState(INITIAL_STATE);
  };

  const backToStart = () => {
    setState(prev => ({ ...prev, currentStep: 0 }));
  };

  const goToStep = (index: number) => {
    setState(prev => ({ ...prev, currentStep: index }));
  };

  const handleNewSample = (mean: number) => {
    setState(prev => ({ ...prev, sampleMean: mean }));
  };

  const calculatePValue = (sampleMean: number) => {
    const z = (sampleMean - state.popMean) / stdErr;
    const tailProb = 1 - normDist(Math.abs(z));
    return state.testType === 'two-tailed' ? tailProb * 2 : tailProb;
  };

  const pValue = useMemo(() => calculatePValue(state.sampleMean), [state.sampleMean, state.popMean, stdErr, state.testType]);

  const renderVisual = (targetStep: StoryStep) => {
    switch (targetStep.visualType) {
      case 'sample':
        return <SampleCloud onSampleDrawn={handleNewSample} highlightSample={true} />;
      case 'sample-on-dist':
        return (
          <NormalDistribution mean={state.popMean} stdDev={stdErr} alpha={state.alpha} sampleMean={state.sampleMean} showCriticalRegion={false} testType={state.testType} />
        );
      case 'comparison':
        return (
          <div className="flex flex-col items-center justify-center gap-8 h-full py-4">
            <div className="flex items-center gap-12 sm:gap-20">
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-tighter">Population \u03BC</span>
                <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-600 font-black text-3xl border-4 border-slate-200">
                  {state.popMean}
                </div>
              </div>
              <div className="text-4xl text-slate-200">
                <i className="fas fa-arrows-left-right animate-pulse"></i>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-blue-500 mb-2 uppercase tracking-tighter">Sample x̄</span>
                <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 font-black text-3xl border-4 border-blue-400 shadow-xl shadow-blue-100">
                  {state.sampleMean}
                </div>
              </div>
            </div>
            <div className="text-center bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 max-w-sm">
                <p className="text-slate-500 text-sm">
                  Difference observed: <span className="text-blue-600 font-bold">{(state.sampleMean - state.popMean).toFixed(1)}</span>.
                </p>
                <p className="text-slate-400 text-xs mt-1 uppercase font-bold tracking-tighter">
                  Noise or Discovery?
                </p>
            </div>
          </div>
        );
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
          <NormalDistribution mean={state.popMean} stdDev={stdErr} alpha={0.05} testType={state.testType} showCentralRegion={true} />
        );
      case 'threshold':
        return (
          <NormalDistribution mean={state.popMean} stdDev={stdErr} alpha={state.alpha} showCriticalRegion={true} highlightAlpha={true} testType={state.testType} />
        );
      case 'conclusion':
        return (
          <NormalDistribution mean={state.popMean} stdDev={stdErr} alpha={state.alpha} sampleMean={state.sampleMean} showCriticalRegion={true} highlightAlpha={true} testType={state.testType} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 sm:px-8 lg:px-12 bg-slate-50">
      <header className="max-w-7xl w-full flex flex-col md:flex-row items-center justify-between mb-16 gap-8" />

      <main className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch animate-in fade-in duration-700">
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-6 h-full flex flex-col relative overflow-hidden">
            <div className="flex gap-2 mb-6">
              {STORY_STEPS.map((s, idx) => (
                <button 
                  key={s.id} 
                  onClick={() => goToStep(idx)}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 focus:outline-none ${
                    idx <= state.currentStep ? 'bg-blue-600' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div key={state.currentStep} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h2 className="text-5xl font-black text-slate-900 mb-4 leading-tight tracking-tight">{step.title}</h2>
              <p className="text-2xl text-slate-600 leading-relaxed font-medium mb-6">{step.content}</p>
              
              <div className="bg-blue-50/50 border-l-4 border-blue-500 p-8 rounded-r-[2rem] mb-8">
                <p className="text-blue-900 text-base leading-relaxed font-semibold italic opacity-90">{step.details}</p>
              </div>
            </div>

            <div className="mt-auto pt-6 flex items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={backToStart}
                  disabled={state.currentStep === 0}
                  className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-600 bg-white border-2 border-slate-200 hover:border-slate-300 disabled:opacity-30 transition-all active:scale-95"
                >
                  <i className="fas fa-home mr-2"></i>Start
                </button>
                <button
                  onClick={resetStory}
                  className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-600 bg-white border-2 border-slate-200 hover:border-slate-300 transition-all active:scale-95"
                >
                  <i className="fas fa-rotate-right mr-2"></i>Reset
                </button>
              </div>
              <button 
                onClick={prevStep} 
                disabled={state.currentStep === 0}
                className="px-8 py-4 font-black text-slate-400 hover:text-slate-900 disabled:opacity-0 transition-all active:scale-95"
              >
                Back
              </button>
              
              <button 
                onClick={nextStep} 
                disabled={state.currentStep === STORY_STEPS.length - 1} 
                className="flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:bg-slate-200 disabled:text-slate-400 transition-all hover:scale-105 active:scale-95 group"
              >
                {state.currentStep === STORY_STEPS.length - 1 ? 'End' : 'Continue'}
                <i className="fas fa-chevron-right text-xs group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 h-full flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]">
            {renderVisual(step)}
            
            {['threshold', 'conclusion'].includes(step.visualType) && (
              <div className="mt-8 w-full animate-in slide-in-from-bottom-6 duration-500">
                <div className="w-full flex flex-col sm:flex-row items-center gap-10 bg-slate-50/80 backdrop-blur p-8 rounded-[2.5rem] border border-slate-200 shadow-inner">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between text-[11px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">
                        <span>Alpha (&alpha;) Threshold</span>
                        <span className="text-blue-600 bg-blue-100 px-3 py-1 rounded-full">&alpha; = {state.alpha.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.01" 
                        max="0.20" 
                        step="0.01" 
                        value={state.alpha} 
                        onChange={(e) => setState(prev => ({ ...prev, alpha: parseFloat(e.target.value) }))} 
                        className="w-full h-2.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" 
                      />
                    </div>
                    <div className="w-full sm:w-auto flex flex-col gap-3">
                      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200">
                        <button onClick={() => setState(prev => ({ ...prev, testType: 'two-tailed' }))} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${state.testType === 'two-tailed' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Two-Tailed</button>
                        <button onClick={() => setState(prev => ({ ...prev, testType: 'one-tailed' }))} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${state.testType === 'one-tailed' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>One-Tailed</button>
                      </div>
                    </div>
                    {step.visualType === 'conclusion' && (
                      <div className="w-full sm:w-48 text-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-6 sm:pt-0 sm:pl-10">
                          <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">P-Value</div>
                          <div className={`text-4xl font-black tabular-nums ${pValue < state.alpha ? 'text-green-500' : 'text-amber-500'}`}>{pValue.toFixed(3)}</div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
