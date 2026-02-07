
export enum ToolType {
  NORMAL_CURVE = 'normal-curve',
  SAMPLE_SIZE = 'sample-size',
  SAMPLE_VISUALIZATION = 'sample-visualization',
  POWER_EFFECT = 'power-effect',
  ERRORS_POWER = 'errors-power',
  GALTON_BOARD = 'galton-board',
  COIN_TOSS = 'coin-toss',
  CONFIDENCE_FUNNEL_CHART = 'confidence-funnel-chart',
  PROBABILITY_DISTRIBUTION_HUB = 'probability-distribution-hub',
  HYPOTHESIS_TESTING_HUB = 'hypothesis-testing-hub',
  LAW_OF_LARGE_NUMBERS = 'law-of-large-numbers',
  BUILD_A_NORMAL = 'build-a-normal',
  Z_PERCENTILE_TRANSLATOR = 'z-percentile-translator',
  PROBABILITY_STATEMENT_BUILDER = 'probability-statement-builder',
  HYPOTHESIS_TEST_STORY = 'hypothesis-test-story',
  HYPOTHESIS_TEST_PLACEHOLDER = 'hypothesis-test-placeholder',
  HYPOTHESIS_TEST_TOOL = 'hypothesis-test-tool',
  STATISTICAL_TABLES = 'statistical-tables'
}

export interface StatsParams {
  mean: number;
  sd: number;
  alpha: number;
  power: number;
  effectSize: number;
}
