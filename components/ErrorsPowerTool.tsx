
import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { Settings2, AlertTriangle, Target, CheckCircle2, Info } from 'lucide-react';
import { inverseNormalCDF, normalPDF, normalCDF } from '../services/statsUtils';

const ErrorsPowerTool: React.FC = () => {
  const [alpha, setAlpha] = useState(0.05);
  const [effectSize, setEffectSize] = useState(0.8);
  const [n, setN] = useState(30);

  const sd = useMemo(() => 1 / Math.sqrt(n), [n]);
  const criticalValue = useMemo(() => inverseNormalCDF(1 - alpha) * sd, [alpha, sd]);

  const chartData = useMemo(() => {
    const data = [];
    const points = 200;
    const start = -1;
    const end = effectSize + 2;
    const step = (end - start) / points;

    for (let i = 0; i <= points; i++) {
      const x = start + i * step;
      const h0 = normalPDF(x, 0, sd);
      const h1 = normalPDF(x, effectSize, sd);
      
      data.push({
        x,
        h0,
        h1,
        alphaRegion: x >= criticalValue ? h0 : 0,
        betaRegion: x < criticalValue ? h1 : 0,
        powerRegion: x >= criticalValue ? h1 : 0
      });
    }
    return data;
  }, [alpha, effectSize, sd, criticalValue]);

  const power = useMemo(() => 1 - normalCDF(criticalValue, effectSize, sd), [criticalValue, effectSize, sd]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-4 space-y-6">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <Settings2 size={20} />
            <h3 className="font-bold text-slate-800">Visual Controls</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alpha (Type I Error)</label>
                <span className="text-sm font-bold text-rose-600">{alpha.toFixed(3)}</span>
              </div>
              <input 
                type="range" min="0.001" max="0.2" step="0.001" 
                value={alpha} 
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full accent-rose-500 h-1.5"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Effect Size (Shift)</label>
                <span className="text-sm font-bold text-indigo-600">{effectSize.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0.1" max="2.0" step="0.05" 
                value={effectSize} 
                onChange={(e) => setEffectSize(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sample Size (N)</label>
                <span className="text-sm font-bold text-slate-800">{n}</span>
              </div>
              <input 
                type="range" min="10" max="200" step="1" 
                value={n} 
                onChange={(e) => setN(Number(e.target.value))}
                className="w-full accent-slate-800 h-1.5"
              />
            </div>
          </div>
        </section>

        <section className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200">
           <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Summary Statistics</h4>
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-xs text-slate-400">Type I Error</span>
                 </div>
                 <span className="text-xs font-bold text-rose-500">{(alpha * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs text-slate-400">Type II Error</span>
                 </div>
                 <span className="text-xs font-bold text-amber-500">{((1 - power) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-200">Statistical Power</span>
                 </div>
                 <span className="text-lg font-black text-emerald-500">{(power * 100).toFixed(1)}%</span>
              </div>
           </div>
        </section>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Null vs. Alternative</h3>
            <div className="flex gap-4">
               <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-slate-200 rounded-full" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">H₀</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1 bg-indigo-200 rounded-full" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase">H₁</span>
               </div>
            </div>
          </div>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="x" type="number" domain={['auto', 'auto']} hide />
                <YAxis hide />
                
                {/* Distributions */}
                <Area type="monotone" dataKey="h0" stroke="#cbd5e1" strokeWidth={2} fill="#f8fafc" animationDuration={0} />
                <Area type="monotone" dataKey="h1" stroke="#818cf8" strokeWidth={2} fill="#eef2ff" fillOpacity={0.3} animationDuration={0} />

                {/* Error Shading */}
                <Area type="monotone" dataKey="alphaRegion" stroke="none" fill="#f43f5e" fillOpacity={0.6} animationDuration={0} />
                <Area type="monotone" dataKey="betaRegion" stroke="none" fill="#f59e0b" fillOpacity={0.4} animationDuration={0} />
                <Area type="monotone" dataKey="powerRegion" stroke="none" fill="#10b981" fillOpacity={0.3} animationDuration={0} />

                <ReferenceLine x={criticalValue} stroke="#000" strokeWidth={1} label={{ position: 'top', value: 'Crit Value', fill: '#000', fontSize: 10, fontWeight: 'bold' }} />
                <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <ReferenceLine x={effectSize} stroke="#818cf8" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {[
             { title: 'Alpha (α)', val: alpha, color: 'border-rose-200 bg-rose-50 text-rose-700', icon: AlertTriangle, desc: 'Mistakenly rejecting a true H₀.' },
             { title: 'Beta (β)', val: 1-power, color: 'border-amber-200 bg-amber-50 text-amber-700', icon: Target, desc: 'Failing to find a real effect.' },
             { title: 'Power', val: power, color: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2, desc: 'Probability of a correct rejection.' }
           ].map((item, i) => (
             <div key={i} className={`p-5 rounded-2xl border ${item.color} space-y-2`}>
                <div className="flex items-center justify-between">
                   <item.icon size={18} />
                   <span className="font-black">{(item.val * 100).toFixed(1)}%</span>
                </div>
                <h5 className="text-xs font-bold uppercase tracking-wider">{item.title}</h5>
                <p className="text-[10px] opacity-80 leading-tight">{item.desc}</p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default ErrorsPowerTool;
