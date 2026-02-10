/**
 * Statistical utility functions for the 3030 Dashboard
 */

/**
 * Normal Distribution Probability Density Function (PDF)
 */
export const normalPDF = (x: number, mean: number = 0, sd: number = 1): number => {
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(sd, 2));
  return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
};

/**
 * Standard Normal Cumulative Distribution Function (CDF)
 */
export const normalCDF = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302744))));
  return x > 0 ? 1 - prob : prob;
};

/**
 * Rational approximation for the inverse normal CDF (Probit function)
 */
export const inverseNormalCDF = (p: number): number => {
  if (p <= 0 || p >= 1) return 0;
  const c = [2.515517, 0.802853, 0.010328];
  const d = [1.432788, 0.189269, 0.001308];
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));
  const num = t * (c[0] + t * (c[1] + t * c[2]));
  const den = 1 + t * (d[0] + t * (d[1] + t * d[2]));
  const z = t - num / den;
  return p < 0.5 ? -z : z;
};

/**
 * Calculate z-score
 */
export const zScore = (observed: number, mean: number, sd: number): number => {
  return (observed - mean) / sd;
};

/**
 * Generate normal curve data for plotting
 */
export const generateNormalCurveData = (
  mean: number = 0,
  sd: number = 1,
  points: number = 200
): Array<{ x: number; y: number }> => {
  const data = [];
  const range = 4 * sd;
  const minX = mean - range;
  const maxX = mean + range;
  const step = (maxX - minX) / points;
  
  for (let x = minX; x <= maxX; x += step) {
    data.push({
      x: parseFloat(x.toFixed(4)),
      y: parseFloat(normalPDF(x, mean, sd).toFixed(6))
    });
  }
  
  return data;
};

/**
 * Calculate required sample size (a priori)
 * Using simplified formula for one-sample z-test
 */
export const calculateRequiredN = (
  alpha: number = 0.05,
  beta: number = 0.20,
  effectSize: number = 0.5
): number => {
  const zAlpha = inverseNormalCDF(1 - alpha / 2);
  const zBeta = inverseNormalCDF(1 - beta);
  const n = Math.pow((zAlpha + zBeta) / effectSize, 2) * 2;
  return Math.ceil(n);
};

/**
 * Calculate p-value from z-score
 */
export const calculatePValue = (
  stat: number,
  tailType: 'left' | 'right' | 'two-tailed' = 'two-tailed'
): number => {
  const absZ = Math.abs(stat);
  const pLower = normalCDF(stat);
  const pUpper = 1 - pLower;
  
  switch (tailType) {
    case 'left':
      return pLower;
    case 'right':
      return pUpper;
    case 'two-tailed':
      return 2 * (1 - normalCDF(absZ));
    default:
      return pUpper;
  }
};
