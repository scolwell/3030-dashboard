import React, { useMemo, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   Interfaces
   ═══════════════════════════════════════════════════════════════════════════ */

interface DesignConfig {
  id: '2b2w' | '2b3w' | '2b4w';
  label: string;
  betweenLevels: number;
  withinLevels: number;
}

interface ExampleConfig {
  id: string;
  label: string;
  description: string;
  hypothesis: string;
  designId: DesignConfig['id'];
  dvLabel: string;
  betweenLabel: string;         // e.g. "Training Method"
  withinLabel: string;          // e.g. "Time Point"
  betweenLevelNames: string[];  // e.g. ["Control", "Experimental"]
  withinLevelNames: string[];   // e.g. ["Pre", "Post"]
  cellMeans: Record<string, number>; // "row-col" where row=between, col=within
}

interface MixedAnovaSummary {
  // Between-subjects
  ssBetween: number; dfBetween: number; msBetween: number; fBetween: number; eta2pBetween: number;
  ssSubjects: number; dfSubjects: number; msSubjects: number; // error for between
  // Within-subjects
  ssWithin: number; dfWithin: number; msWithin: number; fWithin: number; eta2pWithin: number;
  ssWithinError: number; dfWithinError: number; msWithinError: number; // error for within
  // Interaction
  ssInteraction: number; dfInteraction: number; msInteraction: number; fInteraction: number; eta2pInteraction: number;
  // Totals
  ssTotal: number; dfTotal: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Statistical helpers   (duplicated – self-contained)
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

const cellKey = (indices: number[]) => indices.join('-');

/* ═══════════════════════════════════════════════════════════════════════════
   Mixed / Split-plot ANOVA from cell means (balanced design)
   Between-subjects factor (rows) × Within-subjects factor (cols)
   ═══════════════════════════════════════════════════════════════════════════ */

const computeMixedAnova = (
  cellMeans: Record<string, number>,
  a: number,   // between-subjects levels (rows)
  b: number,   // within-subjects levels (cols)
  nPerCell: number
): MixedAnovaSummary | null => {
  const n = nPerCell;

  // Read cell means into a 2D array
  const means: number[][] = [];
  for (let i = 0; i < a; i++) {
    means[i] = [];
    for (let j = 0; j < b; j++) {
      const key = cellKey([i, j]);
      const val = cellMeans[key];
      if (!Number.isFinite(val)) return null;
      means[i][j] = val;
    }
  }

  // Grand mean
  let sumAll = 0;
  for (let i = 0; i < a; i++)
    for (let j = 0; j < b; j++) sumAll += means[i][j];
  const grandMean = sumAll / (a * b);

  // Row means (between-subjects group means, averaging over within-subjects levels)
  const rowMeans: number[] = [];
  for (let i = 0; i < a; i++) {
    let s = 0;
    for (let j = 0; j < b; j++) s += means[i][j];
    rowMeans[i] = s / b;
  }

  // Column means (within-subjects level means, averaging over between-subjects groups)
  const colMeans: number[] = [];
  for (let j = 0; j < b; j++) {
    let s = 0;
    for (let i = 0; i < a; i++) s += means[i][j];
    colMeans[j] = s / a;
  }

  // ── Sums of Squares ───────────────────────────────────────────────────

  // SS Between-Subjects factor
  let ssBetween = 0;
  for (let i = 0; i < a; i++) {
    ssBetween += (rowMeans[i] - grandMean) ** 2;
  }
  ssBetween *= b * n;

  // SS Subjects(within groups) – the between-subjects error term
  // Assumed: each subject's average (across within-levels) has variance σ²_s around the group mean
  // We use a fixed subject-level variance component
  const sigma2Between = 120; // between-subjects variance (subject differences)
  const dfSubjects = a * (n - 1);
  const ssSubjects = dfSubjects * sigma2Between / b; // scaled error for between test
  const msSubjects = ssSubjects / dfSubjects;

  // SS Within-subjects factor
  let ssWithin = 0;
  for (let j = 0; j < b; j++) {
    ssWithin += (colMeans[j] - grandMean) ** 2;
  }
  ssWithin *= a * n;

  // SS Interaction (Between × Within)
  let ssInteraction = 0;
  for (let i = 0; i < a; i++) {
    for (let j = 0; j < b; j++) {
      ssInteraction += (means[i][j] - rowMeans[i] - colMeans[j] + grandMean) ** 2;
    }
  }
  ssInteraction *= n;

  // SS Within-subjects error (Time × Subjects(Group))
  // Assumed: within-subject error variance per repeated measure
  const sigma2Within = 60; // within-subjects error variance
  const dfWithinError = a * (n - 1) * (b - 1);
  const ssWithinError = dfWithinError * sigma2Within / 1;
  const msWithinError = ssWithinError / dfWithinError;

  // Degrees of freedom
  const dfBetween = a - 1;
  const dfWithin = b - 1;
  const dfInteraction = (a - 1) * (b - 1);

  // Mean Squares
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : NaN;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : NaN;
  const msInteraction = dfInteraction > 0 ? ssInteraction / dfInteraction : NaN;

  // F-ratios
  // Between-subjects effect is tested against subjects-within-groups error
  const fBetween = msSubjects > 0 ? msBetween / msSubjects : NaN;
  // Within-subjects effects use the within-subjects error
  const fWithin = msWithinError > 0 ? msWithin / msWithinError : NaN;
  const fInteraction = msWithinError > 0 ? msInteraction / msWithinError : NaN;

  // Partial eta squared
  const eta2pBetween = ssBetween / (ssBetween + ssSubjects);
  const eta2pWithin = ssWithin / (ssWithin + ssWithinError);
  const eta2pInteraction = ssInteraction / (ssInteraction + ssWithinError);

  const ssTotal = ssBetween + ssSubjects + ssWithin + ssInteraction + ssWithinError;
  const dfTotal = a * b * n - 1;

  return {
    ssBetween, dfBetween, msBetween, fBetween, eta2pBetween,
    ssSubjects, dfSubjects, msSubjects,
    ssWithin, dfWithin, msWithin, fWithin, eta2pWithin,
    ssWithinError, dfWithinError, msWithinError,
    ssInteraction, dfInteraction, msInteraction, fInteraction, eta2pInteraction,
    ssTotal, dfTotal,
  };
};

/* ═══════════════════════════════════════════════════════════════════════════
   Design configs
   ═══════════════════════════════════════════════════════════════════════════ */

const DESIGN_CONFIGS: DesignConfig[] = [
  { id: '2b2w', label: '2B × 2W', betweenLevels: 2, withinLevels: 2 },
  { id: '2b3w', label: '2B × 3W', betweenLevels: 2, withinLevels: 3 },
  { id: '2b4w', label: '2B × 4W', betweenLevels: 2, withinLevels: 4 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Example Datasets (10 total)
   ═══════════════════════════════════════════════════════════════════════════ */

const EXAMPLE_DATASETS: ExampleConfig[] = [
  {
    id: 'sp-1-email-campaign',
    label: '1) Email campaign personalisation (2B×2W)',
    description:
      'An e-commerce retailer randomly assigns customers to receive either personalised or generic promotional emails (between). Click-through rate is measured before and after a 4-week campaign (within).',
    hypothesis: 'Does email personalisation increase click-through rates more than generic emails over time?',
    designId: '2b2w',
    dvLabel: 'Click-through rate (%)',
    betweenLabel: 'Email Type',
    withinLabel: 'Campaign Period',
    betweenLevelNames: ['Generic', 'Personalised'],
    withinLevelNames: ['Pre-campaign', 'Post-campaign'],
    cellMeans: {
      '0-0': 18, '0-1': 22,  // Generic: slight lift
      '1-0': 19, '1-1': 35,  // Personalised: strong lift
    },
  },
  {
    id: 'sp-2-teaching-method',
    label: '2) Teaching methods across semesters (2B×3W)',
    description:
      'Students are assigned to traditional or flipped classroom (between). Test scores are measured at Baseline, Mid-year, and End-of-year (within).',
    hypothesis: 'Do teaching methods differ in how students improve over the academic year?',
    designId: '2b3w',
    dvLabel: 'Test score',
    betweenLabel: 'Method',
    withinLabel: 'Time',
    betweenLevelNames: ['Traditional', 'Flipped'],
    withinLevelNames: ['Baseline', 'Mid-year', 'End-year'],
    cellMeans: {
      '0-0': 60, '0-1': 65, '0-2': 70,  // Traditional: steady
      '1-0': 62, '1-1': 72, '1-2': 85,  // Flipped: accelerating
    },
  },
  {
    id: 'sp-3-sustainable-containers',
    label: '3) Marketing sustainable drinking containers (2B×3W)',
    description:
      'A beverage company tests two marketing messages for reusable containers — an environmental appeal vs a cost-saving appeal (between). Purchase intention is measured at Baseline, after 4 weeks of ads, and after 8 weeks (within).',
    hypothesis: 'Does the type of marketing appeal affect how purchase intention for sustainable containers changes over the campaign?',
    designId: '2b3w',
    dvLabel: 'Purchase intention',
    betweenLabel: 'Ad Appeal',
    withinLabel: 'Campaign Phase',
    betweenLevelNames: ['Eco-friendly', 'Cost-saving'],
    withinLevelNames: ['Baseline', 'Week 4', 'Week 8'],
    cellMeans: {
      '0-0': 45, '0-1': 58, '0-2': 72,  // Eco-friendly: steady climb
      '1-0': 44, '1-1': 62, '1-2': 64,  // Cost-saving: fast start then plateaus
    },
  },
  {
    id: 'sp-4-loyalty-program',
    label: '4) Loyalty program and spending (2B×4W)',
    description:
      'A retail chain randomly assigns stores to launch a points-based loyalty program or continue without one (between). Average customer monthly spend is tracked at Baseline, Month 2, Month 4, and Month 6 (within).',
    hypothesis: 'Does a loyalty program increase customer spending more than no program over six months?',
    designId: '2b4w',
    dvLabel: 'Monthly spend ($)',
    betweenLabel: 'Program',
    withinLabel: 'Time',
    betweenLevelNames: ['No Program', 'Loyalty Program'],
    withinLevelNames: ['Baseline', 'Month 2', 'Month 4', 'Month 6'],
    cellMeans: {
      '0-0': 62, '0-1': 63, '0-2': 61, '0-3': 62,  // No program: flat
      '1-0': 60, '1-1': 68, '1-2': 76, '1-3': 82,  // Loyalty: steady climb
    },
  },
  {
    id: 'sp-5-therapy-anxiety',
    label: '5) Therapy type and anxiety (2B×2W)',
    description:
      'Patients with anxiety are assigned to CBT or Psychodynamic therapy (between). Anxiety is measured pre- and post-treatment (within).',
    hypothesis: 'Does anxiety reduction differ between CBT and psychodynamic therapy?',
    designId: '2b2w',
    dvLabel: 'Anxiety score',
    betweenLabel: 'Therapy Type',
    withinLabel: 'Time',
    betweenLevelNames: ['CBT', 'Psychodynamic'],
    withinLevelNames: ['Pre', 'Post'],
    cellMeans: {
      '0-0': 75, '0-1': 52,  // CBT: big drop
      '1-0': 73, '1-1': 62,  // Psychodynamic: moderate drop
    },
  },
  {
    id: 'sp-6-product-innovation',
    label: '6) Product innovation pipeline (2B×3W)',
    description:
      'A tech company compares two innovation approaches — rapid prototyping vs stage-gate development (between). Product viability scores are evaluated at Concept, Prototype, and Market Test stages (within).',
    hypothesis: 'Does the innovation approach affect how product viability evolves across development stages?',
    designId: '2b3w',
    dvLabel: 'Viability score',
    betweenLabel: 'Innovation Method',
    withinLabel: 'Development Stage',
    betweenLevelNames: ['Stage-Gate', 'Rapid Prototype'],
    withinLevelNames: ['Concept', 'Prototype', 'Market Test'],
    cellMeans: {
      '0-0': 70, '0-1': 66, '0-2': 72,  // Stage-Gate: dips at prototype, recovers
      '1-0': 55, '1-1': 68, '1-2': 80,  // Rapid Prototype: starts low, climbs fast
    },
  },
  {
    id: 'sp-7-sleep-training',
    label: '7) Infant sleep training (2B×4W)',
    description:
      'Parents are assigned to sleep training or control (between). Infant sleep duration is measured at 2, 4, 6, and 8 months of age (within).',
    hypothesis: 'Does sleep training improve infant sleep duration over the first 8 months?',
    designId: '2b4w',
    dvLabel: 'Sleep hours',
    betweenLabel: 'Condition',
    withinLabel: 'Age',
    betweenLevelNames: ['Control', 'Sleep Training'],
    withinLevelNames: ['2 mo', '4 mo', '6 mo', '8 mo'],
    cellMeans: {
      '0-0': 52, '0-1': 56, '0-2': 60, '0-3': 64,  // Control: gradual
      '1-0': 54, '1-1': 64, '1-2': 72, '1-3': 78,  // Training: faster gains
    },
  },
  {
    id: 'sp-8-foodbank-social',
    label: '8) Social media for food bank donations (2B×2W)',
    description:
      'A food bank tests two social media strategies — storytelling posts vs informational infographics (between). Weekly donation volume is measured before and after a 6-week campaign (within).',
    hypothesis: 'Does the social media content style affect how food bank donations change after the campaign?',
    designId: '2b2w',
    dvLabel: 'Donations ($100s)',
    betweenLabel: 'Content Style',
    withinLabel: 'Campaign Period',
    betweenLevelNames: ['Infographics', 'Storytelling'],
    withinLevelNames: ['Pre-campaign', 'Post-campaign'],
    cellMeans: {
      '0-0': 42, '0-1': 50,  // Infographics: modest boost
      '1-0': 40, '1-1': 68,  // Storytelling: dramatic boost
    },
  },
  {
    id: 'sp-9-language-learning',
    label: '9) Language immersion vs classroom (2B×3W)',
    description:
      'Students learning Spanish are assigned to immersion or classroom instruction (between). Proficiency is tested at Baseline, Month 6, and Month 12 (within).',
    hypothesis: 'Does immersion produce faster language gains than traditional classroom instruction?',
    designId: '2b3w',
    dvLabel: 'Proficiency score',
    betweenLabel: 'Instruction',
    withinLabel: 'Time Point',
    betweenLevelNames: ['Classroom', 'Immersion'],
    withinLevelNames: ['Baseline', 'Month 6', 'Month 12'],
    cellMeans: {
      '0-0': 40, '0-1': 52, '0-2': 60,  // Classroom: steady
      '1-0': 42, '1-1': 65, '1-2': 82,  // Immersion: accelerating
    },
  },
  {
    id: 'sp-10-music-memory',
    label: '10) Music training and memory (2B×2W)',
    description:
      'Children are assigned to music lessons or regular curriculum (between). Working memory is tested before and after 1 year (within).',
    hypothesis: 'Does formal music training improve working memory more than regular curriculum?',
    designId: '2b2w',
    dvLabel: 'Memory score',
    betweenLabel: 'Condition',
    withinLabel: 'Time',
    betweenLevelNames: ['Regular', 'Music Lessons'],
    withinLevelNames: ['Pre', 'Post'],
    cellMeans: {
      '0-0': 65, '0-1': 68,  // Regular: small change
      '1-0': 64, '1-1': 78,  // Music: larger jump
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const etaBenchmark = (eta2p: number): { label: string; color: string } => {
  if (!Number.isFinite(eta2p) || eta2p < 0) return { label: '', color: '#94a3b8' };
  if (eta2p >= 0.80) return { label: 'Large', color: '#16a34a' };
  if (eta2p >= 0.60) return { label: 'Med-Large', color: '#0891b2' };
  if (eta2p >= 0.40) return { label: 'Sm-Medium', color: '#d97706' };
  if (eta2p >= 0.20) return { label: 'Small', color: '#64748b' };
  return { label: 'Very Small', color: '#cbd5e1' };
};

const computeMarginalMeans = (
  cellMeans: Record<string, number>,
  rows: number,
  cols: number
): { rowMeans: (number | null)[]; colMeans: (number | null)[]; grandMean: number | null } => {
  const rowMeans: (number | null)[] = [];
  const colMeans: (number | null)[] = [];

  for (let r = 0; r < rows; r++) {
    const vals: number[] = [];
    for (let c = 0; c < cols; c++) {
      const v = cellMeans[cellKey([r, c])];
      if (Number.isFinite(v)) vals.push(v);
    }
    rowMeans[r] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  for (let c = 0; c < cols; c++) {
    const vals: number[] = [];
    for (let r = 0; r < rows; r++) {
      const v = cellMeans[cellKey([r, c])];
      if (Number.isFinite(v)) vals.push(v);
    }
    colMeans[c] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const all: number[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const v = cellMeans[cellKey([r, c])];
      if (Number.isFinite(v)) all.push(v);
    }
  const grandMean = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;

  return { rowMeans, colMeans, grandMean };
};

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

const SplitPlotTool: React.FC = () => {
  const [designId, setDesignId] = useState<DesignConfig['id']>('2b2w');
  const [cellMeans, setCellMeans] = useState<Record<string, number>>({
    '0-0': 65, '0-1': 70,
    '1-0': 64, '1-1': 80,
  });
  const [betweenLabel, setBetweenLabel] = useState('Group');
  const [withinLabel, setWithinLabel] = useState('Time');
  const [betweenLevelsText, setBetweenLevelsText] = useState('Control, Treatment');
  const [withinLevelsText, setWithinLevelsText] = useState('Pre, Post');
  const [dvLabel, setDvLabel] = useState('Outcome');
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);
  const [highlightSource, setHighlightSource] = useState<string | null>(null);

  const config = useMemo(
    () => DESIGN_CONFIGS.find((c) => c.id === designId) ?? DESIGN_CONFIGS[0],
    [designId]
  );

  const activeExample = useMemo(
    () => EXAMPLE_DATASETS.find((e) => e.id === activeExampleId) ?? null,
    [activeExampleId]
  );

  const parseLevels = (text: string, count: number, fallback: string): string[] => {
    const parts = text.split(',').map(p => p.trim()).filter(Boolean).slice(0, count);
    while (parts.length < count) parts.push(`${fallback}${parts.length + 1}`);
    return parts;
  };

  const rows = config.betweenLevels;
  const cols = config.withinLevels;
  const bLevels = parseLevels(betweenLevelsText, rows, betweenLabel);
  const wLevels = parseLevels(withinLevelsText, cols, withinLabel);
  const nPerCell = 20;

  // Apply example
  const applyExample = (ex: ExampleConfig) => {
    setDesignId(ex.designId);
    setCellMeans({ ...ex.cellMeans });
    setBetweenLabel(ex.betweenLabel);
    setWithinLabel(ex.withinLabel);
    setBetweenLevelsText(ex.betweenLevelNames.join(', '));
    setWithinLevelsText(ex.withinLevelNames.join(', '));
    setDvLabel(ex.dvLabel);
    setActiveExampleId(ex.id);
  };

  const handleDesignSwitch = (dId: DesignConfig['id']) => {
    const cfg = DESIGN_CONFIGS.find(c => c.id === dId)!;
    setDesignId(dId);
    setActiveExampleId(null);
    // Reset cell means to defaults
    const newMeans: Record<string, number> = {};
    for (let r = 0; r < cfg.betweenLevels; r++) {
      for (let c = 0; c < cfg.withinLevels; c++) {
        newMeans[cellKey([r, c])] = 60 + r * 5 + c * 8;
      }
    }
    setCellMeans(newMeans);
    setBetweenLabel('Group');
    setWithinLabel('Time');
    const bNames = Array.from({ length: cfg.betweenLevels }, (_, i) => `Group ${i + 1}`);
    const wNames = Array.from({ length: cfg.withinLevels }, (_, i) => `T${i + 1}`);
    setBetweenLevelsText(bNames.join(', '));
    setWithinLevelsText(wNames.join(', '));
    setDvLabel('Outcome');
  };

  // Cell mean editing
  const handleMeanChange = (r: number, c: number, val: string) => {
    const num = parseFloat(val);
    if (Number.isFinite(num)) {
      setCellMeans(prev => ({ ...prev, [cellKey([r, c])]: Math.max(0, Math.min(100, num)) }));
    }
  };
  const getMean = (r: number, c: number): number => {
    const v = cellMeans[cellKey([r, c])];
    return Number.isFinite(v) ? v : 50;
  };

  // ── ANOVA computation ───────────────────────────────────────────────────
  const anovaSummary = useMemo(
    () => computeMixedAnova(cellMeans, rows, cols, nPerCell),
    [cellMeans, rows, cols]
  );

  // ── Format helper ───────────────────────────────────────────────────────
  const fmt = (value: number | undefined): string => {
    if (value === undefined || !Number.isFinite(value as number)) return '—';
    const v = value as number;
    if (v === 0) return '0.00';
    if (Math.abs(v) >= 100000) return Math.round(v).toLocaleString();
    if (Math.abs(v) >= 10) return v.toFixed(1);
    if (Math.abs(v) >= 1) return v.toFixed(2);
    if (Math.abs(v) >= 0.001) return v.toFixed(3);
    return '<\u00a0.001';
  };

  const seriesColors = ['#2563eb', '#15803d', '#7c3aed', '#dc2626'];

  /* ─────────────────────────────────────────────────────────────────────────
     getPointOpacity / getPointGlow / getLineOpacity (cross-panel highlight)
     ───────────────────────────────────────────────────────────────────────── */

  const getPointOpacity = (r: number, c: number): number => {
    if (!highlightSource) return 1;
    if (highlightSource === 'between') return 1;
    if (highlightSource === 'within') return 1;
    if (highlightSource === 'interaction') return 1;
    const m = highlightSource.match(/^cell-(\d+)-(\d+)$/);
    if (m) return (parseInt(m[1]) === r && parseInt(m[2]) === c) ? 1 : 0.15;
    const pm = highlightSource.match(/^posthoc-B-(\d+)-(\d+)$/);
    if (pm) {
      const i1 = parseInt(pm[1]), i2 = parseInt(pm[2]);
      return (r === i1 || r === i2) ? 1 : 0.15;
    }
    const wm = highlightSource.match(/^posthoc-W-(\d+)-(\d+)$/);
    if (wm) {
      const j1 = parseInt(wm[1]), j2 = parseInt(wm[2]);
      return (c === j1 || c === j2) ? 1 : 0.15;
    }
    return 1;
  };

  const getPointGlow = (r: number, _c: number): boolean => {
    if (!highlightSource) return false;
    if (highlightSource === 'between') return false;
    if (highlightSource === 'within') return true;
    if (highlightSource === 'interaction') return true;
    if (highlightSource.startsWith('cell-')) return true;
    return false;
  };

  const getLineOpacity = (r: number): number => {
    if (!highlightSource) return 1;
    if (highlightSource === 'between') return 1;
    if (highlightSource === 'within') return 0.15;
    if (highlightSource === 'interaction') return 0.15;
    if (highlightSource.startsWith('cell-')) return 0.15;
    const pm = highlightSource.match(/^posthoc-B-(\d+)-(\d+)$/);
    if (pm) {
      const i1 = parseInt(pm[1]), i2 = parseInt(pm[2]);
      return (r === i1 || r === i2) ? 1 : 0.12;
    }
    return 1;
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Cell Means Panel
     ───────────────────────────────────────────────────────────────────────── */

  const renderCellMeansPanel = () => {
    const { rowMeans, colMeans, grandMean } = computeMarginalMeans(cellMeans, rows, cols);

    return (
      <div>
        <table className="w-full text-xs border-collapse border border-slate-300 overflow-hidden">
          <thead>
            <tr className="bg-slate-100">
              <th className="bg-slate-100" style={{ borderLeftStyle: 'hidden', borderRightStyle: 'hidden' }} />
              <th></th>
              <th colSpan={wLevels.length} className="px-3 pt-2 pb-0 text-center font-bold text-slate-500 uppercase tracking-widest text-[10px] border-l border-slate-300">
                {withinLabel} <span className="text-[8px] font-normal text-slate-400">(within-subjects)</span>
              </th>
              <th className="bg-indigo-100 border-l-2 border-indigo-300"></th>
            </tr>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="px-1 py-2 bg-slate-100" style={{ borderLeftStyle: 'hidden', borderRightStyle: 'hidden' }} />
              <th className="px-3 py-2 text-left font-bold text-slate-700 uppercase tracking-wide text-[11px]"></th>
              {wLevels.map((w, i) => (
                <th key={i} className="px-3 py-2 text-center font-bold text-slate-700 uppercase tracking-wide text-[11px] border-l border-slate-300">{w}</th>
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
                        {betweenLabel} <span className="text-[8px] font-normal">(B)</span>
                      </span>
                    </td>
                  )}
                  <td className="px-3 py-3 font-bold text-slate-700 text-[11px] whitespace-nowrap bg-slate-50/60">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span>{bLevels[r]}</span>
                    </div>
                  </td>
                  {Array.from({ length: cols }).map((_, c) => {
                    const val = getMean(r, c);
                    return (
                      <td key={c} className="px-2 py-3 border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <button type="button" onClick={() => handleMeanChange(r, c, String(Math.max(0, val - 1)))}
                            className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <span className="text-lg font-black tabular-nums leading-tight min-w-[2.5rem] text-center" style={{ color }}>
                            {val}
                          </span>
                          <button type="button" onClick={() => handleMeanChange(r, c, String(Math.min(100, val + 1)))}
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

  /* ─────────────────────────────────────────────────────────────────────────
     Render: ANOVA Card (Mixed design)
     ───────────────────────────────────────────────────────────────────────── */

  const renderAnovaCard = () => {
    const s = anovaSummary;
    const hasSummary = !!s;

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Mixed ANOVA</h3>
            <p className="text-[11px] text-slate-600">
              Split-Plot ANOVA {'–'} DV: {dvLabel}
            </p>
          </div>
          <span className="text-[11px] text-slate-400">
            n = {nPerCell} per cell
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
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 tracking-wide">
                  <span className="normal-case italic">η</span><sup>2</sup><sub className="normal-case italic">p</sub>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* ── Between-Subjects Section ── */}
              <tr>
                <td colSpan={7} className="px-4 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border-t border-slate-200">
                  Between Subjects
                </td>
              </tr>
              <tr
                className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'between' ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('between')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">{betweenLabel}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? fmt(s!.ssBetween) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? s!.dfBetween : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? fmt(s!.msBetween) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? fmt(s!.fBetween) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? formatP(fDistPValue(s!.fBetween, s!.dfBetween, s!.dfSubjects)) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">
                  {hasSummary ? (
                    <span className="inline-flex items-center gap-1">
                      {fmt(s!.eta2pBetween)}
                      <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(s!.eta2pBetween).color }}>{etaBenchmark(s!.eta2pBetween).label}</span>
                    </span>
                  ) : '—'}
                </td>
              </tr>
              <tr className="text-slate-400">
                <td className="px-4 py-1.5 text-xs italic text-slate-400 pl-8">Residual (subjects)</td>
                <td className="px-4 py-1.5 text-right text-sm">{hasSummary ? fmt(s!.ssSubjects) : '—'}</td>
                <td className="px-4 py-1.5 text-right text-sm">{hasSummary ? s!.dfSubjects : '—'}</td>
                <td className="px-4 py-1.5 text-right text-sm">{hasSummary ? fmt(s!.msSubjects) : '—'}</td>
                <td className="px-4 py-1.5 text-right text-sm"></td>
                <td className="px-4 py-1.5 text-right text-sm"></td>
                <td className="px-4 py-1.5 text-right text-sm"></td>
              </tr>

              {/* ── Within-Subjects Section ── */}
              <tr>
                <td colSpan={7} className="px-4 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border-t border-slate-200">
                  Within Subjects
                </td>
              </tr>
              <tr
                className={`cursor-pointer transition-colors duration-150 ${highlightSource === 'within' ? 'bg-cyan-50 ring-1 ring-inset ring-cyan-200' : 'hover:bg-slate-50/60'}`}
                onMouseEnter={() => setHighlightSource('within')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-semibold text-slate-700">{withinLabel}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? fmt(s!.ssWithin) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? s!.dfWithin : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? fmt(s!.msWithin) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? fmt(s!.fWithin) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">{hasSummary ? formatP(fDistPValue(s!.fWithin, s!.dfWithin, s!.dfWithinError)) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm text-slate-600">
                  {hasSummary ? (
                    <span className="inline-flex items-center gap-1">
                      {fmt(s!.eta2pWithin)}
                      <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(s!.eta2pWithin).color }}>{etaBenchmark(s!.eta2pWithin).label}</span>
                    </span>
                  ) : '—'}
                </td>
              </tr>

              {/* Interaction row */}
              <tr
                className={`border-l-4 border-l-indigo-500 cursor-pointer transition-colors duration-150 ${highlightSource === 'interaction' ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100/60'}`}
                onMouseEnter={() => setHighlightSource('interaction')}
                onMouseLeave={() => setHighlightSource(null)}
              >
                <td className="px-4 py-2 text-xs font-bold text-indigo-900">{betweenLabel} {'×'} {withinLabel}</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">{hasSummary ? fmt(s!.ssInteraction) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">{hasSummary ? s!.dfInteraction : '—'}</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">{hasSummary ? fmt(s!.msInteraction) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">{hasSummary ? fmt(s!.fInteraction) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">{hasSummary ? formatP(fDistPValue(s!.fInteraction, s!.dfInteraction, s!.dfWithinError)) : '—'}</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-indigo-900">
                  {hasSummary ? (
                    <span className="inline-flex items-center gap-1">
                      {fmt(s!.eta2pInteraction)}
                      <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: etaBenchmark(s!.eta2pInteraction).color }}>{etaBenchmark(s!.eta2pInteraction).label}</span>
                    </span>
                  ) : '—'}
                </td>
              </tr>

              <tr className="text-slate-400">
                <td className="px-4 py-1.5 text-xs italic text-slate-400 pl-8">Residual (within)</td>
                <td className="px-4 py-1.5 text-right text-sm">{hasSummary ? fmt(s!.ssWithinError) : '—'}</td>
                <td className="px-4 py-1.5 text-right text-sm">{hasSummary ? s!.dfWithinError : '—'}</td>
                <td className="px-4 py-1.5 text-right text-sm">{hasSummary ? fmt(s!.msWithinError) : '—'}</td>
                <td className="px-4 py-1.5 text-right text-sm"></td>
                <td className="px-4 py-1.5 text-right text-sm"></td>
                <td className="px-4 py-1.5 text-right text-sm"></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
          Note: Between-subjects effect tested against subjects-within-groups error; within-subjects effects tested against within-subjects residual.
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Estimated Marginal Means Card 
     ───────────────────────────────────────────────────────────────────────── */

  const renderEMMCard = () => {
    const s = anovaSummary;
    if (!s) return null;

    const nPerMarginal = nPerCell * cols;
    const seRow = Math.sqrt(s.msSubjects / nPerMarginal);
    const seCell = Math.sqrt(s.msWithinError / nPerCell);
    const tCrit = 1.96;

    // Build rows grouped by between-subjects level
    const emmRows: { bLevel: string; wLevel: string; mean: number; se: number; lower: number; upper: number; rIdx: number; cIdx: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const m = getMean(r, c);
        emmRows.push({
          bLevel: bLevels[r],
          wLevel: wLevels[c],
          mean: m,
          se: seCell,
          lower: m - tCrit * seCell,
          upper: m + tCrit * seCell,
          rIdx: r,
          cIdx: c,
        });
      }
    }

    const groupBoundaries = new Set<number>();
    for (let i = 1; i < emmRows.length; i++) {
      if (emmRows[i].bLevel !== emmRows[i - 1].bLevel) groupBoundaries.add(i);
    }

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Estimated Marginal Means</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
            {betweenLabel} * {withinLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-800">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide" rowSpan={2}>{betweenLabel}</th>
                <th className="px-4 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide" rowSpan={2}>{withinLabel}</th>
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
                const hoverKey = `cell-${row.rIdx}-${row.cIdx}`;
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
                    <td className="px-4 py-1.5 text-xs text-slate-600">{row.wLevel}</td>
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

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Post Hoc / Simple Effects Card
     ───────────────────────────────────────────────────────────────────────── */

  const renderPostHocCard = () => {
    const s = anovaSummary;
    if (!s) return null;

    // Between-subjects pairwise comparisons (at each within-subjects level)
    const msErr = s.msSubjects;
    const seB = Math.sqrt(2 * msErr / (nPerCell * cols));
    const dfB = s.dfSubjects;

    // Between-level pairs
    const betweenPairs: { i1: number; i2: number; label1: string; label2: string; diff: number; t: number; p: number; d: number }[] = [];
    const { rowMeans } = computeMarginalMeans(cellMeans, rows, cols);
    for (let i1 = 0; i1 < rows; i1++) {
      for (let i2 = i1 + 1; i2 < rows; i2++) {
        if (rowMeans[i1] !== null && rowMeans[i2] !== null) {
          const diff = rowMeans[i2]! - rowMeans[i1]!;
          const tVal = seB > 0 ? diff / seB : 0;
          const pVal = tDistPValue(Math.abs(tVal), dfB);
          const d = diff / Math.sqrt(msErr);
          betweenPairs.push({ i1, i2, label1: bLevels[i1], label2: bLevels[i2], diff, t: tVal, p: pVal, d });
        }
      }
    }

    // Within-subjects pairwise comparisons (averaged over between-subjects groups)
    const msWErr = s.msWithinError;
    const seW = Math.sqrt(2 * msWErr / (nPerCell * rows));
    const dfW = s.dfWithinError;

    const { colMeans } = computeMarginalMeans(cellMeans, rows, cols);
    const withinPairs: { j1: number; j2: number; label1: string; label2: string; diff: number; t: number; p: number; d: number }[] = [];
    for (let j1 = 0; j1 < cols; j1++) {
      for (let j2 = j1 + 1; j2 < cols; j2++) {
        if (colMeans[j1] !== null && colMeans[j2] !== null) {
          const diff = colMeans[j2]! - colMeans[j1]!;
          const tVal = seW > 0 ? diff / seW : 0;
          const pVal = tDistPValue(Math.abs(tVal), dfW);
          const d = diff / Math.sqrt(msWErr);
          withinPairs.push({ j1, j2, label1: wLevels[j1], label2: wLevels[j2], diff, t: tVal, p: pVal, d });
        }
      }
    }

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Post Hoc Comparisons</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
            Pairwise comparisons of marginal means
          </p>
        </div>

        {/* Between-subjects comparisons */}
        {betweenPairs.length > 0 && (
          <div className="border-b border-slate-200">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{betweenLabel} (Between)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-slate-800">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Comparison</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mean Diff</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">SE</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">t</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">p</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cohen's d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {betweenPairs.map((pair, idx) => {
                    const hoverKey = `posthoc-B-${pair.i1}-${pair.i2}`;
                    const pSig = pair.p < 0.05;
                    return (
                      <tr key={idx}
                        className={`cursor-pointer transition-colors duration-150 ${highlightSource === hoverKey ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'hover:bg-slate-50/60'}`}
                        onMouseEnter={() => setHighlightSource(hoverKey)}
                        onMouseLeave={() => setHighlightSource(null)}
                      >
                        <td className="px-4 py-1.5 text-xs text-slate-700">{pair.label1} {'–'} {pair.label2}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums text-slate-600 font-bold">{pair.diff.toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums text-slate-500">{seB.toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums text-slate-600">{pair.t.toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums font-bold" style={{ color: pSig ? '#16a34a' : '#64748b' }}>{formatP(pair.p)}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            {pair.d.toFixed(2)}
                            <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: Math.abs(pair.d) >= 0.80 ? '#16a34a' : Math.abs(pair.d) >= 0.60 ? '#0891b2' : Math.abs(pair.d) >= 0.40 ? '#d97706' : Math.abs(pair.d) >= 0.20 ? '#64748b' : '#cbd5e1' }}>
                              {Math.abs(pair.d) >= 0.80 ? 'Large' : Math.abs(pair.d) >= 0.60 ? 'Med-Large' : Math.abs(pair.d) >= 0.40 ? 'Sm-Medium' : Math.abs(pair.d) >= 0.20 ? 'Small' : 'Very Small'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Within-subjects comparisons */}
        {withinPairs.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{withinLabel} (Within)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-slate-800">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Comparison</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Mean Diff</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">SE</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">t</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">p</th>
                    <th className="px-4 py-1.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Cohen's d</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withinPairs.map((pair, idx) => {
                    const hoverKey = `posthoc-W-${pair.j1}-${pair.j2}`;
                    const pSig = pair.p < 0.05;
                    return (
                      <tr key={idx}
                        className={`cursor-pointer transition-colors duration-150 ${highlightSource === hoverKey ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'hover:bg-slate-50/60'}`}
                        onMouseEnter={() => setHighlightSource(hoverKey)}
                        onMouseLeave={() => setHighlightSource(null)}
                      >
                        <td className="px-4 py-1.5 text-xs text-slate-700">{pair.label1} {'–'} {pair.label2}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums text-slate-600 font-bold">{pair.diff.toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums text-slate-500">{seW.toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums text-slate-600">{pair.t.toFixed(2)}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums font-bold" style={{ color: pSig ? '#16a34a' : '#64748b' }}>{formatP(pair.p)}</td>
                        <td className="px-4 py-1.5 text-right text-xs tabular-nums text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            {pair.d.toFixed(2)}
                            <span className="text-[7px] font-bold uppercase tracking-wide" style={{ color: Math.abs(pair.d) >= 0.80 ? '#16a34a' : Math.abs(pair.d) >= 0.60 ? '#0891b2' : Math.abs(pair.d) >= 0.40 ? '#d97706' : Math.abs(pair.d) >= 0.20 ? '#64748b' : '#cbd5e1' }}>
                              {Math.abs(pair.d) >= 0.80 ? 'Large' : Math.abs(pair.d) >= 0.60 ? 'Med-Large' : Math.abs(pair.d) >= 0.40 ? 'Sm-Medium' : Math.abs(pair.d) >= 0.20 ? 'Small' : 'Very Small'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Interaction Plot (SVG – hero chart)
     ───────────────────────────────────────────────────────────────────────── */

  const renderInteractionPlot = () => {
    const heroW = 460, heroH = 280;
    const hml = 50, hmr = 20, hmt = 30, hmb = 50;
    const hpw = heroW - hml - hmr;
    const hph = heroH - hmt - hmb;

    // Gather all cell values
    const allVals: number[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const v = getMean(r, c);
        allVals.push(v);
      }
    if (!allVals.length) return null;

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const range = rawMax - rawMin || 10;
    const pad = range * 0.15;
    const yMin = Math.max(0, rawMin - pad);
    const yMax = rawMax + pad;

    const hScaleX = (i: number, n: number) => {
      if (n <= 1) return hml + hpw / 2;
      const inset = hpw * 0.15;
      return hml + inset + (i / (n - 1)) * (hpw - 2 * inset);
    };
    const hScaleY = (v: number) => hmt + (1 - (v - yMin) / (yMax - yMin || 1)) * hph;

    // Y-axis ticks
    const niceStep = (r: number): number => {
      const rough = r / 5;
      const pow10 = Math.pow(10, Math.floor(Math.log10(rough)));
      const frac = rough / pow10;
      if (frac <= 1.5) return pow10;
      if (frac <= 3.5) return 2 * pow10;
      if (frac <= 7.5) return 5 * pow10;
      return 10 * pow10;
    };
    const step = niceStep(yMax - yMin);
    const yTicks: number[] = [];
    let yt = Math.floor(yMin / step) * step;
    while (yt <= yMax + step * 0.01) {
      if (yt >= yMin - step * 0.01) yTicks.push(yt);
      yt += step;
    }

    // Interaction detection
    const intP = anovaSummary ? fDistPValue(anovaSummary.fInteraction, anovaSummary.dfInteraction, anovaSummary.dfWithinError) : 1;
    const intSig = intP < 0.05;

    // Determine interaction type
    let interactionType: 'crossover' | 'ordinal' | 'none' = 'none';
    let interactionDesc = '';
    let interactionColor = '#64748b';
    let interactionLabel = 'No Interaction';

    if (rows === 2 && cols >= 2) {
      // Simple: check if lines cross
      const diffs: number[] = [];
      for (let c = 0; c < cols; c++) {
        diffs.push(getMean(1, c) - getMean(0, c));
      }
      const signs = diffs.map(d => Math.sign(d));
      const hasSignChange = signs.some((s, i) => i > 0 && s !== signs[0] && s !== 0 && signs[0] !== 0);

      if (hasSignChange) {
        interactionType = 'crossover';
        interactionColor = '#16a34a';
        interactionLabel = 'Crossover Interaction';
        interactionDesc = `The effect of ${withinLabel} reverses direction depending on ${betweenLabel}. The lines cross.`;
      } else {
        const absDiffs = diffs.map(Math.abs);
        const maxDiff = Math.max(...absDiffs);
        const minDiff = Math.min(...absDiffs);
        if (maxDiff > 0 && (maxDiff - minDiff) / maxDiff > 0.25) {
          interactionType = 'ordinal';
          interactionColor = '#d97706';
          interactionLabel = 'Ordinal Interaction';
          interactionDesc = `The effect of ${withinLabel} is stronger for one ${betweenLabel.toLowerCase()} group than the other, but in the same direction.`;
        } else {
          interactionDesc = `The effect of ${withinLabel} is similar across ${betweenLabel.toLowerCase()} groups. Lines are roughly parallel.`;
        }
      }
    } else if (rows >= 3) {
      // Check slopes across multiple groups
      const slopes: number[] = [];
      for (let r = 0; r < rows; r++) {
        slopes.push(getMean(r, cols - 1) - getMean(r, 0));
      }
      const slopeSigns = slopes.map(s => Math.sign(s));
      const hasCross = slopeSigns.some((s, i) => i > 0 && s !== slopeSigns[0] && s !== 0 && slopeSigns[0] !== 0);

      if (hasCross) {
        interactionType = 'crossover';
        interactionColor = '#16a34a';
        interactionLabel = 'Crossover Interaction';
        interactionDesc = `At least one ${betweenLabel.toLowerCase()} group shows the opposite pattern across ${withinLabel.toLowerCase()} levels.`;
      } else {
        const absSlopes = slopes.map(Math.abs);
        const maxSlope = Math.max(...absSlopes);
        const minSlope = Math.min(...absSlopes);
        if (maxSlope > 0 && (maxSlope - minSlope) / maxSlope > 0.25) {
          interactionType = 'ordinal';
          interactionColor = '#d97706';
          interactionLabel = 'Ordinal Interaction';
          interactionDesc = `The pattern across ${withinLabel.toLowerCase()} is similar but differs in magnitude across ${betweenLabel.toLowerCase()} groups.`;
        } else {
          interactionDesc = `All groups show similar patterns across ${withinLabel.toLowerCase()} levels.`;
        }
      }
    }

    return (
      <div className="space-y-4">
        {/* Hero Interaction Plot */}
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Interaction Plot</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
              {betweenLabel} {'×'} {withinLabel} {'–'} {dvLabel}
            </p>
          </div>
          <div className="flex justify-center px-4 py-3">
            <svg width={heroW} height={heroH} className="mx-auto">
              <defs>
                <filter id="glow-sp" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Grid */}
              {yTicks.map((v, i) => (
                <g key={i}>
                  <line x1={hml} x2={heroW - hmr} y1={hScaleY(v)} y2={hScaleY(v)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,3" />
                  <text x={hml - 8} y={hScaleY(v) + 3} textAnchor="end" className="text-[10px] fill-slate-400">{Math.round(v)}</text>
                </g>
              ))}

              {/* Axes */}
              <line x1={hml} x2={hml} y1={hmt} y2={heroH - hmb} stroke="#94a3b8" strokeWidth={1} />
              <line x1={hml} x2={heroW - hmr} y1={heroH - hmb} y2={heroH - hmb} stroke="#94a3b8" strokeWidth={1} />

              {/* Y-axis label */}
              <text x={14} y={hmt + hph / 2} textAnchor="middle" className="text-[10px] font-semibold fill-slate-500" transform={`rotate(-90, 14, ${hmt + hph / 2})`}>
                {dvLabel}
              </text>

              {/* Series lines (one per between-subjects level) */}
              {Array.from({ length: rows }).map((_, r) => {
                const color = seriesColors[r % seriesColors.length];
                const opacity = getLineOpacity(r);
                const points: string[] = [];
                for (let c = 0; c < cols; c++) {
                  points.push(`${hScaleX(c, cols)},${hScaleY(getMean(r, c))}`);
                }
                const pathD = points.map((p, i) => (i === 0 ? `M${p}` : `L${p}`)).join(' ');

                return (
                  <g key={`line-${r}`}>
                    {/* Glow halo for lines */}
                    {highlightSource === 'between' && (
                      <path d={pathD} fill="none" stroke={color} strokeWidth={6} opacity={0.3} filter="url(#glow-sp)" />
                    )}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      opacity={opacity}
                      style={{ transition: 'opacity 200ms ease' }}
                    />
                  </g>
                );
              })}

              {/* Data points */}
              {Array.from({ length: rows }).map((_, r) => {
                const color = seriesColors[r % seriesColors.length];
                return Array.from({ length: cols }).map((_, c) => {
                  const val = getMean(r, c);
                  const cx = hScaleX(c, cols);
                  const cy = hScaleY(val);
                  const opacity = getPointOpacity(r, c);
                  const glow = getPointGlow(r, c);

                  return (
                    <g key={`pt-${r}-${c}`} style={{ transition: 'opacity 200ms ease' }} opacity={opacity}>
                      {glow && (
                        <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.25} filter="url(#glow-sp)">
                          <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        cx={cx} cy={cy} r={5}
                        fill={color} stroke="white" strokeWidth={2}
                        style={{ transition: 'cx 300ms ease, cy 300ms ease' }}
                      />
                      <text x={cx} y={cy - 10} textAnchor="middle" className="text-[9px] font-bold fill-slate-700" style={{ transition: 'y 300ms ease' }}>
                        {val.toFixed(0)}
                      </text>
                    </g>
                  );
                });
              })}

              {/* Interaction gap lines (when interaction hovered) */}
              {highlightSource === 'interaction' && rows >= 2 && (
                <>
                  {Array.from({ length: cols }).map((_, c) => {
                    const cx = hScaleX(c, cols);
                    const colVals = Array.from({ length: rows }, (_, r) => getMean(r, c));
                    const minV = Math.min(...colVals);
                    const maxV = Math.max(...colVals);
                    const gap = maxV - minV;
                    if (gap < 0.5) return null;
                    return (
                      <g key={`gap-${c}`}>
                        <line x1={cx + 12} x2={cx + 12} y1={hScaleY(maxV)} y2={hScaleY(minV)} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4,3" />
                        <text x={cx + 18} y={(hScaleY(maxV) + hScaleY(minV)) / 2 + 3} className="text-[8px] font-bold fill-indigo-500">
                          {'Δ'}{gap.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

              {/* X-axis level labels */}
              {wLevels.map((label, c) => (
                <text key={c} x={hScaleX(c, cols)} y={heroH - hmb + 16} textAnchor="middle" className="text-[10px] font-semibold fill-slate-600">
                  {label}
                </text>
              ))}
              {/* X-axis title */}
              <text x={hml + hpw / 2} y={heroH - 6} textAnchor="middle" className="text-[10px] font-semibold fill-slate-500">{withinLabel}</text>

              {/* Legend */}
              {(() => {
                const legendItems = bLevels.map((name, i) => ({ name, color: seriesColors[i % seriesColors.length] }));
                const itemWidth = 90;
                const totalW = legendItems.length * itemWidth;
                const startX = hml + (hpw - totalW) / 2;
                return legendItems.map((item, i) => (
                  <g key={`legend-${i}`} transform={`translate(${startX + i * itemWidth}, ${hmt - 16})`}>
                    <line x1={0} x2={16} y1={4} y2={4} stroke={item.color} strokeWidth={2.5} />
                    <circle cx={8} cy={4} r={3} fill={item.color} stroke="white" strokeWidth={1} />
                    <text x={20} y={7} className="text-[9px] font-semibold fill-slate-600">{item.name}</text>
                  </g>
                ));
              })()}
            </svg>
          </div>
        </div>

        {/* Interaction diagnosis card */}
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{interactionType === 'crossover' ? '✅' : interactionType === 'ordinal' ? '⚠️' : '➖'}</span>
              <span className="text-sm font-black" style={{ color: interactionColor }}>{interactionLabel}</span>
              {intSig && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 uppercase tracking-wide">Significant</span>}
              {Number.isFinite(intP) && !intSig && <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 uppercase tracking-wide">Not Significant</span>}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{interactionDesc}</p>
            <p className="text-xs text-slate-500 mt-2 italic">
              Adjust the cell means on the left to create, remove, or reverse the interaction.
            </p>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Render: Main Effects Dot + 95% CI Charts
     ───────────────────────────────────────────────────────────────────────── */

  const renderMainEffectsCard = () => {
    const { rowMeans, colMeans } = computeMarginalMeans(cellMeans, rows, cols);
    const s = anovaSummary;
    if (!s) return null;

    const seB = Math.sqrt(s.msSubjects / (nPerCell * cols));
    const seW = Math.sqrt(s.msWithinError / (nPerCell * rows));
    const tCrit = 1.96;

    const dotColors = ['#4f46e5', '#0891b2', '#059669', '#7c3aed', '#dc2626', '#d97706'];

    const renderDotCIChart = (
      means: (number | null)[],
      labels: string[],
      label: string,
      seVal: number
    ) => {
      const validMeans = means.filter((v): v is number => v !== null);
      if (!validMeans.length) return null;

      const w = 320, h = 220;
      const ml = 52, mr = 16, mt = 16, mb = 44;
      const pw = w - ml - mr;
      const ph = h - mt - mb;

      const ciMax = Math.max(...validMeans.map(v => v + tCrit * seVal));
      const ciMin = Math.min(...validMeans.map(v => v - tCrit * seVal));
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
          <text x={ml + pw / 2} y={h - 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="#475569">{label}</text>
          {/* Dots + CI */}
          {validMeans.map((v, i) => {
            const x = ml + pw * (i + 0.5) / validMeans.length;
            const color = dotColors[i % dotColors.length];
            const upper = v + tCrit * seVal;
            const lower = v - tCrit * seVal;
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

    return (
      <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Main Effects</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
            Marginal means with 95% confidence intervals
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-200">
          <div className="px-3 py-3">
            <p className="text-[11px] font-bold text-slate-600 mb-1 text-center uppercase tracking-wide">{betweenLabel} <span className="text-[8px] font-normal">(between)</span></p>
            {renderDotCIChart(rowMeans, bLevels, betweenLabel, seB)}
          </div>
          <div className="px-3 py-3">
            <p className="text-[11px] font-bold text-slate-600 mb-1 text-center uppercase tracking-wide">{withinLabel} <span className="text-[8px] font-normal">(within)</span></p>
            {renderDotCIChart(colMeans, wLevels, withinLabel, seW)}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     Main return
     ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col gap-6 lg:flex-row h-full">
      {/* ── Left column (55%) ──────────────────────────────────── */}
      <aside className="flex-1 lg:basis-[55%] lg:max-w-[55%] overflow-y-auto min-h-0" style={{ direction: 'rtl' }}>
        <div style={{ direction: 'ltr' }}>
        {/* Header / Controls Card */}
        <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Split-Plot / Mixed Design</span>
            </h3>
          </div>

          {/* Design selector */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Design:</span>
            {DESIGN_CONFIGS.map((cfg) => (
              <button
                key={cfg.id}
                type="button"
                onClick={() => handleDesignSwitch(cfg.id)}
                className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
                  designId === cfg.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400 hover:text-indigo-600'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Label editors */}
          <div className="px-3 py-2 border-b border-slate-100 grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">DV Label</label>
              <input type="text" value={dvLabel} onChange={(e) => setDvLabel(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Between Factor</label>
              <input type="text" value={betweenLabel} onChange={(e) => setBetweenLabel(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Within Factor</label>
              <input type="text" value={withinLabel} onChange={(e) => setWithinLabel(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white" />
            </div>
          </div>

          {/* Level name editors */}
          <div className="px-3 py-2 border-b border-slate-100 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Between Levels (comma-sep)</label>
              <input type="text" value={betweenLevelsText} onChange={(e) => setBetweenLevelsText(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Within Levels (comma-sep)</label>
              <input type="text" value={withinLevelsText} onChange={(e) => setWithinLevelsText(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white" />
            </div>
          </div>

          {/* Dataset selector */}
          <div className="px-3 py-2 border-b border-slate-100">
            <select
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 bg-white text-slate-700"
              value={activeExampleId ?? ''}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) { setActiveExampleId(null); return; }
                const ex = EXAMPLE_DATASETS.find((d) => d.id === id);
                if (ex) applyExample(ex);
              }}
            >
              <option value="">— Select an example dataset —</option>
              <optgroup label="2B × 2W Designs">
                {EXAMPLE_DATASETS.filter(d => d.designId === '2b2w').map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </optgroup>
              <optgroup label="2B × 3W Designs">
                {EXAMPLE_DATASETS.filter(d => d.designId === '2b3w').map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </optgroup>
              <optgroup label="2B × 4W Designs">
                {EXAMPLE_DATASETS.filter(d => d.designId === '2b4w').map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Cell means grid */}
          <div className="px-3 py-3">
            {renderCellMeansPanel()}
          </div>
        </div>

        {/* Mixed ANOVA Card */}
        <div className="mt-4">{renderAnovaCard()}</div>

        {/* EMM Card */}
        <div className="mt-4">{renderEMMCard()}</div>

        {/* Post Hoc */}
        <div className="mt-4">{renderPostHocCard()}</div>
        </div>
      </aside>

      {/* ── Right column (45%) ──────────────────────────────────── */}
      <section className="flex-1 lg:basis-[45%] lg:max-w-[45%] overflow-y-auto min-h-0">
        {activeExample && (
          <div className="mx-1 mb-3 mt-1 bg-indigo-50/50 border-l-4 border-indigo-500 px-5 py-4 text-sm text-slate-800 shadow-sm">
            <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Scenario</div>
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
          {renderInteractionPlot()}
          {renderMainEffectsCard()}
        </div>
      </section>
    </div>
  );
};

export default SplitPlotTool;
