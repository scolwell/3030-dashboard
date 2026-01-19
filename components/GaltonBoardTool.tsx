
import React from 'react';

const GaltonBoardTool: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M10 9v6"/><path d="M14 9v6"/><path d="M10 12h4"/></svg>
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Galton Board Placeholder</h3>
      <p className="text-slate-500 max-w-sm">This demo has been removed as per request.</p>
    </div>
  );
};

export default GaltonBoardTool;
