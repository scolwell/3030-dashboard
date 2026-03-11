import React, { useEffect, useMemo, useRef, useState } from 'react';

interface DesignConfig {
  id: '2x2' | '3x2' | '2x2x2';
  label: string;
  factors: string[];
  levels: number[];
}

interface ExampleConfig {
  id: string;
  label: string;
  description: string;
  designId: DesignConfig['id'];
  cellMeans: Record<string, number>;
  // Optional naming metadata so presets feel like real studies
  factorALabel?: string;
  factorBLabel?: string;
  factorCLabel?: string;
  factorALevels?: string[];
  factorBLevels?: string[];
  factorCLevels?: string[];
  dvLabel?: string;
  hypothesis?: string;
}

interface TwoWayAnovaSummary {
  ssA: number;
  dfA: number;
  msA: number;
  fA: number;
  eta2pA: number;

  ssB: number;
  dfB: number;
  msB: number;
  fB: number;
  eta2pB: number;

  ssAB: number;
  dfAB: number;
  msAB: number;
  fAB: number;
  eta2pAB: number;

  ssError: number;
  dfError: number;
  msError: number;

  ssTotal: number;
  dfTotal: number;
}

// Simple icon primitives to hint at Jamovi-style visuals without copying assets
const ContinuousIcon: React.FC = () => (
  <span className="inline-block w-3 h-3 bg-[#f5b14b] border border-slate-500 rounded-[2px] transform -skew-x-6" />
);

const CategoricalIcon: React.FC = () => (
  <span className="relative inline-block w-3 h-3">
    <span className="absolute w-1.5 h-1.5 rounded-full bg-[#4d8ae8] left-0 top-0 border border-slate-500" />
    <span className="absolute w-1.5 h-1.5 rounded-full bg-[#f5b14b] right-0 top-0 border border-slate-500" />
    <span className="absolute w-1.5 h-1.5 rounded-full bg-[#6bbf6b] left-1/2 bottom-0 -translate-x-1/2 border border-slate-500" />
  </span>
);

const DESIGN_CONFIGS: DesignConfig[] = [
  {
    id: '2x2',
    label: '2 × 2',
    factors: ['A', 'B'],
    levels: [2, 2],
  },
  {
    id: '3x2',
    label: '3 × 2',
    factors: ['A', 'B'],
    levels: [3, 2],
  },
  {
    id: '2x2x2',
    label: '2 × 2 × 2',
    factors: ['A', 'B', 'C'],
    levels: [2, 2, 2],
  },
];

export const EXAMPLE_DATASETS: ExampleConfig[] = [
  {
    id: 'dataset-1-sports-drink',
    label: '1) Sports performance drink (2×2)',
    description:
      'Training Type (Cardio vs Strength) × Drink Type (Energy vs Hydration); crossover: Energy helps Cardio, Hydration helps Strength.',
    hypothesis: 'Does the effect of drink type on performance depend on training type?',
    designId: '2x2',
    dvLabel: 'Performance score',
    factorALabel: 'Training Type',
    factorBLabel: 'Drink Type',
    factorALevels: ['Cardio', 'Strength'],
    factorBLevels: ['Energy', 'Hydration'],
    cellMeans: {
      // rows: Cardio, Strength; cols: Energy, Hydration
      '0-0': 85,
      '0-1': 70,
      '1-0': 72,
      '1-1': 87,
    },
  },
  {
    id: 'dataset-2-resort-vacation',
    label: '2) Luxury resort vacation (3×2)',
    description:
      'Resort Style (Party, Relaxation, Adventure) × Travel Companion (Friends, Partner); Party+Friends and Relaxation+Partner are best.',
    hypothesis: 'Does vacation satisfaction depend on the match between resort style and travel companion?',
    designId: '3x2',
    dvLabel: 'Vacation satisfaction',
    factorALabel: 'Resort Style',
    factorBLabel: 'Travel Companion',
    factorALevels: ['Party', 'Relaxation', 'Adventure'],
    factorBLevels: ['Friends', 'Partner'],
    cellMeans: {
      // rows (Strategy): Re-read, Practice test, Mixed
      // cols (Test type): Multiple-choice, Short-answer
      // Here: rows = Party, Relaxation, Adventure; cols = Friends, Partner
      '0-0': 88, // Party + Friends
      '0-1': 72, // Party + Partner
      '1-0': 68, // Relaxation + Friends
      '1-1': 88, // Relaxation + Partner
      '2-0': 75, // Adventure + Friends
      '2-1': 76, // Adventure + Partner
    },
  },
  {
    id: 'dataset-3-smartwatch',
    label: '3) Smartwatch purchase (2×2×2)',
    description:
      'Feature Focus (Fitness vs Productivity) × Battery Life (Short vs Long) × Price (Low vs High); high price only acceptable with long battery and good feature match.',
    hypothesis: 'Is purchase intention influenced by the three-way interaction of features, battery life, and price?',
    designId: '2x2x2',
    dvLabel: 'Purchase intention',
    factorALabel: 'Feature Focus',
    factorBLabel: 'Battery Life',
    factorCLabel: 'Price',
    factorALevels: ['Fitness', 'Productivity'],
    factorBLevels: ['Short', 'Long'],
    factorCLevels: ['Low', 'High'],
    cellMeans: {
      // indices: [FeatureFocus (0=Fitness,1=Productivity), BatteryLife (0=Short,1=Long), Price (0=Low,1=High)]
      '0-0-0': 78,
      '0-0-1': 52,
      '0-1-0': 88,
      '0-1-1': 80,
      '1-0-0': 76,
      '1-0-1': 50,
      '1-1-0': 86,
      '1-1-1': 78,
    },
  },
  {
    id: 'dataset-4-porsche-ads',
    label: '4) Porsche car advertising (2×2)',
    description:
      'Ad Style (Performance vs Luxury) × Buyer Type (Recreational vs Professional); recreational buyers like performance, professionals like luxury.',
    hypothesis: 'Does ad effectiveness depend on matching the ad style to the buyer type?',
    designId: '2x2',
    dvLabel: 'Purchase intention',
    factorALabel: 'Ad Style',
    factorBLabel: 'Buyer Type',
    factorALevels: ['Performance', 'Luxury'],
    factorBLevels: ['Recreational', 'Professional'],
    cellMeans: {
      // rows: Performance, Luxury; cols: Recreational, Professional
      '0-0': 87, // Performance + Recreational
      '0-1': 72, // Performance + Professional
      '1-0': 66, // Luxury + Recreational
      '1-1': 90, // Luxury + Professional
    },
  },
  {
    id: 'dataset-5-landscaping',
    label: '5) Backyard landscaping (3×2)',
    description:
      'Yard Style (Modern, Natural, Minimalist) × Maintenance Level (Low vs High); Modern drops when maintenance is high, Natural tolerates high maintenance.',
    hypothesis: 'Does the effect of maintenance level on design preference differ across yard styles?',
    designId: '3x2',
    dvLabel: 'Design preference',
    factorALabel: 'Yard Style',
    factorBLabel: 'Maintenance Level',
    factorALevels: ['Modern', 'Natural', 'Minimalist'],
    factorBLevels: ['Low', 'High'],
    cellMeans: {
      // rows: Modern, Natural, Minimalist; cols: Low, High maintenance
      '0-0': 88,
      '0-1': 60,
      '1-0': 80,
      '1-1': 78,
      '2-0': 75,
      '2-1': 65,
    },
  },
  {
    id: 'dataset-6-streaming',
    label: '6) Streaming service subscription (2×2×2)',
    description:
      'Content Type (Movies vs Series) × Ads (Yes vs No) × Cost (Cheap vs Expensive); ads acceptable only when cheap and especially for series.',
    hypothesis: 'Does the acceptability of ads depend on cost, especially for series content?',
    designId: '2x2x2',
    dvLabel: 'Subscription likelihood',
    factorALabel: 'Content Type',
    factorBLabel: 'Ads',
    factorCLabel: 'Cost',
    factorALevels: ['Movies', 'Series'],
    factorBLevels: ['Yes', 'No'],
    factorCLevels: ['Cheap', 'Expensive'],
    cellMeans: {
      // indices: [ContentType (0=Movies,1=Series), Ads (0=Yes,1=No), Cost (0=Cheap,1=Expensive)]
      '0-0-0': 70,
      '0-0-1': 50,
      '0-1-0': 78,
      '0-1-1': 68,
      '1-0-0': 88,
      '1-0-1': 55,
      '1-1-0': 82,
      '1-1-1': 72,
    },
  },
  {
    id: 'dataset-7-fitness-app',
    label: '7) Fitness app motivation (2×2)',
    description:
      'Coach Type (AI Coach vs Human Trainer) × Social Mode (Solo vs Community); AI best solo, human best in community.',
    hypothesis: 'Is motivation highest when coach type matches social mode?',
    designId: '2x2',
    dvLabel: 'Motivation score',
    factorALabel: 'Coach Type',
    factorBLabel: 'Social Mode',
    factorALevels: ['AI Coach', 'Human Trainer'],
    factorBLevels: ['Solo', 'Community'],
    cellMeans: {
      // rows: AI Coach, Human Trainer; cols: Solo, Community
      '0-0': 86,
      '0-1': 68,
      '1-0': 72,
      '1-1': 90,
    },
  },
  {
    id: 'dataset-8-coffee-shop',
    label: '8) Coffee shop study environment (3×2)',
    description:
      'Music Level (None, Background, Loud) × Seating (Couch vs Desk); loud hurts desk study but boosts relaxed couch studying.',
    hypothesis: 'Does the effect of music on study performance depend on seating arrangement?',
    designId: '3x2',
    dvLabel: 'Study performance',
    factorALabel: 'Music Level',
    factorBLabel: 'Seating',
    factorALevels: ['None', 'Background', 'Loud'],
    factorBLevels: ['Couch', 'Desk'],
    cellMeans: {
      // rows: None, Background, Loud; cols: Couch, Desk
      '0-0': 72,
      '0-1': 78,
      '1-0': 78,
      '1-1': 80,
      '2-0': 82,
      '2-1': 60,
    },
  },
  {
    id: 'dataset-9-video-game',
    label: '9) Video game engagement (2×2×2)',
    description:
      'Game Type (Competitive vs Story) × Multiplayer (Solo vs Online) × Difficulty (Easy vs Hard); hard mode boosts enjoyment only for competitive online games.',
    hypothesis: 'Does hard difficulty boost engagement specifically for competitive online games?',
    designId: '2x2x2',
    dvLabel: 'Enjoyment score',
    factorALabel: 'Game Type',
    factorBLabel: 'Multiplayer',
    factorCLabel: 'Difficulty',
    factorALevels: ['Competitive', 'Story'],
    factorBLevels: ['Solo', 'Online'],
    factorCLevels: ['Easy', 'Hard'],
    cellMeans: {
      // indices: [GameType (0=Competitive,1=Story), Multiplayer (0=Solo,1=Online), Difficulty (0=Easy,1=Hard)]
      '0-0-0': 78,
      '0-0-1': 70,
      '0-1-0': 80,
      '0-1-1': 92,
      '1-0-0': 80,
      '1-0-1': 70,
      '1-1-0': 82,
      '1-1-1': 72,
    },
  },
  {
    id: 'dataset-10-influencer',
    label: '10) Influencer marketing (2×2)',
    description:
      'Influencer Type (Celebrity vs Micro-Influencer) × Product Type (Luxury vs Everyday); celebrities sell luxury, micro-influencers sell everyday products.',
    hypothesis: 'Does influencer effectiveness depend on matching influencer type to product category?',
    designId: '2x2',
    dvLabel: 'Purchase intention',
    factorALabel: 'Influencer Type',
    factorBLabel: 'Product Type',
    factorALevels: ['Celebrity', 'Micro-Influencer'],
    factorBLevels: ['Luxury', 'Everyday'],
    cellMeans: {
      // rows: Celebrity, Micro-Influencer; cols: Luxury, Everyday
      '0-0': 90,
      '0-1': 65,
      '1-0': 72,
      '1-1': 88,
    },
  },
];

// Helper to build a stable key for a cell
const cellKey = (indices: number[]) => indices.join('-');

// Simple two-way ANOVA from cell means for a balanced design with equal n per cell
// Assumes a constant within-cell variance (σ² = 1) so that SS_error and F-ratios
// are internally consistent with the current means, without requiring raw data.
const computeTwoWayAnovaFromCellMeans = (
  cellMeans: Record<string, number>,
  rows: number,
  cols: number,
  nPerCell: number
): TwoWayAnovaSummary | null => {
  const a = rows;
  const b = cols;
  const n = nPerCell;

  const means: number[][] = [];
  for (let i = 0; i < a; i++) {
    means[i] = [];
    for (let j = 0; j < b; j++) {
      const key = cellKey([i, j]);
      const val = cellMeans[key];
      if (!Number.isFinite(val)) {
        return null;
      }
      means[i][j] = val;
    }
  }

  // Grand mean (each cell weighted equally; n is constant)
  let sumAll = 0;
  for (let i = 0; i < a; i++) {
    for (let j = 0; j < b; j++) {
      sumAll += means[i][j];
    }
  }
  const grandMean = sumAll / (a * b);

  // Row and column means
  const rowMeans: number[] = [];
  const colMeans: number[] = [];

  for (let i = 0; i < a; i++) {
    let rowSum = 0;
    for (let j = 0; j < b; j++) {
      rowSum += means[i][j];
    }
    rowMeans[i] = rowSum / b;
  }

  for (let j = 0; j < b; j++) {
    let colSum = 0;
    for (let i = 0; i < a; i++) {
      colSum += means[i][j];
    }
    colMeans[j] = colSum / a;
  }

  // Sums of squares (balanced two-way ANOVA)
  let ssA = 0;
  for (let i = 0; i < a; i++) {
    ssA += Math.pow(rowMeans[i] - grandMean, 2);
  }
  ssA *= b * n;

  let ssB = 0;
  for (let j = 0; j < b; j++) {
    ssB += Math.pow(colMeans[j] - grandMean, 2);
  }
  ssB *= a * n;

  let ssAB = 0;
  for (let i = 0; i < a; i++) {
    for (let j = 0; j < b; j++) {
      const interactionComponent = means[i][j] - rowMeans[i] - colMeans[j] + grandMean;
      ssAB += Math.pow(interactionComponent, 2);
    }
  }
  ssAB *= n;

  const ssBetween = ssA + ssB + ssAB;

  // Assume a constant within-cell variance for illustration (SD ≈ 10)
  const sigma2 = 100;
  const ssError = a * b * (n - 1) * sigma2;
  const ssTotal = ssBetween + ssError;

  const dfA = a - 1;
  const dfB = b - 1;
  const dfAB = (a - 1) * (b - 1);
  const dfError = a * b * (n - 1);
  const dfTotal = a * b * n - 1;

  const msA = dfA > 0 ? ssA / dfA : NaN;
  const msB = dfB > 0 ? ssB / dfB : NaN;
  const msAB = dfAB > 0 ? ssAB / dfAB : NaN;
  const msError = dfError > 0 ? ssError / dfError : NaN;

  const fA = msError > 0 ? msA / msError : NaN;
  const fB = msError > 0 ? msB / msError : NaN;
  const fAB = msError > 0 ? msAB / msError : NaN;

  const eta2pA = ssA / (ssA + ssError);
  const eta2pB = ssB / (ssB + ssError);
  const eta2pAB = ssAB / (ssAB + ssError);

  return {
    ssA,
    dfA,
    msA,
    fA,
    eta2pA,
    ssB,
    dfB,
    msB,
    fB,
    eta2pB,
    ssAB,
    dfAB,
    msAB,
    fAB,
    eta2pAB,
    ssError,
    dfError,
    msError,
    ssTotal,
    dfTotal,
  };
};

const makeDefaultLevelsText = (prefix: string, count: number): string =>
  Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`).join(', ');

const parseLevels = (text: string, count: number, fallbackPrefix: string): string[] => {
  const parts = text
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, count);

  while (parts.length < count) {
    parts.push(`${fallbackPrefix}${parts.length + 1}`);
  }

  return parts;
};

const computeMarginalMeans2D = (
  cellMeans: Record<string, number>,
  rows: number,
  cols: number
): { rowMeans: (number | null)[]; colMeans: (number | null)[]; grandMean: number | null } => {
  const rowMeans: (number | null)[] = [];
  const colMeans: (number | null)[] = [];

  for (let r = 0; r < rows; r++) {
    const vals: number[] = [];
    for (let c = 0; c < cols; c++) {
      const key = cellKey([r, c]);
      const v = cellMeans[key];
      if (Number.isFinite(v)) vals.push(v);
    }
    rowMeans[r] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  for (let c = 0; c < cols; c++) {
    const vals: number[] = [];
    for (let r = 0; r < rows; r++) {
      const key = cellKey([r, c]);
      const v = cellMeans[key];
      if (Number.isFinite(v)) vals.push(v);
    }
    colMeans[c] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const all: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = cellKey([r, c]);
      const v = cellMeans[key];
      if (Number.isFinite(v)) all.push(v);
    }
  }
  const grandMean = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;

  return { rowMeans, colMeans, grandMean };
};

// ── Statistical helpers for p-value computation ──────────────────────────────
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

const fDistPValue = (f: number, df1: number, df2: number): number => {
  if (!Number.isFinite(f) || f < 0 || df1 <= 0 || df2 <= 0) return NaN;
  if (f === 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return betaIncomplete(x, df2 / 2, df1 / 2);
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

// ── Three-way ANOVA from cell means (balanced design) ────────────────────────
const computeThreeWayAnovaFromCellMeans = (
  cellMeans: Record<string, number>,
  a: number,
  b: number,
  c: number,
  nPerCell: number
): TwoWayAnovaSummary & {
  ssC: number; dfC: number; msC: number; fC: number; eta2pC: number;
  ssAC: number; dfAC: number; msAC: number; fAC: number; eta2pAC: number;
  ssBC: number; dfBC: number; msBC: number; fBC: number; eta2pBC: number;
  ssABC: number; dfABC: number; msABC: number; fABC: number; eta2pABC: number;
} | null => {
  const n = nPerCell;
  const means: number[][][] = [];
  for (let i = 0; i < a; i++) {
    means[i] = [];
    for (let j = 0; j < b; j++) {
      means[i][j] = [];
      for (let k = 0; k < c; k++) {
        const key = cellKey([i, j, k]);
        const val = cellMeans[key];
        if (!Number.isFinite(val)) return null;
        means[i][j][k] = val;
      }
    }
  }
  // Grand mean
  let sumAll = 0;
  for (let i = 0; i < a; i++)
    for (let j = 0; j < b; j++)
      for (let k = 0; k < c; k++) sumAll += means[i][j][k];
  const gm = sumAll / (a * b * c);
  // Marginal means
  const mA: number[] = Array(a).fill(0);
  const mB: number[] = Array(b).fill(0);
  const mC: number[] = Array(c).fill(0);
  const mAB: number[][] = Array.from({ length: a }, () => Array(b).fill(0));
  const mAC: number[][] = Array.from({ length: a }, () => Array(c).fill(0));
  const mBC: number[][] = Array.from({ length: b }, () => Array(c).fill(0));
  for (let i = 0; i < a; i++)
    for (let j = 0; j < b; j++)
      for (let k = 0; k < c; k++) {
        mA[i] += means[i][j][k];
        mB[j] += means[i][j][k];
        mC[k] += means[i][j][k];
        mAB[i][j] += means[i][j][k];
        mAC[i][k] += means[i][j][k];
        mBC[j][k] += means[i][j][k];
      }
  for (let i = 0; i < a; i++) mA[i] /= b * c;
  for (let j = 0; j < b; j++) mB[j] /= a * c;
  for (let k = 0; k < c; k++) mC[k] /= a * b;
  for (let i = 0; i < a; i++)
    for (let j = 0; j < b; j++) mAB[i][j] /= c;
  for (let i = 0; i < a; i++)
    for (let k = 0; k < c; k++) mAC[i][k] /= b;
  for (let j = 0; j < b; j++)
    for (let k = 0; k < c; k++) mBC[j][k] /= a;
  // Sums of squares
  let ssA = 0;
  for (let i = 0; i < a; i++) ssA += (mA[i] - gm) ** 2;
  ssA *= b * c * n;
  let ssB = 0;
  for (let j = 0; j < b; j++) ssB += (mB[j] - gm) ** 2;
  ssB *= a * c * n;
  let ssC2 = 0;
  for (let k = 0; k < c; k++) ssC2 += (mC[k] - gm) ** 2;
  ssC2 *= a * b * n;
  let ssAB2 = 0;
  for (let i = 0; i < a; i++)
    for (let j = 0; j < b; j++) ssAB2 += (mAB[i][j] - mA[i] - mB[j] + gm) ** 2;
  ssAB2 *= c * n;
  let ssAC = 0;
  for (let i = 0; i < a; i++)
    for (let k = 0; k < c; k++) ssAC += (mAC[i][k] - mA[i] - mC[k] + gm) ** 2;
  ssAC *= b * n;
  let ssBC = 0;
  for (let j = 0; j < b; j++)
    for (let k = 0; k < c; k++) ssBC += (mBC[j][k] - mB[j] - mC[k] + gm) ** 2;
  ssBC *= a * n;
  let ssABC = 0;
  for (let i = 0; i < a; i++)
    for (let j = 0; j < b; j++)
      for (let k = 0; k < c; k++)
        ssABC += (means[i][j][k] - mAB[i][j] - mAC[i][k] - mBC[j][k] + mA[i] + mB[j] + mC[k] - gm) ** 2;
  ssABC *= n;
  const sigma2 = 100;
  const dfErr = a * b * c * (n - 1);
  const ssErr = dfErr * sigma2;
  const msErr = sigma2;
  const dfA2 = a - 1;
  const dfB2 = b - 1;
  const dfC2 = c - 1;
  const dfAB2 = dfA2 * dfB2;
  const dfAC2 = dfA2 * dfC2;
  const dfBC2 = dfB2 * dfC2;
  const dfABC2 = dfA2 * dfB2 * dfC2;
  const ssTotal = ssA + ssB + ssC2 + ssAB2 + ssAC + ssBC + ssABC + ssErr;
  return {
    ssA, dfA: dfA2, msA: ssA / dfA2, fA: ssA / dfA2 / msErr, eta2pA: ssA / (ssA + ssErr),
    ssB, dfB: dfB2, msB: ssB / dfB2, fB: ssB / dfB2 / msErr, eta2pB: ssB / (ssB + ssErr),
    ssAB: ssAB2, dfAB: dfAB2, msAB: ssAB2 / dfAB2, fAB: ssAB2 / dfAB2 / msErr, eta2pAB: ssAB2 / (ssAB2 + ssErr),
    ssError: ssErr, dfError: dfErr, msError: msErr, ssTotal, dfTotal: a * b * c * n - 1,
    ssC: ssC2, dfC: dfC2, msC: ssC2 / dfC2, fC: ssC2 / dfC2 / msErr, eta2pC: ssC2 / (ssC2 + ssErr),
    ssAC, dfAC: dfAC2, msAC: ssAC / dfAC2, fAC: ssAC / dfAC2 / msErr, eta2pAC: ssAC / (ssAC + ssErr),
    ssBC, dfBC: dfBC2, msBC: ssBC / dfBC2, fBC: ssBC / dfBC2 / msErr, eta2pBC: ssBC / (ssBC + ssErr),
    ssABC, dfABC: dfABC2, msABC: ssABC / dfABC2, fABC: ssABC / dfABC2 / msErr, eta2pABC: ssABC / (ssABC + ssErr),
  };
};

const FactorialDesignTool: React.FC = () => {
  const [designId, setDesignId] = useState<DesignConfig['id']>('2x2');

  // Means are stored in a simple key/value map keyed by factor indices
  // Prefill the 2×2 design with example means between 1 and 5
  const [cellMeans, setCellMeans] = useState<Record<string, number>>({
    '0-0': 1,
    '0-1': 2,
    '1-0': 3,
    '1-1': 4,
  });

  // Factor and level labels (editable)
  const [factorALabel, setFactorALabel] = useState<string>('A');
  const [factorBLabel, setFactorBLabel] = useState<string>('B');
  const [factorALevelsText, setFactorALevelsText] = useState<string>('');
  const [factorBLevelsText, setFactorBLevelsText] = useState<string>('');

  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);

  // Collapsible state for Jamovi-style left-pane sections
  const [isModelOpen, setIsModelOpen] = useState<boolean>(true);
  const [isPostHocOpen, setIsPostHocOpen] = useState<boolean>(true);
  const [isEmmOpen, setIsEmmOpen] = useState<boolean>(false);
  const [isSaveOpen, setIsSaveOpen] = useState<boolean>(false);

  // Simple state for Estimated Marginal Means "selected" factors
  const [emmSelectedFactors, setEmmSelectedFactors] = useState<string[]>([]);
  const [emmLeftSelected, setEmmLeftSelected] = useState<string | null>(null);
  const [emmRightSelected, setEmmRightSelected] = useState<string | null>(null);
  const [effectPlotIndex, setEffectPlotIndex] = useState<number>(0);

  // Freeze & Compare state
  const [frozenSnapshot, setFrozenSnapshot] = useState<{
    cellMeans: Record<string, number>;
    anovaSummary: TwoWayAnovaSummary | null;
    label: string;
  } | null>(null);

  // Hover highlight state for cross-panel contrast highlighting
  const [highlightSource, setHighlightSource] = useState<string | null>(null);

  const config = useMemo(
    () => DESIGN_CONFIGS.find((d) => d.id === designId)!,
    [designId]
  );

  const activeExample = useMemo(
    () => (activeExampleId ? EXAMPLE_DATASETS.find((ex) => ex.id === activeExampleId) ?? null : null),
    [activeExampleId]
  );

  // Reset factor labels and default level labels when design changes
  useEffect(() => {
    const [rows, cols] = config.levels;
    const defaultALabel = config.factors[0] ?? 'A';
    const defaultBLabel = config.factors[1] ?? 'B';
    if (!activeExample) {
      setFactorALabel(defaultALabel);
      setFactorBLabel(defaultBLabel);
      setFactorALevelsText(makeDefaultLevelsText(defaultALabel, rows));
      setFactorBLevelsText(makeDefaultLevelsText(defaultBLabel, cols));
    }
    setEmmSelectedFactors([]);
    setEmmLeftSelected(null);
    setEmmRightSelected(null);
    setEffectPlotIndex(0);
  }, [config, activeExample]);

  const applyExample = (ex: ExampleConfig) => {
    setDesignId(ex.designId);
    setCellMeans(ex.cellMeans);
    setActiveExampleId(ex.id);

    if (ex.factorALabel) {
      setFactorALabel(ex.factorALabel);
    }
    if (ex.factorBLabel) {
      setFactorBLabel(ex.factorBLabel);
    }
    if (ex.factorALevels && ex.factorALevels.length) {
      setFactorALevelsText(ex.factorALevels.join(', '));
    }
    if (ex.factorBLevels && ex.factorBLevels.length) {
      setFactorBLevelsText(ex.factorBLevels.join(', '));
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      const payload = JSON.stringify({ designId, cellMeans }, null, 2);
      await navigator.clipboard.writeText(payload);
    } catch {
      // Silent failure is fine for now
    }
  };

  const handleSave = () => {
    if (typeof document === 'undefined') return;
    const payload = JSON.stringify({ designId, cellMeans }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factorial-design-${designId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePaste = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        if (parsed.designId && DESIGN_CONFIGS.some((d) => d.id === parsed.designId)) {
          setDesignId(parsed.designId as DesignConfig['id']);
        }
        if (parsed.cellMeans && typeof parsed.cellMeans === 'object') {
          setCellMeans(parsed.cellMeans as Record<string, number>);
        }
      }
    } catch {
      // Ignore malformed clipboard contents
    }
  };

  const handleMeanChange = (indices: number[], value: string, cIndex?: number) => {
    const key =
      designId === '2x2x2' && typeof cIndex === 'number'
        ? cellKey([indices[0], indices[1], cIndex])
        : cellKey(indices);
    const num = value === '' ? NaN : Number(value);
    setCellMeans((prev) => ({
      ...prev,
      [key]: num,
    }));
  };

  const getMean = (indices: number[], cIndex?: number) => {
    const key =
      designId === '2x2x2' && typeof cIndex === 'number'
        ? cellKey([indices[0], indices[1], cIndex])
        : cellKey(indices);
    const val = cellMeans[key];
    return Number.isFinite(val) ? val : '';
  };

  const anovaSummary = useMemo(() => {
    const [rows, cols] = config.levels;
    // Use a notional equal sample size per cell; this keeps the ANOVA
    // internally consistent without asking the learner to enter n.
    const assumedNPerCell = 20;
    if (config.id === '2x2x2') {
      return computeThreeWayAnovaFromCellMeans(cellMeans, rows, cols, 2, assumedNPerCell);
    }
    return computeTwoWayAnovaFromCellMeans(cellMeans, rows, cols, assumedNPerCell);
  }, [cellMeans, config]);

  // Effect size benchmarks for partial eta squared
  const etaBenchmark = (eta2p: number): { label: string; color: string } => {
    if (!Number.isFinite(eta2p) || eta2p < 0) return { label: '', color: '#94a3b8' };
    if (eta2p >= 0.80) return { label: 'Large', color: '#16a34a' };
    if (eta2p >= 0.60) return { label: 'Med-Large', color: '#0891b2' };
    if (eta2p >= 0.40) return { label: 'Sm-Medium', color: '#d97706' };
    if (eta2p >= 0.20) return { label: 'Small', color: '#64748b' };
    return { label: 'Very Small', color: '#cbd5e1' };
  };

  const render2DTable = (
    rows: number,
    cols: number,
    title: string | undefined,
    aLabel: string,
    bLabel: string,
    aLevels: string[],
    bLevels: string[],
    cIndex?: number
  ) => {
    const rowMeans: (number | null)[] = [];
    const colMeans: (number | null)[] = [];
    const allValues: number[] = [];

    for (let r = 0; r < rows; r++) {
      const rowVals: number[] = [];
      for (let c = 0; c < cols; c++) {
        const key =
          designId === '2x2x2' && typeof cIndex === 'number'
            ? cellKey([r, c, cIndex])
            : cellKey([r, c]);
        const v = cellMeans[key];
        if (Number.isFinite(v)) {
          rowVals.push(v);
          allValues.push(v);
        }
      }
      rowMeans[r] = rowVals.length ? rowVals.reduce((a, b) => a + b, 0) / rowVals.length : null;
    }

    for (let c = 0; c < cols; c++) {
      const colVals: number[] = [];
      for (let r = 0; r < rows; r++) {
        const key =
          designId === '2x2x2' && typeof cIndex === 'number'
            ? cellKey([r, c, cIndex])
            : cellKey([r, c]);
        const v = cellMeans[key];
        if (Number.isFinite(v)) colVals.push(v);
      }
      colMeans[c] = colVals.length ? colVals.reduce((a, b) => a + b, 0) / colVals.length : null;
    }

    const grandMean = allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : null;

    return (
      <div className="bg-white border border-slate-200  shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>Cell Means Table</span>
            {title && <span className="text-[11px] font-normal text-slate-500">{title}</span>}
          </h3>
          <span className="text-[11px] text-slate-400">Edit cells to update marginal means</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-800">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {aLabel}
                </th>
                {Array.from({ length: cols }).map((_, c) => (
                  <th
                    key={c}
                    className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {bLevels[c]}
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">
                  Row mean
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {aLevels[r]}
                  </td>
                  {Array.from({ length: cols }).map((_, c) => (
                    <td key={c} className="px-3 py-2">
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
                        value={getMean([r, c], cIndex)}
                        onChange={(e) => handleMeanChange([r, c], e.target.value, cIndex)}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center text-sm font-semibold text-slate-800 bg-slate-50">
                    {rowMeans[r] !== null ? rowMeans[r]!.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/80">
                <td className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Column mean
                </td>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-3 py-2 text-center text-sm font-semibold text-slate-800">
                    {colMeans[c] !== null ? colMeans[c]!.toFixed(2) : '—'}
                  </td>
                ))}
                <td className="px-3 py-2 text-center text-sm font-semibold text-slate-900 bg-slate-100">
                  {grandMean !== null ? grandMean.toFixed(2) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };
  const renderContingencyCard = (
    rows: number,
    cols: number,
    aLabel: string,
    bLabel: string,
    aLevels: string[],
    bLevels: string[]
  ) => (
    <div className="bg-white border border-slate-200  shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Contingency table</h3>
        <span className="text-[11px] text-slate-400">Read-only view of current cell values</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-slate-800">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {aLabel}
              </th>
              {Array.from({ length: cols }).map((_, c) => (
                <th
                  key={c}
                  className="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide"
                >
                  {bLevels[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {aLevels[r]}
                </td>
                {Array.from({ length: cols }).map((_, c) => {
                  const key = cellKey([r, c]);
                  const val = cellMeans[key];
                  return (
                    <td key={c} className="px-3 py-2 text-center text-sm">
                      {Number.isFinite(val) ? val : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAnovaCard = (
    aLabel: string,
    bLabel: string,
    summary: TwoWayAnovaSummary | null,
    dvLabel?: string,
    cLabel?: string
  ) => {
    const format = (value: number | undefined): string => {
      if (value === undefined || value === null) return '—';
      if (!Number.isFinite(value as number)) return '—';
      const v = value as number;
      if (v === 0) return '0.00';
      if (Math.abs(v) >= 100000) return Math.round(v).toLocaleString();
      if (Math.abs(v) >= 10) return v.toFixed(1);
      if (Math.abs(v) >= 1) return v.toFixed(2);
      if (Math.abs(v) >= 0.001) return v.toFixed(3);
      return '<\u00a0.001';
    };

    const hasSummary = !!summary;
    const s3 = hasSummary && summary && 'ssC' in summary ? (summary as any) : null;

    const ssModel = hasSummary ? summary!.ssA + summary!.ssB + summary!.ssAB + (s3 ? s3.ssC + s3.ssAC + s3.ssBC + s3.ssABC : 0) : NaN;
    const dfModel = hasSummary ? summary!.dfA + summary!.dfB + summary!.dfAB + (s3 ? s3.dfC + s3.dfAC + s3.dfBC + s3.dfABC : 0) : NaN;
    const msModel = hasSummary && dfModel > 0 ? ssModel / dfModel : NaN;
    const fModel = hasSummary && summary!.msError > 0 ? msModel / summary!.msError : NaN;
    const eta2pModel = hasSummary ? ssModel / (ssModel + summary!.ssError) : NaN;

    return (
    <div className="bg-white border border-slate-200  shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">ANOVA</h3>
          <p className="text-[11px] text-slate-600">ANOVA – DV: {dvLabel || 'Outcome'}</p>
        </div>
        <span className="text-[11px] text-slate-400">
          Values are estimated from current cell means (balanced design)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-slate-800">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Sum of Squares</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">df</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Mean Square</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">F</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">p</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 tracking-wide"><span className="normal-case italic">η</span><sup>2</sup><sub className="normal-case italic">p</sub></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-2 text-xs font-semibold text-slate-700">Overall model</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(ssModel) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(dfModel) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(msModel) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(fModel) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? formatP(fDistPValue(fModel, dfModel, summary!.dfError)) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(eta2pModel) : '—'}
              </td>
            </tr>
            <tr className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'main-A' ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('main-A')}
                onMouseLeave={() => setHighlightSource(null)}>
              <td className="px-4 py-2 text-xs font-semibold text-slate-700">{`${aLabel} (main effect)`}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.ssA) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.dfA) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.msA) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.fA) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? formatP(fDistPValue(summary!.fA, summary!.dfA, summary!.dfError)) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? (
                  <span className="inline-flex items-center gap-1">
                    {format(summary!.eta2pA)}
                    <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(summary!.eta2pA).color }}>{etaBenchmark(summary!.eta2pA).label}</span>
                  </span>
                ) : '—'}
              </td>
            </tr>
            <tr className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'main-B' ? 'bg-cyan-50 ring-1 ring-inset ring-cyan-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('main-B')}
                onMouseLeave={() => setHighlightSource(null)}>
              <td className="px-4 py-2 text-xs font-semibold text-slate-700">{`${bLabel} (main effect)`}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.ssB) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.dfB) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.msB) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.fB) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? formatP(fDistPValue(summary!.fB, summary!.dfB, summary!.dfError)) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? (
                  <span className="inline-flex items-center gap-1">
                    {format(summary!.eta2pB)}
                    <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(summary!.eta2pB).color }}>{etaBenchmark(summary!.eta2pB).label}</span>
                  </span>
                ) : '—'}
              </td>
            </tr>
            <tr className={`border-l-4 border-l-indigo-500 cursor-pointer transition-colors duration-150 ${highlightSource === 'interaction' ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100/60'}`}
                onMouseEnter={() => setHighlightSource('interaction')}
                onMouseLeave={() => setHighlightSource(null)}>
              <td className="px-4 py-2 text-xs font-bold text-indigo-900">{`${aLabel} × ${bLabel} (interaction)`}</td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">
                {hasSummary ? format(summary!.ssAB) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">
                {hasSummary ? format(summary!.dfAB) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">
                {hasSummary ? format(summary!.msAB) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">
                {hasSummary ? format(summary!.fAB) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">
                {hasSummary ? formatP(fDistPValue(summary!.fAB, summary!.dfAB, summary!.dfError)) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">
                {hasSummary ? (
                  <span className="inline-flex items-center gap-1">
                    {format(summary!.eta2pAB)}
                    <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(summary!.eta2pAB).color }}>{etaBenchmark(summary!.eta2pAB).label}</span>
                  </span>
                ) : '—'}
              </td>
            </tr>
            {s3 && (<>
            <tr className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'main-C' ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('main-C')}
                onMouseLeave={() => setHighlightSource(null)}>
              <td className="px-4 py-2 text-xs font-semibold text-slate-700">{`${cLabel} (main effect)`}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.ssC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.dfC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.msC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.fC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{formatP(fDistPValue(s3.fC, s3.dfC, summary!.dfError))}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  {format(s3.eta2pC)}
                  <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(s3.eta2pC).color }}>{etaBenchmark(s3.eta2pC).label}</span>
                </span>
              </td>
            </tr>
            <tr className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'int-AC' ? 'bg-violet-50 ring-1 ring-inset ring-violet-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('int-AC')}
                onMouseLeave={() => setHighlightSource(null)}>
              <td className="px-4 py-2 text-xs font-semibold text-slate-700">{`${aLabel} × ${cLabel}`}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.ssAC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.dfAC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.msAC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.fAC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{formatP(fDistPValue(s3.fAC, s3.dfAC, summary!.dfError))}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  {format(s3.eta2pAC)}
                  <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(s3.eta2pAC).color }}>{etaBenchmark(s3.eta2pAC).label}</span>
                </span>
              </td>
            </tr>
            <tr className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'int-BC' ? 'bg-violet-50 ring-1 ring-inset ring-violet-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('int-BC')}
                onMouseLeave={() => setHighlightSource(null)}>
              <td className="px-4 py-2 text-xs font-semibold text-slate-700">{`${bLabel} × ${cLabel}`}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.ssBC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.dfBC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.msBC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{format(s3.fBC)}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">{formatP(fDistPValue(s3.fBC, s3.dfBC, summary!.dfError))}</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  {format(s3.eta2pBC)}
                  <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(s3.eta2pBC).color }}>{etaBenchmark(s3.eta2pBC).label}</span>
                </span>
              </td>
            </tr>
            <tr className={`border-l-4 border-l-purple-500 cursor-pointer transition-colors duration-150 ${highlightSource === 'int-ABC' ? 'bg-purple-100 ring-1 ring-inset ring-purple-300' : 'bg-purple-50 hover:bg-purple-100/60'}`}
                onMouseEnter={() => setHighlightSource('int-ABC')}
                onMouseLeave={() => setHighlightSource(null)}>
              <td className="px-4 py-2 text-xs font-bold text-purple-900">{`${aLabel} × ${bLabel} × ${cLabel}`}</td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-purple-900">{format(s3.ssABC)}</td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-purple-900">{format(s3.dfABC)}</td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-purple-900">{format(s3.msABC)}</td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-purple-900">{format(s3.fABC)}</td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-purple-900">{formatP(fDistPValue(s3.fABC, s3.dfABC, summary!.dfError))}</td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-purple-900">
                <span className="inline-flex items-center gap-1">
                  {format(s3.eta2pABC)}
                  <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(s3.eta2pABC).color }}>{etaBenchmark(s3.eta2pABC).label}</span>
                </span>
              </td>
            </tr>
            </>)}
            <tr>
              <td className="px-4 py-2 text-xs font-semibold text-slate-700">Residuals</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.ssError) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.dfError) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">
                {hasSummary ? format(summary!.msError) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">—</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">—</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">—</td>
            </tr>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <td className="px-4 py-2 text-xs font-bold text-slate-800">Total</td>
              <td className="px-4 py-2 text-right text-sm text-slate-800">
                {hasSummary ? format(ssModel + summary!.ssError) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-800">
                {hasSummary ? format(dfModel + summary!.dfError) : '—'}
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">—</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">—</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">—</td>
              <td className="px-4 py-2 text-right text-sm text-slate-600">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
  };

  const renderPostHocCard = (
    aLabel: string,
    bLabel: string,
    aLevels: string[],
    bLevels: string[],
    summary: TwoWayAnovaSummary | null,
    cLabel?: string,
    cLevels?: string[]
  ) => {
    if (!summary) return null;

    const a = aLevels.length;
    const b = bLevels.length;
    const c = cLevels ? cLevels.length : 1;
    const n = 20; // assumed nPerCell
    const is3Way = designId === '2x2x2' && cLevels && c > 1;

    // Compute Factor A marginal means
    const aMeans: number[] = [];
    for (let i = 0; i < a; i++) {
      let sum = 0;
      let cnt = 0;
      for (let j = 0; j < b; j++) {
        if (is3Way) {
          for (let k = 0; k < c; k++) {
            const v = cellMeans[cellKey([i, j, k])];
            if (Number.isFinite(v)) { sum += v; cnt++; }
          }
        } else {
          const v = cellMeans[cellKey([i, j])];
          if (Number.isFinite(v)) { sum += v; cnt++; }
        }
      }
      aMeans[i] = cnt > 0 ? sum / cnt : NaN;
    }

    // Compute Factor B marginal means
    const bMeans: number[] = [];
    for (let j = 0; j < b; j++) {
      let sum = 0;
      let cnt = 0;
      for (let i = 0; i < a; i++) {
        if (is3Way) {
          for (let k = 0; k < c; k++) {
            const v = cellMeans[cellKey([i, j, k])];
            if (Number.isFinite(v)) { sum += v; cnt++; }
          }
        } else {
          const v = cellMeans[cellKey([i, j])];
          if (Number.isFinite(v)) { sum += v; cnt++; }
        }
      }
      bMeans[j] = cnt > 0 ? sum / cnt : NaN;
    }

    // Compute Factor C marginal means (3-way only)
    const cMeansList: number[] = [];
    if (is3Way) {
      for (let k = 0; k < c; k++) {
        let sum = 0;
        let cnt = 0;
        for (let i = 0; i < a; i++) {
          for (let j = 0; j < b; j++) {
            const v = cellMeans[cellKey([i, j, k])];
            if (Number.isFinite(v)) { sum += v; cnt++; }
          }
        }
        cMeansList[k] = cnt > 0 ? sum / cnt : NaN;
      }
    }

    const mse = summary.msError;
    const dfErr = summary.dfError;
    const seA = Math.sqrt(2 * mse / (b * c * n));
    const seB = Math.sqrt(2 * mse / (a * c * n));
    const seC = is3Way ? Math.sqrt(2 * mse / (a * b * n)) : 0;

    const fmt3 = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : '—');

    const pairwise = (means: number[], levels: string[], se: number) => {
      const pairs: { l1: string; l2: string; i1: number; i2: number; diff: number; se: number; t: number; p: number; d: number }[] = [];
      for (let i = 0; i < means.length; i++) {
        for (let j = i + 1; j < means.length; j++) {
          const diff = means[i] - means[j];
          const tVal = se > 0 ? diff / se : NaN;
          const pVal = tDistPValue(Math.abs(tVal), dfErr);
          const d = mse > 0 ? diff / Math.sqrt(mse) : NaN;
          pairs.push({ l1: levels[i], l2: levels[j], i1: i, i2: j, diff, se, t: tVal, p: pVal, d });
        }
      }
      return pairs;
    };

    const aPairs = pairwise(aMeans, aLevels, seA);
    const bPairs = pairwise(bMeans, bLevels, seB);
    const cPairs = is3Way ? pairwise(cMeansList, cLevels!, seC) : [];

    // Interaction post hoc: pairwise comparisons between ALL cell means
    const interactionPairs: { aL1: string; bL1: string; cL1?: string; aL2: string; bL2: string; cL2?: string; aIdx1: number; bIdx1: number; cIdx1?: number; aIdx2: number; bIdx2: number; cIdx2?: number; diff: number; se: number; t: number; p: number; d: number }[] = [];
    {
      const seCell = Math.sqrt(2 * mse / n); // SE for comparing two cell means
      const cells: { aLevel: string; bLevel: string; cLevel?: string; mean: number; aIdx: number; bIdx: number; cIdx?: number }[] = [];
      if (is3Way) {
        for (let i = 0; i < a; i++) {
          for (let j = 0; j < b; j++) {
            for (let k = 0; k < c; k++) {
              const key = cellKey([i, j, k]);
              const v = cellMeans[key];
              if (Number.isFinite(v)) {
                cells.push({ aLevel: aLevels[i], bLevel: bLevels[j], cLevel: cLevels![k], mean: v, aIdx: i, bIdx: j, cIdx: k });
              }
            }
          }
        }
      } else {
        for (let i = 0; i < a; i++) {
          for (let j = 0; j < b; j++) {
            const key = cellKey([i, j]);
            const v = cellMeans[key];
            if (Number.isFinite(v)) {
              cells.push({ aLevel: aLevels[i], bLevel: bLevels[j], mean: v, aIdx: i, bIdx: j });
            }
          }
        }
      }
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const diff = cells[i].mean - cells[j].mean;
          const tVal = seCell > 0 ? diff / seCell : NaN;
          const pVal = tDistPValue(Math.abs(tVal), dfErr);
          const d = mse > 0 ? diff / Math.sqrt(mse) : NaN;
          interactionPairs.push({
            aL1: cells[i].aLevel, bL1: cells[i].bLevel, cL1: cells[i].cLevel,
            aL2: cells[j].aLevel, bL2: cells[j].bLevel, cL2: cells[j].cLevel,
            aIdx1: cells[i].aIdx, bIdx1: cells[i].bIdx, cIdx1: cells[i].cIdx,
            aIdx2: cells[j].aIdx, bIdx2: cells[j].bIdx, cIdx2: cells[j].cIdx,
            diff, se: seCell, t: tVal, p: pVal, d,
          });
        }
      }
    }

    const renderInteractionTable = () => {
      // Group rows by first cell for visual grouping
      const groupKeyFn = (pr: typeof interactionPairs[0]) =>
        is3Way ? `${pr.aL1}|${pr.bL1}|${pr.cL1 ?? ''}` : `${pr.aL1}|${pr.bL1}`;
      const groups: Map<string, typeof interactionPairs> = new Map();
      interactionPairs.forEach((pr) => {
        const key = groupKeyFn(pr);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(pr);
      });

      const headerLabel = is3Way ? `${aLabel} * ${bLabel} * ${cLabel}` : `${aLabel} * ${bLabel}`;
      const leftColCount = is3Way ? 3 : 2;
      const rightColCount = is3Way ? 3 : 2;

      return (
        <div>
          <h4 className="px-4 pt-3 pb-2 font-semibold text-slate-800">
            Post Hoc Comparisons &ndash; {headerLabel}
          </h4>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-t border-slate-200">
                <th colSpan={leftColCount + 1} className="px-4 py-1 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide"></th>
                <th colSpan={rightColCount} className="px-4 py-1 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Comparison</th>
                <th colSpan={5} className="px-4 py-1"></th>
              </tr>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{aLabel}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{bLabel}</th>
                {is3Way && <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{cLabel}</th>}
                <th className="px-1 py-2 text-center text-slate-300"></th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{aLabel}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{bLabel}</th>
                {is3Way && <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{cLabel}</th>}
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Mean Diff</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">SE</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">df</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">t</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">p<sub>tukey</sub></th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Cohen&apos;s d</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(groups.entries()).map(([groupKey, rows], gi) => {
                const parts = groupKey.split('|');
                return rows.map((pr, ri) => {
                  const hoverKey = is3Way
                    ? `posthoc-cell-${pr.aIdx1}-${pr.bIdx1}-${pr.cIdx1 ?? 0}-${pr.aIdx2}-${pr.bIdx2}-${pr.cIdx2 ?? 0}`
                    : `posthoc-cell-${pr.aIdx1}-${pr.bIdx1}-${pr.aIdx2}-${pr.bIdx2}`;
                  return (
                  <tr key={`${gi}-${ri}`}
                    className={`cursor-pointer transition-colors duration-150 ${ri === 0 && gi > 0 ? 'border-t border-slate-200' : ''} ${highlightSource === hoverKey ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'hover:bg-slate-50/60'}`}
                    onMouseEnter={() => setHighlightSource(hoverKey)}
                    onMouseLeave={() => setHighlightSource(null)}>
                    {ri === 0 && (
                      <td className="px-3 py-1.5 text-xs font-semibold text-slate-600" rowSpan={rows.length}>{parts[0]}</td>
                    )}
                    {ri === 0 && (
                      <td className="px-3 py-1.5 text-xs text-slate-600" rowSpan={rows.length}>{parts[1]}</td>
                    )}
                    {is3Way && ri === 0 && (
                      <td className="px-3 py-1.5 text-xs text-slate-600" rowSpan={rows.length}>{parts[2]}</td>
                    )}
                    <td className="px-1 py-1.5 text-center text-slate-300 text-xs">&ndash;</td>
                    <td className="px-3 py-1.5 text-xs text-slate-600">{pr.aL2}</td>
                    <td className="px-3 py-1.5 text-xs text-slate-600">{pr.bL2}</td>
                    {is3Way && <td className="px-3 py-1.5 text-xs text-slate-600">{pr.cL2}</td>}
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-slate-700">{fmt3(pr.diff)}</td>
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-slate-600">{fmt3(pr.se)}</td>
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-slate-600">{dfErr}</td>
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-slate-600">{fmt3(pr.t)}</td>
                    <td className={`px-3 py-1.5 text-right text-xs tabular-nums ${pr.p < 0.05 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{formatP(pr.p)}</td>
                    <td className="px-3 py-1.5 text-right text-xs tabular-nums text-slate-600">{fmt3(pr.d)}</td>
                  </tr>
                  );
                });
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-[10px] text-slate-400 italic">Note. Comparisons are based on estimated marginal means</p>
        </div>
      );
    };

    const renderTable = (title: string, pairs: typeof aPairs, factor: 'A' | 'B' | 'C') => (
      <div>
        <h4 className="px-4 pt-3 pb-2 font-semibold text-slate-800">{title}</h4>
        <table className="min-w-full text-sm">
          <thead className="border-t border-b border-slate-200">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Level 1</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Level 2</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Mean Diff</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">SE</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">df</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">t</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">p<sub>tukey</sub></th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Cohen's d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pairs.map((pr, idx) => {
              const hoverKey = `posthoc-${factor}-${pr.i1}-${pr.i2}`;
              return (
              <tr key={idx}
                  className={`cursor-pointer transition-colors duration-150 ${highlightSource === hoverKey ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'hover:bg-slate-50/60'}`}
                  onMouseEnter={() => setHighlightSource(hoverKey)}
                  onMouseLeave={() => setHighlightSource(null)}>
                <td className="px-4 py-2 text-slate-700">{pr.l1}</td>
                <td className="px-4 py-2 text-slate-700">{pr.l2}</td>
                <td className="px-4 py-2 text-right text-slate-600">{fmt3(pr.diff)}</td>
                <td className="px-4 py-2 text-right text-slate-600">{fmt3(pr.se)}</td>
                <td className="px-4 py-2 text-right text-slate-600">{dfErr}</td>
                <td className="px-4 py-2 text-right text-slate-600">{fmt3(pr.t)}</td>
                <td className="px-4 py-2 text-right text-slate-600">{formatP(pr.p)}</td>
                <td className="px-4 py-2 text-right text-slate-600">{fmt3(pr.d)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

    // Determine when post hocs are needed
    // Determine when post hocs are needed
    const pAVal = summary ? fDistPValue(summary.fA, summary.dfA, summary.dfError) : NaN;
    const pBVal = summary ? fDistPValue(summary.fB, summary.dfB, summary.dfError) : NaN;
    const needsPostHocA = !!summary && a > 2 && Number.isFinite(pAVal) && pAVal < 0.05;
    const needsPostHocB = !!summary && b > 2 && Number.isFinite(pBVal) && pBVal < 0.05;
    const intPValPH = summary ? fDistPValue(summary.fAB, summary.dfAB, summary.dfError) : NaN;
    const intSigPH = Number.isFinite(intPValPH) && intPValPH < 0.05;

    return (
      <div className="bg-white border border-slate-200  shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Post Hoc Tests</h3>
          <span className="text-[11px] text-slate-400">Pairwise comparisons of marginal means (n = 20/cell)</span>
        </div>
        <div className="overflow-x-auto">
          <div className="space-y-4 text-sm text-slate-800">
            {renderTable(`Post Hoc Comparisons – ${aLabel}`, aPairs, 'A')}
            {renderTable(`Post Hoc Comparisons – ${bLabel}`, bPairs, 'B')}
            {is3Way && cPairs.length > 0 && renderTable(`Post Hoc Comparisons – ${cLabel}`, cPairs, 'C')}
            {interactionPairs.length > 0 && renderInteractionTable()}
          </div>
        </div>
        {/* Post Hoc Logic Explanation */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/80">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">When are post hoc tests needed?</p>
          <ul className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className={`mt-0.5 text-[10px] ${needsPostHocA ? 'text-green-600' : 'text-slate-300'}`}>{needsPostHocA ? '✓' : '○'}</span>
              <span><strong>Significant main effect with &gt;2 levels</strong> {' — '}{a > 2 ? `${aLabel} has ${a} levels. ` : `${aLabel} has only 2 levels (post hoc = the main effect). `}{needsPostHocA ? 'Post hoc needed to identify which pairs differ.' : a > 2 ? 'Main effect not significant, post hocs not warranted.' : ''}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className={`mt-0.5 text-[10px] ${needsPostHocB ? 'text-green-600' : 'text-slate-300'}`}>{needsPostHocB ? '✓' : '○'}</span>
              <span><strong>Factor B</strong> {' — '}{b > 2 ? `${bLabel} has ${b} levels. ` : `${bLabel} has only 2 levels (post hoc = the main effect). `}{needsPostHocB ? 'Post hoc needed.' : b > 2 ? 'Main effect not significant.' : ''}</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className={`mt-0.5 text-[10px] ${intSigPH ? 'text-green-600' : 'text-slate-300'}`}>{intSigPH ? '✓' : '○'}</span>
              <span><strong>Significant interaction</strong> {' — '}{intSigPH ? 'The interaction is significant. Follow up with simple effects analysis to understand WHERE the interaction occurs.' : 'Interaction not significant. Main effects can be interpreted directly.'}</span>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  const renderEstimatedMarginalMeansCard = (
    aLabel: string,
    bLabel: string,
    aLevels: string[],
    bLevels: string[],
    summary: TwoWayAnovaSummary | null
  ) => {
    const [rows, cols] = config.levels;
    const sigma2 = 100;
    const nPerCell = 20;
    const se = Math.sqrt(sigma2 / nPerCell); // SE of each cell mean
    const tCrit = 1.96; // approx t-crit for df_error → large sample
    const dvLabel = activeExample?.dvLabel ?? 'Outcome';

    // Build cell-level rows grouped by Factor B (like the Jamovi screenshot)
    const emmRows: { bLevel: string; aLevel: string; mean: number; se: number; lower: number; upper: number; rIdx: number; cIdx: number }[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const key = cellKey([r, c]);
        const m = cellMeans[key];
        if (Number.isFinite(m)) {
          emmRows.push({
            bLevel: bLevels[c],
            aLevel: aLevels[r],
            mean: m,
            se,
            lower: m - tCrit * se,
            upper: m + tCrit * se,
            rIdx: r,
            cIdx: c,
          });
        }
      }
    }

    if (!emmRows.length) return null;

    // Determine where to draw group separators (between Factor B groups)
    const groupBoundaries = new Set<number>();
    for (let i = 1; i < emmRows.length; i++) {
      if (emmRows[i].bLevel !== emmRows[i - 1].bLevel) groupBoundaries.add(i);
    }

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Estimated Marginal Means</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
            {aLabel} * {bLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-800">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide" rowSpan={2}>{bLabel}</th>
                <th className="px-4 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide" rowSpan={2}>{aLabel}</th>
                <th className="px-4 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide" rowSpan={2}>Mean</th>
                <th className="px-4 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide" rowSpan={2}>SE</th>
                <th className="px-4 py-1.5 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide border-b-0" colSpan={2}>95% Confidence Interval</th>
              </tr>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-1 text-center text-[10px] font-semibold text-slate-400 tracking-wide">Lower</th>
                <th className="px-4 py-1 text-center text-[10px] font-semibold text-slate-400 tracking-wide">Upper</th>
              </tr>
            </thead>
            <tbody>
              {emmRows.map((row, i) => {
                const isFirstInGroup = i === 0 || groupBoundaries.has(i);
                const groupSize = (() => {
                  let count = 0;
                  for (let j = i; j < emmRows.length && emmRows[j].bLevel === row.bLevel; j++) count++;
                  return count;
                })();
                const hoverKey = `emm-${row.rIdx}-${row.cIdx}`;
                return (
                  <tr key={i}
                    className={`cursor-pointer transition-colors duration-150 ${groupBoundaries.has(i) ? 'border-t border-slate-200' : ''} ${highlightSource === hoverKey ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : 'hover:bg-slate-50/60'}`}
                    onMouseEnter={() => setHighlightSource(hoverKey)}
                    onMouseLeave={() => setHighlightSource(null)}>
                    {isFirstInGroup && (
                      <td className="px-4 py-1.5 text-xs font-semibold text-slate-600" rowSpan={groupSize}>
                        {row.bLevel}
                      </td>
                    )}
                    <td className="px-4 py-1.5 text-xs text-slate-600">{row.aLevel}</td>
                    <td className="px-4 py-1.5 text-center text-xs font-bold tabular-nums text-slate-800">{row.mean.toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-center text-xs tabular-nums text-slate-600">{row.se.toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-center text-xs tabular-nums text-slate-500">{row.lower.toFixed(2)}</td>
                    <td className="px-4 py-1.5 text-center text-xs tabular-nums text-slate-500">{row.upper.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEffectPlotsCard = (
    rows: number,
    cols: number,
    aLabel: string,
    bLabel: string,
    aLevels: string[],
    bLevels: string[]
  ) => {
    const { rowMeans, colMeans } = computeMarginalMeans2D(cellMeans, rows, cols);
    const dvLabel = activeExample?.dvLabel ?? 'Outcome';
    const sigma2 = 100;
    const nPerCell = 20;
    const tCrit2 = 1.96;
    const seA = Math.sqrt(sigma2 / (nPerCell * cols));
    const seB = Math.sqrt(sigma2 / (nPerCell * rows));

    const dotColors = ['#4f46e5', '#0891b2', '#059669', '#7c3aed', '#dc2626', '#d97706'];

    const renderDotCIChart = (
      means: (number | null)[],
      labels: string[],
      factorLabel: string,
      seVal: number
    ) => {
      const validVals = means.filter((v): v is number => v !== null);
      if (!validVals.length) return null;
      const w = 320, h = 220;
      const ml = 52, mr = 16, mt = 16, mb = 44;
      const pw = w - ml - mr, ph = h - mt - mb;

      const ciMax = Math.max(...validVals.map(v => v + tCrit2 * seVal));
      const ciMin = Math.min(...validVals.map(v => v - tCrit2 * seVal));
      const range = (ciMax - ciMin) || 1;
      const pad = range * 0.25;
      const dMin = ciMin - pad, dMax = ciMax + pad;
      const scY = (v: number) => mt + (1 - (v - dMin) / (dMax - dMin)) * ph;

      const niceStep = (rng: number) => { const r2 = rng / 5; const m2 = Math.pow(10, Math.floor(Math.log10(r2))); const f2 = r2 / m2; if (f2 <= 1.5) return m2; if (f2 <= 3.5) return 2 * m2; if (f2 <= 7.5) return 5 * m2; return 10 * m2; };
      const step = niceStep(dMax - dMin);
      const ticks: number[] = [];
      for (let t = Math.ceil(dMin / step) * step; t <= dMax; t += step) ticks.push(t);

      return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 220 }}>
          {/* Grid */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={ml} y1={scY(t)} x2={ml + pw} y2={scY(t)} stroke="#e2e8f0" strokeWidth={0.5} />
              <text x={ml - 8} y={scY(t) + 3.5} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(t * 10) / 10}</text>
            </g>
          ))}
          <line x1={ml} y1={mt} x2={ml} y2={mt + ph} stroke="#94a3b8" strokeWidth={1} />
          <line x1={ml} y1={mt + ph} x2={ml + pw} y2={mt + ph} stroke="#94a3b8" strokeWidth={1} />
          {/* Y-axis label */}
          <text x={14} y={mt + ph / 2} textAnchor="middle" fontSize={10} fontWeight={600} fill="#475569" transform={`rotate(-90,14,${mt + ph / 2})`}>{dvLabel}</text>
          {/* X-axis label */}
          <text x={ml + pw / 2} y={h - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#475569">{factorLabel}</text>
          {/* Dots + CI */}
          {validVals.map((v, i) => {
            const x = ml + pw * (i + 0.5) / validVals.length;
            const color = dotColors[i % dotColors.length];
            const upper = v + tCrit2 * seVal;
            const lower = v - tCrit2 * seVal;
            return (
              <g key={i}>
                {/* CI whisker */}
                <line x1={x} y1={scY(upper)} x2={x} y2={scY(lower)} stroke={color} strokeWidth={2} opacity={0.5} style={{ transition: 'y1 300ms ease, y2 300ms ease' }} />
                <line x1={x - 6} y1={scY(upper)} x2={x + 6} y2={scY(upper)} stroke={color} strokeWidth={2} opacity={0.5} />
                <line x1={x - 6} y1={scY(lower)} x2={x + 6} y2={scY(lower)} stroke={color} strokeWidth={2} opacity={0.5} />
                {/* Dot */}
                <circle cx={x} cy={scY(v)} r={6} fill={color} stroke="white" strokeWidth={1.5} style={{ transition: 'cy 300ms ease' }} />
                {/* Mean label */}
                <text x={x} y={scY(upper) - 7} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{v.toFixed(1)}</text>
                {/* X-axis level label */}
                <text x={x} y={mt + ph + 16} textAnchor="middle" fontSize={10} fontWeight={600} fill="#334155">{labels[i]}</text>
              </g>
            );
          })}
        </svg>
      );
    };

    // Two main effect plots side by side
    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Main Effects</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Marginal means with 95% confidence intervals</p>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-slate-200">
          <div className="px-3 py-3">
            <p className="text-[11px] font-bold text-slate-600 mb-1 text-center uppercase tracking-wide">{aLabel}</p>
            {renderDotCIChart(rowMeans, aLevels, aLabel, seA)}
          </div>
          <div className="px-3 py-3">
            <p className="text-[11px] font-bold text-slate-600 mb-1 text-center uppercase tracking-wide">{bLabel}</p>
            {renderDotCIChart(colMeans, bLevels, bLabel, seB)}
          </div>
        </div>
      </div>
    );
  };

  const renderCellMeansPanel = () => {
    const [rows, cols] = config.levels;
    const aLevels = parseLevels(factorALevelsText, rows, factorALabel);
    const bLevels = parseLevels(factorBLevelsText, cols, factorBLabel);
    const seriesColors = ['#2563eb', '#15803d', '#16a34a', '#7c3aed'];

    if (config.id === '2x2x2') {
      const cLabel = activeExample?.factorCLabel ?? 'Factor C';
      const cLevels = activeExample?.factorCLevels ?? ['C1', 'C2'];
      return (
        <div className="space-y-4">
          {[0, 1].map((cLevel) => {
            const rm: (number | null)[] = [];
            const cm: (number | null)[] = [];
            for (let r = 0; r < rows; r++) {
              const vs: number[] = [];
              for (let c = 0; c < cols; c++) { const v = cellMeans[cellKey([r, c, cLevel])]; if (Number.isFinite(v)) vs.push(v); }
              rm[r] = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
            }
            for (let c = 0; c < cols; c++) {
              const vs: number[] = [];
              for (let r = 0; r < rows; r++) { const v = cellMeans[cellKey([r, c, cLevel])]; if (Number.isFinite(v)) vs.push(v); }
              cm[c] = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
            }
            const all: number[] = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const v = cellMeans[cellKey([r, c, cLevel])]; if (Number.isFinite(v)) all.push(v); }
            const gm = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
            return (
              <div key={cLevel}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{cLabel}: {cLevels[cLevel]}</p>
                <table className="w-full text-xs border-collapse border border-slate-200 rounded">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-1.5 py-1 text-left text-[10px] font-semibold text-slate-500">{factorALabel}</th>
                      {bLevels.map((b, i) => (<th key={i} className="px-1 py-1 text-center text-[10px] font-semibold text-slate-500">{b}</th>))}
                      <th className="px-1 py-1 text-center text-[10px] text-slate-400 border-l border-slate-200">M</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rows }).map((_, r) => {
                      const color = seriesColors[r % seriesColors.length];
                      return (
                        <tr key={r} className="border-b border-slate-100">
                          <td className="px-1.5 py-1 text-[10px] font-semibold text-slate-600">
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: color }} />
                            {aLevels[r]}
                          </td>
                          {Array.from({ length: cols }).map((_, c) => {
                            const key = cellKey([r, c, cLevel]);
                            const val = cellMeans[key];
                            const numVal = Number.isFinite(val) ? val : 50;
                            return (
                              <td key={c} className="px-1 py-2">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button type="button" onClick={() => handleMeanChange([r, c], String(Math.max(0, numVal - 1)), cLevel)}
                                    className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-[10px] leading-none">
                                    <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                  <span className="text-xs font-bold tabular-nums min-w-[1.5rem] text-center" style={{ color }}>{Number.isFinite(val) ? val : '—'}</span>
                                  <button type="button" onClick={() => handleMeanChange([r, c], String(Math.min(100, numVal + 1)), cLevel)}
                                    className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-[10px] leading-none">
                                    <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-1 py-1 text-center text-[10px] font-semibold text-slate-600 bg-slate-50 border-l border-slate-200">{rm[r] !== null ? rm[r]!.toFixed(1) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="px-1.5 py-1 text-[10px] text-slate-400 font-semibold">M</td>
                      {Array.from({ length: cols }).map((_, c) => (
                        <td key={c} className="px-1 py-1 text-center text-[10px] font-semibold text-slate-600">{cm[c] !== null ? cm[c]!.toFixed(1) : '—'}</td>
                      ))}
                      <td className="px-1 py-1 text-center text-[10px] font-bold text-slate-800 bg-slate-100 border-l border-slate-200">{gm !== null ? gm.toFixed(1) : '—'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      );
    }

    // 2-factor designs
    const { rowMeans, colMeans, grandMean } = computeMarginalMeans2D(cellMeans, rows, cols);

    return (
      <div>
        <table className="w-full text-xs border-collapse border border-slate-300 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-100">
              <th className="bg-slate-100" style={{ borderLeftStyle: 'hidden', borderRightStyle: 'hidden' }} />
              <th></th>
              <th colSpan={bLevels.length} className="px-3 pt-2 pb-0 text-center font-bold text-slate-500 uppercase tracking-widest text-[10px] border-l border-slate-300">{factorBLabel}</th>
              <th className="bg-indigo-100 border-l-2 border-indigo-300"></th>
            </tr>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="px-1 py-2 bg-slate-100" style={{ borderLeftStyle: 'hidden', borderRightStyle: 'hidden' }} />
              <th className="px-3 py-2 text-left font-bold text-slate-700 uppercase tracking-wide text-[11px]"></th>
              {bLevels.map((b, i) => (
                <th key={i} className="px-3 py-2 text-center font-bold text-slate-700 uppercase tracking-wide text-[11px] border-l border-slate-300">{b}</th>
              ))}
              <th className="px-3 py-2 text-center font-bold text-indigo-700 text-[11px] bg-indigo-100 border-l-2 border-indigo-300">
                M<sub>row</sub>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => {
              const color = seriesColors[r % seriesColors.length];
              return (
                <tr key={r} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  {r === 0 && (
                    <td rowSpan={rows} className="bg-slate-100 relative" style={{ width: '2.5rem', minWidth: '2.5rem', borderLeftStyle: 'hidden', borderRightStyle: 'hidden', borderTopStyle: 'hidden', borderBottomStyle: 'hidden' }}>
                      <span className="absolute top-1/2 left-1/2 font-bold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap"
                        style={{ transform: 'translate(-50%, -50%) rotate(-90deg)', transformOrigin: 'center center' }}>
                        {factorALabel}
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-3 font-bold text-slate-700 text-[11px] whitespace-nowrap bg-slate-50/60">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span>{aLevels[r]}</span>
                    </div>
                  </td>
                  {Array.from({ length: cols }).map((_, c) => {
                    const key = cellKey([r, c]);
                    const val = cellMeans[key];
                    const numVal = Number.isFinite(val) ? val : 50;
                    return (
                      <td key={c} className="px-2 py-3 border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => handleMeanChange([r, c], String(Math.max(0, numVal - 1)))}
                            className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <span className="text-lg font-black tabular-nums leading-tight min-w-[2.5rem] text-center" style={{ color }}>{Number.isFinite(val) ? val : '—'}</span>
                          <button type="button" onClick={() => handleMeanChange([r, c], String(Math.min(100, numVal + 1)))}
                            className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center text-sm font-black text-indigo-700 bg-indigo-50 border-l-2 border-indigo-300 tabular-nums">
                    {rowMeans[r] !== null ? rowMeans[r]!.toFixed(1) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-indigo-300 bg-indigo-100">
              <td className="bg-slate-100" style={{ borderLeftStyle: 'hidden', borderRightStyle: 'hidden' }}></td>
              <td className="px-3 py-2 font-black text-indigo-700 text-[11px] uppercase">
                M<sub>col</sub>
              </td>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-3 py-2 text-center text-sm font-black text-indigo-700 tabular-nums border-l border-indigo-200">
                  {colMeans[c] !== null ? colMeans[c]!.toFixed(1) : '—'}
                </td>
              ))}
              <td className="px-3 py-2 text-center text-sm font-black text-white bg-indigo-600 border-l-2 border-indigo-300 tabular-nums">
                {grandMean !== null ? grandMean.toFixed(1) : '—'}
              </td>
            </tr>
          </tfoot>
        </table>


      </div>
    );
  };

  const renderContent = () => {
    const [rows, cols] = config.levels;

    const aLevels = parseLevels(factorALevelsText, rows, factorALabel);
    const bLevels = parseLevels(factorBLevelsText, cols, factorBLabel);

    if (config.id === '2x2x2') {
      const cLabel = activeExample?.factorCLabel ?? 'Factor C';
      const cLevels =
        activeExample?.factorCLevels ?? Array.from({ length: 2 }, (_, i) => `C${i + 1}`);
      const dvLabel = activeExample?.dvLabel ?? 'Outcome';
      const seriesColors = ['#2563eb', '#15803d', '#16a34a', '#7c3aed'];

      // Collect all cell values for unified Y-axis
      const allVals3: number[] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          for (let k = 0; k < 2; k++) {
            const v = cellMeans[cellKey([r, c, k])];
            if (Number.isFinite(v)) allVals3.push(v);
          }
      if (!allVals3.length) return <div className="text-sm text-slate-500 p-6">Enter cell means to see results.</div>;

      let y3Min = Math.min(...allVals3);
      let y3Max = Math.max(...allVals3);
      const y3Pad = (y3Max - y3Min || 1) * 0.15;
      y3Min -= y3Pad;
      y3Max += y3Pad;

      // Y-axis ticks
      const y3Range = y3Max - y3Min;
      const y3Step = y3Range > 0 ? (() => {
        const rough = y3Range / 5;
        const mag2 = Math.pow(10, Math.floor(Math.log10(rough)));
        const res = rough / mag2;
        if (res <= 1.5) return mag2;
        if (res <= 3) return 2 * mag2;
        if (res <= 7) return 5 * mag2;
        return 10 * mag2;
      })() : 1;
      const y3Ticks: number[] = [];
      { let t = Math.ceil(y3Min / y3Step) * y3Step; while (t <= y3Max) { y3Ticks.push(t); t += y3Step; } }

      // Interaction plot per C level — side by side
      const plotW = 280, plotH = 220;
      const pml = 44, pmr = 14, pmt = 24, pmb = 44;
      const ppw = plotW - pml - pmr, pph = plotH - pmt - pmb;
      const pScaleX = (i: number) => {
        const inset = ppw * 0.2;
        return pml + inset + (i / Math.max(1, cols - 1)) * (ppw - 2 * inset);
      };
      const pScaleY = (v: number) => pmt + (1 - (v - y3Min) / (y3Max - y3Min || 1)) * pph;

      // Interaction diagnosis per C level
      const diagnoseInteraction = (cIdx: number) => {
        const m00 = cellMeans[cellKey([0, 0, cIdx])] ?? 0;
        const m01 = cellMeans[cellKey([0, 1, cIdx])] ?? 0;
        const m10 = cellMeans[cellKey([1, 0, cIdx])] ?? 0;
        const m11 = cellMeans[cellKey([1, 1, cIdx])] ?? 0;
        const effectA_atB1 = m00 - m10;
        const effectA_atB2 = m01 - m11;
        if (Math.sign(effectA_atB1) !== Math.sign(effectA_atB2) && Math.abs(effectA_atB1) > 1 && Math.abs(effectA_atB2) > 1)
          return { type: 'crossover', desc: `Crossover: effect of ${factorALabel} reverses across ${factorBLabel} when ${cLabel} = ${cLevels[cIdx]}.` };
        if (Math.abs(effectA_atB1 - effectA_atB2) > 3)
          return { type: 'ordinal', desc: `Ordinal: effect of ${factorALabel} differs in strength across ${factorBLabel} when ${cLabel} = ${cLevels[cIdx]}.` };
        return { type: 'none', desc: `No interaction: effect of ${factorALabel} is similar across ${factorBLabel} when ${cLabel} = ${cLevels[cIdx]}.` };
      };

      // Three-way interaction diagnosis
      const diag0 = diagnoseInteraction(0);
      const diag1 = diagnoseInteraction(1);
      const patternsMatch = diag0.type === diag1.type;
      const threeWayDesc = patternsMatch
        ? `The A×B interaction pattern is similar at both levels of ${cLabel} — suggesting no three-way interaction.`
        : `The A×B interaction pattern DIFFERS between ${cLevels[0]} and ${cLevels[1]} — evidence of a three-way interaction.`;
      const threeWayColor = patternsMatch ? '#64748b' : '#7c3aed';
      const threeWayIcon = patternsMatch ? '○' : '✓';
      const threeWayLabel = patternsMatch ? 'No Three-Way Interaction' : 'Three-Way Interaction Detected';

      // A×B p-value, A×B×C p-value
      const s3 = anovaSummary && 'ssC' in anovaSummary ? (anovaSummary as any) : null;
      const abPVal = anovaSummary ? fDistPValue(anovaSummary.fAB, anovaSummary.dfAB, anovaSummary.dfError) : NaN;
      const abSig = Number.isFinite(abPVal) && abPVal < 0.05;
      const abcPVal = s3 ? fDistPValue(s3.fABC, s3.dfABC, anovaSummary!.dfError) : NaN;
      const abcSig = Number.isFinite(abcPVal) && abcPVal < 0.05;

      // Marginal means for main effects (across all 8 cells)
      const aMarginals: (number | null)[] = [];
      for (let r = 0; r < rows; r++) {
        const vs: number[] = [];
        for (let c = 0; c < cols; c++) for (let k = 0; k < 2; k++) { const v = cellMeans[cellKey([r, c, k])]; if (Number.isFinite(v)) vs.push(v); }
        aMarginals.push(vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null);
      }
      const bMarginals: (number | null)[] = [];
      for (let c = 0; c < cols; c++) {
        const vs: number[] = [];
        for (let r = 0; r < rows; r++) for (let k = 0; k < 2; k++) { const v = cellMeans[cellKey([r, c, k])]; if (Number.isFinite(v)) vs.push(v); }
        bMarginals.push(vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null);
      }
      const cMarginals: (number | null)[] = [];
      for (let k = 0; k < 2; k++) {
        const vs: number[] = [];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const v = cellMeans[cellKey([r, c, k])]; if (Number.isFinite(v)) vs.push(v); }
        cMarginals.push(vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null);
      }

      const sigma2 = 100;
      const nPerCell = 20;
      const tCrit = 1.96;
      const seA3 = Math.sqrt(sigma2 / (nPerCell * cols * 2));
      const seB3 = Math.sqrt(sigma2 / (nPerCell * rows * 2));
      const seC3 = Math.sqrt(sigma2 / (nPerCell * rows * cols));

      // Dot + CI chart renderer for 3-way main effects
      const renderDotCI = (means: (number | null)[], labels: string[], factorLabel2: string, se2: number) => {
        const w2 = 240, h2 = 200;
        const ml2 = 44, mr2 = 14, mt2 = 14, mb2 = 48;
        const pw2 = w2 - ml2 - mr2, ph2 = h2 - mt2 - mb2;
        const validVals = means.filter((v): v is number => v !== null);
        if (!validVals.length) return null;
        const ciMax = Math.max(...validVals.map(v => v + tCrit * se2));
        const ciMin = Math.min(...validVals.map(v => v - tCrit * se2));
        const range2 = (ciMax - ciMin) || 1;
        const pad2 = range2 * 0.2;
        const dMin = ciMin - pad2, dMax = ciMax + pad2;
        const scY2 = (v: number) => mt2 + (1 - (v - dMin) / (dMax - dMin)) * ph2;
        const dotColors = ['#4f46e5', '#0891b2', '#059669', '#7c3aed'];

        const niceStep2 = (rng: number) => { const r2 = rng / 4; const m2 = Math.pow(10, Math.floor(Math.log10(r2))); const f2 = r2 / m2; if (f2 <= 1.5) return m2; if (f2 <= 3.5) return 2 * m2; if (f2 <= 7.5) return 5 * m2; return 10 * m2; };
        const st2 = niceStep2(dMax - dMin);
        const ticks2: number[] = [];
        for (let t = Math.ceil(dMin / st2) * st2; t <= dMax; t += st2) ticks2.push(t);

        return (
          <svg viewBox={`0 0 ${w2} ${h2}`} className="w-full" style={{ height: h2 }}>
            {ticks2.map((t) => (
              <g key={t}>
                <line x1={ml2} y1={scY2(t)} x2={ml2 + pw2} y2={scY2(t)} stroke="#e2e8f0" strokeWidth={0.5} />
                <text x={ml2 - 6} y={scY2(t) + 3} textAnchor="end" fontSize={8} fill="#94a3b8">{Math.round(t * 10) / 10}</text>
              </g>
            ))}
            <line x1={ml2} y1={mt2} x2={ml2} y2={mt2 + ph2} stroke="#94a3b8" strokeWidth={1} />
            <line x1={ml2} y1={mt2 + ph2} x2={ml2 + pw2} y2={mt2 + ph2} stroke="#94a3b8" strokeWidth={1} />
            {validVals.map((v, i) => {
              const x = ml2 + pw2 * (i + 0.5) / validVals.length;
              const color = dotColors[i % dotColors.length];
              const upper = v + tCrit * se2;
              const lower = v - tCrit * se2;
              return (
                <g key={i}>
                  <line x1={x} y1={scY2(upper)} x2={x} y2={scY2(lower)} stroke={color} strokeWidth={2} opacity={0.5} style={{ transition: 'y1 300ms ease, y2 300ms ease' }} />
                  <line x1={x - 5} y1={scY2(upper)} x2={x + 5} y2={scY2(upper)} stroke={color} strokeWidth={2} opacity={0.5} />
                  <line x1={x - 5} y1={scY2(lower)} x2={x + 5} y2={scY2(lower)} stroke={color} strokeWidth={2} opacity={0.5} />
                  <circle cx={x} cy={scY2(v)} r={5} fill={color} stroke="white" strokeWidth={1.5} style={{ transition: 'cy 300ms ease' }} />
                  <text x={x} y={scY2(upper) - 6} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>{v.toFixed(1)}</text>
                  <text x={x} y={mt2 + ph2 + 14} textAnchor="middle" fontSize={9} fontWeight={600} fill="#334155">{labels[i]}</text>
                </g>
              );
            })}
            {/* Y-axis label */}
            <text x={10} y={mt2 + ph2 / 2} textAnchor="middle" fontSize={9} fontWeight={600} fill="#475569" transform={`rotate(-90,10,${mt2 + ph2 / 2})`}>{dvLabel}</text>
            {/* X-axis label */}
            <text x={ml2 + pw2 / 2} y={h2 - 6} textAnchor="middle" fontSize={9} fontWeight={600} fill="#475569">{factorLabel2}</text>
          </svg>
        );
      };

      // Highlight helpers for 3-way plots
      const get3PointOpacity = (r: number, c: number): number => {
        if (!highlightSource) return 1;
        if (highlightSource === 'main-A' || highlightSource === 'main-B' || highlightSource === 'main-C') return 1;
        if (highlightSource === 'interaction' || highlightSource === 'int-AC' || highlightSource === 'int-BC' || highlightSource === 'int-ABC') return 1;
        const me = highlightSource.match(/^emm-(\d+)-(\d+)$/);
        if (me) return (r === +me[1] && c === +me[2]) ? 1 : 0.12;
        return 1;
      };
      const get3PointGlow = (r: number, c: number): boolean => {
        if (!highlightSource) return false;
        if (highlightSource === 'main-B' || highlightSource === 'main-C') return true;
        if (highlightSource === 'interaction' || highlightSource === 'int-AC' || highlightSource === 'int-BC' || highlightSource === 'int-ABC') return true;
        const me = highlightSource.match(/^emm-(\d+)-(\d+)$/);
        if (me) return r === +me[1] && c === +me[2];
        return false;
      };
      const get3LineOpacity = (r: number): number => {
        if (!highlightSource) return 1;
        if (highlightSource === 'main-A') return 1;
        if (highlightSource === 'main-B' || highlightSource === 'main-C') return 0.15;
        if (highlightSource === 'interaction' || highlightSource === 'int-AC' || highlightSource === 'int-BC' || highlightSource === 'int-ABC') return 0.15;
        if (highlightSource.startsWith('emm-')) return 0.15;
        const m = highlightSource.match(/^posthoc-A-(\d+)-(\d+)$/);
        if (m) return (r === +m[1] || r === +m[2]) ? 1 : 0.12;
        return 1;
      };

      return (
        <div className="space-y-5">
          {/* ── Side-by-side interaction plots (one per C level) ── */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Interaction Plots by {cLabel}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                  A×B interaction at each level of {cLabel} &mdash; DV: {dvLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {s3 && (
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wide text-center leading-relaxed ${abcSig ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-400'}`}>
                    {factorALabel} {'×'} {factorBLabel} {'×'} {cLabel}<br />
                    F = {s3.fABC.toFixed(2)}, p {abcSig ? (abcPVal < 0.001 ? '<\u00a0.001' : `= ${abcPVal.toFixed(3)}`) : `= ${(abcPVal || 0).toFixed(3)}`}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-200">
              {[0, 1].map((cIdx) => (
                <div key={cIdx} className="px-3 py-3">
                  <p className="text-[11px] font-bold text-slate-600 mb-2 text-center uppercase tracking-wide">
                    {cLabel}: {cLevels[cIdx]}
                  </p>
                  <svg viewBox={`0 0 ${plotW} ${plotH}`} className="w-full" style={{ height: plotH }}>
                    <defs>
                      <filter id={`glow-3way-${cIdx}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {/* Grid */}
                    {y3Ticks.map((t) => (
                      <g key={t}>
                        <line x1={pml} y1={pScaleY(t)} x2={pml + ppw} y2={pScaleY(t)} stroke="#e2e8f0" strokeDasharray="4 2" />
                        <text x={pml - 5} y={pScaleY(t) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(t)}</text>
                      </g>
                    ))}
                    <line x1={pml} y1={pmt} x2={pml} y2={pmt + pph} stroke="#94a3b8" strokeWidth={1} />
                    <line x1={pml} y1={pmt + pph} x2={pml + ppw} y2={pmt + pph} stroke="#94a3b8" strokeWidth={1} />
                    {/* Y-axis label */}
                    <text x={10} y={pmt + pph / 2} textAnchor="middle" fontSize={9} fill="#475569" transform={`rotate(-90,10,${pmt + pph / 2})`}>{dvLabel}</text>

                    {/* Highlight overlays for main-B: vertical column bands */}
                    {highlightSource === 'main-B' && bLevels.map((_, bc) => {
                      const x = pScaleX(bc);
                      return <rect key={`col-band-${bc}`} x={x - 14} y={pmt} width={28} height={pph} fill="#06b6d4" opacity={0.06} rx={4} />;
                    })}

                    {/* Series lines */}
                    {Array.from({ length: rows }).map((_, r) => {
                      const pts = Array.from({ length: cols }, (__, c) => {
                        const v = cellMeans[cellKey([r, c, cIdx])];
                        return Number.isFinite(v) ? { x: pScaleX(c), y: pScaleY(v) } : null;
                      }).filter(Boolean) as { x: number; y: number }[];
                      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const color = seriesColors[r % seriesColors.length];
                      const lineOp = get3LineOpacity(r);
                      const glowing = highlightSource && lineOp === 1;
                      return (
                        <g key={`line-${r}`}>
                          {glowing && <path d={d} fill="none" stroke={color} strokeWidth={8} opacity={0.25} style={{ transition: 'd 300ms ease, opacity 200ms ease' }} />}
                          <path d={d} fill="none" stroke={color} strokeWidth={2.5} opacity={lineOp} style={{ transition: 'd 300ms ease, opacity 200ms ease' }} />
                        </g>
                      );
                    })}
                    {/* Data points */}
                    {Array.from({ length: rows }).map((_, r) =>
                      Array.from({ length: cols }).map((__, c) => {
                        const v = cellMeans[cellKey([r, c, cIdx])];
                        if (!Number.isFinite(v)) return null;
                        const cx = pScaleX(c);
                        const cy = pScaleY(v);
                        const color = seriesColors[r % seriesColors.length];
                        const ptOp = get3PointOpacity(r, c);
                        const ptGlow = get3PointGlow(r, c);
                        return (
                          <g key={`pt-${r}-${c}`} style={{ transition: 'opacity 200ms ease' }} opacity={ptOp}>
                            {ptGlow && <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.2} filter={`url(#glow-3way-${cIdx})`} style={{ transition: 'cx 300ms ease, cy 300ms ease' }}>
                              <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" />
                            </circle>}
                            <circle cx={cx} cy={cy} r={ptGlow ? 7 : 5} fill={color} stroke="white" strokeWidth={1.5} style={{ transition: 'cx 300ms ease, cy 300ms ease, r 200ms ease' }} />
                            <text x={cx} y={cy - (ptGlow ? 14 : 8)} textAnchor="middle" fontSize={ptGlow ? 11 : 9} fontWeight="bold" fill={color} style={{ transition: 'all 300ms ease' }}>{v}</text>
                          </g>
                        );
                      })
                    )}

                    {/* Highlight overlay: interaction gap indicators */}
                    {(highlightSource === 'interaction' || highlightSource === 'int-AC' || highlightSource === 'int-BC' || highlightSource === 'int-ABC') && Array.from({ length: cols }).map((_, bc) => {
                      const vals = Array.from({ length: rows }, (__, r) => cellMeans[cellKey([r, bc, cIdx])]).filter(Number.isFinite) as number[];
                      if (vals.length < 2) return null;
                      const minV = Math.min(...vals);
                      const maxV = Math.max(...vals);
                      const x = pScaleX(bc);
                      return (
                        <g key={`gap-${bc}`}>
                          <line x1={x} y1={pScaleY(minV)} x2={x} y2={pScaleY(maxV)} stroke="#6366f1" strokeWidth={5} opacity={0.15} />
                          <line x1={x} y1={pScaleY(minV)} x2={x} y2={pScaleY(maxV)} stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" opacity={0.7} />
                          <text x={x + 12} y={(pScaleY(minV) + pScaleY(maxV)) / 2 + 3} fontSize={9} fontWeight="bold" fill="#6366f1" opacity={0.85}>{'Δ'}{(maxV - minV).toFixed(0)}</text>
                        </g>
                      );
                    })}

                    {/* X labels */}
                    {bLevels.map((lab, i) => (
                      <text key={lab} x={pScaleX(i)} y={pmt + pph + 16} textAnchor="middle" fontSize={10} fontWeight={600} fill="#334155">{lab}</text>
                    ))}
                    {/* X-axis label */}
                    <text x={pml + ppw / 2} y={plotH - 4} textAnchor="middle" fontSize={9} fontWeight={600} fill="#475569">{factorBLabel}</text>
                    {/* Legend */}
                    {aLevels.map((lab, idx) => (
                      <g key={lab} transform={`translate(${pml + idx * 90 + 10}, ${pmt - 12})`}>
                        <line x1={0} y1={4} x2={12} y2={4} stroke={seriesColors[idx % seriesColors.length]} strokeWidth={2} />
                        <circle cx={6} cy={4} r={2.5} fill={seriesColors[idx % seriesColors.length]} />
                        <text x={16} y={7} fontSize={9} fill="#334155">{lab}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* ── Three-way interaction diagnosis card ─────────── */}
          <div className="border-2 shadow-sm overflow-hidden" style={{ borderColor: threeWayColor }}>
            <div className="flex items-start gap-3 px-5 py-4">
              <span className="text-2xl mt-0.5" style={{ color: threeWayColor }}>{threeWayIcon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-black" style={{ color: threeWayColor }}>{threeWayLabel}</span>
                  {abcSig && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 uppercase tracking-wide">Significant</span>}
                  {s3 && !abcSig && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase tracking-wide">Not Significant</span>}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{threeWayDesc}</p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="bg-slate-50 rounded px-3 py-2">
                    <span className="font-semibold">{cLevels[0]}:</span> {diag0.desc}
                  </div>
                  <div className="bg-slate-50 rounded px-3 py-2">
                    <span className="font-semibold">{cLevels[1]}:</span> {diag1.desc}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 italic">
                  The three-way interaction asks: does the A×B interaction <strong>change</strong> across levels of {cLabel}? Adjust cell means to explore.
                </p>
              </div>
            </div>
          </div>

          {/* ── Main Effects (dot + 95% CI) ──────────────────── */}
          <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Main Effects</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Marginal means with 95% CI</p>
            </div>
            <div className="grid grid-cols-3 gap-0 divide-x divide-slate-200">
              <div className="px-2 py-3">
                <p className="text-[10px] font-bold text-slate-600 mb-1 text-center uppercase tracking-wide">{factorALabel}</p>
                {renderDotCI(aMarginals, aLevels, factorALabel, seA3)}
              </div>
              <div className="px-2 py-3">
                <p className="text-[10px] font-bold text-slate-600 mb-1 text-center uppercase tracking-wide">{factorBLabel}</p>
                {renderDotCI(bMarginals, bLevels, factorBLabel, seB3)}
              </div>
              <div className="px-2 py-3">
                <p className="text-[10px] font-bold text-slate-600 mb-1 text-center uppercase tracking-wide">{cLabel}</p>
                {renderDotCI(cMarginals, cLevels, cLabel, seC3)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Interaction-focused layout for 2-factor designs ──────────────
    const dvLabel = activeExample?.dvLabel ?? 'Outcome';
    const seriesColors = ['#2563eb', '#15803d', '#16a34a', '#7c3aed'];

    // Compute interaction diagnosis
    const { rowMeans: margRowMeans, colMeans: margColMeans } = computeMarginalMeans2D(cellMeans, rows, cols);

    // Collect all finite cell values for Y-axis scaling
    const allVals: number[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const v = cellMeans[cellKey([r, c])];
        if (Number.isFinite(v)) allVals.push(v);
      }
    if (!allVals.length) return <div className="text-sm text-slate-500 p-6">Enter cell means to see results.</div>;

    let yMin = Math.min(...allVals);
    let yMax = Math.max(...allVals);
    const yPad = (yMax - yMin || 1) * 0.15;
    yMin -= yPad;
    yMax += yPad;

    // Hero interaction plot dimensions (bigger than the carousel version)
    const heroW = 460;
    const heroH = 260;
    const hml = 50;
    const hmr = 20;
    const hmt = 30;
    const hmb = 36;
    const hpw = heroW - hml - hmr;
    const hph = heroH - hmt - hmb;
    const hScaleX = (i: number, n: number) => {
      const inset = hpw * 0.15;
      const usable = hpw - 2 * inset;
      if (n <= 1) return hml + hpw / 2;
      return hml + inset + (i / (n - 1)) * usable;
    };
    const hScaleY = (v: number) => hmt + (1 - (v - yMin) / (yMax - yMin || 1)) * hph;

    // Y-axis tick marks
    const yRange = yMax - yMin;
    const yStep = yRange > 0 ? Math.pow(10, Math.floor(Math.log10(yRange))) : 1;
    const yTicks: number[] = [];
    {
      let t = Math.ceil(yMin / yStep) * yStep;
      while (t <= yMax) { yTicks.push(t); t += yStep; }
    }

    // Interaction detection
    let interactionType = 'none';
    let interactionDesc = '';
    if (rows === 2 && cols === 2) {
      const m00 = cellMeans['0-0'] ?? 0;
      const m01 = cellMeans['0-1'] ?? 0;
      const m10 = cellMeans['1-0'] ?? 0;
      const m11 = cellMeans['1-1'] ?? 0;
      const effectA_atB1 = m00 - m10;
      const effectA_atB2 = m01 - m11;
      if (Math.sign(effectA_atB1) !== Math.sign(effectA_atB2) && Math.abs(effectA_atB1) > 1 && Math.abs(effectA_atB2) > 1) {
        interactionType = 'crossover';
        interactionDesc = `Crossover interaction: the effect of ${factorALabel} reverses across levels of ${factorBLabel}. ${aLevels[0]} outperforms ${aLevels[1]} at ${bLevels[0]}, but the pattern flips at ${bLevels[1]}.`;
      } else if (Math.abs(effectA_atB1 - effectA_atB2) > 3) {
        interactionType = 'ordinal';
        const stronger = Math.abs(effectA_atB1) > Math.abs(effectA_atB2) ? bLevels[0] : bLevels[1];
        interactionDesc = `Ordinal interaction: the effect of ${factorALabel} is stronger at ${stronger}. The pattern doesn't reverse, but the gap changes size.`;
      } else {
        interactionType = 'none';
        interactionDesc = `No meaningful interaction: the effect of ${factorALabel} is roughly the same across levels of ${factorBLabel}. Lines are approximately parallel.`;
      }
    } else if (rows >= 2 && cols >= 2) {
      // For 3x2: check if slopes differ
      const diffs: number[] = [];
      for (let r = 0; r < rows; r++) {
        const vals = Array.from({ length: cols }, (_, c) => cellMeans[cellKey([r, c])] ?? 0);
        diffs.push(vals[vals.length - 1] - vals[0]);
      }
      const allSame = diffs.every((d) => Math.abs(d - diffs[0]) < 3);
      if (allSame) {
        interactionType = 'none';
        interactionDesc = `No clear interaction: all levels of ${factorALabel} show a similar pattern across ${factorBLabel}. Lines are roughly parallel.`;
      } else {
        const anyReverse = diffs.some((d) => Math.sign(d) !== Math.sign(diffs[0]) && Math.abs(d) > 1);
        if (anyReverse) {
          interactionType = 'crossover';
          interactionDesc = `Crossover interaction: some levels of ${factorALabel} show opposite trends across ${factorBLabel}. Lines cross.`;
        } else {
          interactionType = 'ordinal';
          interactionDesc = `Ordinal (spreading) interaction: the effect of ${factorBLabel} varies in magnitude across levels of ${factorALabel}, but doesn't reverse.`;
        }
      }
    }

    const interactionColor = interactionType === 'crossover' ? '#16a34a' : interactionType === 'ordinal' ? '#16a34a' : '#dc2626';
    const interactionIcon = interactionType === 'crossover' ? '✓' : interactionType === 'ordinal' ? '✓' : '✖';
    const interactionLabel = interactionType === 'crossover' ? 'Crossover (Disordinal)' : interactionType === 'ordinal' ? 'Ordinal (Spreading)' : 'No Interaction (Parallel)';

    // Interaction p-value from summary
    const intPVal = anovaSummary ? fDistPValue(anovaSummary.fAB, anovaSummary.dfAB, anovaSummary.dfError) : NaN;
    const intSig = Number.isFinite(intPVal) && intPVal < 0.05;

    // Highlight helpers for the hero plot
    const getPointOpacity = (r: number, c: number): number => {
      if (!highlightSource) return 1;
      if (highlightSource === 'main-A' || highlightSource === 'main-B' || highlightSource === 'interaction') return 1;
      // EMM single cell: highlight only that one cell
      const me = highlightSource.match(/^emm-(\d+)-(\d+)$/);
      if (me) {
        return (r === +me[1] && c === +me[2]) ? 1 : 0.12;
      }
      // Cell-level post hoc: highlight only the two specific cells
      const mc = highlightSource.match(/^posthoc-cell-(\d+)-(\d+)-(\d+)-(\d+)$/);
      if (mc) {
        return (r === +mc[1] && c === +mc[2]) || (r === +mc[3] && c === +mc[4]) ? 1 : 0.12;
      }
      const m = highlightSource.match(/^posthoc-(A|B)-(\d+)-(\d+)$/);
      if (m) {
        if (m[1] === 'A') return (r === +m[2] || r === +m[3]) ? 1 : 0.12;
        if (m[1] === 'B') return (c === +m[2] || c === +m[3]) ? 1 : 0.12;
      }
      return 1;
    };
    const getPointGlow = (r: number, c: number): boolean => {
      if (!highlightSource) return false;
      // Main-A: highlight lines only, no circle glow
      if (highlightSource === 'main-A') return false;
      // Main-B: glow circles only (lines will be dimmed)
      if (highlightSource === 'main-B') return true;
      // Interaction: glow circles (lines will be dimmed, gap indicators shown)
      if (highlightSource === 'interaction') return true;
      // EMM single cell: glow that one cell
      const me = highlightSource.match(/^emm-(\d+)-(\d+)$/);
      if (me) {
        return r === +me[1] && c === +me[2];
      }
      // Cell-level post hoc: glow the two specific cells
      const mc = highlightSource.match(/^posthoc-cell-(\d+)-(\d+)-(\d+)-(\d+)$/);
      if (mc) {
        return (r === +mc[1] && c === +mc[2]) || (r === +mc[3] && c === +mc[4]);
      }
      const m = highlightSource.match(/^posthoc-(A|B)-(\d+)-(\d+)$/);
      if (m) {
        if (m[1] === 'A') return r === +m[2] || r === +m[3];
        if (m[1] === 'B') return c === +m[2] || c === +m[3];
      }
      return false;
    };
    const getLineOpacity = (r: number): number => {
      if (!highlightSource) return 1;
      // Main-A: highlight the series lines (they ARE the direct effect)
      if (highlightSource === 'main-A') return 1;
      // Main-B: dim series lines, only circles glow
      if (highlightSource === 'main-B') return 0.15;
      // Interaction: dim series lines, show gap indicators instead
      if (highlightSource === 'interaction') return 0.15;
      // EMM single cell: dim all lines, only the point glows
      if (highlightSource.startsWith('emm-')) return 0.15;
      // Cell-level post hoc: dim all lines, only points glow
      if (highlightSource.startsWith('posthoc-cell-')) return 0.15;
      const m = highlightSource.match(/^posthoc-A-(\d+)-(\d+)$/);
      if (m) return (r === +m[1] || r === +m[2]) ? 1 : 0.12;
      const m2 = highlightSource.match(/^posthoc-B-/);
      if (m2) return 0.4;
      return 1;
    };

    return (
      <div className="space-y-5">
        {/* ── HERO: Interaction Plot ────────────────────────────── */}
        <div className="bg-white border border-slate-200  shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Interaction Plot</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
                Lines for each level of {factorALabel} across levels of {factorBLabel}
                {' — '} DV: {dvLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {anovaSummary && (
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wide text-center leading-relaxed ${intSig ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                  {factorALabel} {'×'} {factorBLabel}<br />
                  F = {anovaSummary.fAB.toFixed(2)}, p {intSig ? (intPVal < 0.001 ? '<\u00a0.001' : `= ${intPVal.toFixed(3)}`) : `= ${(intPVal || 0).toFixed(3)}`}
                </span>
              )}
            </div>
          </div>
          <div className="px-5 py-4 flex justify-center">
            <svg viewBox={`0 0 ${heroW} ${heroH}`} className="w-full max-w-lg" style={{ height: 280 }}>
              {/* Glow filter */}
              <defs>
                <filter id="glow-highlight" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Grid lines */}
              {yTicks.map((t) => (
                <g key={t}>
                  <line x1={hml} y1={hScaleY(t)} x2={hml + hpw} y2={hScaleY(t)} stroke="#e2e8f0" strokeDasharray="4 2" />
                  <text x={hml - 6} y={hScaleY(t) + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{Math.round(t)}</text>
                </g>
              ))}
              {/* Axes */}
              <line x1={hml} y1={hmt} x2={hml} y2={hmt + hph} stroke="#94a3b8" strokeWidth={1} />
              <line x1={hml} y1={hmt + hph} x2={hml + hpw} y2={hmt + hph} stroke="#94a3b8" strokeWidth={1} />
              {/* Y-axis label */}
              <text x={14} y={hmt + hph / 2} textAnchor="middle" fontSize={11} fill="#475569" transform={`rotate(-90,14,${hmt + hph / 2})`}>{dvLabel}</text>
              {/* X-axis label */}
              <text x={hml + hpw / 2} y={heroH - 4} textAnchor="middle" fontSize={11} fill="#475569">{factorBLabel}</text>

              {/* Highlight overlays for main-B: vertical column bands */}
              {highlightSource === 'main-B' && bLevels.map((_, c) => {
                const x = hScaleX(c, cols);
                return <rect key={`col-band-${c}`} x={x - 18} y={hmt} width={36} height={hph} fill="#06b6d4" opacity={0.06} rx={4} />;
              })}

              {/* Series lines with transitions & highlight */}
              {Array.from({ length: rows }).map((_, r) => {
                const pathData = Array.from({ length: cols }, (_, c) => {
                  const v = cellMeans[cellKey([r, c])];
                  if (!Number.isFinite(v)) return null;
                  return { x: hScaleX(c, cols), y: hScaleY(v) };
                }).filter(Boolean) as { x: number; y: number }[];
                const d = pathData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const color = seriesColors[r % seriesColors.length];
                const opacity = getLineOpacity(r);
                const glowing = highlightSource && opacity === 1;
                return (
                  <g key={`line-${r}`}>
                    {glowing && <path d={d} fill="none" stroke={color} strokeWidth={8} opacity={0.25} style={{ transition: 'd 300ms ease, opacity 200ms ease' }} />}
                    <path d={d} fill="none" stroke={color} strokeWidth={2.5} opacity={opacity} style={{ transition: 'd 300ms ease, opacity 200ms ease' }} />
                  </g>
                );
              })}
              {/* Data points with mean labels, transitions & glow */}
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const v = cellMeans[cellKey([r, c])];
                  if (!Number.isFinite(v)) return null;
                  const cx = hScaleX(c, cols);
                  const cy = hScaleY(v);
                  const color = seriesColors[r % seriesColors.length];
                  const opacity = getPointOpacity(r, c);
                  const glowing = getPointGlow(r, c);
                  return (
                    <g key={`pt-${r}-${c}`} style={{ transition: 'opacity 200ms ease' }} opacity={opacity}>
                      {glowing && <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.2} style={{ transition: 'cx 300ms ease, cy 300ms ease' }}>
                        <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
                      </circle>}
                      <circle cx={cx} cy={cy} r={glowing ? 7 : 5} fill={color} stroke="white" strokeWidth={1.5} style={{ transition: 'cx 300ms ease, cy 300ms ease, r 200ms ease' }} />
                      <text x={cx} y={cy - (glowing ? 14 : 10)} textAnchor="middle" fontSize={glowing ? 12 : 10} fontWeight="bold" fill={color} style={{ transition: 'all 300ms ease' }}>{v}</text>
                    </g>
                  );
                })
              )}

              {/* Highlight overlay: interaction gap indicators */}
              {highlightSource === 'interaction' && Array.from({ length: cols }).map((_, c) => {
                const vals = Array.from({ length: rows }, (_, r) => cellMeans[cellKey([r, c])]).filter(Number.isFinite) as number[];
                if (vals.length < 2) return null;
                const minV = Math.min(...vals);
                const maxV = Math.max(...vals);
                const x = hScaleX(c, cols);
                return (
                  <g key={`gap-${c}`}>
                    <line x1={x} y1={hScaleY(minV)} x2={x} y2={hScaleY(maxV)} stroke="#6366f1" strokeWidth={6} opacity={0.15} />
                    <line x1={x} y1={hScaleY(minV)} x2={x} y2={hScaleY(maxV)} stroke="#6366f1" strokeWidth={2.5} strokeDasharray="4 2" opacity={0.7} />
                    <text x={x + 14} y={(hScaleY(minV) + hScaleY(maxV)) / 2 + 3} fontSize={10} fontWeight="bold" fill="#6366f1" opacity={0.85}>{'Δ'}{(maxV - minV).toFixed(0)}</text>
                  </g>
                );
              })}

              {/* X-axis level labels */}
              {bLevels.map((lab, i) => {
                const x = hScaleX(i, bLevels.length);
                return (
                  <text key={lab} x={x} y={hmt + hph + 18} textAnchor="middle" fontSize={11} fontWeight={600} fill="#334155">{lab}</text>
                );
              })}
              {/* Legend – centered */}
              {(() => {
                const itemW = 110;
                const totalW = aLevels.length * itemW;
                const legendStartX = hml + (hpw - totalW) / 2;
                return aLevels.map((lab, idx) => {
                  const lx = legendStartX + idx * itemW;
                  return (
                    <g key={lab} transform={`translate(${lx}, ${hmt - 16})`}>
                      <line x1={0} y1={5} x2={16} y2={5} stroke={seriesColors[idx % seriesColors.length]} strokeWidth={2.5} />
                      <circle cx={8} cy={5} r={3} fill={seriesColors[idx % seriesColors.length]} />
                      <text x={20} y={9} fontSize={11} fill="#334155">{lab}</text>
                    </g>
                  );
                });
              })()}
            </svg>
          </div>
        </div>

        {/* ── Interaction Diagnosis Card ──────────────────────── */}
        <div className=" border-2 shadow-sm overflow-hidden" style={{ borderColor: interactionColor }}>
          <div className="flex items-start gap-3 px-5 py-4">
            <span className="text-2xl mt-0.5" style={{ color: interactionColor }}>{interactionIcon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-black" style={{ color: interactionColor }}>{interactionLabel}</span>
                {intSig && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 uppercase tracking-wide">Significant</span>}
                {Number.isFinite(intPVal) && !intSig && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase tracking-wide">Not Significant</span>}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{interactionDesc}</p>
              <p className="text-xs text-slate-500 mt-2 italic">
                Interaction answers: <strong>WHEN</strong> does the effect happen? Adjust the cell means on the left to create, remove, or reverse the interaction.
              </p>
            </div>
          </div>
        </div>

        {/* ── Main Effects Carousel (secondary) ──────────────── */}
        {renderEffectPlotsCard(rows, cols, factorALabel, factorBLabel, aLevels, bLevels)}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row h-full">
      {/* Left column – Cell Means & Controls */}
      <aside className="lg:basis-[55%] lg:max-w-[55%] flex-shrink-0 overflow-y-auto min-h-0" style={{ direction: 'rtl' }}>
        <div style={{ direction: 'ltr' }}>
        <div className="bg-white border border-slate-200  shadow-sm flex flex-col overflow-hidden">
          {/* Header with design buttons + dataset selector */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cell Means</h2>
              <div className="flex gap-1">
                {DESIGN_CONFIGS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setActiveExampleId(null);
                      setDesignId(d.id);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      designId === d.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <select
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg text-sm bg-white cursor-pointer transition-all hover:border-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              value={activeExampleId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setActiveExampleId(null);
                  return;
                }
                const ex = EXAMPLE_DATASETS.find((d) => d.id === value);
                if (ex) applyExample(ex);
              }}
            >
              <option value="">Custom means</option>
              {EXAMPLE_DATASETS.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.label} — DV: {ex.dvLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Cell means table with embedded sliders + marginals + simple effects */}
          <div className="px-3 py-3">
            {renderCellMeansPanel()}
          </div>
        </div>

        {/* ANOVA Summary (interaction highlighted) */}
        <div className="mt-4">
          {renderAnovaCard(factorALabel, factorBLabel, anovaSummary, activeExample?.dvLabel ?? 'Outcome')}
        </div>

        {/* Estimated Marginal Means */}
        <div className="mt-4">
          {renderEstimatedMarginalMeansCard(factorALabel, factorBLabel, parseLevels(factorALevelsText, config.levels[0], factorALabel), parseLevels(factorBLevelsText, config.levels[1], factorBLabel), anovaSummary)}
        </div>

        {/* Post Hoc Tests */}
        <div className="mt-4">
          {renderPostHocCard(factorALabel, factorBLabel, parseLevels(factorALevelsText, config.levels[0], factorALabel), parseLevels(factorBLevelsText, config.levels[1], factorBLabel), anovaSummary)}
        </div>
        </div>
      </aside>

      {/* Right column (~70%) - interaction-focused results */}
      <section className="flex-1 lg:basis-[45%] lg:max-w-[45%] overflow-y-auto min-h-0">
        {activeExample && (
          <div className="mx-1 mb-3 mt-1  bg-indigo-50/50 border-l-4 border-indigo-500 px-5 py-4 text-sm text-slate-800 shadow-sm">
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
          {renderContent()}
        </div>
      </section>
    </div>
  );
};

export default FactorialDesignTool;
