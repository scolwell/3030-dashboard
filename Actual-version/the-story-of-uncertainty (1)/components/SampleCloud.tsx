
import React, { useMemo, useState, useEffect, useRef } from 'react';

interface Props {
  onSampleDrawn?: (mean: number) => void;
  highlightSample: boolean;
  popMean: number;
  popStdDev: number;
  sampleSize: number;
}

const COLORS = [
  { name: 'Violet', bg: 'bg-violet-600', range: 'Innovators' },
  { name: 'Cyan', bg: 'bg-cyan-500', range: 'Early Adopters' },
  { name: 'Emerald', bg: 'bg-emerald-500', range: 'Early Majority' },
  { name: 'Amber', bg: 'bg-amber-500', range: 'Late Majority' },
  { name: 'Slate', bg: 'bg-slate-400', range: 'Laggards' },
];

const SampleCloud: React.FC<Props> = ({ onSampleDrawn, highlightSample, popMean, popStdDev, sampleSize }) => {
  const populationSize = 250;
  const timerRef = useRef<number | null>(null);

  const { population, truePopMean } = useMemo(() => {
    const dots = [];
    let totalSum = 0;
    const groupCount = 5;
    const dotsPerGroup = populationSize / groupCount;
    
    for (let i = 0; i < groupCount; i++) {
      // Distribute around popMean using Box-Muller transform
      const baseVal = popMean - 2 * popStdDev + i * (popStdDev); 
      for (let j = 0; j < dotsPerGroup; j++) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const val = baseVal + z * (popStdDev * 0.8); 
        
        dots.push({
          id: i * dotsPerGroup + j,
          val,
          colorIndex: i,
          x: Math.random() * 92 + 4,
          y: Math.random() * 92 + 4,
        });
        totalSum += val;
      }
    }
    return { population: dots, truePopMean: totalSum / populationSize };
  }, [popMean, popStdDev, populationSize]);

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSampling, setIsSampling] = useState(false);

  const drawSample = () => {
    if (isSampling) return;
    setIsSampling(true);
    setSelectedIndices([]);
    
    const pool = Array.from({ length: populationSize }, (_, i) => i);
    const newSelection: number[] = [];
    
    for (let i = 0; i < sampleSize; i++) {
      const randIdx = Math.floor(Math.random() * pool.length);
      newSelection.push(pool.splice(randIdx, 1)[0]);
    }

    let currentCount = 0;
    const interval = setInterval(() => {
      currentCount += 2; 
      if (currentCount >= sampleSize) {
        currentCount = sampleSize;
        clearInterval(interval);
        setSelectedIndices(newSelection);
        const sum = newSelection.reduce((acc, idx) => acc + population[idx].val, 0);
        const mean = sum / sampleSize;
        if (onSampleDrawn) onSampleDrawn(parseFloat(mean.toFixed(1)));
        setIsSampling(false);
      } else {
        setSelectedIndices(newSelection.slice(0, currentCount));
      }
    }, 25); 
    
    timerRef.current = interval as unknown as number;
  };

  const currentSampleMean = selectedIndices.length > 0 
    ? (selectedIndices.reduce((a, i) => a + population[i].val, 0) / selectedIndices.length)
    : 0;
  
  const samplingError = selectedIndices.length === sampleSize 
    ? currentSampleMean - truePopMean 
    : 0;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="w-full bg-white rounded-3xl p-8 flex flex-col items-center">
      <div className="text-center mb-6">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-1">The Global Market</h3>
        <p className="text-xs text-slate-400 font-medium italic">Average Enthusiasm (μ): {truePopMean.toFixed(1)}</p>
      </div>

      <div className="relative w-80 h-80 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 shadow-inner overflow-hidden mb-8">
        {population.map((dot) => {
          const isSelected = selectedIndices.includes(dot.id);
          const baseColor = COLORS[dot.colorIndex].bg;
          
          return (
            <div
              key={dot.id}
              className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-500 ease-in-out ${baseColor} ${
                isSelected
                  ? 'z-20 opacity-100 animate-pulse-scale scale-150'
                  : selectedIndices.length > 0 
                    ? 'opacity-15 grayscale-[0.5]' 
                    : 'opacity-40'
              }`}
              style={{ 
                left: `${dot.x}%`, 
                top: `${dot.y}%`,
              }}
            />
          );
        })}
        
        {isSampling && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between bg-white/95 backdrop-blur px-4 py-2 rounded-full border border-slate-100 shadow-sm z-30">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Scanning Users ({selectedIndices.length}/30)</span>
            </div>
          </div>
        )}

        {selectedIndices.length === 0 && !isSampling && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="bg-white/95 backdrop-blur px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl text-center">
                <i className="fas fa-users-viewfinder text-indigo-600 text-2xl mb-2"></i>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Study a Segment</p>
             </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <button
          onClick={drawSample}
          disabled={isSampling}
          className="group w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-slate-200"
        >
          <i className={`fas fa-bolt ${isSampling ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'}`}></i>
          {selectedIndices.length > 0 ? 'Resample Market' : 'Extract Sample (n=30)'}
        </button>
        
        <div className="grid grid-cols-1 gap-3 w-full">
           <div className="bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100 flex items-center justify-between">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Sample Score (x̄)</span>
             <span className="text-xl font-black text-indigo-600 leading-none">
               {selectedIndices.length > 0 ? currentSampleMean.toFixed(1) : '-'}
             </span>
           </div>
           
           <div className={`px-6 py-3 rounded-2xl border flex items-center justify-between transition-colors duration-500 ${
             selectedIndices.length === sampleSize 
               ? 'bg-slate-50 border-slate-200' 
               : 'bg-slate-50/50 border-slate-100 opacity-50'
           }`}>
             <div className="flex items-center justify-between w-full">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Deviation from H₀</span>
               <span className={`text-xl font-black leading-none ${Math.abs(samplingError) > 3 ? 'text-orange-500' : 'text-slate-900'}`}>
                 {selectedIndices.length === sampleSize 
                   ? (samplingError > 0 ? `+${samplingError.toFixed(1)}` : samplingError.toFixed(1)) 
                   : '-'}
               </span>
             </div>
           </div>
        </div>

        <div className="bg-slate-50/50 rounded-2xl p-4 w-full border border-slate-100">
           <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Adopter Categories</span>
              <span className="text-[9px] font-bold text-slate-300">Diffusion Model</span>
           </div>
           <div className="flex justify-between items-center gap-1">
             {COLORS.map((c, idx) => (
               <div key={idx} className="flex flex-col items-center flex-1">
                 <div className={`w-full h-1.5 rounded-full mb-1 ${c.bg} opacity-80`}></div>
                 <span className="text-[7px] font-bold text-slate-400 uppercase whitespace-nowrap">{c.range}</span>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SampleCloud;
