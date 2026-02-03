
import React from 'react';
import { Unit } from '../types';

interface DataTableProps {
  data: Unit[];
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Population Explorer (N=400)</h3>
        <span className="text-xs text-slate-400">{data.length} Individuals Available</span>
      </div>
      <div className="overflow-y-auto flex-1 h-[400px]">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">ID</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Label</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Value</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Stratum</th>
              <th className="px-6 py-3 font-semibold text-slate-600 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.slice(0, 100).map((unit) => (
              <tr 
                key={unit.id} 
                className={`${unit.isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'} transition-colors`}
              >
                <td className="px-6 py-2.5 font-mono text-xs text-slate-400">{unit.id}</td>
                <td className="px-6 py-2.5 font-medium text-slate-900">{unit.label}</td>
                <td className="px-6 py-2.5 text-slate-600 font-mono">{unit.value}</td>
                <td className="px-6 py-2.5">
                   <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                     ['bg-rose-400', 'bg-emerald-400', 'bg-amber-400', 'bg-sky-400'][unit.stratum]
                   }`} />
                   Group {unit.stratum + 1}
                </td>
                <td className="px-6 py-2.5 text-right">
                  {unit.isSelected ? (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase">Selected</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full uppercase">In Pop</span>
                  )}
                </td>
              </tr>
            ))}
            {data.length > 100 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-slate-400 text-xs bg-slate-50 italic">
                  Showing first 100 records only...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
