
export enum ToolType {
  NORMAL_CURVE = 'normal-curve',
  SAMPLE_SIZE = 'sample-size',
  POWER_EFFECT = 'power-effect',
  ERRORS_POWER = 'errors-power',
  GALTON_BOARD = 'galton-board'
}

export interface StatsParams {
  mean: number;
  sd: number;
  alpha: number;
  power: number;
  effectSize: number;
}
