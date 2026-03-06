import React, { useMemo, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   Interfaces
   ═══════════════════════════════════════════════════════════════════════════ */

interface ExampleConfig {
  id: string;
  label: string;
  description: string;
  hypothesis: string;
  dvLabel: string;
  groupLabel: string;
  group1Name: string;
  group2Name: string;
  mean1: number;
  mean2: number;
  timeLabel?: string;
  time1Name?: string;
  time2Name?: string;
}

interface TTestResult {
  meanDiff: number;
  pooledSE: number;
  t: number;
  df: number;
  p: number;
  cohensD: number;
  ci95Lower: number;
  ci95Upper: number;
  mean1: number;
  mean2: number;
  se1: number;
  se2: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Statistical helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const lnGamma = (z: number): number => {
  const coeff = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = coeff[0];
  for (let i = 1; i < 9; i++) {
    x += coeff[i] / (z + i);
  }
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
};

const betaCF = (x: number, a: number, b: number): number => {
  const maxIter = 200;
  const eps = 3e-12;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let cc = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    cc = 1 + aa / cc;
    if (Math.abs(cc) < 1e-30) cc = 1e-30;
    d = 1 / d;
    h *= d * cc;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    cc = 1 + aa / cc;
    if (Math.abs(cc) < 1e-30) cc = 1e-30;
    d = 1 / d;
    const del = d * cc;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
};

const betaIncomplete = (x: number, a: number, b: number): number => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return bt * betaCF(x, a, b) / a;
  return 1 - bt * betaCF(1 - x, b, a) / b;
};

const tCDF = (tVal: number, df: number): number => {
  const x = df / (df + tVal * tVal);
  return 1 - 0.5 * betaIncomplete(x, df / 2, 0.5);
};

const formatP = (p: number): string => {
  if (p < 0.001) return '< .001';
  return p.toFixed(3).replace(/^0/, '');
};

const computePairedTTest = (
  m1: number,
  m2: number,
): TTestResult => {
  const n = 20;
  const sigma2 = 100;
  // Paired: SE of the difference scores
  const seDiff = Math.sqrt(sigma2 / n);
  const diff = m2 - m1;
  const t = diff / seDiff;
  const df = n - 1;
  const p = 2 * (1 - tCDF(Math.abs(t), df));
  const cohensD = diff / Math.sqrt(sigma2);
  const tCrit = 2.093; // approx t(.025, 19)
  return {
    meanDiff: diff,
    pooledSE: seDiff,
    t,
    df,
    p,
    cohensD,
    ci95Lower: diff - tCrit * seDiff,
    ci95Upper: diff + tCrit * seDiff,
    mean1: m1,
    mean2: m2,
    se1: Math.sqrt(sigma2 / n),
    se2: Math.sqrt(sigma2 / n),
  };
};

/* ═══════════════════════════════════════════════════════════════════════════
   Example Datasets (5 paired-sample examples)
   ═══════════════════════════════════════════════════════════════════════════ */

const EXAMPLE_DATASETS: ExampleConfig[] = [
  {
    id: 'paired-1-mindfulness',
    label: '1) Mindfulness training (pre/post)',
    description:
      'Twenty employees complete a stress questionnaire before and after an 8-week mindfulness program. The same individuals are measured at both time points.',
    hypothesis: 'Does mindfulness training reduce self-reported stress?',
    dvLabel: 'Stress score (lower = better)',
    groupLabel: 'Condition',
    group1Name: 'Pre-training',
    group2Name: 'Post-training',
    timeLabel: 'Time',
    time1Name: 'Pre',
    time2Name: 'Post',
    mean1: 74,
    mean2: 60,
  },
  {
    id: 'paired-2-sales-training',
    label: '2) Sales training workshop',
    description:
      'Twenty sales representatives have their monthly close rate measured, attend a two-day consultative selling workshop, then are measured again over the following month.',
    hypothesis: 'Does consultative selling training increase close rates?',
    dvLabel: 'Close rate (%)',
    groupLabel: 'Condition',
    group1Name: 'Before training',
    group2Name: 'After training',
    timeLabel: 'Time',
    time1Name: 'Before',
    time2Name: 'After',
    mean1: 58,
    mean2: 71,
  },
  {
    id: 'paired-3-posture',
    label: '3) Ergonomic chair and back pain',
    description:
      'Twenty office workers report their back pain level, receive an ergonomic chair, then report pain again after 6 weeks. Same individuals at both time points.',
    hypothesis: 'Does an ergonomic chair reduce self-reported back pain?',
    dvLabel: 'Pain rating (0-100)',
    groupLabel: 'Condition',
    group1Name: 'Before chair',
    group2Name: 'After chair',
    timeLabel: 'Time',
    time1Name: 'Before',
    time2Name: 'After',
    mean1: 68,
    mean2: 52,
  },
  {
    id: 'paired-4-website-ux',
    label: '4) Website UX redesign',
    description:
      'Twenty regular customers complete a checkout task on the current website, then the site is redesigned and the same customers complete the same task on the new version.',
    hypothesis: 'Does the UX redesign reduce checkout completion time?',
    dvLabel: 'Task time (seconds, lower = better)',
    groupLabel: 'Version',
    group1Name: 'Old design',
    group2Name: 'New design',
    timeLabel: 'Version',
    time1Name: 'Old',
    time2Name: 'New',
    mean1: 82,
    mean2: 61,
  },
  {
    id: 'paired-5-onboarding',
    label: '5) Employee onboarding program',
    description:
      'Twenty new hires have their weekly output measured during their first month, then complete a structured onboarding program and are measured again in their third month.',
    hypothesis: 'Does the onboarding program improve employee productivity?',
    dvLabel: 'Weekly output score',
    groupLabel: 'Phase',
    group1Name: 'Before onboarding',
    group2Name: 'After onboarding',
    timeLabel: 'Phase',
    time1Name: 'Before',
    time2Name: 'After',
    mean1: 64,
    mean2: 67,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Cohen's d benchmark helper
   ═══════════════════════════════════════════════════════════════════════════ */

const dBenchmark = (d: number): { label: string; color: string } => {
  const abs = Math.abs(d);
  if (abs >= 0.8) return { label: 'Large', color: '#16a34a' };
  if (abs >= 0.5) return { label: 'Medium', color: '#d97706' };
  if (abs >= 0.2) return { label: 'Small', color: '#64748b' };
  return { label: 'Trivial', color: '#cbd5e1' };
};

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

const SingleGroupTool: React.FC = () => {
  const [mean1, setMean1] = useState<number>(74);
  const [mean2, setMean2] = useState<number>(60);
  const [groupLabel, setGroupLabel] = useState('Time');
  const [group1Name, setGroup1Name] = useState('Pre-test');
  const [group2Name, setGroup2Name] = useState('Post-test');
  const [dvLabel, setDvLabel] = useState('Outcome');
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);
  const [highlightSource, setHighlightSource] = useState<string | null>(null);

  const activeExample = useMemo(
    () => EXAMPLE_DATASETS.find((e) => e.id === activeExampleId) ?? null,
    [activeExampleId]
  );

  const applyExample = (ex: ExampleConfig) => {
    setMean1(ex.mean1);
    setMean2(ex.mean2);
    setGroupLabel(ex.groupLabel);
    setGroup1Name(ex.group1Name);
    setGroup2Name(ex.group2Name);
    setDvLabel(ex.dvLabel);
    setActiveExampleId(ex.id);
  };

  // Compute paired t-test
  const tResult = useMemo(
    () => computePairedTTest(mean1, mean2),
    [mean1, mean2]
  );

  const nPerGroup = 20;
  const sigma2 = 100;
  const isSig = tResult ? tResult.p < 0.05 : false;

  // ── Format helpers ──────────────────────────────────────────────────────
  const fmt = (v: number | undefined): string => {
    if (v === undefined || !Number.isFinite(v as number)) return '—';
    const val = v as number;
    if (val === 0) return '0.00';
    if (Math.abs(val) >= 100000) return Math.round(val).toLocaleString();
    if (Math.abs(val) >= 10) return val.toFixed(1);
    if (Math.abs(val) >= 1) return val.toFixed(2);
    if (Math.abs(val) >= 0.001) return val.toFixed(3);
    return '<\u00a0.001';
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Group Means Panel (paired: Pre/Post columns on single row)
     ───────────────────────────────────────────────────────────────────────── */

  const renderGroupMeansPanel = () => {
    const diff = mean2 - mean1;
    const seriesColors = ['#2563eb', '#15803d'];

    return (
      <div>
        <table className="w-full text-xs border-collapse border border-slate-300 overflow-hidden">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border border-slate-300">{groupLabel}</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider border border-slate-300" style={{ color: seriesColors[0] }}>{group1Name}</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider border border-slate-300" style={{ color: seriesColors[1] }}>{group2Name}</th>
              <th className="px-3 py-2 text-center text-[10px] font-bold text-indigo-700 uppercase tracking-wider border border-slate-300 bg-indigo-50">Diff</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-300">
              <td className="px-3 py-3 text-xs font-semibold text-slate-700 border border-slate-300">Same participants</td>
              <td className="px-3 py-3 text-center border border-slate-300">
                <div className="flex items-center justify-center gap-1">
                  <button className="w-5 h-5 rounded bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200" onClick={() => setMean1(mean1 - 1)}>−</button>
                  <span className="text-lg font-black tabular-nums leading-tight min-w-[2.5rem] text-center" style={{ color: seriesColors[0] }}>
                    {mean1}
                  </span>
                  <button className="w-5 h-5 rounded bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200" onClick={() => setMean1(mean1 + 1)}>+</button>
                </div>
              </td>
              <td className="px-3 py-3 text-center border border-slate-300">
                <div className="flex items-center justify-center gap-1">
                  <button className="w-5 h-5 rounded bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200" onClick={() => setMean2(mean2 - 1)}>−</button>
                  <span className="text-lg font-black tabular-nums leading-tight min-w-[2.5rem] text-center" style={{ color: seriesColors[1] }}>
                    {mean2}
                  </span>
                  <button className="w-5 h-5 rounded bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200" onClick={() => setMean2(mean2 + 1)}>+</button>
                </div>
              </td>
              <td className="px-3 py-3 text-center text-sm font-black text-indigo-700 bg-indigo-50 border-l-2 border-indigo-300 tabular-nums">
                {diff > 0 ? '+' : ''}{diff}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: T-test Results Card
     ───────────────────────────────────────────────────────────────────────── */

  const renderTTestCard = () => {
    const r = tResult;

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Paired Samples T-Test
            </h3>
            <p className="text-[11px] text-slate-600">
              Paired T-Test {'–'} DV: {dvLabel}
            </p>
          </div>
          <span className="text-[11px] text-slate-400">
            n = {nPerGroup} {'·'} {'σ²'} = {sigma2}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-800">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statistic</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr
                className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'mean-diff' ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('mean-diff')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">Mean Difference ({group2Name} {'−'} {group1Name})</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-slate-800 tabular-nums">
                  {r ? fmt(r.meanDiff) : '—'}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">SE of Difference</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{r ? fmt(r.pooledSE) : '—'}</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">
                  <span className="italic">t</span>
                </td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{r ? fmt(r.t) : '—'}</td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">df</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{r ? r.df : '—'}</td>
              </tr>
              <tr
                className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'p-value' ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('p-value')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">
                  <span className="italic">p</span> (two-tailed)
                </td>
                <td className="px-4 py-2 text-right text-sm font-bold tabular-nums" style={{ color: isSig ? '#16a34a' : '#64748b' }}>
                  {r ? formatP(r.p) : '—'}
                </td>
              </tr>
              <tr
                className={`border-l-4 border-l-indigo-500 cursor-pointer transition-colors duration-150 ${highlightSource === 'effect-size' ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100/60'}`}
                onMouseEnter={() => setHighlightSource('effect-size')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-bold text-indigo-900">Cohen's <span className="italic">d</span></td>
                <td className="px-4 py-2 text-right text-sm font-bold text-indigo-900 tabular-nums">
                  {r ? (
                    <span className="inline-flex items-center gap-1">
                      {r.cohensD.toFixed(2)}
                      <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: dBenchmark(r.cohensD).color }}>
                        {dBenchmark(r.cohensD).label}
                      </span>
                    </span>
                  ) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Descriptives Card
     ───────────────────────────────────────────────────────────────────────── */

  const renderDescriptivesCard = () => {
    const r = tResult;
    const sd = Math.sqrt(sigma2);

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Descriptives</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-800">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{groupLabel}</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">N</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Mean</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">SD</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">SE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr
                className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'group-1' ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('group-1')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: '#2563eb' }} />
                  {group1Name}
                </td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{nPerGroup}</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-slate-800 tabular-nums">{mean1.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{sd.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{r ? r.se1.toFixed(2) : '—'}</td>
              </tr>
              <tr
                className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'group-2' ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('group-2')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: '#15803d' }} />
                  {group2Name}
                </td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{nPerGroup}</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-slate-800 tabular-nums">{mean2.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{sd.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{r ? r.se2.toFixed(2) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: 95% CI Card for the Difference
     ───────────────────────────────────────────────────────────────────────── */

  const renderCICard = () => {
    const r = tResult;
    if (!r) return null;

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            95% Confidence Interval for Mean Difference
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-800">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Comparison</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Mean Diff</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">SE</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Lower</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Upper</th>
              </tr>
            </thead>
            <tbody>
              <tr
                className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'mean-diff' ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('mean-diff')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">{group2Name} {'−'} {group1Name}</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-slate-800 tabular-nums">{r.meanDiff.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{r.pooledSE.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{r.ci95Lower.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600 tabular-nums">{r.ci95Upper.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Paired Comparison Plot
     ───────────────────────────────────────────────────────────────────────── */

  const renderPairedPlot = () => {
    const r = tResult;
    if (!r) return null;

    const w = 400, h = 220;
    const ml = 56, mr = 24, mt = 20, mb = 44;
    const pw = w - ml - mr;
    const ph = h - mt - mb;

    const vals = [mean1, mean2];
    const labels = [group1Name, group2Name];
    const se = Math.sqrt(sigma2 / nPerGroup);

    // Y-axis: range from 0 to max + padding
    let yMax = Math.max(...vals) + se + 2;
    const rawPad = yMax * 0.12;
    yMax += rawPad;

    const niceStep = (range: number): number => {
      const rough = range / 5;
      const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
      const frac = rough / pow10;
      if (frac <= 1.5) return pow10;
      if (frac <= 3.5) return 2 * pow10;
      if (frac <= 7.5) return 5 * pow10;
      return 10 * pow10;
    };
    const step = niceStep(yMax);
    const yTicks: number[] = [];
    for (let v = 0; v <= yMax; v += step) yTicks.push(v);
    if (yTicks[yTicks.length - 1] < yMax) yTicks.push(yTicks[yTicks.length - 1] + step);
    const tickMax = yTicks[yTicks.length - 1];

    const scaleY = (v: number) => mt + (1 - v / tickMax) * ph;

    const x1 = ml + pw * 0.25;
    const x2 = ml + pw * 0.75;
    const colors = ['#2563eb', '#15803d'];

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Paired Comparison Plot</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
            Connected means showing within-subject change
          </p>
        </div>
        <div className="flex justify-center px-4 py-3">
          <svg width={w} height={h}>
            {/* Grid */}
            {yTicks.map((v, i) => (
              <g key={i}>
                <line x1={ml} x2={w - mr} y1={scaleY(v)} y2={scaleY(v)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={v === 0 ? 'none' : '3,3'} />
                <text x={ml - 8} y={scaleY(v) + 3} textAnchor="end" className="text-[10px] fill-slate-400">{v}</text>
              </g>
            ))}

            {/* Axes */}
            <line x1={ml} x2={ml} y1={mt} y2={h - mb} stroke="#94a3b8" strokeWidth={1} />
            <line x1={ml} x2={w - mr} y1={h - mb} y2={h - mb} stroke="#94a3b8" strokeWidth={1} />

            {/* Y-axis label */}
            <text x={14} y={mt + ph / 2} textAnchor="middle" className="text-[10px] font-semibold fill-slate-500" transform={`rotate(-90, 14, ${mt + ph / 2})`}>
              {dvLabel}
            </text>

            {/* Connecting line */}
            <line
              x1={x1} y1={scaleY(mean1)}
              x2={x2} y2={scaleY(mean2)}
              stroke="#6366f1" strokeWidth={2} strokeDasharray="6,4"
              style={{ transition: 'y1 300ms ease, y2 300ms ease' }}
            />

            {/* Points + SE whiskers */}
            {vals.map((v, i) => {
              const cx = i === 0 ? x1 : x2;
              return (
                <g key={i}>
                  {/* SE whisker */}
                  <line x1={cx} x2={cx} y1={scaleY(v + se)} y2={scaleY(v - se)} stroke="#334155" strokeWidth={1.5} />
                  <line x1={cx - 6} x2={cx + 6} y1={scaleY(v + se)} y2={scaleY(v + se)} stroke="#334155" strokeWidth={1.5} />
                  <line x1={cx - 6} x2={cx + 6} y1={scaleY(v - se)} y2={scaleY(v - se)} stroke="#334155" strokeWidth={1.5} />
                  {/* Circle */}
                  <circle
                    cx={cx} cy={scaleY(v)} r={6}
                    fill={colors[i]} stroke="white" strokeWidth={2}
                    style={{ transition: 'cy 300ms ease' }}
                  />
                  {/* Mean label */}
                  <text x={cx} y={scaleY(v + se) - 8} textAnchor="middle" className="text-[10px] font-bold fill-slate-700">
                    {v.toFixed(1)}
                  </text>
                  {/* X label */}
                  <text x={cx} y={h - mb + 16} textAnchor="middle" className="text-[10px] font-semibold fill-slate-600">
                    {labels[i]}
                  </text>
                </g>
              );
            })}

            {/* Delta label */}
            <text
              x={(x1 + x2) / 2}
              y={(scaleY(mean1) + scaleY(mean2)) / 2 - 10}
              textAnchor="middle"
              className="text-[10px] font-bold fill-indigo-600"
            >
              {'Δ'} = {(mean2 - mean1).toFixed(1)}
            </text>

            {/* X-axis label */}
            <text x={ml + pw / 2} y={h - 4} textAnchor="middle" className="text-[10px] font-semibold fill-slate-500 uppercase tracking-wider">
              {activeExample?.timeLabel || groupLabel}
            </text>
          </svg>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Dot + 95% CI Chart
     ───────────────────────────────────────────────────────────────────────── */

  const renderBarChart = () => {
    const r = tResult;
    if (!r) return null;

    const w = 400, h = 260;
    const ml = 56, mr = 24, mt = 20, mb = 44;
    const pw = w - ml - mr;
    const ph = h - mt - mb;

    const se = Math.sqrt(sigma2 / nPerGroup);
    const tCrit = 1.96;
    const vals = [mean1, mean2];
    const labels = [group1Name, group2Name];
    const dotColors = ['#2563eb', '#15803d'];

    // Y-axis range based on CI bounds
    const ciMax = Math.max(...vals.map(v => v + tCrit * se));
    const ciMin = Math.min(...vals.map(v => v - tCrit * se));
    const range = (ciMax - ciMin) || 1;
    const pad = range * 0.25;
    const dMin = ciMin - pad, dMax = ciMax + pad;
    const scaleY = (v: number) => mt + (1 - (v - dMin) / (dMax - dMin)) * ph;

    // Nice tick step
    const niceStep = (rng: number): number => {
      const rough = rng / 5;
      const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
      const frac = rough / pow10;
      if (frac <= 1.5) return pow10;
      if (frac <= 3.5) return 2 * pow10;
      if (frac <= 7.5) return 5 * pow10;
      return 10 * pow10;
    };
    const step = niceStep(dMax - dMin);
    const yTicks: number[] = [];
    for (let t = Math.ceil(dMin / step) * step; t <= dMax; t += step) yTicks.push(t);

    // Point opacity/glow helpers
    const getDotOpacity = (idx: number) => {
      if (!highlightSource) return 1;
      if (highlightSource === `group-${idx + 1}`) return 1;
      if (highlightSource === 'mean-diff' || highlightSource === 'effect-size') return 1;
      if (highlightSource === 'p-value') return 1;
      if (highlightSource.startsWith('group-')) return 0.25;
      return 1;
    };

    const getDotGlow = (idx: number) => {
      if (!highlightSource) return false;
      if (highlightSource === `group-${idx + 1}`) return true;
      return false;
    };

    return (
      <svg width={w} height={h} className="mx-auto">
        <defs>
          <filter id="dot-glow-sg" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={ml} x2={w - mr} y1={scaleY(v)} y2={scaleY(v)} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={ml - 8} y={scaleY(v) + 3} textAnchor="end" className="text-[10px] fill-slate-400">{Math.round(v * 10) / 10}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={ml} x2={ml} y1={mt} y2={h - mb} stroke="#94a3b8" strokeWidth={1} />
        <line x1={ml} x2={w - mr} y1={h - mb} y2={h - mb} stroke="#94a3b8" strokeWidth={1} />

        {/* Y-axis label */}
        <text
          x={14}
          y={mt + ph / 2}
          textAnchor="middle"
          className="text-[10px] font-semibold fill-slate-500"
          transform={`rotate(-90, 14, ${mt + ph / 2})`}
        >
          {dvLabel}
        </text>

        {/* Dots + CI */}
        {vals.map((v, i) => {
          const x = ml + pw * (i + 0.5) / vals.length;
          const color = dotColors[i];
          const upper = v + tCrit * se;
          const lower = v - tCrit * se;
          const opacity = getDotOpacity(i);
          const glow = getDotGlow(i);

          return (
            <g key={i} style={{ transition: 'opacity 200ms ease' }} opacity={opacity}>
              {/* Glow halo */}
              {glow && (
                <circle cx={x} cy={scaleY(v)} r={14} fill={color} opacity={0.2} filter="url(#dot-glow-sg)">
                  <animate attributeName="r" values="12;16;12" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              {/* CI whisker */}
              <line x1={x} y1={scaleY(upper)} x2={x} y2={scaleY(lower)} stroke={color} strokeWidth={2} opacity={0.5} style={{ transition: 'y1 300ms ease, y2 300ms ease' }} />
              <line x1={x - 6} y1={scaleY(upper)} x2={x + 6} y2={scaleY(upper)} stroke={color} strokeWidth={2} opacity={0.5} />
              <line x1={x - 6} y1={scaleY(lower)} x2={x + 6} y2={scaleY(lower)} stroke={color} strokeWidth={2} opacity={0.5} />
              {/* Dot */}
              <circle cx={x} cy={scaleY(v)} r={6} fill={color} stroke="white" strokeWidth={1.5} style={{ transition: 'cy 300ms ease' }} />
              {/* Mean label */}
              <text x={x} y={scaleY(upper) - 7} textAnchor="middle" className="text-[10px] font-bold" fill={color} style={{ transition: 'y 300ms ease' }}>
                {v.toFixed(1)}
              </text>
              {/* X-axis level label */}
              <text x={x} y={mt + ph + 16} textAnchor="middle" className="text-[10px] font-semibold fill-slate-600">
                {labels[i]}
              </text>
            </g>
          );
        })}

        {/* Mean difference bracket (when hovering mean-diff or effect-size) */}
        {(highlightSource === 'mean-diff' || highlightSource === 'effect-size') && tResult && (() => {
          const x1Pos = ml + pw * 0.5 / vals.length;
          const x2Pos = ml + pw * 1.5 / vals.length;
          const midX = (x1Pos + x2Pos) / 2;
          return (
            <g>
              <line x1={x1Pos + 10} x2={x2Pos - 10} y1={scaleY(mean1)} y2={scaleY(mean1)} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4,3" />
              <line x1={x1Pos + 10} x2={x2Pos - 10} y1={scaleY(mean2)} y2={scaleY(mean2)} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4,3" />
              <line x1={midX} x2={midX} y1={scaleY(mean1)} y2={scaleY(mean2)} stroke="#6366f1" strokeWidth={2} />
              <text x={midX + 12} y={(scaleY(mean1) + scaleY(mean2)) / 2 + 4} className="text-[10px] font-bold fill-indigo-600">
                {'Δ'} = {tResult.meanDiff.toFixed(1)}
              </text>
            </g>
          );
        })()}

        {/* X-axis label */}
        <text x={ml + pw / 2} y={h - 4} textAnchor="middle" className="text-[10px] font-semibold fill-slate-500 uppercase tracking-wider">
          {groupLabel}
        </text>
      </svg>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Effect Interpretation Card
     ───────────────────────────────────────────────────────────────────────── */

  const renderInterpretationCard = () => {
    const r = tResult;
    if (!r) return null;

    const diff = r.meanDiff;
    const absDiff = Math.abs(diff);
    const bench = dBenchmark(r.cohensD);

    let directionDesc: string;
    if (Math.abs(diff) < 0.5) {
      directionDesc = `The two time points have virtually identical means.`;
    } else if (diff > 0) {
      directionDesc = `${group2Name} scored higher than ${group1Name} by ${absDiff.toFixed(1)} points.`;
    } else {
      directionDesc = `${group1Name} scored higher than ${group2Name} by ${absDiff.toFixed(1)} points.`;
    }

    let sigDesc: string;
    if (isSig) {
      sigDesc = `This difference is statistically significant (p = ${formatP(r.p)}), meaning it is unlikely to have occurred by chance alone.`;
    } else {
      sigDesc = `This difference is not statistically significant (p = ${formatP(r.p)}). We cannot rule out that this difference is due to sampling variability.`;
    }

    const effectDesc = `Cohen's d = ${r.cohensD.toFixed(2)}, which is considered a ${bench.label.toLowerCase()} effect.`;

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <span className="text-lg">{isSig ? '✅' : '⚠️'}</span>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Interpretation</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-black" style={{ color: isSig ? '#16a34a' : '#64748b' }}>
                {isSig ? 'Significant' : 'Not Significant'}
              </span>
              {isSig && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 uppercase tracking-wide">p {'<'} .05</span>}
              {!isSig && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase tracking-wide">p {'≥'} .05</span>}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm text-slate-700 leading-relaxed">{directionDesc}</p>
          <p className="text-sm text-slate-700 leading-relaxed">{sigDesc}</p>
          <p className="text-sm text-slate-700 leading-relaxed">{effectDesc}</p>
          <p className="text-xs text-slate-500 mt-2 italic">
            Adjust the means on the left to explore how the difference, significance, and effect size change together.
          </p>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     Main return
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 lg:flex-row h-full">
      {/* ── Left column (55%) ──────────────────────────────────────────────── */}
      <aside className="flex-1 lg:basis-[55%] lg:max-w-[55%] overflow-y-auto min-h-0" style={{ direction: 'rtl' }}>
        <div style={{ direction: 'ltr' }}>

        {/* Single-sample t-test cross-reference note */}
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <span className="text-lg mt-0.5">💡</span>
          <div>
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Single-Sample T-Test</h4>
            <p className="text-sm text-amber-700 mt-1 leading-relaxed">
              Single-group designs also include the <strong>single-sample t-test</strong>, which compares one group's mean to a known population value. You can find an interactive single-sample t-test tool under the <strong>Hypothesis Testing</strong> section of this dashboard.
            </p>
          </div>
        </div>

        {/* Cell Means Card */}
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Paired Samples Design</span>
            </h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pre-test / Post-test</span>
          </div>

          {/* Label editors */}
          <div className="px-3 py-2 border-b border-slate-100 grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">DV Label</label>
              <input
                type="text"
                value={dvLabel}
                onChange={(e) => setDvLabel(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Time 1</label>
              <input
                type="text"
                value={group1Name}
                onChange={(e) => setGroup1Name(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Time 2</label>
              <input
                type="text"
                value={group2Name}
                onChange={(e) => setGroup2Name(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
              />
            </div>
          </div>

          {/* Dataset selector */}
          <div className="px-3 py-2 border-b border-slate-100">
            <select
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-slate-700"
              value={activeExampleId ?? ''}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) {
                  setActiveExampleId(null);
                  return;
                }
                const ex = EXAMPLE_DATASETS.find((d) => d.id === id);
                if (ex) applyExample(ex);
              }}
            >
              <option value="">— Select an example dataset —</option>
              {EXAMPLE_DATASETS.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Group means panel with steppers */}
          <div className="px-3 py-3">
            {renderGroupMeansPanel()}
          </div>
        </div>

        {/* T-Test Results */}
        <div className="mt-4">
          {renderTTestCard()}
        </div>

        {/* Descriptives */}
        <div className="mt-4">
          {renderDescriptivesCard()}
        </div>

        {/* 95% CI for Difference */}
        <div className="mt-4">
          {renderCICard()}
        </div>
        </div>
      </aside>

      {/* ── Right column (45%) ─────────────────────────────────────────────── */}
      <section className="flex-1 lg:basis-[45%] lg:max-w-[45%] overflow-y-auto min-h-0">
        {/* Scenario description */}
        {activeExample && (
          <div className="mx-1 mb-3 mt-1 bg-indigo-50/50 border-l-4 border-indigo-500 px-5 py-4 text-sm text-slate-800 shadow-sm">
            <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
              Scenario
            </div>
            <p className="text-sm leading-relaxed text-slate-700 font-medium">{activeExample.description}</p>
            {activeExample.hypothesis && (
              <div className="mt-3 pt-3 border-t border-indigo-200/60">
                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Research Question</span>
                <p className="text-sm font-bold text-indigo-900 mt-0.5 italic">{activeExample.hypothesis}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col gap-4">
          {/* Bar chart */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Group Comparison</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                Means with standard error bars
              </p>
            </div>
            <div className="flex justify-center px-4 py-3">
              {renderBarChart()}
            </div>
          </div>

          {/* Paired comparison plot */}
          {renderPairedPlot()}

          {/* Interpretation card */}
          {renderInterpretationCard()}
        </div>
      </section>
    </div>
  );
};

export default SingleGroupTool;
