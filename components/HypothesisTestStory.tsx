import React from 'react';

const HypothesisTestStory: React.FC = () => {
  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-emerald-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-slate-800 mb-3">The Story of Uncertainty</h1>
          <p className="text-lg text-slate-600">
            Hypothesis testing is a structured way to make decisions when the world is noisy.
          </p>
        </header>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">1) Why we need tests</h2>
            <p className="text-slate-700 leading-relaxed">
              In real data, randomness creates variation. Two samples from the same population won&apos;t match perfectly.
              Hypothesis testing gives us a way to ask: “Is what I&apos;m seeing plausibly due to random chance, or is it
              too unusual to ignore?”
            </p>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">2) The two stories: H0 and H1</h2>
            <p className="text-slate-700 leading-relaxed">
              A hypothesis test compares two explanations:
            </p>
            <ul className="mt-3 list-disc pl-6 text-slate-700 space-y-1">
              <li>
                <span className="font-semibold">Null hypothesis (H0):</span> the “no effect / no difference” story.
              </li>
              <li>
                <span className="font-semibold">Alternative hypothesis (H1):</span> the “there is an effect / difference” story.
              </li>
            </ul>
            <p className="mt-3 text-slate-700 leading-relaxed">
              We don&apos;t prove H1 directly. Instead we check whether the data look surprisingly incompatible with H0.
            </p>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">3) “Surprising” means probability under H0</h2>
            <p className="text-slate-700 leading-relaxed">
              The <span className="font-semibold">p-value</span> answers: “If H0 were true, how likely is data this extreme (or more)?”
              Small p-values mean the observed result would be rare under the null story.
            </p>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">4) Decisions have two kinds of risk</h2>
            <p className="text-slate-700 leading-relaxed">
              Because we work with noisy data, mistakes are possible:
            </p>
            <ul className="mt-3 list-disc pl-6 text-slate-700 space-y-1">
              <li>
                <span className="font-semibold">Type I error (alpha):</span> rejecting H0 when H0 is actually true.
              </li>
              <li>
                <span className="font-semibold">Type II error (beta):</span> failing to reject H0 when H1 is true.
              </li>
            </ul>
            <p className="mt-3 text-slate-700 leading-relaxed">
              Power (1 - beta) is the probability of detecting an effect when it exists.
            </p>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">5) What to do next</h2>
            <p className="text-slate-700 leading-relaxed">
              Use the examples tool to practice choosing hypotheses, computing a test statistic, and interpreting results.
              The goal is to build intuition: what changes the p-value, what changes power, and what “evidence” really means.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HypothesisTestStory;
