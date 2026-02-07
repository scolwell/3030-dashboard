
import { StoryStep, AppState } from './types';

export const STORY_STEPS: StoryStep[] = [
  {
    id: 0,
    chapterNumber: 6,
    title: "Extracting the Sample",
    content: "Science begins with a glimpse. Since we cannot measure the 'Whole', we must extract a representative part.",
    details: "This is the essence of sampling. We draw a random subset from a population (μ=50), hoping it reflects the hidden truth of the total landscape.",
    visualType: 'sample'
  },
  {
    id: 1,
    chapterNumber: 6,
    title: "What if it's Different",
    content: "Our sample result is rarely exactly the same as the population mean. Is the difference significant?",
    details: "The sample mean (x̄) we found is different from 50. We must decide if this is just chance or a real change in the world.",
    visualType: 'comparison'
  },
  {
    id: 2,
    chapterNumber: 5,
    title: "The Null Hypothesis",
    content: "We start by assuming the status quo: that nothing has changed and our sample is perfectly normal.",
    details: "The Null Hypothesis (H₀) is the benchmark of skepticism. We assume the difference we observed is 100% luck until we can prove otherwise.",
    visualType: 'sample-on-dist'
  },
  {
    id: 3,
    chapterNumber: 7,
    title: "The Logic of the Null",
    content: "Statistical logic is like a courtroom. We never prove the Null is true; we only decide if we can reject it.",
    details: "A failed test doesn't mean H₀ is correct; it means the evidence wasn't strong enough to 'convict'. We either Reject or Fail to Reject.",
    visualType: 'logic'
  },
  {
    id: 4,
    chapterNumber: 5,
    title: "About the Normal Curve",
    content: "If we sampled all possible combinations of samples, our results would form this perfect bell curve. This is the 'Map of the Expected'.",
    details: "The Sampling Distribution shows us what counts as 'Normal'. Most samples fall within the 95% region.",
    visualType: 'distribution'
  },
  {
    id: 5,
    chapterNumber: 7,
    title: "Drawing a Line in the Sand",
    content: "We must decide our 'Surprise Threshold'. How rare does a result need to be to break our belief in the Null?",
    details: "Alpha (α) is our risk tolerance. A threshold of 0.05 means we'll only claim a discovery if the chance of it being luck is less than 5%.",
    visualType: 'threshold'
  },
  {
    id: 6,
    chapterNumber: 7,
    title: "What does that line mean",
    content: "Our threshold defines the Rejection Region—the tails of the curve where luck becomes too improbable to ignore.",
    details: "Anything landing in the red tails is considered 'Statistically Significant'. This is where we lose faith in the Null Hypothesis.",
    visualType: 'threshold'
  },
  {
    id: 7,
    chapterNumber: 7,
    title: "What's P-Value Have to do with it",
    content: "We place our sample on the map. Does it reside in the safe center, or has it crossed the point of no return?",
    details: "The p-value is the probability of seeing our result if the Null were true. If p < α, we reject the status quo and claim a signal.",
    visualType: 'conclusion'
  },
  {
    id: 8,
    chapterNumber: 7,
    title: "What if we are wrong",
    content: "Every decision carries risk. To search for truth is to accept that you might occasionally be fooled.",
    details: "Type I Error is a false alarm; Type II is a missed discovery. The balance of these errors defines the ethics of scientific claim-making.",
    visualType: 'errors'
  },
  {
    id: 9,
    chapterNumber: 7,
    title: "Supporting the Alternative",
    content: "When H₀ falls, we support the Alternative (Hₐ). But remember: in science, truth is always a temporary guest.",
    details: "Supporting Hₐ means we've found evidence for change. It becomes our new baseline—until a better theory arrives.",
    visualType: 'alternative'
  },
  {
    id: 10,
    chapterNumber: 7,
    title: "Managing Uncertainty",
    content: "Hypothesis testing isn't about finding certainty. It is about the mathematical management of uncertainty.",
    details: "We conclude our journey. We have made a decision, measured our risk, and acknowledged that every discovery is a calculated gamble.",
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
