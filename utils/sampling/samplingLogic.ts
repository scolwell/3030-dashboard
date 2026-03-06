/**
 * Sampling simulation utilities
 * Provides population generation, sampling methods, and statistics
 * that work with the Unit / SamplingConfig / Stats types used by the UI.
 */

import {
  Unit,
  SamplingConfig,
  SamplingMethod,
  SubMethod,
  Stats,
} from '../../components/SamplingTypes';

/* ───────────────────────── helpers ───────────────────────── */

/** Fisher-Yates shuffle (in-place, returns same array) */
const shuffle = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** Box-Muller normal random variate */
const normalRandom = (mean = 50, sd = 10): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

/* ────────────────── generatePopulation ───────────────────── */

/**
 * Build a fresh 20×20 grid of Unit objects (N = populationSize, default 400).
 * Each unit gets value, stratum (4 bands of rows), and cluster (5×5 blocks of 4×4 units).
 */
export const generatePopulation = (size: number): Unit[] => {
  const cols = 20;
  const rows = Math.ceil(size / cols);
  const units: Unit[] = [];

  for (let i = 0; i < size; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const stratum = Math.min(3, Math.floor(row / (rows / 4)));
    // 5×5 macro-grid → 25 clusters of 4×4 units
    const cRow = Math.floor(row / 4);
    const cCol = Math.floor(col / 4);
    const cluster = cRow * 5 + cCol;

    units.push({
      id: i,
      row,
      col,
      stratum,
      cluster,
      isSelected: false,
      isPreSelected: false,
      value: normalRandom(),
    });
  }
  return units;
};

/* ─────────────────── performSampling ─────────────────────── */

/**
 * Apply the chosen sampling method and return a new population array
 * with `isSelected` / `isPreSelected` flags set, plus `randomStart`
 * metadata for the explanation panel.
 */
export const performSampling = (
  population: Unit[],
  config: SamplingConfig,
): { population: Unit[]; randomStart: number | number[] | undefined } => {
  // Reset flags
  const pop = population.map(u => ({ ...u, isSelected: false, isPreSelected: false }));

  const { sampleSize, method, subMethod, systematicInterval } = config;

  let randomStart: number | number[] | undefined;

  switch (method) {
    /* ── Simple Random ─────────────────────────────────────── */
    case SamplingMethod.SIMPLE_RANDOM: {
      const indices = shuffle([...Array(pop.length).keys()]).slice(0, sampleSize);
      indices.forEach(i => { pop[i].isSelected = true; });
      break;
    }

    /* ── Systematic ────────────────────────────────────────── */
    case SamplingMethod.SYSTEMATIC: {
      const k = systematicInterval;
      const start = Math.floor(Math.random() * k);
      randomStart = start;
      for (let i = start; i < pop.length && pop.filter(u => u.isSelected).length < sampleSize; i += k) {
        pop[i].isSelected = true;
      }
      break;
    }

    /* ── Stratified ────────────────────────────────────────── */
    case SamplingMethod.STRATIFIED: {
      const strata: Record<number, number[]> = {};
      pop.forEach((u, idx) => {
        if (!strata[u.stratum]) strata[u.stratum] = [];
        strata[u.stratum].push(idx);
      });
      const nStrata = Object.keys(strata).length;
      const perStratum = Math.floor(sampleSize / nStrata);

      for (const key of Object.keys(strata)) {
        const members = strata[Number(key)];
        if (subMethod === SubMethod.SYSTEMATIC) {
          const k = Math.max(1, Math.floor(members.length / perStratum));
          const start = Math.floor(Math.random() * k);
          for (let i = start, count = 0; i < members.length && count < perStratum; i += k, count++) {
            pop[members[i]].isSelected = true;
          }
        } else {
          shuffle(members).slice(0, perStratum).forEach(i => { pop[i].isSelected = true; });
        }
      }
      break;
    }

    /* ── Cluster ───────────────────────────────────────────── */
    case SamplingMethod.CLUSTER: {
      const clusterIds = [...new Set(pop.map(u => u.cluster))];
      const unitsPerCluster = pop.filter(u => u.cluster === clusterIds[0]).length;
      const nClusters = Math.max(1, Math.round(sampleSize / unitsPerCluster));
      const chosen = shuffle([...clusterIds]).slice(0, nClusters);
      randomStart = chosen;
      pop.forEach(u => {
        if (chosen.includes(u.cluster)) {
          u.isSelected = true;
          u.isPreSelected = true;
        }
      });
      break;
    }

    /* ── Multi-stage ───────────────────────────────────────── */
    case SamplingMethod.MULTI_STAGE: {
      const clusterIds = [...new Set(pop.map(u => u.cluster))];
      const nClusters = Math.max(1, Math.round(clusterIds.length * 0.4));
      const chosen = shuffle([...clusterIds]).slice(0, nClusters);
      randomStart = chosen;

      // Mark chosen clusters as pre-selected
      pop.forEach(u => {
        if (chosen.includes(u.cluster)) u.isPreSelected = true;
      });

      // Within chosen clusters, sub-sample
      const clusterMembers = pop.reduce<Record<number, number[]>>((acc, u, idx) => {
        if (chosen.includes(u.cluster)) {
          if (!acc[u.cluster]) acc[u.cluster] = [];
          acc[u.cluster].push(idx);
        }
        return acc;
      }, {});

      const totalPool = Object.values(clusterMembers).flat();
      const perUnit = Math.min(sampleSize, totalPool.length);

      if (subMethod === SubMethod.SYSTEMATIC) {
        const k = Math.max(1, Math.floor(totalPool.length / perUnit));
        const start = Math.floor(Math.random() * k);
        for (let i = start, count = 0; i < totalPool.length && count < perUnit; i += k, count++) {
          pop[totalPool[i]].isSelected = true;
        }
      } else {
        shuffle(totalPool).slice(0, perUnit).forEach(i => { pop[i].isSelected = true; });
      }
      break;
    }
  }

  return { population: pop, randomStart };
};

/* ──────────────────── calculateStats ─────────────────────── */

/**
 * Compute population mean, sample mean, counts, and per-stratum breakdown
 * from a Unit array.
 */
export const calculateStats = (population: Unit[]): Stats => {
  if (population.length === 0) {
    return { popMean: 0, sampleMean: 0, popCount: 0, sampleCount: 0, strataDistribution: {} };
  }

  const popMean = +(population.reduce((s, u) => s + u.value, 0) / population.length).toFixed(1);

  const selected = population.filter(u => u.isSelected);
  const sampleMean = selected.length > 0
    ? +(selected.reduce((s, u) => s + u.value, 0) / selected.length).toFixed(1)
    : 0;

  const strataDistribution: Record<number, { pop: number; sample: number }> = {};
  population.forEach(u => {
    if (!strataDistribution[u.stratum]) strataDistribution[u.stratum] = { pop: 0, sample: 0 };
    strataDistribution[u.stratum].pop++;
    if (u.isSelected) strataDistribution[u.stratum].sample++;
  });

  return {
    popMean,
    sampleMean,
    popCount: population.length,
    sampleCount: selected.length,
    strataDistribution,
  };
};
