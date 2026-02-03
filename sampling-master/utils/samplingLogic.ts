
import { SamplingMethod, SubMethod, Unit, SamplingConfig, Stats } from '../types';

export interface SamplingResult {
  population: Unit[];
  randomStart?: number | number[]; // Store 1-based random starts
}

const STRATA_NAMES = ["First Year", "Second Year", "Third Year", "Fourth Year"];

const drawFromPool = <T extends { id: number }>(
  pool: T[], 
  n: number, 
  method: SubMethod, 
  interval: number
): { selectedIds: number[], start?: number } => {
  if (pool.length === 0 || n <= 0) return { selectedIds: [] };
  const selectedIds: number[] = [];
  const sortedPool = [...pool].sort((a, b) => a.id - b.id);

  if (method === SubMethod.SIMPLE) {
    const shuffled = [...sortedPool].sort(() => 0.5 - Math.random());
    shuffled.slice(0, Math.min(n, sortedPool.length)).forEach(u => selectedIds.push(u.id));
    return { selectedIds };
  } else {
    let k = Math.max(1, interval || Math.floor(sortedPool.length / n));
    const startIdx = Math.floor(Math.random() * k);
    for (let i = startIdx; i < sortedPool.length; i += k) {
      if (selectedIds.length < n) {
        selectedIds.push(sortedPool[i].id);
      }
    }
    return { selectedIds, start: startIdx + 1 };
  }
};

export const generatePopulation = (size: number, customData?: Partial<Unit>[]): Unit[] => {
  const cols = 20; 
  const totalClusters = 25; 
  const unitsPerCluster = size / totalClusters; // 400 / 25 = 16

  return Array.from({ length: size }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    
    // Stratum by Year Level (4 strata: 100 students each in a 400 pop)
    const stratum = Math.floor((i / size) * 4);
    
    // Cluster Logic: 25 Geographic Zones
    const cluster = Math.floor(i / unitsPerCluster);
    
    const baseValue = 50 + Math.sin(i * 0.1) * 20 + Math.random() * 10;

    const unit: Unit = {
      id: i,
      row,
      col,
      stratum,
      cluster,
      category: `${STRATA_NAMES[stratum]} | Geographic Zone ${cluster + 1}`,
      isSelected: false,
      value: Math.round(baseValue * 10) / 10,
      label: `Student-${i + 1}`
    };

    if (customData && customData[i]) {
      Object.assign(unit, customData[i]);
    }

    return unit;
  });
};

export const calculateStats = (population: Unit[]): Stats => {
  const selected = population.filter(u => u.isSelected);
  const popValues = population.map(u => u.value);
  const popMean = popValues.length > 0 ? popValues.reduce((a, b) => a + b, 0) / population.length : 0;
  const sampleMean = selected.length > 0 ? selected.reduce((acc, u) => acc + u.value, 0) / selected.length : 0;

  const strataDist: Record<number, { pop: number; sample: number }> = {};
  population.forEach(u => {
    if (!strataDist[u.stratum]) strataDist[u.stratum] = { pop: 0, sample: 0 };
    strataDist[u.stratum].pop++;
    if (u.isSelected) strataDist[u.stratum].sample++;
  });

  return {
    popMean: Math.round(popMean * 100) / 100,
    sampleMean: Math.round(sampleMean * 100) / 100,
    popCount: population.length,
    sampleCount: selected.length,
    strataDistribution: strataDist
  };
};

export const performSampling = (population: Unit[], config: SamplingConfig): SamplingResult => {
  const { method, subMethod, sampleSize, systematicInterval } = config;
  const newPop = population.map(u => ({ ...u, isSelected: false, isPreSelected: false }));
  let randomStart: number | number[] | undefined;

  switch (method) {
    case SamplingMethod.SIMPLE_RANDOM: {
      const { selectedIds } = drawFromPool(newPop, sampleSize, SubMethod.SIMPLE, 0);
      selectedIds.forEach(id => newPop[id].isSelected = true);
      break;
    }

    case SamplingMethod.SYSTEMATIC: {
      const { selectedIds, start } = drawFromPool(newPop, sampleSize, SubMethod.SYSTEMATIC, systematicInterval);
      selectedIds.forEach(id => newPop[id].isSelected = true);
      randomStart = start;
      break;
    }

    case SamplingMethod.STRATIFIED: {
      const strata: Record<number, Unit[]> = {};
      newPop.forEach(u => {
        if (!strata[u.stratum]) strata[u.stratum] = [];
        strata[u.stratum].push(u);
      });
      
      const strataKeys = Object.keys(strata).map(Number);
      const perStrata = Math.floor(sampleSize / strataKeys.length);
      const starts: number[] = [];
      
      strataKeys.forEach(s => {
        const { selectedIds, start } = drawFromPool(strata[s], perStrata, subMethod, systematicInterval);
        selectedIds.forEach(id => newPop[id].isSelected = true);
        if (start !== undefined) starts.push(start);
      });
      if (starts.length > 0) randomStart = starts;
      break;
    }

    case SamplingMethod.CLUSTER: {
      const totalClusters = 25;
      const unitsPerCluster = 16;
      // Derive clusters to sample from sampleSize
      const clustersToSample = Math.max(1, Math.ceil(sampleSize / unitsPerCluster));
      const clusterIds = Array.from({ length: totalClusters }, (_, i) => ({ id: i }));
      const clusterK = Math.max(1, Math.floor(totalClusters / clustersToSample));
      
      const { selectedIds: pickedClusters, start: clusterStart } = drawFromPool(clusterIds, clustersToSample, subMethod, clusterK);
      
      newPop.forEach(u => {
        if (pickedClusters.includes(u.cluster)) {
          u.isSelected = true;
          u.isPreSelected = true;
        }
      });

      if (subMethod === SubMethod.SYSTEMATIC) randomStart = clusterStart;
      break;
    }

    case SamplingMethod.MULTI_STAGE: {
      const totalClusters = 25;
      // For this demo, we'll pick 5 clusters (out of 25) in the first stage.
      const clustersToSample = 5; 
      const clusterIds = Array.from({ length: totalClusters }, (_, i) => ({ id: i }));
      const clusterK = Math.max(1, Math.floor(totalClusters / clustersToSample));
      const { selectedIds: pickedClusters } = drawFromPool(clusterIds, clustersToSample, SubMethod.SIMPLE, clusterK);
      
      const perClusterSize = Math.max(1, Math.floor(sampleSize / clustersToSample));
      const starts: number[] = [];
      
      pickedClusters.forEach(cid => {
        const inCluster = newPop.filter(u => u.cluster === cid);
        const { selectedIds, start } = drawFromPool(inCluster, perClusterSize, subMethod, systematicInterval);
        selectedIds.forEach(id => newPop[id].isSelected = true);
        
        newPop.forEach(u => {
          if (u.cluster === cid) u.isPreSelected = true;
        });

        if (start !== undefined) starts.push(start);
      });
      if (starts.length > 0) randomStart = starts;
      break;
    }
  }

  return { population: newPop, randomStart };
};
