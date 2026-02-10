
import { StoryStep, AppState } from './types';

export const STORY_STEPS: StoryStep[] = [
  {
    id: 0,
    chapterNumber: 1,
    title: "Life is Random",
    content: "Measurements wobble. Nature varies. Knowledge is always incomplete.",
    details: "Uncertainty comes in two flavors: aleatory (real randomness) and epistemic (limits of knowledge). This story begins with both.",
    visualType: 'sample'
  },
  {
    id: 1,
    chapterNumber: 2,
    title: "The Art of Choosing",
    content: "We sample not because we can't measure everything, but because we need to learn efficiently and generalize beyond what we saw.",
    details: "Sampling saves time, avoids destructive measurement, and lets us infer about future or unseen populations.",
    visualType: 'comparison'
  },
  {
    id: 2,
    chapterNumber: 3,
    title: "How Far is Too Far?",
    content: "Variation is the signature of uncertainty. The wider the spread, the less certain we are about any single observation.",
    details: "Standard deviation measures typical deviation from the mean. It quantifies how noisy a process is.",
    visualType: 'distribution'
  },
  {
    id: 3,
    chapterNumber: 4,
    title: "Shrinking Doubt",
    content: "The mean is more stable than individual observations. Its uncertainty shrinks with more data.",
    details: "Standard error is σ/√n. Bigger samples narrow uncertainty about the mean without eliminating it.",
    visualType: 'sample-on-dist'
  },
  {
    id: 4,
    chapterNumber: 5,
    title: "The Bell Takes Over",
    content: "Repeat sampling enough times and the distribution of sample means becomes bell-shaped, even if the data are not.",
    details: "This is why the normal curve appears everywhere in inference. It is the map of long-run sampling behavior.",
    visualType: 'distribution'
  },
  {
    id: 5,
    chapterNumber: 6,
    title: "Confidence Zones",
    content: "A point estimate is a guess. An interval is a range of plausible values given the data and model.",
    details: "Confidence levels describe a long-run frequency of capture, not the probability that a specific interval is correct.",
    visualType: 'threshold'
  },
  {
    id: 6,
    chapterNumber: 7,
    title: "Acting Despite Doubt",
    content: "Sometimes we must act. Hypothesis tests formalize decisions under uncertainty, but they never prove truth.",
    details: "Rejecting H₀ is a choice under risk, not a certificate of correctness. Failure to reject is not proof of no effect.",
    visualType: 'logic'
  },
  {
    id: 7,
    chapterNumber: 8,
    title: "What P Really Means",
    content: "A p-value is the probability of results at least this extreme if the null model were true.",
    details: "It is NOT the probability the null is true, NOT a measure of effect size, and NOT a guarantee of reproducibility.",
    visualType: 'conclusion'
  },
  {
    id: 8,
    chapterNumber: 9,
    title: "Two Ways to Be Wrong",
    content: "Every decision carries two risks: false alarms and missed discoveries.",
    details: "Type I error (false positive) is controlled by α; Type II error (false negative) is controlled by power and sample size.",
    visualType: 'errors'
  },
  {
    id: 9,
    chapterNumber: 10,
    title: "How Big is the Difference?",
    content: "Statistical significance is not practical importance. Always ask: how big is the effect?",
    details: "Report effect sizes and intervals so decisions reflect magnitude, not just thresholds.",
    visualType: 'alternative'
  },
  {
    id: 10,
    chapterNumber: 11,
    title: "Living with Uncertainty",
    content: "Uncertainty never disappears. We manage it with models, data, and transparent communication.",
    details: "Other frameworks exist (e.g., Bayesian inference). The goal is not certainty, but honest, useful decisions.",
    visualType: 'conclusion'
  }
];

export const INITIAL_STATE: AppState = {
  currentStep: 0,
  alpha: 0.05,
  popMean: 50,
  popStdDev: 10,
  sampleSize: 30,
  sampleMean: 50,
  testType: 'two-tailed'
};
