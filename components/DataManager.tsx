
import React, { useRef } from 'react';
import { Unit } from '../types';

interface DataManagerProps {
  onDataLoaded: (data: Partial<Unit>[]) => void;
  onReset: () => void;
}

const DataManager: React.FC<DataManagerProps> = ({ onDataLoaded, onReset }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const data: Partial<Unit>[] = [];
      
      // Basic CSV parsing
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        data.push({
          value: parseFloat(parts[0]) || 0,
          label: parts[1] || `Item ${i}`,
          stratum: parseInt(parts[2]) || 0
        });
      }
      onDataLoaded(data);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Data Lab</h3>
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import CSV Data
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept=".csv"
        />
        
        <p className="text-[10px] text-slate-400 italic">
          CSV Format: Value, Label, Stratum(0-3)
        </p>

        <button 
          onClick={onReset}
          className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold underline"
        >
          Reset to Simulated Data
        </button>
      </div>
    </div>
  );
};

export default DataManager;
