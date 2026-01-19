
import React, { useState, useMemo } from 'react';
import { Settings2, Info, Calculator, Users } from 'lucide-react';
import { calculateRequiredN } from '../services/statsUtils';

const SampleSizeTool: React.FC = () => {
  const [alpha, setAlpha] = useState(0.05);
  const [power, setPower] = useState(0.80);
  const [effectSize, setEffectSize] = useState(0.50);

  const requiredN = useMemo(() => {
    return calculateRequiredN(alpha, power, effectSize);
  }, [alpha, power, effectSize]);

  const getEffectSizeLabel = (d: number) => {
    if (d < 0.2) return { label: 'Negligible', color: 'text-slate-400' };
    if (d < 0.5) return { label: 'Small', color: 'text-blue-500' };
    if (d < 0.8) return { label: 'Medium', color: 'text-indigo-600' };
    return { label: 'Large', color: 'text-emerald-600' };
  };

  const effectLabel = getEffectSizeLabel(effectSize);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-4 space-y-6">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <Settings2 size={20} />
            <h3 className="font-bold text-slate-800">Parameters</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alpha (α)</label>
                <span className="text-sm font-bold text-indigo-600">{alpha.toFixed(3)}</span>
              </div>
              <input 
                type="range" min="0.001" max="0.2" step="0.001" 
                value={alpha} 
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Power (1-β)</label>
                <span className="text-sm font-bold text-indigo-600">{(power * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0.5" max="0.99" step="0.01" 
                value={power} 
                onChange={(e) => setPower(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Effect Size (d)</label>
                <span className={`text-sm font-bold ${effectLabel.color}`}>{effectSize.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.1" max="1.5" step="0.05" 
                value={effectSize} 
                onChange={(e) => setEffectSize(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Small (0.2)</span>
                <span>Med (0.5)</span>
                <span>Large (0.8+)</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8">
            <Users size={40} />
          </div>
          
          <span className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mb-2">Required Total Sample Size</span>
          <div className="text-8xl font-black text-slate-900 mb-4 tabular-nums tracking-tight">
            {requiredN}
          </div>
          <p className="text-slate-500 text-sm max-w-sm text-center leading-relaxed">
            Based on a <span className="font-bold text-slate-800">{(power * 100).toFixed(0)}%</span> probability of detecting a 
            <span className={`font-bold ${effectLabel.color}`}> {effectLabel.label.toLowerCase()} effect</span> (d = {effectSize}) 
            at the α = {alpha} significance level.
          </p>
        </div>

        <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-white/10 rounded-xl text-indigo-300">
              <Info size={20} />
            </div>
            <div>
              <h4 className="font-bold mb-2">Why does this matter?</h4>
              <p className="text-sm text-indigo-200 leading-relaxed">
                Collecting too few participants (underpowered) means you likely won't find an effect even if it exists. 
                Collecting too many (overpowered) is a waste of resources. This calculator ensures your research design is efficient and ethically sound.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SampleSizeTool;
