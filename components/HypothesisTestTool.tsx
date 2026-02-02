import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Check, 
  ChevronRight,
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Eye
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
type StepId = 1 | 2 | 3 | 4 | 5 | 6;

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
    name: 'Repeat Purchase Amount',
    mu0: 85,
    sigma: 18,
    n: 56,
    xbar: 91,
    tail: 'right',
    alpha: 0.05,
    description: 'Testing if a loyalty program increases repeat purchase amount ($).'
  },
  {
    name: 'Ad Recall Score',
    mu0: 70,
    sigma: 10,
    n: 49,
    xbar: 67,
    tail: 'left',
    alpha: 0.05,
    description: 'Does the presence of rival banner ads lower brand recall %?'
  },
  {
    name: 'Decision Time Under Pressure',
    mu0: 30,
    sigma: 6,
    n: 36,
    xbar: 28.2,
    tail: 'left',
    alpha: 0.05,
    description: 'Assessing if training reduces managers\' decision time in crises.'
  },
  {
    name: 'Working Memory Span',
    mu0: 7.0,
    sigma: 1.2,
    n: 81,
    xbar: 6.6,
    tail: 'two',
    alpha: 0.01,
    description: 'Testing how sleep deprivation changes working memory span.'
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HypothesisTestTool: React.FC = () => {
  const [scenario, setScenario] = useState<string>('Repeat Purchase Amount');
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
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    ctx.clearRect(0, 0, width, height);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const zMin = -4; const zMax = 4; const zRange = zMax - zMin;
    const yMax = normalPDF(0) * 1.1;
    const xScale = (z: number) => padding.left + ((z - zMin) / zRange) * chartWidth;
    const yScale = (y: number) => height - padding.bottom - (y / yMax) * chartHeight;
    
    // Draw axes
    ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padding.left, yScale(0)); ctx.lineTo(width - padding.right, yScale(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, height - padding.bottom); ctx.stroke();
    
    // X-axis labels
    ctx.fillStyle = '#6B7280'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'center';
    for (let z = -4; z <= 4; z++) {
      const x = xScale(z);
      ctx.fillText(z.toString(), x, height - padding.bottom + 20);
    }
    
    // Rejection regions
    const steps = 200;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
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
    
    // Normal curve
    ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const z = zMin + (zRange * i) / steps; const y = normalPDF(z);
      const x = xScale(z); const yPos = yScale(y);
      if (i === 0) { ctx.moveTo(x, yPos); } else { ctx.lineTo(x, yPos); }
    }
    ctx.stroke();
    
    // Critical value lines
    if (results.criticalLower !== null) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(xScale(results.criticalLower), padding.top);
      ctx.lineTo(xScale(results.criticalLower), height - padding.bottom); ctx.stroke();
    }
    if (results.criticalUpper !== null) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(xScale(results.criticalUpper), padding.top);
      ctx.lineTo(xScale(results.criticalUpper), height - padding.bottom); ctx.stroke();
    }
    
    // Observed z-score
    ctx.setLineDash([]); ctx.strokeStyle = results.reject ? '#10B981' : '#F59E0B'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xScale(results.z), padding.top + 15);
    ctx.lineTo(xScale(results.z), height - padding.bottom); ctx.stroke();
    ctx.fillStyle = results.reject ? '#10B981' : '#F59E0B'; ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`z = ${results.z.toFixed(3)}`, xScale(results.z), padding.top + 10);
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
      return 'Increasing n decreases the standard error. Choose an x̄ farther from μ₀.';
    } else if (currentChallenge.type === 'hide') {
      return 'With small n, the standard error is large, making it harder to detect differences.';
    } else {
      return 'A larger α (like 0.10) increases your chance of rejecting. One-tailed tests can also help.';
    }
  };

  const copyResults = () => {
    if (!results) return;
    const h0 = tail === 'two' ? `H₀: μ = ${mu0}` : tail === 'right' ? `H₀: μ ≤ ${mu0}` : `H₀: μ ≥ ${mu0}`;
    const ha = tail === 'two' ? `Hₐ: μ ≠ ${mu0}` : tail === 'right' ? `Hₐ: μ > ${mu0}` : `Hₐ: μ < ${mu0}`;
    const text = `Hypothesis Test Results\n${h0}\n${ha}\nα = ${alpha}, ${tail === 'two' ? 'two-tailed' : tail === 'left' ? 'left-tailed' : 'right-tailed'}\n\nSample: n = ${n}, x̄ = ${xbar}, σ = ${sigma}\nSE = ${results.se.toFixed(4)}\nz = ${results.z.toFixed(4)}\np-value = ${results.pValue.toFixed(4)}\n\nDecision: ${results.reject ? 'Reject H₀' : 'Fail to reject H₀'}`;
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const getInterpretation = () => {
    if (!results) return '';
    const direction = tail === 'right' ? 'greater than' : tail === 'left' ? 'less than' : 'different from';
    if (results.reject) {
      return `At α = ${alpha}, we reject the null hypothesis. There is sufficient evidence that the population mean is ${direction} ${mu0}.`;
    } else {
      return `At α = ${alpha}, we fail to reject the null hypothesis. There is insufficient evidence that the population mean is ${direction} ${mu0}.`;
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
    <div className="w-full h-full flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Process Steps</h3>
        <div className="space-y-2">
          {[
            { id: 1, label: 'Hypotheses' },
            { id: 2, label: 'Critical Values' },
            { id: 3, label: 'Test Statistic' },
            { id: 4, label: 'Decision' },
            { id: 5, label: 'Interpretation' },
            { id: 6, label: 'Challenge' },
          ].map((step) => (
            <button
              key={step.id}
              onClick={() => goToStep(step.id as StepId)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                currentStep === step.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : completedSteps.has(step.id as StepId)
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                completedSteps.has(step.id as StepId)
                  ? 'bg-green-500 text-white'
                  : currentStep === step.id
                  ? 'bg-white text-indigo-600'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {completedSteps.has(step.id as StepId) ? <Check size={14} /> : step.id}
              </div>
              <span className="flex-1 text-left font-medium">{step.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Configuration Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Test Configuration</h2>
            
            {/* Scenario */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Scenario</label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                disabled={challengeActive && currentChallenge?.type !== 'alpha-trade'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SCENARIOS.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <p className="text-sm text-gray-600 mt-2">
                {SCENARIOS.find(s => s.name === scenario)?.description}
              </p>
            </div>

            {/* Parameters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">μ₀ (Null Mean)</label>
                <input
                  type="number"
                  value={mu0}
                  onChange={(e) => setMu0(Number(e.target.value))}
                  disabled={challengeActive}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">σ (Std Dev)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sigma}
                  onChange={(e) => setSigma(Number(e.target.value))}
                  disabled={challengeActive}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">α (Significance)</label>
                <select
                  value={alpha}
                  onChange={(e) => setAlpha(Number(e.target.value) as AlphaValue)}
                  disabled={challengeActive && !currentChallenge?.constraints.allowAlphaChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0.01}>0.01</option>
                  <option value={0.05}>0.05</option>
                  <option value={0.10}>0.10</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">n (Sample Size)</label>
                <input
                  type="number"
                  value={n}
                  onChange={(e) => setN(Number(e.target.value))}
                  disabled={challengeActive && currentChallenge?.fixedN !== undefined}
                  min={currentChallenge?.constraints.nMin || 2}
                  max={currentChallenge?.constraints.nMax || 10000}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">x̄ (Sample Mean)</label>
                <input
                  type="number"
                  step="0.1"
                  value={xbar}
                  onChange={(e) => setXbar(Number(e.target.value))}
                  disabled={challengeActive && currentChallenge?.fixedXbar !== undefined}
                  min={currentChallenge?.constraints.xbarMin}
                  max={currentChallenge?.constraints.xbarMax}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tail Type</label>
                <select
                  value={tail}
                  onChange={(e) => setTail(e.target.value as TailType)}
                  disabled={challengeActive && !currentChallenge?.constraints.allowTailChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="two">Two-tailed</option>
                  <option value="left">Left-tailed (&lt;)</option>
                  <option value="right">Right-tailed (&gt;)</option>
                </select>
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                {errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle size={16} />{err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Visualization */}
          {isValid && results && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Sampling Distribution</h3>
              <canvas ref={canvasRef} width={900} height={350} className="w-full border border-gray-200 rounded-lg" />
              
              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-indigo-600 rounded"></div>
                  <span className="text-gray-700">Normal Curve</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 opacity-20 rounded"></div>
                  <span className="text-gray-700">Rejection Region</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${results.reject ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-gray-700">Observed z = {results.z.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step Content */}
          {isValid && results && currentStep !== 6 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {currentStep === 1 && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Step 1: Define Hypotheses</h3>
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Null Hypothesis (H₀)</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {tail === 'two' ? `μ = ${mu0}` : tail === 'right' ? `μ ≤ ${mu0}` : `μ ≥ ${mu0}`}
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm font-semibold text-indigo-700 mb-1">Alternative Hypothesis (Hₐ)</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        {tail === 'two' ? `μ ≠ ${mu0}` : tail === 'right' ? `μ > ${mu0}` : `μ < ${mu0}`}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Lightbulb size={16} />Key Points
                    </h4>
                    <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
                      <li>H₀ represents the status quo or claim we're testing</li>
                      <li>Hₐ is what we suspect might be true</li>
                      <li>{tail === 'two' ? 'Two-tailed: testing for any difference' : tail === 'right' ? 'Right-tailed: testing if μ is greater' : 'Left-tailed: testing if μ is less'}</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => { markStepComplete(1); goToStep(2); }}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium"
                  >
                    Continue to Critical Values<ChevronRight size={18} />
                  </button>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Step 2: Critical Values & Distribution</h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Significance Level</p>
                      <p className="text-2xl font-bold text-gray-900">α = {alpha}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Standard Error</p>
                      <p className="text-2xl font-bold text-gray-900">{results.se.toFixed(4)}</p>
                      <p className="text-xs text-gray-500 mt-1">σ/√n = {sigma}/√{n}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm font-semibold text-red-700 mb-1">Critical Value(s)</p>
                      <p className="text-lg font-bold text-red-600">
                        {results.criticalLower !== null && `z = ${results.criticalLower.toFixed(3)}`}
                        {results.criticalLower !== null && results.criticalUpper !== null && ', '}
                        {results.criticalUpper !== null && `z = ${results.criticalUpper.toFixed(3)}`}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm font-semibold text-red-700 mb-1">Rejection Region</p>
                      <p className="text-sm font-bold text-red-600">
                        {tail === 'two' && `|z| > ${results.criticalUpper?.toFixed(3)}`}
                        {tail === 'right' && `z > ${results.criticalUpper?.toFixed(3)}`}
                        {tail === 'left' && `z < ${results.criticalLower?.toFixed(3)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { markStepComplete(2); goToStep(3); }}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium"
                  >
                    Continue to Test Statistic<ChevronRight size={18} />
                  </button>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Step 3: Calculate Test Statistic</h3>
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Formula</p>
                      <p className="text-lg font-mono text-gray-900">z = (x̄ - μ₀) / SE</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Calculation</p>
                      <p className="text-lg font-mono text-gray-900">
                        z = ({xbar} - {mu0}) / {results.se.toFixed(4)} = {results.z.toFixed(4)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-lg ${results.reject ? 'bg-green-50' : 'bg-yellow-50'}`}>
                      <p className={`text-sm font-semibold mb-1 ${results.reject ? 'text-green-700' : 'text-yellow-700'}`}>
                        p-value
                      </p>
                      <p className={`text-2xl font-bold ${results.reject ? 'text-green-600' : 'text-yellow-600'}`}>
                        {results.pValue.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { markStepComplete(3); goToStep(4); }}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium"
                  >
                    Continue to Decision<ChevronRight size={18} />
                  </button>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Step 4: Make Decision</h3>
                  <div className={`p-6 rounded-xl mb-6 ${results.reject ? 'bg-green-50 border-2 border-green-500' : 'bg-yellow-50 border-2 border-yellow-500'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      {results.reject ? (
                        <CheckCircle2 size={32} className="text-green-600" />
                      ) : (
                        <AlertCircle size={32} className="text-yellow-600" />
                      )}
                      <div>
                        <p className={`text-lg font-bold ${results.reject ? 'text-green-900' : 'text-yellow-900'}`}>
                          {results.reject ? 'Reject H₀' : 'Fail to Reject H₀'}
                        </p>
                        <p className={`text-sm ${results.reject ? 'text-green-700' : 'text-yellow-700'}`}>
                          {results.reject 
                            ? `z = ${results.z.toFixed(3)} falls in the rejection region`
                            : `z = ${results.z.toFixed(3)} does not fall in the rejection region`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className={`font-semibold ${results.reject ? 'text-green-700' : 'text-yellow-700'}`}>Observed z-score</p>
                        <p className={`text-lg font-bold ${results.reject ? 'text-green-900' : 'text-yellow-900'}`}>{results.z.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className={`font-semibold ${results.reject ? 'text-green-700' : 'text-yellow-700'}`}>p-value</p>
                        <p className={`text-lg font-bold ${results.reject ? 'text-green-900' : 'text-yellow-900'}`}>{results.pValue.toFixed(4)}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { markStepComplete(4); goToStep(5); }}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium"
                  >
                    Continue to Interpretation<ChevronRight size={18} />
                  </button>
                </>
              )}

              {currentStep === 5 && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Step 5: Interpret Results</h3>
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl mb-6">
                    <p className="text-base text-blue-900 leading-relaxed">
                      {getInterpretation()}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { markStepComplete(5); goToStep(1); }}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                    >
                      Start Over
                    </button>
                    <button
                      onClick={copyResults}
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium"
                    >
                      {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                      {copied ? 'Copied!' : 'Copy Results'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Challenge Mode */}
          {currentStep === 6 && currentChallenge && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Challenge Mode</h3>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg mb-6">
                <p className="text-base text-purple-900">{currentChallenge.description}</p>
              </div>

              {challengeAttempted && checkChallenge() && (
                <div className={`p-4 rounded-lg mb-4 ${checkChallenge()?.success ? 'bg-green-50 border border-green-200' : checkChallenge()?.close ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`font-semibold mb-2 ${checkChallenge()?.success ? 'text-green-900' : checkChallenge()?.close ? 'text-yellow-900' : 'text-red-900'}`}>
                    {checkChallenge()?.success ? '✓ Success!' : checkChallenge()?.close ? '⚠ Close!' : '✗ Not quite'}
                  </p>
                  <p className={`text-sm ${checkChallenge()?.success ? 'text-green-900' : checkChallenge()?.close ? 'text-yellow-900' : 'text-red-900'}`}>
                    {checkChallenge()?.success 
                      ? `You achieved the target! Your z = ${results?.z.toFixed(3)}`
                      : checkChallenge()?.close
                      ? `You were close! Your z = ${results?.z.toFixed(3)} was only ${Math.abs(Math.abs(results?.z || 0) - (results?.criticalUpper || results?.criticalLower || 1.96)).toFixed(3)} away`
                      : `Your z = ${results?.z.toFixed(3)}, p = ${results?.pValue.toFixed(4)}. Target was to ${currentChallenge.targetDecision.replace('-', ' ')}.`
                    }
                  </p>
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setChallengeAttempted(true)}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  Check My Attempt
                </button>
                <button
                  onClick={generateChallenge}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 font-medium"
                >
                  <RefreshCw size={18} />New Challenge
                </button>
                {!showHint ? (
                  <button
                    onClick={() => setShowHint(true)}
                    className="px-6 py-2.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition flex items-center gap-2 font-medium"
                  >
                    <Eye size={18} />Show Hint
                  </button>
                ) : (
                  <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900 font-medium">{getHint()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HypothesisTestTool;
