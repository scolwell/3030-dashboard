import React from 'react';
import { StoryStep } from '../types';

interface StepperProps {
  steps: StoryStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full">
      {/* Step counter */}
      <div className="text-center mb-4">
        <span className="text-sm font-bold text-slate-600">
          Step {currentStep + 1} of {steps.length}
        </span>
        <span className="text-xs text-slate-400 ml-2">
          Chapter {steps[currentStep].chapterNumber}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-2">
        {steps.map((s, idx) => (
          <button 
            key={s.id} 
            onClick={() => onStepClick(idx)}
            aria-label={`Go to step ${idx + 1}: ${s.title}`}
            aria-current={idx === currentStep ? 'step' : undefined}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
              idx <= currentStep ? 'bg-blue-600' : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title={s.title}
          />
        ))}
      </div>
    </div>
  );
};

export default Stepper;
