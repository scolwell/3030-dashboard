/**
 * Sampling simulation utilities
 */

export interface SampleStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  n: number;
}

/**
 * Generate a population with specified parameters
 */
export const generatePopulation = (
  size: number,
  mean: number = 50,
  stdDev: number = 10,
  distribution: 'normal' | 'uniform' | 'bimodal' = 'normal'
): number[] => {
  const population: number[] = [];
  
  if (distribution === 'normal') {
    // Box-Muller transform for normal distribution
    for (let i = 0; i < size; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      population.push(mean + z * stdDev);
    }
  } else if (distribution === 'uniform') {
    // Uniform distribution
    const range = stdDev * 3.46; // Adjust range for similar spread
    const min = mean - range / 2;
    const max = mean + range / 2;
    for (let i = 0; i < size; i++) {
      population.push(min + Math.random() * (max - min));
    }
  } else if (distribution === 'bimodal') {
    // Bimodal distribution (two peaks)
    const mean1 = mean - 10;
    const mean2 = mean + 10;
    for (let i = 0; i < size; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const selectedMean = Math.random() > 0.5 ? mean1 : mean2;
      population.push(selectedMean + z * (stdDev / 2));
    }
  }
  
  return population;
};

/**
 * Draw a random sample from population
 */
export const performSampling = (
  population: number[],
  sampleSize: number,
  method: 'random' | 'stratified' = 'random'
): number[] => {
  if (sampleSize > population.length) {
    sampleSize = population.length;
  }
  
  if (method === 'random') {
    const sample: number[] = [];
    const indices = new Set<number>();
    
    while (indices.size < sampleSize) {
      const idx = Math.floor(Math.random() * population.length);
      indices.add(idx);
    }
    
    indices.forEach(idx => sample.push(population[idx]));
    return sample;
  } else if (method === 'stratified') {
    // Stratified sampling (divide population into strata and sample from each)
    const strata = 4;
    const strataSize = Math.floor(sampleSize / strata);
    const sample: number[] = [];
    
    population.sort((a, b) => a - b);
    
    for (let s = 0; s < strata; s++) {
      const strataStart = Math.floor((s / strata) * population.length);
      const strataEnd = Math.floor(((s + 1) / strata) * population.length);
      const strataPop = population.slice(strataStart, strataEnd);
      
      for (let i = 0; i < strataSize && sample.length < sampleSize; i++) {
        const idx = Math.floor(Math.random() * strataPop.length);
        sample.push(strataPop[idx]);
      }
    }
    
    return sample;
  }
  
  return [];
};

/**
 * Calculate descriptive statistics for a sample
 */
export const calculateStats = (sample: number[]): SampleStats => {
  if (sample.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, n: 0 };
  }
  
  // Mean
  const sum = sample.reduce((a, b) => a + b, 0);
  const mean = sum / sample.length;
  
  // Standard deviation
  const squaredDifferences = sample.map(x => Math.pow(x - mean, 2));
  const variance = squaredDifferences.reduce((a, b) => a + b, 0) / (sample.length - 1 || 1);
  const stdDev = Math.sqrt(variance);
  
  // Median
  const sorted = [...sample].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  // Min/Max
  const min = Math.min(...sample);
  const max = Math.max(...sample);
  
  return {
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    n: sample.length
  };
};
