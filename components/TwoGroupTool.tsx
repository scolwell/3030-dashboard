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
  groupLabel: string;       // e.g. "Treatment"
  group1Name: string;       // e.g. "Control"
  group2Name: string;       // e.g. "Experimental"
  mean1: number;
  mean2: number;
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
   Statistical helpers   (duplicated from FactorialDesignTool – self-contained)
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
  const lnBeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta);
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaCF(x, a, b)) / a;
  }
  return 1 - (front * betaCF(1 - x, b, a)) / b;
};

const tDistPValue = (t: number, df: number): number => {
  if (!Number.isFinite(t) || df <= 0) return NaN;
  const x = df / (df + t * t);
  return betaIncomplete(x, df / 2, 0.5);
};

const formatP = (p: number): string => {
  if (!Number.isFinite(p)) return '.999';
  if (p > 0.999) return '.999';
  if (p < 0.001) return '<\u00a0.001';
  return p.toFixed(3);
};

/* ═══════════════════════════════════════════════════════════════════════════
   T-test computation from group means (balanced, σ² = 100, n = 20/group)
   ═══════════════════════════════════════════════════════════════════════════ */

const computeTTest = (
  mean1: number,
  mean2: number,
): TTestResult | null => {
  if (!Number.isFinite(mean1) || !Number.isFinite(mean2)) return null;

  const sigma2 = 100;   // assumed within-group variance (SD ≈ 10)
  const nPerGroup = 20;
  const diff = mean2 - mean1; // Group2 - Group1

  // Independent samples: SE = sqrt(σ²/n1 + σ²/n2) = sqrt(2 σ²/n)
  const se = Math.sqrt((2 * sigma2) / nPerGroup);
  const df = 2 * nPerGroup - 2; // df = 38

  const tStat = se > 0 ? diff / se : 0;
  const pVal = tDistPValue(Math.abs(tStat), df);

  // Cohen's d
  const sd = Math.sqrt(sigma2);
  const cohensD = sd > 0 ? diff / sd : 0;

  // 95% CI for mean difference (using t critical ≈ 2.024 for df=38 or 2.093 for df=19)
  // More precise: use inverse-t via approximation
  const tCrit = df >= 30 ? 2.024 : 2.093;
  const ci95Lower = diff - tCrit * se;
  const ci95Upper = diff + tCrit * se;

  // SE per group
  const se1 = Math.sqrt(sigma2 / nPerGroup);
  const se2 = Math.sqrt(sigma2 / nPerGroup);

  return {
    meanDiff: diff,
    pooledSE: se,
    t: tStat,
    df,
    p: pVal,
    cohensD,
    ci95Lower,
    ci95Upper,
    mean1,
    mean2,
    se1,
    se2,
  };
};

/* ═══════════════════════════════════════════════════════════════════════════
   Example Datasets (5 independent samples)
   ═══════════════════════════════════════════════════════════════════════════ */

const EXAMPLE_DATASETS: ExampleConfig[] = [
  {
    id: 'ind-1-tutoring',
    label: '1) After-school tutoring program',
    description:
      'A school randomly assigns 40 students to either receive after-school tutoring (treatment) or continue without extra support (control). Math test scores are compared at the end of the semester.',
    hypothesis: 'Does after-school tutoring improve math test scores?',
    dvLabel: 'Math test score',
    groupLabel: 'Condition',
    group1Name: 'Control',
    group2Name: 'Tutoring',
    mean1: 68,
    mean2: 79,
  },
  {
    id: 'ind-2-packaging',
    label: '2) Product packaging colour',
    description:
      'A marketing team tests whether switching from blue to green packaging increases purchase likelihood. Shoppers are randomly shown one version and asked to rate purchase intent.',
    hypothesis: 'Does green packaging increase purchase intent compared to blue?',
    dvLabel: 'Purchase intent (0-100)',
    groupLabel: 'Packaging',
    group1Name: 'Blue',
    group2Name: 'Green',
    mean1: 62,
    mean2: 65,
  },
  {
    id: 'ind-3-sleep-app',
    label: '3) Sleep quality app',
    description:
      'Researchers randomly assign 40 adults with poor sleep to use either a white-noise app (treatment) or no app (control) for 4 weeks, then measure self-reported sleep quality.',
    hypothesis: 'Does the white-noise app improve sleep quality ratings?',
    dvLabel: 'Sleep quality score',
    groupLabel: 'Condition',
    group1Name: 'No app',
    group2Name: 'White-noise app',
    mean1: 55,
    mean2: 72,
  },
  {
    id: 'ind-4-font-reading',
    label: '4) Font type and reading speed',
    description:
      'Participants are randomly assigned to read a passage in either serif or sans-serif font. Reading time (words per minute) is measured.',
    hypothesis: 'Does font type affect reading speed?',
    dvLabel: 'Words per minute',
    groupLabel: 'Font Type',
    group1Name: 'Serif',
    group2Name: 'Sans-serif',
    mean1: 74,
    mean2: 76,
  },
  {
    id: 'ind-5-therapy',
    label: '5) CBT therapy for anxiety',
    description:
      'Forty patients with generalized anxiety are randomly assigned to 8 weeks of CBT therapy or a wait-list control. Anxiety symptoms are measured post-treatment on a standardized scale.',
    hypothesis: 'Does CBT therapy reduce anxiety scores compared to a wait-list control?',
    dvLabel: 'Anxiety score (lower = better)',
    groupLabel: 'Condition',
    group1Name: 'Wait-list',
    group2Name: 'CBT Therapy',
    mean1: 72,
    mean2: 55,
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

const TwoGroupTool: React.FC = () => {
  const [mean1, setMean1] = useState<number>(68);
  const [mean2, setMean2] = useState<number>(79);
  const [groupLabel, setGroupLabel] = useState('Condition');
  const [group1Name, setGroup1Name] = useState('Control');
  const [group2Name, setGroup2Name] = useState('Treatment');
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

  // Compute t-test
  const tResult = useMemo(
    () => computeTTest(mean1, mean2),
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
     Render: Group Means Panel (editable cells with +/- steppers)
     ───────────────────────────────────────────────────────────────────────── */

  const renderGroupMeansPanel = () => {
    const diff = mean2 - mean1;
    const seriesColors = ['#2563eb', '#15803d'];

    return (
      <div>
        <table className="w-full text-xs border-collapse border border-slate-300 overflow-hidden">
          <thead>
            <tr className="bg-slate-100">
              <th className="bg-slate-100" style={{ borderLeftStyle: 'hidden', borderRightStyle: 'hidden' }} />
              <th colSpan={1} className="px-3 pt-2 pb-0 text-center font-bold text-slate-500 uppercase tracking-widest text-[10px] border-l border-slate-300">
                {dvLabel}
              </th>
            </tr>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="px-3 py-2 text-left font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                {groupLabel}
              </th>
              <th className="px-3 py-2 text-center font-bold text-slate-700 uppercase tracking-wide text-[11px] border-l border-slate-300">
                Mean
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: group1Name, value: mean1, setter: setMean1, color: seriesColors[0], hoverKey: 'group-1' },
              { name: group2Name, value: mean2, setter: setMean2, color: seriesColors[1], hoverKey: 'group-2' },
            ].map((g, idx) => (
              <tr
                key={idx}
                className={`border-b border-slate-200 transition-colors cursor-pointer ${highlightSource === g.hoverKey ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50'}`}
                onMouseEnter={() => setHighlightSource(g.hoverKey)}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-3 py-3 font-bold text-slate-700 text-[11px] whitespace-nowrap bg-slate-50/60">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                    <span>{g.name}</span>
                  </div>
                </td>
                <td className="px-2 py-3 border-l border-slate-200">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => g.setter(Math.max(0, g.value - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <span className="text-lg font-black tabular-nums leading-tight min-w-[2.5rem] text-center" style={{ color: g.color }}>
                      {g.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => g.setter(Math.min(100, g.value + 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-indigo-300 bg-indigo-100">
              <td className="px-3 py-2 font-black text-indigo-700 text-[11px] uppercase">
                Difference (G2{' − '}G1)
              </td>
              <td className="px-3 py-2 text-center text-sm font-black text-indigo-700 tabular-nums border-l border-indigo-200">
                {Number.isFinite(diff) ? (diff > 0 ? '+' : '') + diff.toFixed(1) : '—'}
              </td>
            </tr>
          </tfoot>
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
              Independent Samples T-Test
            </h3>
            <p className="text-[11px] text-slate-600">
              T-Test {'–'} DV: {dvLabel}
            </p>
          </div>
          <span className="text-[11px] text-slate-400">
            n = {nPerGroup} per group {'·'} {'σ²'} = {sigma2}
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
          <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
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
                <circle cx={x} cy={scaleY(v)} r={14} fill={color} opacity={0.2} filter="url(#dot-glow)">
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
    const dAbs = Math.abs(r.cohensD);
    const bench = dBenchmark(r.cohensD);

    let directionDesc: string;
    if (Math.abs(diff) < 0.5) {
      directionDesc = `The two groups have virtually identical means.`;
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
            Adjust the group means on the left to explore how the difference, significance, and effect size change together.
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
        {/* Cell Means Card */}
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Two-Group Design</span>
            </h3>
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
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Group 1</label>
              <input
                type="text"
                value={group1Name}
                onChange={(e) => setGroup1Name(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Group 2</label>
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

          {/* Interpretation card */}
          {renderInterpretationCard()}
        </div>
      </section>
    </div>
  );
};

export default TwoGroupTool;
