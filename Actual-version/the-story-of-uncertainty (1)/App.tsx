
import React, { useReducer, useMemo } from 'react';
import { STORY_STEPS, INITIAL_STATE } from './constants';
import Stepper from './components/Stepper';
import AssumptionsCard from './components/AssumptionsCard';
import VisualPanel from './visuals/VisualPanel';
import { calculatePValue, calculateStandardError } from './domain/stats';
import { appReducer } from './state/reducer';

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  
  const step = STORY_STEPS[state.currentStep];
  const stdErr = calculateStandardError(state.popStdDev, state.sampleSize);

  const nextStep = () => dispatch({ type: 'NEXT_STEP' });
  const prevStep = () => dispatch({ type: 'PREV_STEP' });
  const resetStory = () => dispatch({ type: 'RESET' });
  const backToStart = () => dispatch({ type: 'BACK_TO_START' });

  const goToStep = (index: number) => {
    // Warn if jumping to conclusion steps without having drawn a sample
    const targetStep = STORY_STEPS[index];
    if (['conclusion', 'sample-on-dist'].includes(targetStep.visualType) && state.sampleMean === state.popMean) {
      if (!confirm('You haven\'t drawn a sample yet. Continue to this step anyway?')) {
        return;
      }
    }
    dispatch({ type: 'GOTO_STEP', payload: index });
  };

  const handleNewSample = (mean: number) => {
    dispatch({ type: 'NEW_SAMPLE', payload: mean });
  };

  const pValue = useMemo(
    () => calculatePValue(state.sampleMean, state.popMean, stdErr, state.testType),
    [state.sampleMean, state.popMean, stdErr, state.testType]
  );

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-4 sm:px-8 lg:px-12 bg-slate-50">
      <header className="max-w-7xl w-full flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-2">
            The Uncertainty <span className="text-blue-600">Story</span>
          </h1>
          <p className="text-slate-500 font-semibold tracking-wide uppercase text-[11px]">From Variability to Decisions Under Uncertainty</p>
        </div>
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
      </header>

      <main className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch animate-in fade-in duration-700">
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-12 h-full flex flex-col relative overflow-hidden">
            <div className="mb-12">
              <Stepper steps={STORY_STEPS} currentStep={state.currentStep} onStepClick={goToStep} />
            </div>

            <div key={state.currentStep} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="inline-block px-4 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">Chapter {step.chapterNumber}</span>
              <h2 className="text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">{step.title}</h2>
              <p className="text-2xl text-slate-600 leading-relaxed font-medium mb-10">{step.content}</p>
              
              <div className="bg-blue-50/50 border-l-4 border-blue-500 p-8 rounded-r-[2rem] mb-8">
                <p className="text-blue-900 text-base leading-relaxed font-semibold italic opacity-90">{step.details}</p>
              </div>

              {['threshold', 'conclusion'].includes(step.visualType) && (
                <AssumptionsCard 
                  nullHypothesis={`H₀: μ = ${state.popMean}`}
                  popStdDev={state.popStdDev}
                  sampleSize={state.sampleSize}
                  testType={state.testType}
                  alpha={state.alpha}
                />
              )}
            </div>

            <div className="mt-auto pt-8 flex items-center justify-between">
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
                className="flex items-center gap-4 px-12 py-5 rounded-[2rem] font-black bg-blue-600 text-white hover:bg-blue-700 shadow-2xl shadow-blue-200 disabled:bg-slate-200 disabled:text-slate-400 transition-all hover:scale-105 active:scale-95 group"
              >
                {state.currentStep === STORY_STEPS.length - 1 ? 'End' : 'Continue'}
                <i className="fas fa-chevron-right text-xs group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 h-full flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]">
            <VisualPanel 
              step={step}
              popMean={state.popMean}
              popStdDev={state.popStdDev}
              sampleSize={state.sampleSize}
              sampleMean={state.sampleMean}
              stdErr={stdErr}
              alpha={state.alpha}
              testType={state.testType}
              onSampleDrawn={handleNewSample}
            />
            
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
                        onChange={(e) => dispatch({ type: 'SET_ALPHA', payload: parseFloat(e.target.value) })} 
                        className="w-full h-2.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" 
                      />
                    </div>
                    <div className="w-full sm:w-auto flex flex-col gap-3">
                      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200">
                        <button onClick={() => dispatch({ type: 'SET_TEST_TYPE', payload: 'two-tailed' })} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${state.testType === 'two-tailed' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Two-Tailed</button>
                        <button onClick={() => dispatch({ type: 'SET_TEST_TYPE', payload: 'one-tailed' })} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${state.testType === 'one-tailed' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>One-Tailed</button>
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
