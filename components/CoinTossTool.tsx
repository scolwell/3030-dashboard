import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

interface TossPoint {
  toss: number;
  prop: number;
}

const formatPct = (x: number) => `${(x * 100).toFixed(1)}%`;

const CoinTossTool: React.FC = () => {
  const [p, setP] = useState<number>(0.5);
  const [batchSize, setBatchSize] = useState<number>(10);
  const [tosses, setTosses] = useState<TossPoint[]>([]);
  const [totalHeads, setTotalHeads] = useState<number>(0);

  const totalTosses = tosses.length;
  const currentProp = totalTosses > 0 ? totalHeads / totalTosses : 0;
  const chartData = [
    { toss: 1, prop: 0 },
    { toss: 20, prop: 100 }
  ];

  const doSingleToss = () => {
    const isHead = Math.random() < p;
    const newHeads = totalHeads + (isHead ? 1 : 0);
    const newTotal = totalTosses + 1;
    setTotalHeads(newHeads);
    setTosses((prev) => [...prev, { toss: newTotal, prop: newHeads / newTotal }]);
  };

  const doBatchTosses = () => {
    let heads = totalHeads;
    const newPoints: TossPoint[] = [];
    for (let i = 0; i < batchSize; i++) {
      const isHead = Math.random() < p;
      if (isHead) heads++;
      const tossNum = totalTosses + i + 1;
      newPoints.push({ toss: tossNum, prop: heads / tossNum });
    }
    setTotalHeads(heads);
    setTosses((prev) => [...prev, ...newPoints]);
  };

  const reset = () => {
    setTosses([]);
    setTotalHeads(0);
  };

  return (
    <div className="w-full h-full grid grid-rows-[auto_1fr] gap-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Probability of Heads (p)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={p}
            onChange={(e) => setP(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-slate-700 mt-1">p = {p.toFixed(2)}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Batch Size</label>
          <input
            type="range"
            min={1}
            max={100}
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <div className="text-sm text-slate-700 mt-1">{batchSize} tosses</div>
        </div>

        <div className="flex items-end gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium"
            onClick={doSingleToss}
          >Single Toss</button>
          <button
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-medium"
            onClick={doBatchTosses}
          >Run {batchSize}</button>
        </div>

        <div className="flex items-end">
          <button
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm"
            onClick={reset}
          >Reset</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 h-[calc(100%-8rem)]">
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-slate-500">Law of Large Numbers</div>
              <div className="text-lg font-semibold text-slate-800">Running Proportion of Heads</div>
            </div>
            <div className="text-sm text-slate-500">Target p: <span className="font-medium text-slate-700">{p.toFixed(2)}</span></div>
          </div>

          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 20, right: 30, left: 60, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="toss" 
                  type="number"
                  domain={[1, 20]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]}
                />
                <YAxis 
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Summary</div>
          <div className="text-lg font-semibold text-slate-800 mb-4">Current State</div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total Tosses</span>
              <span className="font-semibold text-slate-800">{totalTosses}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total Heads</span>
              <span className="font-semibold text-slate-800">{totalHeads}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Current Proportion</span>
              <span className="font-semibold text-slate-800">{totalTosses > 0 ? currentProp.toFixed(3) : '-'}</span>
            </div>
            <div className="h-px bg-slate-200 my-2"></div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Target p</span>
              <span className="font-semibold text-slate-800">{p.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Difference</span>
              <span className="font-semibold text-slate-800">{totalTosses > 0 ? (currentProp - p).toFixed(3) : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinTossTool;
