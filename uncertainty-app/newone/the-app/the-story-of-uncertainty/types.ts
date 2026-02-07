
export interface StoryStep {
  id: number;
  chapterNumber: number;
  title: string;
  content: string;
  visualType: 'sample' | 'distribution' | 'comparison' | 'threshold' | 'conclusion' | 'logic' | 'alternative' | 'errors' | 'sample-on-dist';
  details: string;
}

export interface AppState {
  currentStep: number;
  alpha: number;
  sampleMean: number;
  popMean: number;
  popStdDev: number;
  sampleSize: number;
  testType: 'one-tailed' | 'two-tailed';
}