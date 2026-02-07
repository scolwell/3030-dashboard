/**
 * Statistical utility functions for hypothesis testing
 */

/**
 * Standard normal cumulative distribution function
 * Uses polynomial approximation
 */
export function normDist(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

/**
 * Calculate z-score for a sample mean
 */
export function calculateZScore(sampleMean: number, popMean: number, stdErr: number): number {
  return (sampleMean - popMean) / stdErr;
}

/**
 * Calculate p-value for hypothesis test
 */
export function calculatePValue(
  sampleMean: number,
  popMean: number,
  stdErr: number,
  testType: 'one-tailed' | 'two-tailed'
): number {
  const z = calculateZScore(sampleMean, popMean, stdErr);
  const tailProb = 1 - normDist(Math.abs(z));
  return testType === 'two-tailed' ? tailProb * 2 : tailProb;
}

/**
 * Calculate standard error
 */
export function calculateStandardError(popStdDev: number, sampleSize: number): number {
  return popStdDev / Math.sqrt(sampleSize);
}
