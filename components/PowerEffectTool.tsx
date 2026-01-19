
import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, AreaChart, Area 
} from 'recharts';
import { Settings2, Target, Info, Zap } from 'lucide-react';
import { inverseNormalCDF, normalCDF } from '../services/statsUtils';

const PowerEffectTool: React.FC = () => {
  const [alpha, setAlpha] = useState(0.05);
  const [effectSize, setEffectSize] = useState(0.5);

  const curveData = useMemo(() => {
    const data = [];
    const zAlpha = inverseNormalCDF(1 - alpha / 2);
    
    for (let n = 4; n <= 100; n += 2) {
      // Power calculation for independent t-test:
      // Power = Phi( (d * sqrt(n/2)) - z_alpha )
      const power = normalCDF((effectSize * Math.sqrt(n / 2)) - zAlpha);
      data.push({ n, power: Number(power.toFixed(3)) });
    }
    return data;
  }, [alpha, effectSize]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-4 space-y-6">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <Settings2 size={20} />
            <h3 className="font-bold text-slate-800">Simulation Config</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Significance (α)</label>
                <span className="text-sm font-bold text-slate-800">{alpha}</span>
              </div>
              <input 
                type="range" min="0.01" max="0.10" step="0.01" 
                value={alpha} 
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Effect Size (d)</label>
                <span className="text-sm font-bold text-indigo-600">{effectSize}</span>
              </div>
              <input 
                type="range" min="0.1" max="1.5" step="0.1" 
                value={effectSize} 
                onChange={(e) => setEffectSize(Number(e.target.value))}
                className="w-full accent-indigo-600 h-1.5"
              />
            </div>
          </div>
        </section>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Live Insight</h4>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
            <Zap size={18} className="text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
              Increasing the effect size (e.g., a stronger treatment) makes the curve steeper, meaning you reach high power with fewer participants.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">The Power Curve</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100">
               <span className="text-[10px] font-bold text-indigo-600 uppercase">Power vs. Sample Size</span>
            </div>
          </div>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData}>
                <defs>
                  <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="n" 
                  label={{ value: 'Sample Size (N)', position: 'bottom', offset: -5, fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} 
                  stroke="#cbd5e1"
                  fontSize={12}
                />
                <YAxis 
                  domain={[0, 1]} 
                  tickFormatter={(v) => `${v * 100}%`} 
                  stroke="#cbd5e1"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Power']}
                  labelFormatter={(n) => `Sample Size: ${n}`}
                />
                <ReferenceLine y={0.8} stroke="#cbd5e1" strokeDasharray="3 3" label={{ position: 'right', value: 'Goal: 80%', fill: '#94a3b8', fontSize: 10 }} />
                <Area 
                  type="monotone" 
                  dataKey="power" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fill="url(#powerGradient)"
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerEffectTool;
