
export enum SamplingMethod {
  SIMPLE_RANDOM = 'Simple Random',
  SYSTEMATIC = 'Systematic',
  STRATIFIED = 'Stratified',
  CLUSTER = 'Cluster',
  MULTI_STAGE = 'Multi-stage'
}

export enum SubMethod {
  SIMPLE = 'Simple Random',
  SYSTEMATIC = 'Systematic'
}

export interface Unit {
  id: number;
  row: number;
  col: number;
  stratum: number; 
  cluster: number;
  isSelected: boolean;
  isPreSelected?: boolean;
  value: number;
  label?: string;
  category?: string;
}

export interface SamplingConfig {
  populationSize: number;
  sampleSize: number;
  method: SamplingMethod;
  subMethod: SubMethod; // Controls logic within strata/clusters
  systematicInterval: number;
  strataCount: number;
  clusterCount: number;
}

export interface Stats {
  popMean: number;
  sampleMean: number;
  popCount: number;
  sampleCount: number;
  strataDistribution: Record<number, { pop: number; sample: number }>;
}
