'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Eye, EyeOff, Check } from 'lucide-react';
import { ToolType } from '../types';

interface DemoCard {
  id: string;
  title: string;
  description: string;
  toolType: ToolType;
  tags: string[];
}

interface ProbabilityDistributionHubProps {
  onNavigate: (toolId: ToolType) => void;
}

const demos: DemoCard[] = [
  {
    id: 'statistical-tables',
    title: 'Statistical Tables Lookup',
    description: 'Find critical values or p-values across z, t, chi-square, and F distributions.',
    toolType: ToolType.STATISTICAL_TABLES,
    tags: ['z', 't', 'chi-square', 'F']
  },
  {
    id: 'normal-curve',
    title: 'Areas Under Normal Curve',
    description: 'Calculate probabilities and shade regions under the normal distribution curve to visualize cumulative probabilities.',
    toolType: ToolType.NORMAL_CURVE,
    tags: ['normal distribution', 'probability', 'shading']
  },
  {
    id: 'coin-toss',
    title: 'Probability: Coin Flip',
    description: 'Simulate coin flips to explore probability concepts and see how theoretical probabilities emerge from repeated trials.',
    toolType: ToolType.COIN_TOSS,
    tags: ['probability', 'simulation', 'basic concepts']
  },
  {
    id: 'law-of-large-numbers',
    title: 'Law of Large Numbers',
    description: 'See sampling variability shrink and means converge as sample size grows—intuition for the law of large numbers.',
    toolType: ToolType.CONFIDENCE_FUNNEL_CHART,
    tags: ['standard error', 'convergence', 'sample size']

  }
];

const ProbabilityDistributionHub: React.FC<ProbabilityDistributionHubProps> = ({ onNavigate }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyDemoLink = (demoId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?demo=${demoId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(demoId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">
            Probability & Distribution
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Interactive demonstrations to build your understanding of probability distributions, 
            the normal curve, and fundamental statistical concepts.
          </p>
        </div>

        {/* Demo Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demos.map((demo) => (
            <div
              key={demo.id}
              className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {demo.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {demo.description}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {demo.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => onNavigate(demo.toolType)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink size={16} />
                  Open Demo
                </button>
                <button
                  onClick={() => copyDemoLink(demo.id)}
                  className="px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Copy Link"
                >
                  {copiedId === demo.id ? (
                    <Check size={16} className="text-green-600" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">📚 Learning Path:</span> These demos are designed 
              to be explored in order, building intuition from basic probability to complex distributions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProbabilityDistributionHub;
