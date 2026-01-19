
/**
 * Statistical utility functions for Normal Distribution calculations.
 */

/**
 * Standard Error Function (erf) approximation
 */
export const erf = (x: number): number => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
};

/**
 * Cumulative Distribution Function (CDF)
 */
export const normalCDF = (x: number, mean: number = 0, sd: number = 1): number => {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.sqrt(2))));
};

/**
 * Probability Density Function (PDF)
 */
export const normalPDF = (x: number, mean: number = 0, sd: number = 1): number => {
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(sd, 2));
  const denominator = sd * Math.sqrt(2 * Math.PI);
  return Math.exp(exponent) / denominator;
};

/**
 * Inverse Normal CDF (Quantile Function)
 * Approximation using Wichura (1988) or similar algorithm
 */
export const inverseNormalCDF = (p: number): number => {
  if (p <= 0 || p >= 1) return 0;
  
  // Rational approximation for the inverse normal
  const low = 0.02425;
  const high = 1.0 - low;
  let q, r;

  if (p < low) {
    q = Math.sqrt(-2.0 * Math.log(p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  } else if (p > high) {
    q = Math.sqrt(-2.0 * Math.log(1.0 - p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0);
  } else {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0);
  }
};

const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

export const zScore = (x: number, mean: number, sd: number): number => (x - mean) / sd;

export const generateNormalCurveData = (mean: number, sd: number, points: number = 200, rangeMultiplier: number = 4) => {
  const data = [];
  const start = mean - rangeMultiplier * sd;
  const end = mean + rangeMultiplier * sd;
  const step = (end - start) / points;
  for (let i = 0; i <= points; i++) {
    const x = start + i * step;
    data.push({ x, y: normalPDF(x, mean, sd) });
  }
  return data;
};

/**
 * A-Priori Sample Size calculation for a two-tailed independent t-test
 */
export const calculateRequiredN = (alpha: number, power: number, d: number): number => {
  const zAlpha = inverseNormalCDF(1 - alpha / 2);
  const zBeta = inverseNormalCDF(power);
  return Math.ceil((2 * Math.pow(zAlpha + zBeta, 2)) / Math.pow(d, 2));
};
