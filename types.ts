
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
  EXPERIMENTAL_DESIGN_HUB = 'experimental-design-hub',
  TWO_GROUP_DESIGNS = 'two-group-designs',
  SINGLE_GROUP_DESIGNS = 'single-group-designs',
  SPLIT_PLOT_DESIGNS = 'split-plot-designs',
  FACTORIAL_DESIGNS = 'factorial-designs',
  LAW_OF_LARGE_NUMBERS = 'law-of-large-numbers',
  BUILD_A_NORMAL = 'build-a-normal',
  Z_PERCENTILE_TRANSLATOR = 'z-percentile-translator',
  PROBABILITY_STATEMENT_BUILDER = 'probability-statement-builder',
  HYPOTHESIS_TEST_STORY = 'hypothesis-test-story',
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
