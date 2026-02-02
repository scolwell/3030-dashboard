import React, { useState, useMemo } from 'react';
import { Calculator, Info } from 'lucide-react';

type Distribution = 'z' | 't' | 'chi-square' | 'f';
type LookupMode = 'critical-value' | 'p-value';
type TailType = 'two-tail' | 'one-tail';

// Statistical calculation functions
const normalCDF = (z: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
};

const normalInverse = (p: number): number => {
  if (p <= 0 || p >= 1) return NaN;
  
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];
  
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  
  let q, r, result;
  
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    result = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    result = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    result = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  
  return result;
};

const tCDF = (t: number, df: number): number => {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
};

const incompleteBeta = (x: number, a: number, b: number): number => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  
  const f = 1;
  const c = 1;
  const d = 1 / (1 - (a + b) * x / (a + 1));
  
  let result = front * (c * d);
  
  for (let i = 1; i <= 100; i++) {
    const m = i;
    const numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    
    const dPlus = 1 + numerator * d;
    const cPlus = 1 + numerator / c;
    
    const d2 = 1 / dPlus;
    const delta = cPlus * d2;
    result *= delta;
    
    if (Math.abs(delta - 1) < 1e-10) break;
    
    const numerator2 = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    const dPlus2 = 1 + numerator2 * d2;
    const cPlus2 = 1 + numerator2 / (cPlus * d2);
    
    const d3 = 1 / dPlus2;
    const delta2 = cPlus2 * d3;
    result *= delta2;
    
    if (Math.abs(delta2 - 1) < 1e-10) break;
  }
  
  return result;
};

const logGamma = (x: number): number => {
  const cof = [
    76.18009172947146, -86.50532032941677,
    24.01409824083091, -1.231739572450155,
    0.001208650973866179, -0.000005395239384953
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  
  for (let j = 0; j <= 5; j++) {
    ser += cof[j] / ++y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x);
};

const chiSquareCDF = (x: number, df: number): number => {
  if (x <= 0) return 0;
  return lowerGamma(df / 2, x / 2) / gamma(df / 2);
};

const gamma = (z: number): number => {
  return Math.exp(logGamma(z));
};

const lowerGamma = (s: number, x: number): number => {
  if (x <= 0) return 0;
  
  let sum = 0;
  let term = 1 / s;
  sum += term;
  
  for (let i = 1; i < 100; i++) {
    term *= x / (s + i);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  
  return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
};

const fCDF = (f: number, df1: number, df2: number): number => {
  if (f <= 0) return 0;
  const x = df2 / (df2 + df1 * f);
  return 1 - incompleteBeta(x, df2 / 2, df1 / 2);
};

const StatisticalTablesLookup: React.FC = () => {
  const [distribution, setDistribution] = useState<Distribution>('z');
  const [lookupMode, setLookupMode] = useState<LookupMode>('p-value');
  const [tailType, setTailType] = useState<TailType>('two-tail');
  
  // Input values
  const [testStatistic, setTestStatistic] = useState<string>('1.96');
  const [alpha, setAlpha] = useState<string>('0.05');
  const [df1, setDf1] = useState<string>('10');
  const [df2, setDf2] = useState<string>('10');
  
  // Results
  const result = useMemo(() => {
    if (lookupMode === 'p-value') {
      const stat = parseFloat(testStatistic);
      if (isNaN(stat)) return null;
      
      if (distribution === 'z') {
        let pValue: number;
        let interpretation: string;
        
        if (tailType === 'two-tail') {
          pValue = 2 * (1 - normalCDF(Math.abs(stat)));
          interpretation = `P(|Z| > ${Math.abs(stat).toFixed(3)}) = ${pValue.toFixed(6)}`;
        } else {
          const isRight = stat >= 0;
          pValue = isRight ? (1 - normalCDF(stat)) : normalCDF(stat);
          interpretation = isRight
            ? `P(Z > ${stat.toFixed(3)}) = ${pValue.toFixed(6)} (right-tail inferred from statistic sign)`
            : `P(Z < ${stat.toFixed(3)}) = ${pValue.toFixed(6)} (left-tail inferred from statistic sign)`;
        }
        
        const decision = pValue < parseFloat(alpha || '0.05') ? 'Reject H₀' : 'Fail to reject H₀';
        
        return {
          label: 'p-value',
          value: pValue.toFixed(6),
          interpretation,
          decision
        };
      } else if (distribution === 't') {
        const degrees = parseFloat(df1);
        if (isNaN(degrees) || degrees < 1) return null;
        
        let pValue: number;
        let interpretation: string;
        
        if (tailType === 'two-tail') {
          pValue = 2 * (1 - tCDF(Math.abs(stat), degrees));
          interpretation = `P(|t| > ${Math.abs(stat).toFixed(3)}) = ${pValue.toFixed(6)} with df = ${degrees}`;
        } else {
          const isRight = stat >= 0;
          pValue = isRight ? (1 - tCDF(stat, degrees)) : tCDF(stat, degrees);
          interpretation = isRight
            ? `P(t > ${stat.toFixed(3)}) = ${pValue.toFixed(6)} with df = ${degrees} (right-tail inferred from statistic sign)`
            : `P(t < ${stat.toFixed(3)}) = ${pValue.toFixed(6)} with df = ${degrees} (left-tail inferred from statistic sign)`;
        }
        
        const decision = pValue < parseFloat(alpha || '0.05') ? 'Reject H₀' : 'Fail to reject H₀';
        
        return {
          label: 'p-value',
          value: pValue.toFixed(6),
          interpretation,
          decision
        };
      } else if (distribution === 'chi-square') {
        const degrees = parseFloat(df1);
        if (isNaN(degrees) || degrees < 1 || stat < 0) return null;
        
        const pValue = 1 - chiSquareCDF(stat, degrees);
        const interpretation = `P(χ² > ${stat.toFixed(3)}) = ${pValue.toFixed(6)} with df = ${degrees}`;
        const decision = pValue < parseFloat(alpha || '0.05') ? 'Reject H₀' : 'Fail to reject H₀';
        
        return {
          label: 'p-value',
          value: pValue.toFixed(6),
          interpretation,
          decision
        };
      } else if (distribution === 'f') {
        const degrees1 = parseFloat(df1);
        const degrees2 = parseFloat(df2);
        if (isNaN(degrees1) || isNaN(degrees2) || degrees1 < 1 || degrees2 < 1 || stat < 0) return null;
        
        const pValue = 1 - fCDF(stat, degrees1, degrees2);
        const interpretation = `P(F > ${stat.toFixed(3)}) = ${pValue.toFixed(6)} with df1 = ${degrees1}, df2 = ${degrees2}`;
        const decision = pValue < parseFloat(alpha || '0.05') ? 'Reject H₀' : 'Fail to reject H₀';
        
        return {
          label: 'p-value',
          value: pValue.toFixed(6),
          interpretation,
          decision
        };
      }
    } else {
      // critical-value mode
      const alphaVal = parseFloat(alpha);
      if (isNaN(alphaVal) || alphaVal <= 0 || alphaVal >= 1) return null;
      
      if (distribution === 'z') {
        let criticalZ: number;
        let interpretation: string;
        
        if (tailType === 'two-tail') {
          criticalZ = normalInverse(1 - alphaVal / 2);
          interpretation = `z_{α/2} = ±${criticalZ.toFixed(4)} (α = ${alphaVal})`;
        } else {
          criticalZ = normalInverse(1 - alphaVal);
          interpretation = `z_{α} = ±${criticalZ.toFixed(4)} (α = ${alphaVal}) — use sign of your test statistic to pick direction`;
        }
        
        return {
          label: 'Critical Value',
          value: criticalZ.toFixed(4),
          interpretation,
          decision: tailType === 'two-tail'
            ? `Reject H₀ if |test statistic| > ${criticalZ.toFixed(4)}`
            : `Reject H₀ if test statistic > ${criticalZ.toFixed(4)} (stat ≥ 0) or < -${criticalZ.toFixed(4)} (stat < 0)`
        };
      } else if (distribution === 't') {
        const degrees = parseFloat(df1);
        if (isNaN(degrees) || degrees < 1) return null;
        
        const targetP = tailType === 'two-tail' ? (1 - alphaVal / 2) : (1 - alphaVal);
        let t = normalInverse(targetP);
        
        for (let i = 0; i < 10; i++) {
          const p = tCDF(t, degrees);
          const error = p - targetP;
          if (Math.abs(error) < 1e-6) break;
          
          const h = 0.001;
          const pPlus = tCDF(t + h, degrees);
          const derivative = (pPlus - p) / h;
          
          if (Math.abs(derivative) > 1e-10) {
            t = t - error / derivative;
          }
        }
        
        const interpretation = tailType === 'two-tail' 
          ? `t_{α/2} = ±${t.toFixed(4)} (α = ${alphaVal}, df = ${degrees})`
          : `t_{α} = ±${t.toFixed(4)} (α = ${alphaVal}, df = ${degrees}) — use sign of your test statistic to pick direction`;
        
        return {
          label: 'Critical Value',
          value: t.toFixed(4),
          interpretation,
          decision: tailType === 'two-tail'
            ? `Reject H₀ if |test statistic| > ${t.toFixed(4)}`
            : `Reject H₀ if test statistic > ${t.toFixed(4)} (stat ≥ 0) or < -${t.toFixed(4)} (stat < 0)`
        };
      } else if (distribution === 'chi-square') {
        const degrees = parseFloat(df1);
        if (isNaN(degrees) || degrees < 1) return null;
        
        let x = degrees + Math.sqrt(2 * degrees) * normalInverse(1 - alphaVal);
        
        for (let i = 0; i < 20; i++) {
          const p = chiSquareCDF(x, degrees);
          const target = 1 - alphaVal;
          const error = p - target;
          if (Math.abs(error) < 1e-6) break;
          
          const h = 0.01;
          const pPlus = chiSquareCDF(x + h, degrees);
          const derivative = (pPlus - p) / h;
          
          if (Math.abs(derivative) > 1e-10) {
            x = x - error / derivative;
          }
        }
        
        return {
          label: 'Critical Value',
          value: x.toFixed(4),
          interpretation: `χ²_{α} = ${x.toFixed(4)} (α = ${alphaVal}, df = ${degrees})`,
          decision: `Reject H₀ if test statistic > ${x.toFixed(4)}`
        };
      } else if (distribution === 'f') {
        const degrees1 = parseFloat(df1);
        const degrees2 = parseFloat(df2);
        if (isNaN(degrees1) || isNaN(degrees2) || degrees1 < 1 || degrees2 < 1) return null;
        
        // Approximate F critical value using Newton's method
        let f = 1.0;
        
        for (let i = 0; i < 20; i++) {
          const p = fCDF(f, degrees1, degrees2);
          const target = 1 - alphaVal;
          const error = p - target;
          if (Math.abs(error) < 1e-6) break;
          
          const h = 0.01;
          const pPlus = fCDF(f + h, degrees1, degrees2);
          const derivative = (pPlus - p) / h;
          
          if (Math.abs(derivative) > 1e-10) {
            f = f - error / derivative;
          }
        }
        
        return {
          label: 'Critical Value',
          value: f.toFixed(4),
          interpretation: `F_{α} = ${f.toFixed(4)} (α = ${alphaVal}, df1 = ${degrees1}, df2 = ${degrees2})`,
          decision: `Reject H₀ if test statistic > ${f.toFixed(4)}`
        };
      }
    }
    
    return null;
  }, [distribution, lookupMode, tailType, testStatistic, alpha, df1, df2]);

  // Reusable Components
  const DistributionSelector = ({ showStep = false }: { showStep?: boolean }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        {showStep && (
          <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-sm font-bold rounded-full">
            1
          </span>
        )}
        <h3 className="text-lg font-semibold text-slate-800">Distribution</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['z', 't', 'chi-square', 'f'] as Distribution[]).map((dist) => (
          <button
            key={dist}
            onClick={() => setDistribution(dist)}
            className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
              distribution === dist
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {dist === 'z' ? 'Z (Normal)' : dist === 't' ? 't (Student)' : dist === 'f' ? 'F (Fisher)' : 'χ² (Chi-Square)'}
          </button>
        ))}
      </div>
      {showStep && (
        <p className="text-xs text-slate-500 mt-3">Choose the statistical distribution for your test</p>
      )}
    </div>
  );

  const LookupModeSelector = ({ showStep = false }: { showStep?: boolean }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        {showStep && (
          <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-sm font-bold rounded-full">
            2
          </span>
        )}
        <h3 className="text-lg font-semibold text-slate-800">Lookup Mode</h3>
      </div>
      <div className="space-y-2">
        <button
          onClick={() => setLookupMode('p-value')}
          className={`w-full px-4 py-3 rounded-lg font-medium transition text-left ${
            lookupMode === 'p-value'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <div className="font-semibold text-sm">P-Value Mode</div>
          <div className={`text-xs mt-1 ${lookupMode === 'p-value' ? 'text-indigo-100' : 'text-slate-500'}`}>
            Test statistic → p-value
          </div>
        </button>
        <button
          onClick={() => setLookupMode('critical-value')}
          className={`w-full px-4 py-3 rounded-lg font-medium transition text-left ${
            lookupMode === 'critical-value'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <div className="font-semibold text-sm">Critical Value Mode</div>
          <div className={`text-xs mt-1 ${lookupMode === 'critical-value' ? 'text-indigo-100' : 'text-slate-500'}`}>
            Significance level → critical value
          </div>
        </button>
      </div>
      {showStep && (
        <p className="text-xs text-slate-500 mt-3">What do you want to calculate?</p>
      )}
    </div>
  );

  const TailTypeSelector = ({ showStep = false }: { showStep?: boolean }) => {
    if (distribution !== 'z' && distribution !== 't') return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          {showStep && (
            <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-sm font-bold rounded-full">
              3
            </span>
          )}
          <h3 className="text-lg font-semibold text-slate-800">Tail Type</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTailType('two-tail')}
            className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
              tailType === 'two-tail'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Two-Tail
          </button>
          <button
            onClick={() => setTailType('one-tail')}
            className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
              tailType === 'one-tail'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            One-Tail (auto direction)
          </button>
        </div>
        {showStep && (
          <p className="text-xs text-slate-500 mt-3">Two-tail or one-tail (direction inferred from statistic sign)</p>
        )}
      </div>
    );
  };

  const InputFields = ({ showStep = false }: { showStep?: boolean }) => {
    const stepNumber = (distribution === 'z' || distribution === 't') ? 4 : 3;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          {showStep && (
            <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-sm font-bold rounded-full">
              {stepNumber}
            </span>
          )}
          <h3 className="text-lg font-semibold text-slate-800">Input Values</h3>
        </div>
        
        {lookupMode === 'p-value' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Test Statistic
            </label>
            <input
              type="number"
              step="0.01"
              value={testStatistic}
              onChange={(e) => setTestStatistic(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          {(distribution === 't' || distribution === 'chi-square' || distribution === 'f') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Degrees of Freedom{distribution === 'f' ? ' (df1)' : ''}
                        {distribution === 'f' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Degrees of Freedom 2 (df2)
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={df2}
                              onChange={(e) => setDf2(e.target.value)}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={df1}
                onChange={(e) => setDf1(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Significance Level (α)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              max="0.999"
              value={alpha}
              onChange={(e) => setAlpha(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2 mt-2">
              {['0.10', '0.05', '0.01'].map((val) => (
                <button
                  key={val}
                  onClick={() => setAlpha(val)}
                  className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
          
          {(distribution === 't' || distribution === 'chi-square' || distribution === 'f') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Degrees of Freedom{distribution === 'f' ? ' (df1)' : ''}
                        {distribution === 'f' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Degrees of Freedom 2 (df2)
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={df2}
                              onChange={(e) => setDf2(e.target.value)}
                              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={df1}
                onChange={(e) => setDf1(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
      )}
      {showStep && (
        <p className="text-xs text-slate-500 mt-3">Enter your values to calculate the result</p>
      )}
    </div>
  );
};

  const ResultDisplay = () => (
    <div className="bg-white rounded-lg shadow-sm p-8 flex-1">
      <div className="flex items-start gap-3 mb-6">
        <Calculator className="text-indigo-600 flex-shrink-0" size={24} />
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Result</h3>
          <p className="text-slate-600 text-sm mt-1">
            {lookupMode === 'p-value' 
              ? 'Calculate p-value from test statistic'
              : 'Calculate critical value from significance level'}
          </p>
        </div>
      </div>

      {result ? (
        <div className="space-y-6">
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-6">
            <div className="text-sm font-medium text-indigo-700 mb-2">{result.label}</div>
            <div className="text-4xl font-bold text-indigo-900">{result.value}</div>
          </div>

          <div className="bg-slate-50 rounded-lg p-6">
            <div className="text-sm font-medium text-slate-700 mb-2">Interpretation</div>
            <div className="text-slate-900 font-mono text-sm">{result.interpretation}</div>
          </div>

          {result.decision && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-sm font-medium text-green-700 mb-2">Decision</div>
              <div className="text-green-900 font-semibold text-lg">{result.decision}</div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-start gap-2">
              <Info className="text-slate-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-slate-600">
                {lookupMode === 'p-value' ? (
                  <p>
                    The p-value represents the probability of obtaining results as extreme as observed, assuming H₀ is true.
                  </p>
                ) : (
                  <p>
                    The critical value defines the rejection region boundary for the hypothesis test at α = {alpha}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="text-center">
            <Calculator size={48} className="mx-auto mb-3 opacity-50" />
            <p>Enter values to calculate</p>
          </div>
        </div>
      )}
    </div>
  );

  const InfoBox = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-slate-700">
          <p className="font-semibold mb-1">Distribution Guide</p>
          <p className="text-xs text-slate-600">
            <strong>Z (Normal):</strong> Large samples, known σ • 
            <strong>t (Student):</strong> Small samples, unknown σ • 
            <strong>χ² (Chi-Square):</strong> Variance tests • 
            <strong>F (Fisher):</strong> Comparing two variances
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex-1 flex flex-col gap-6 min-h-0">
        <div className="grid grid-cols-4 gap-4">
          <DistributionSelector showStep={true} />
          <LookupModeSelector showStep={true} />
          <TailTypeSelector showStep={true} />
          <InputFields showStep={true} />
        </div>
        <div className="flex-1 flex gap-4 min-h-0">
          <ResultDisplay />
          <div className="w-80"><InfoBox /></div>
        </div>
      </div>
    </div>
  );
};

export default StatisticalTablesLookup;
