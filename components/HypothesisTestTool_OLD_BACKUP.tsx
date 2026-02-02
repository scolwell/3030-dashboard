import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Check, 
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Eye,
  Settings,
  Globe,
  Zap,
  Maximize2
} from 'lucide-react';

// ============================================================================
// MATH UTILITIES
// ============================================================================

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCDF(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function normalPDF(z: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
}

const CRITICAL_VALUES: { [key: string]: number } = {
  'one-0.10': 1.2816,
  'one-0.05': 1.6449,
  'one-0.01': 2.3263,
  'two-0.10': 1.6449,
  'two-0.05': 1.9600,
  'two-0.01': 2.5758,
};

// ============================================================================
// TYPES
// ============================================================================

type TailType = 'two' | 'left' | 'right';
type AlphaValue = 0.01 | 0.05 | 0.10;
type StepId = 1 | 2 | 3 | 4 | 5 | 6; // 6 = Challenge

interface Scenario {
  name: string;
  mu0: number;
  sigma: number;
  n: number;
  xbar: number;
  tail: TailType;
  alpha: AlphaValue;
  description: string;
}

interface ChallengeType {
  type: 'significant' | 'hide' | 'alpha-trade';
  description: string;
  targetDecision: 'reject' | 'fail-to-reject';
  mu0: number;
  sigma: number;
  muTrue?: number;
  fixedN?: number;
  fixedXbar?: number;
  fixedAlpha?: AlphaValue;
  fixedTail?: TailType;
  constraints: {
    nMin?: number;
    nMax?: number;
    xbarMin?: number;
    xbarMax?: number;
    allowAlphaChange?: boolean;
    allowTailChange?: boolean;
  };
}

// ============================================================================
// SCENARIOS
// ============================================================================

const SCENARIOS: Scenario[] = [
  {
    name: 'Repeat Purchase Amount (Consumer Behavior)',
    mu0: 85,
    sigma: 18,
    n: 56,
    xbar: 91,
    tail: 'right',
    alpha: 0.05,
    description: 'Testing if a loyalty program increases repeat purchase amount ($).'
  },
  {
    name: 'Ad Recall Score (Consumer Behavior)',
    mu0: 70,
    sigma: 10,
    n: 49,
    xbar: 67,
    tail: 'left',
    alpha: 0.05,
    description: 'Does the presence of rival banner ads lower brand recall %? (baseline = 70%)'
  },
  {
    name: 'Decision Time Under Pressure (Managerial Psychology)',
    mu0: 30,
    sigma: 6,
    n: 36,
    xbar: 28.2,
    tail: 'left',
    alpha: 0.05,
    description: 'Assessing if training reduces managers\' decision time in crises (seconds).'
  },
  {
    name: 'Working Memory Span (Psychology)',
    mu0: 7.0,
    sigma: 1.2,
    n: 81,
    xbar: 6.6,
    tail: 'two',
    alpha: 0.01,
    description: 'Testing how sleep deprivation changes working memory span (items recalled, baseline = 7.0).'
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HypothesisTestTool: React.FC = () => {
  const [scenario, setScenario] = useState<string>('Repeat Purchase Amount (Consumer Behavior)');
  const [mu0, setMu0] = useState<number>(85);
  const [sigma, setSigma] = useState<number>(18);
  const [n, setN] = useState<number>(56);
  const [xbar, setXbar] = useState<number>(91);
  const [tail, setTail] = useState<TailType>('right');
  const [alpha, setAlpha] = useState<AlphaValue>(0.05);
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [copied, setCopied] = useState(false);
  const [challengeActive, setChallengeActive] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeType | null>(null);
  const [challengeAttempted, setChallengeAttempted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [configStyle, setConfigStyle] = useState<'clean' | 'compact' | 'cards' | 'split'>('clean');

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (n < 2) errs.push('Sample size must be at least 2');
    if (!Number.isInteger(n)) errs.push('Sample size must be an integer');
    if (sigma <= 0) errs.push('Standard deviation must be positive');
    return errs;
  }, [n, sigma]);

  const isValid = errors.length === 0;

  const results = useMemo(() => {
    if (!isValid) return null;
    const se = sigma / Math.sqrt(n);
    const z = (xbar - mu0) / se;
    const critKey = tail === 'two' ? `two-${alpha}` : `one-${alpha}`;
    const critZ = CRITICAL_VALUES[critKey];
    let criticalLower: number | null = null;
    let criticalUpper: number | null = null;
    if (tail === 'two') { criticalLower = -critZ; criticalUpper = critZ; }
    else if (tail === 'left') { criticalLower = -critZ; }
    else { criticalUpper = critZ; }
    let pValue: number;
    if (tail === 'two') { pValue = 2 * (1 - normalCDF(Math.abs(z))); }
    else if (tail === 'right') { pValue = 1 - normalCDF(z); }
    else { pValue = normalCDF(z); }
    let reject = false;
    if (tail === 'two') { reject = Math.abs(z) > critZ; }
    else if (tail === 'right') { reject = z > critZ; }
    else { reject = z < -critZ; }
    return { se, z, criticalLower, criticalUpper, pValue, reject };
  }, [mu0, sigma, n, xbar, tail, alpha, isValid]);

  useEffect(() => {
    const sc = SCENARIOS.find(s => s.name === scenario);
    if (sc) {
      setMu0(sc.mu0); setSigma(sc.sigma); setN(sc.n);
      setXbar(sc.xbar); setTail(sc.tail); setAlpha(sc.alpha);
    }
  }, [scenario]);

  useEffect(() => {
    if (!canvasRef.current || !results) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width; const height = canvas.height;
    const padding = { top: 30, right: 40, bottom: 50, left: 60 };
    ctx.clearRect(0, 0, width, height);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const zMin = -4; const zMax = 4; const zRange = zMax - zMin;
    const yMax = normalPDF(0) * 1.1;
    const xScale = (z: number) => padding.left + ((z - zMin) / zRange) * chartWidth;
    const yScale = (y: number) => height - padding.bottom - (y / yMax) * chartHeight;
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padding.left, yScale(0)); ctx.lineTo(width - padding.right, yScale(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, height - padding.bottom); ctx.stroke();
    ctx.fillStyle = '#6B7280'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let z = -4; z <= 4; z++) {
      const x = xScale(z); ctx.fillText(z.toString(), x, height - padding.bottom + 20);
      ctx.beginPath(); ctx.moveTo(x, yScale(0)); ctx.lineTo(x, yScale(0) + 5); ctx.strokeStyle = '#E5E7EB'; ctx.stroke();
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = (yMax / 4) * i; const yPos = yScale(y);
      ctx.fillText(y.toFixed(2), padding.left - 10, yPos);
      ctx.beginPath(); ctx.moveTo(padding.left - 5, yPos); ctx.lineTo(padding.left, yPos);
      ctx.strokeStyle = '#E5E7EB'; ctx.stroke();
    }
    ctx.fillStyle = '#374151'; ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('z-score', width / 2, height - 10);
    ctx.save(); ctx.translate(15, height / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Probability Density', 0, 0); ctx.restore();
    const steps = 200; ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    if (tail === 'two' && results.criticalLower && results.criticalUpper) {
      ctx.beginPath(); ctx.moveTo(xScale(zMin), yScale(0));
      for (let i = 0; i <= steps; i++) {
        const z = zMin + (results.criticalLower - zMin) * (i / steps);
        const y = normalPDF(z); ctx.lineTo(xScale(z), yScale(y));
      }
      ctx.lineTo(xScale(results.criticalLower), yScale(0)); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(xScale(results.criticalUpper), yScale(0));
      for (let i = 0; i <= steps; i++) {
        const z = results.criticalUpper + (zMax - results.criticalUpper) * (i / steps);
        const y = normalPDF(z); ctx.lineTo(xScale(z), yScale(y));
      }
      ctx.lineTo(xScale(zMax), yScale(0)); ctx.closePath(); ctx.fill();
    } else if (tail === 'left' && results.criticalLower) {
      ctx.beginPath(); ctx.moveTo(xScale(zMin), yScale(0));
      for (let i = 0; i <= steps; i++) {
        const z = zMin + (results.criticalLower - zMin) * (i / steps);
        const y = normalPDF(z); ctx.lineTo(xScale(z), yScale(y));
      }
      ctx.lineTo(xScale(results.criticalLower), yScale(0)); ctx.closePath(); ctx.fill();
    } else if (tail === 'right' && results.criticalUpper) {
      ctx.beginPath(); ctx.moveTo(xScale(results.criticalUpper), yScale(0));
      for (let i = 0; i <= steps; i++) {
        const z = results.criticalUpper + (zMax - results.criticalUpper) * (i / steps);
        const y = normalPDF(z); ctx.lineTo(xScale(z), yScale(y));
      }
      ctx.lineTo(xScale(zMax), yScale(0)); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const z = zMin + (zRange * i) / steps; const y = normalPDF(z);
      const x = xScale(z); const yPos = yScale(y);
      if (i === 0) { ctx.moveTo(x, yPos); } else { ctx.lineTo(x, yPos); }
    }
    ctx.stroke();
    if (results.criticalLower !== null) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(xScale(results.criticalLower), padding.top);
      ctx.lineTo(xScale(results.criticalLower), height - padding.bottom); ctx.stroke();
      ctx.fillStyle = '#EF4444'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`z = ${results.criticalLower.toFixed(3)}`, xScale(results.criticalLower), padding.top - 5);
    }
    if (results.criticalUpper !== null) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(xScale(results.criticalUpper), padding.top);
      ctx.lineTo(xScale(results.criticalUpper), height - padding.bottom); ctx.stroke();
      ctx.fillStyle = '#EF4444'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`z = ${results.criticalUpper.toFixed(3)}`, xScale(results.criticalUpper), padding.top - 5);
    }
    ctx.setLineDash([]); ctx.strokeStyle = results.reject ? '#10B981' : '#F59E0B'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xScale(results.z), padding.top + 15);
    ctx.lineTo(xScale(results.z), height - padding.bottom); ctx.stroke();
    ctx.fillStyle = results.reject ? '#10B981' : '#F59E0B'; ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(`Observed z = ${results.z.toFixed(3)}`, xScale(results.z), padding.top + 10);
  }, [results, tail]);

  const generateChallenge = () => {
    const types: ChallengeType['type'][] = ['significant', 'hide', 'alpha-trade'];
    const type = types[Math.floor(Math.random() * types.length)];
    let challenge: ChallengeType;
    if (type === 'significant') {
      const mu = 100 + Math.random() * 50; const sig = 10 + Math.random() * 10;
      challenge = {
        type: 'significant', description: `Make the test reject H₀ at α = 0.05 (two-tailed) by choosing n and x̄.`,
        targetDecision: 'reject', mu0: Math.round(mu), sigma: Math.round(sig * 10) / 10,
        fixedAlpha: 0.05, fixedTail: 'two',
        constraints: { nMin: 10, nMax: 200, xbarMin: Math.round((mu - sig * 2) * 10) / 10, xbarMax: Math.round((mu + sig * 2) * 10) / 10 }
      };
    } else if (type === 'hide') {
      const mu = 100 + Math.random() * 50; const sig = 10 + Math.random() * 10;
      const muTrue = mu + (Math.random() > 0.5 ? 1 : -1) * (sig * 0.3);
      challenge = {
        type: 'hide', description: `The true mean is ${muTrue.toFixed(1)}, but you want to FAIL to reject H₀: μ = ${Math.round(mu)}. Choose a small n to hide the difference.`,
        targetDecision: 'fail-to-reject', mu0: Math.round(mu), muTrue: Math.round(muTrue * 10) / 10, sigma: Math.round(sig * 10) / 10,
        fixedAlpha: 0.05, fixedTail: 'two',
        constraints: { nMin: 5, nMax: 50, xbarMin: Math.round((muTrue - sig) * 10) / 10, xbarMax: Math.round((muTrue + sig) * 10) / 10 }
      };
    } else {
      const mu = 100; const sig = 15; const xb = mu + sig * 0.15;
      challenge = {
        type: 'alpha-trade', description: `With x̄ = ${xb.toFixed(1)} fixed, choose α and tail type to REJECT H₀.`,
        targetDecision: 'reject', mu0: mu, sigma: sig, fixedN: 100, fixedXbar: xb,
        constraints: { allowAlphaChange: true, allowTailChange: true }
      };
    }
    setCurrentChallenge(challenge); setChallengeAttempted(false); setShowHint(false);
    setMu0(challenge.mu0); setSigma(challenge.sigma);
    if (challenge.fixedN) setN(challenge.fixedN);
    if (challenge.fixedXbar) setXbar(challenge.fixedXbar);
    if (challenge.fixedAlpha) setAlpha(challenge.fixedAlpha);
    if (challenge.fixedTail) setTail(challenge.fixedTail);
  };

  const checkChallenge = () => {
    if (!currentChallenge || !results) return null;
    const success = currentChallenge.targetDecision === 'reject' ? results.reject : !results.reject;
    const close = !success && Math.abs(Math.abs(results.z) - (results.criticalUpper || results.criticalLower || 1.96)) < 0.2;
    return { success, close };
  };

  const getHint = () => {
    if (!currentChallenge) return '';
    if (currentChallenge.type === 'significant') {
      return 'Hint: Increasing n decreases the standard error, making the test more sensitive. Also, choose an x̄ farther from μ₀.';
    } else if (currentChallenge.type === 'hide') {
      return 'Hint: With small n, the standard error is large, making it harder to detect differences. Choose n close to the minimum.';
    } else {
      return 'Hint: A larger α (like 0.10) increases your chance of rejecting. One-tailed tests can also help if the difference is in one direction.';
    }
  };

  const copyResults = () => {
    if (!results) return;
    const h0 = tail === 'two' ? `H₀: μ = ${mu0}` : tail === 'right' ? `H₀: μ ≤ ${mu0}` : `H₀: μ ≥ ${mu0}`;
    const ha = tail === 'two' ? `Hₐ: μ ≠ ${mu0}` : tail === 'right' ? `Hₐ: μ > ${mu0}` : `Hₐ: μ < ${mu0}`;
    const text = `Hypothesis Test Results\n${h0}\n${ha}\nα = ${alpha}, ${tail === 'two' ? 'two-tailed' : tail === 'left' ? 'left-tailed' : 'right-tailed'}\n\nSample: n = ${n}, x̄ = ${xbar}, σ = ${sigma}\nSE = ${results.se.toFixed(4)}\nz = ${results.z.toFixed(4)}\np-value = ${results.pValue.toFixed(4)}\n\nDecision: ${results.reject ? 'Reject H₀' : 'Fail to reject H₀'}\n\n${getInterpretation()}`;
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const getInterpretation = () => {
    if (!results) return '';
    const direction = tail === 'right' ? 'greater than' : tail === 'left' ? 'less than' : 'different from';
    if (results.reject) {
      return `At the α = ${alpha} significance level, we reject the null hypothesis. The sample provides sufficient evidence to conclude that the population mean is ${direction} ${mu0}.`;
    } else {
      return `At the α = ${alpha} significance level, we fail to reject the null hypothesis. The sample does not provide sufficient evidence to conclude that the population mean is ${direction} ${mu0}. Note: This does not prove the null hypothesis is true.`;
    }
  };

  const markStepComplete = (step: StepId) => {
    setCompletedSteps(prev => new Set(prev).add(step));
  };

  const goToStep = (step: StepId) => {
    setCurrentStep(step);
    if (step === 6) {
      setChallengeActive(true);
      if (!currentChallenge) { generateChallenge(); }
    } else {
      setChallengeActive(false);
    }
  };

  return (
    <div className="w-full h-full flex gap-6">
      <div className="w-64 flex-shrink-0 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Steps</h3>
          <div className="space-y-1">
            {[
              { id: 1, label: 'Define Hypotheses' },
              { id: 2, label: 'Set α & Distribution' },
              { id: 3, label: 'Calculate Test Statistic' },
              { id: 4, label: 'Make Decision' },
              { id: 5, label: 'Interpret Results' },
              { id: 6, label: 'Challenge Mode' },
            ].map((step) => (
              <button
                key={step.id}
                onClick={() => goToStep(step.id as StepId)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  currentStep === step.id
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : completedSteps.has(step.id as StepId)
                    ? 'text-gray-700 hover:bg-gray-50'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  completedSteps.has(step.id as StepId)
                    ? 'bg-green-100 text-green-700'
                    : currentStep === step.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {completedSteps.has(step.id as StepId) ? <Check size={12} /> : step.id}
                </div>
                <span className="flex-1 text-left">{step.label}</span>
                {currentStep === step.id && <ChevronRight size={16} />}
              </button>
            ))}
          </div>
        </div>
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        
        {/* Config Style rendering - 4 styles: clean, compact, cards, split */}
        {configStyle === 'clean' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Test Configuration</h3>
              <p className="text-sm text-gray-500">Set up your test with clear, grouped controls.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Scenario</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Preset</label>
                    <select value={scenario} onChange={(e) => setScenario(e.target.value)}
                      disabled={challengeActive && currentChallenge?.type !== 'alpha-trade'}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600">
                      {SCENARIOS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">{SCENARIOS.find(s => s.name === scenario)?.description}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tail Type</label>
                    <select value={tail} onChange={(e) => setTail(e.target.value as TailType)}
                      disabled={challengeActive && !currentChallenge?.constraints.allowTailChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600">
                      <option value="two">Two-tailed</option>
                      <option value="left">Left-tailed (&lt;)</option>
                      <option value="right">Right-tailed (&gt;)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Population Parameters</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">μ₀ (H₀ mean)</label>
                    <input type="number" value={mu0} onChange={(e) => setMu0(Number(e.target.value))} disabled={challengeActive}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">σ (Population SD)</label>
                    <input type="number" step="0.1" value={sigma} onChange={(e) => setSigma(Number(e.target.value))} disabled={challengeActive}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Sample Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">n (Sample size)</label>
                    <input type="number" value={n} onChange={(e) => setN(Number(e.target.value))}
                      disabled={challengeActive && currentChallenge?.fixedN !== undefined}
                      min={currentChallenge?.constraints.nMin || 2} max={currentChallenge?.constraints.nMax || 10000}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">x̄ (Sample mean)</label>
                    <input type="number" step="0.1" value={xbar} onChange={(e) => setXbar(Number(e.target.value))}
                      disabled={challengeActive && currentChallenge?.fixedXbar !== undefined}
                      min={currentChallenge?.constraints.xbarMin} max={currentChallenge?.constraints.xbarMax}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Significance</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">α Level</label>
                  <select value={alpha} onChange={(e) => setAlpha(Number(e.target.value) as AlphaValue)}
                    disabled={challengeActive && !currentChallenge?.constraints.allowAlphaChange}
                    className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600">
                    <option value={0.01}>0.01</option>
                    <option value={0.05}>0.05</option>
                    <option value={0.10}>0.10</option>
                  </select>
                </div>
              </div>
              {errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle size={16} />{err}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Hypotheses Preview</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Null (H₀)</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {tail === 'two' ? `μ = ${mu0}` : tail === 'right' ? `μ ≤ ${mu0}` : `μ ≥ ${mu0}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Alternative (Hₐ)</p>
                    <p className="text-lg font-semibold text-indigo-600">
                      {tail === 'two' ? `μ ≠ ${mu0}` : tail === 'right' ? `μ > ${mu0}` : `μ < ${mu0}`}
                    </p>
                  </div>
                </div>
                {isValid && (
                  <div className="mt-4 text-sm text-gray-700 space-y-1">
                    <p><span className="text-gray-600">SE:</span> <span className="font-medium">{(sigma/Math.sqrt(n)).toFixed(4)}</span></p>
                    <p><span className="text-gray-600">α:</span> <span className="font-medium">{alpha}</span></p>
                    <p><span className="text-gray-600">Tail:</span> <span className="font-medium">{tail}</span></p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
        
        {configStyle === 'compact' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Test Configuration</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Scenario</label>
                <select value={scenario} onChange={(e) => setScenario(e.target.value)}
                  disabled={challengeActive && currentChallenge?.type !== 'alpha-trade'}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-600">
                  {SCENARIOS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tail</label>
                <select value={tail} onChange={(e) => setTail(e.target.value as TailType)}
                  disabled={challengeActive && !currentChallenge?.constraints.allowTailChange}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-600">
                  <option value="two">Two</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">μ₀</label>
                <input type="number" value={mu0} onChange={(e) => setMu0(Number(e.target.value))} disabled={challengeActive}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">σ</label>
                <input type="number" step="0.1" value={sigma} onChange={(e) => setSigma(Number(e.target.value))} disabled={challengeActive}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">n</label>
                <input type="number" value={n} onChange={(e) => setN(Number(e.target.value))}
                  disabled={challengeActive && currentChallenge?.fixedN !== undefined}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">x̄</label>
                <input type="number" step="0.1" value={xbar} onChange={(e) => setXbar(Number(e.target.value))}
                  disabled={challengeActive && currentChallenge?.fixedXbar !== undefined}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">α</label>
                <select value={alpha} onChange={(e) => setAlpha(Number(e.target.value) as AlphaValue)}
                  disabled={challengeActive && !currentChallenge?.constraints.allowAlphaChange}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-indigo-600">
                  <option value={0.01}>0.01</option>
                  <option value={0.05}>0.05</option>
                  <option value={0.10}>0.10</option>
                </select>
              </div>
            </div>
            {errors.length > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">{err}</p>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
        
        {configStyle === 'cards' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Test Configuration</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-blue-900 mb-2">Scenario</label>
              <select value={scenario} onChange={(e) => setScenario(e.target.value)}
                disabled={challengeActive && currentChallenge?.type !== 'alpha-trade'}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-600">
                {SCENARIOS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-purple-900 mb-2">Tail Type</label>
              <select value={tail} onChange={(e) => setTail(e.target.value as TailType)}
                disabled={challengeActive && !currentChallenge?.constraints.allowTailChange}
                className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-600">
                <option value="two">Two-tailed</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-green-900 mb-2">μ₀</label>
              <input type="number" value={mu0} onChange={(e) => setMu0(Number(e.target.value))} disabled={challengeActive}
                className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:border-green-600" />
              <p className="text-xs text-green-700 mt-1">H₀ mean</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-green-900 mb-2">σ</label>
              <input type="number" step="0.1" value={sigma} onChange={(e) => setSigma(Number(e.target.value))} disabled={challengeActive}
                className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:border-green-600" />
              <p className="text-xs text-green-700 mt-1">Pop. SD</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-orange-900 mb-2">n</label>
              <input type="number" value={n} onChange={(e) => setN(Number(e.target.value))}
                disabled={challengeActive && currentChallenge?.fixedN !== undefined}
                className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
              <p className="text-xs text-orange-700 mt-1">Sample size</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-orange-900 mb-2">x̄</label>
              <input type="number" step="0.1" value={xbar} onChange={(e) => setXbar(Number(e.target.value))}
                disabled={challengeActive && currentChallenge?.fixedXbar !== undefined}
                className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:border-orange-600" />
              <p className="text-xs text-orange-700 mt-1">Sample mean</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-lg p-4">
              <label className="block text-xs font-semibold text-red-900 mb-2">α</label>
              <select value={alpha} onChange={(e) => setAlpha(Number(e.target.value) as AlphaValue)}
                disabled={challengeActive && !currentChallenge?.constraints.allowAlphaChange}
                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-600">
                <option value={0.01}>0.01</option>
                <option value={0.05}>0.05</option>
                <option value={0.10}>0.10</option>
              </select>
              <p className="text-xs text-red-700 mt-1">Sig. level</p>
            </div>
          </div>
          {errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} />{err}
                </p>
              ))}
            </div>
          )}
        </div>
        )}
        
        {configStyle === 'split' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <div className="space-y-6">
            {/* Test Setup Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 bg-yellow-300 p-3 rounded-lg">
                <Settings size={22} className="text-indigo-600" />
                <h4 className="text-lg font-bold text-slate-800">Test Setup</h4>
              </div>
              <div className="space-y-4 ml-1">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 tracking-wider">SCENARIO PRESET</label>
                  <select value={scenario} onChange={(e) => setScenario(e.target.value)}
                    disabled={challengeActive && currentChallenge?.type !== 'alpha-trade'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                    {SCENARIOS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">{SCENARIOS.find(s => s.name === scenario)?.description}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider">TAIL TYPE</label>
                  <div className="flex gap-2">
                    <button onClick={() => setTail('left')} disabled={challengeActive && !currentChallenge?.constraints.allowTailChange}
                      className={`flex-1 px-3 py-2.5 border rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tail === 'left' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                      <ChevronLeft size={16} />Left
                    </button>
                    <button onClick={() => setTail('two')} disabled={challengeActive && !currentChallenge?.constraints.allowTailChange}
                      className={`flex-1 px-3 py-2.5 border rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tail === 'two' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                      <Maximize2 size={16} />Two
                    </button>
                    <button onClick={() => setTail('right')} disabled={challengeActive && !currentChallenge?.constraints.allowTailChange}
                      className={`flex-1 px-3 py-2.5 border rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tail === 'right' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                      <ChevronRight size={16} />Right
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 tracking-wider">SIGNIFICANCE LEVEL (α)</label>
                  <select value={alpha} onChange={(e) => setAlpha(Number(e.target.value) as AlphaValue)}
                    disabled={challengeActive && !currentChallenge?.constraints.allowAlphaChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                    <option value={0.01}>0.01 (Stringent)</option>
                    <option value={0.05}>0.05 (Standard)</option>
                    <option value={0.10}>0.10 (Lenient)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Probability of rejecting the null when it's true.</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Population Context Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe size={22} className="text-green-600" />
                <h4 className="text-lg font-bold text-slate-800">Population Context</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 ml-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 mb-1 tracking-wider">M₀ (Null Mean)</label>
                  <div className="relative">
                    <input type="number" value={mu0} onChange={(e) => setMu0(Number(e.target.value))} disabled={challengeActive}
                      className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200">
                      <button onClick={() => setMu0(mu0 + 1)} disabled={challengeActive}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center border-b border-slate-200 rounded-tr-lg">
                        <ChevronUp size={14} className="text-slate-600" />
                      </button>
                      <button onClick={() => setMu0(mu0 - 1)} disabled={challengeActive}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center rounded-br-lg">
                        <ChevronDown size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 mb-1 tracking-wider">Σ (STD DEV)</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={sigma} onChange={(e) => setSigma(Number(e.target.value))} disabled={challengeActive}
                      className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-medium" />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200">
                      <button onClick={() => setSigma(Number((sigma + 0.1).toFixed(1)))} disabled={challengeActive}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center border-b border-slate-200 rounded-tr-lg">
                        <ChevronUp size={14} className="text-slate-600" />
                      </button>
                      <button onClick={() => setSigma(Math.max(0.1, Number((sigma - 0.1).toFixed(1))))} disabled={challengeActive}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center rounded-br-lg">
                        <ChevronDown size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Sample Findings Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap size={22} className="text-orange-600" />
                <h4 className="text-lg font-bold text-slate-800">Sample Findings</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 ml-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 mb-1 tracking-wider">N (SAMPLE SIZE)</label>
                  <div className="relative">
                    <input type="number" value={n} onChange={(e) => setN(Number(e.target.value))}
                      disabled={challengeActive && currentChallenge?.fixedN !== undefined}
                      className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium" />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200">
                      <button onClick={() => setN(n + 1)} disabled={challengeActive && currentChallenge?.fixedN !== undefined}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center border-b border-slate-200 rounded-tr-lg">
                        <ChevronUp size={14} className="text-slate-600" />
                      </button>
                      <button onClick={() => setN(Math.max(1, n - 1))} disabled={challengeActive && currentChallenge?.fixedN !== undefined}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center rounded-br-lg">
                        <ChevronDown size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 mb-1 tracking-wider">X̄ (SAMPLE MEAN)</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={xbar} onChange={(e) => setXbar(Number(e.target.value))}
                      disabled={challengeActive && currentChallenge?.fixedXbar !== undefined}
                      className="w-full px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium" />
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200">
                      <button onClick={() => setXbar(Number((xbar + 0.1).toFixed(1)))} disabled={challengeActive && currentChallenge?.fixedXbar !== undefined}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center border-b border-slate-200 rounded-tr-lg">
                        <ChevronUp size={14} className="text-slate-600" />
                      </button>
                      <button onClick={() => setXbar(Number((xbar - 0.1).toFixed(1)))} disabled={challengeActive && currentChallenge?.fixedXbar !== undefined}
                        className="flex-1 px-1.5 hover:bg-slate-100 transition-all flex items-center justify-center rounded-br-lg">
                        <ChevronDown size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={16} />{err}
                </p>
              ))}
            </div>
          )}
        </div>
        )}
        
        {isValid && results && (
          <>
            {/* Clean layout does not reorder visualization */}
            {currentStep === 1 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Step 1: Define Hypotheses</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Null Hypothesis (H₀):</p>
                  <p className="text-lg font-semibold text-gray-900 mb-4">
                    {tail === 'two' ? `μ = ${mu0}` : tail === 'right' ? `μ ≤ ${mu0}` : `μ ≥ ${mu0}`}
                  </p>
                  <p className="text-sm font-medium text-gray-700 mb-2">Alternative Hypothesis (Hₐ):</p>
                  <p className="text-lg font-semibold text-indigo-600">
                    {tail === 'two' ? `μ ≠ ${mu0}` : tail === 'right' ? `μ > ${mu0}` : `μ < ${mu0}`}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2"><Lightbulb size={16} />Key Points</h4>
                  <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
                    <li>H₀ represents the status quo or claim we're testing</li>
                    <li>Hₐ is what we suspect might be true</li>
                    <li>{tail === 'two' ? 'Two-tailed: we test for any difference' : tail === 'right' ? 'Right-tailed: testing if μ is greater' : 'Left-tailed: testing if μ is less'}</li>
                  </ul>
                </div>
                <button onClick={() => { markStepComplete(1); goToStep(2); }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
                  Next: Set α & Distribution<ChevronRight size={16} />
                </button>
              </div>
            )}
            {currentStep === 2 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Step 2: Sampling Distribution & Critical Values</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Significance Level</p>
                    <p className="text-2xl font-bold text-gray-900">α = {alpha}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Standard Error</p>
                    <p className="text-2xl font-bold text-gray-900">SE = {results.se.toFixed(4)}</p>
                    <p className="text-xs text-gray-500 mt-1">σ/√n = {sigma}/√{n}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Critical Value(s)</p>
                    <p className="text-lg font-bold text-red-600">
                      {results.criticalLower !== null && `z = ${results.criticalLower.toFixed(3)}`}
                      {results.criticalLower !== null && results.criticalUpper !== null && ', '}
                      {results.criticalUpper !== null && `z = ${results.criticalUpper.toFixed(3)}`}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Rejection Region</p>
                    <p className="text-sm text-gray-900">
                      {tail === 'two' && `|z| > ${results.criticalUpper?.toFixed(3)}`}
                      {tail === 'right' && `z > ${results.criticalUpper?.toFixed(3)}`}
                      {tail === 'left' && `z < ${results.criticalLower?.toFixed(3)}`}
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2"><Lightbulb size={16} />Key Points</h4>
                  <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
                    <li>α is our tolerance for Type I error (rejecting true H₀)</li>
                    <li>Critical values mark the boundaries of rejection regions</li>
                    <li>SE measures how much sample means vary from the population mean</li>
                  </ul>
                </div>
                <button onClick={() => { markStepComplete(2); goToStep(3); }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
                  Next: Calculate Test Statistic<ChevronRight size={16} />
                </button>
              </div>
            )}
            {currentStep === 3 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Step 3: Calculate Test Statistic</h3>
                <div className="bg-gray-50 rounded-lg p-6 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Formula:</p>
                  <p className="text-lg text-gray-900 mb-4 font-mono">z = (x̄ − μ₀) / (σ/√n)</p>
                  <p className="text-sm text-gray-700 mb-2">Calculation:</p>
                  <p className="text-gray-900 font-mono text-sm mb-4">
                    z = ({xbar} − {mu0}) / ({sigma}/√{n})<br />z = {(xbar - mu0).toFixed(4)} / {results.se.toFixed(4)}
                  </p>
                  <div className="bg-white rounded-lg p-4 border-2 border-indigo-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Observed Test Statistic:</p>
                    <p className="text-3xl font-bold text-indigo-600">z = {results.z.toFixed(4)}</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2"><Lightbulb size={16} />Key Points</h4>
                  <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
                    <li>The z-score tells us how many standard errors x̄ is from μ₀</li>
                    <li>Larger |z| values indicate the sample is less consistent with H₀</li>
                    <li>We'll compare this z to our critical values in the next step</li>
                  </ul>
                </div>
                <button onClick={() => { markStepComplete(3); goToStep(4); }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
                  Next: Make Decision<ChevronRight size={16} />
                </button>
              </div>
            )}
            {currentStep === 4 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Step 4: Make Decision</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Method 1: Critical Value</h4>
                    <p className="text-sm text-gray-700 mb-2">Observed: z = {results.z.toFixed(4)}</p>
                    <p className="text-sm text-gray-700 mb-2">
                      Critical: {tail === 'two' && ` |z| > ${results.criticalUpper?.toFixed(3)}`}
                      {tail === 'right' && ` z > ${results.criticalUpper?.toFixed(3)}`}
                      {tail === 'left' && ` z < ${results.criticalLower?.toFixed(3)}`}
                    </p>
                    <div className={`mt-3 p-3 rounded-lg ${results.reject ? 'bg-green-100 border border-green-300' : 'bg-yellow-100 border border-yellow-300'}`}>
                      <p className={`font-semibold ${results.reject ? 'text-green-800' : 'text-yellow-800'}`}>
                        {results.reject ? '✓ Reject H₀' : '✗ Fail to reject H₀'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Method 2: P-Value</h4>
                    <p className="text-sm text-gray-700 mb-2">p-value = {results.pValue.toFixed(4)}</p>
                    <p className="text-sm text-gray-700 mb-2">α = {alpha}</p>
                    <p className="text-sm text-gray-700 mb-2">{results.pValue < alpha ? 'p < α' : 'p ≥ α'}</p>
                    <div className={`mt-3 p-3 rounded-lg ${results.reject ? 'bg-green-100 border border-green-300' : 'bg-yellow-100 border border-yellow-300'}`}>
                      <p className={`font-semibold ${results.reject ? 'text-green-800' : 'text-yellow-800'}`}>
                        {results.reject ? '✓ Reject H₀' : '✗ Fail to reject H₀'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2"><Lightbulb size={16} />Key Points</h4>
                  <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
                    <li>Both methods must agree (and they do!)</li>
                    <li>Critical value method: Compare observed z to critical boundary</li>
                    <li>P-value method: Compare probability of our result to α</li>
                    <li>p-value = probability of observing this extreme a result if H₀ is true</li>
                  </ul>
                </div>
                <button onClick={() => { markStepComplete(4); goToStep(5); }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
                  Next: Interpret Results<ChevronRight size={16} />
                </button>
              </div>
            )}
            {currentStep === 5 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Step 5: Interpret Results</h3>
                <div className={`rounded-lg p-6 mb-4 ${results.reject ? 'bg-green-50 border-2 border-green-300' : 'bg-yellow-50 border-2 border-yellow-300'}`}>
                  <p className={`font-semibold mb-3 flex items-center gap-2 ${results.reject ? 'text-green-800' : 'text-yellow-800'}`}>
                    {results.reject ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    Decision: {results.reject ? 'Reject H₀' : 'Fail to Reject H₀'}
                  </p>
                  <p className={`text-sm leading-relaxed ${results.reject ? 'text-green-900' : 'text-yellow-900'}`}>{getInterpretation()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Summary Statistics:</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div><span className="text-gray-600">Test statistic:</span><p className="font-semibold">z = {results.z.toFixed(4)}</p></div>
                    <div><span className="text-gray-600">P-value:</span><p className="font-semibold">{results.pValue.toFixed(4)}</p></div>
                    <div><span className="text-gray-600">Alpha level:</span><p className="font-semibold">{alpha}</p></div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2"><Lightbulb size={16} />Important Notes</h4>
                  <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
                    <li><strong>Never say "accept H₀"</strong> — we only "fail to reject" it</li>
                    <li>Failing to reject ≠ proving H₀ is true (just insufficient evidence)</li>
                    <li>Results are specific to the chosen α level</li>
                    <li>Statistical significance ≠ practical significance</li>
                  </ul>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={copyResults} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2">
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}{copied ? 'Copied!' : 'Copy Results'}
                  </button>
                  <button onClick={() => { markStepComplete(5); goToStep(6); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">
                    Try Challenge Mode<ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
            {currentStep === 6 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Challenge: Try to Fool the Test</h3>
                {currentChallenge ? (
                  <>
                    <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-purple-900 mb-2">Your Mission:</h4>
                      <p className="text-sm text-purple-900">{currentChallenge.description}</p>
                      {currentChallenge.constraints && (
                        <div className="mt-3 text-xs text-purple-800">
                          <p><strong>Constraints:</strong></p>
                          <ul className="list-disc list-inside ml-2">
                            {currentChallenge.constraints.nMin && <li>n between {currentChallenge.constraints.nMin} and {currentChallenge.constraints.nMax}</li>}
                            {currentChallenge.constraints.xbarMin && <li>x̄ between {currentChallenge.constraints.xbarMin} and {currentChallenge.constraints.xbarMax}</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                    {challengeAttempted && checkChallenge() && (
                      <div className={`rounded-lg p-4 mb-4 ${checkChallenge()?.success ? 'bg-green-50 border-2 border-green-300' : checkChallenge()?.close ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-red-50 border-2 border-red-300'}`}>
                        <p className={`font-semibold mb-2 ${checkChallenge()?.success ? 'text-green-800' : checkChallenge()?.close ? 'text-yellow-800' : 'text-red-800'}`}>
                          {checkChallenge()?.success ? '🎉 Success!' : checkChallenge()?.close ? '😮 So Close!' : '❌ Not Quite'}
                        </p>
                        <p className={`text-sm ${checkChallenge()?.success ? 'text-green-900' : checkChallenge()?.close ? 'text-yellow-900' : 'text-red-900'}`}>
                          {checkChallenge()?.success 
                            ? `You achieved the target! Your z = ${results.z.toFixed(3)} ${results.reject ? 'is in' : 'is not in'} the rejection region.`
                            : checkChallenge()?.close
                            ? `You were close! Your z = ${results.z.toFixed(3)} was only ${Math.abs(Math.abs(results.z) - (results.criticalUpper || results.criticalLower || 1.96)).toFixed(3)} away from the critical value.`
                            : `Your z = ${results.z.toFixed(3)}, p = ${results.pValue.toFixed(4)}. You ${results.reject ? 'rejected' : 'failed to reject'} H₀, but the target was to ${currentChallenge.targetDecision.replace('-', ' ')}.`
                          }
                        </p>
                        {currentChallenge.type === 'hide' && (
                          <p className="text-sm mt-2 text-gray-700">
                            <strong>Type II Error insight:</strong> With small n, SE is large ({results.se.toFixed(3)}), making it hard to detect the true difference even though μ_true = {currentChallenge.muTrue}.
                          </p>
                        )}
                        {currentChallenge.type === 'alpha-trade' && (
                          <p className="text-sm mt-2 text-gray-700">
                            <strong>Alpha tradeoff:</strong> Larger α increases Type I error risk but makes it easier to reject H₀. {tail === 'two' ? 'Two-tailed tests' : 'One-tailed tests'} affect power too.
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => setChallengeAttempted(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Check My Attempt</button>
                      <button onClick={generateChallenge} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2">
                        <RefreshCw size={16} />New Challenge
                      </button>
                      {!showHint ? (
                        <button onClick={() => setShowHint(true)} className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition flex items-center gap-2">
                          <Eye size={16} />Reveal Hint
                        </button>
                      ) : (
                        <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-900">{getHint()}</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <button onClick={generateChallenge} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-lg font-semibold">Start Challenge</button>
                )}
              </div>
            )}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Sampling Distribution Visualization</h3>
              <canvas ref={canvasRef} width={800} height={400} className="w-full border border-gray-200 rounded-lg" />
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-indigo-600 rounded"></div><span className="text-gray-700">Normal Distribution</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 opacity-20 rounded"></div><span className="text-gray-700">Rejection Region (α = {alpha})</span></div>
                <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${results.reject ? 'bg-green-500' : 'bg-yellow-500'}`}></div><span className="text-gray-700">Observed z = {results.z.toFixed(3)}</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HypothesisTestTool;
