'use client';

import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { ToolType } from '../types';

interface DemoCard {
  id: string;
  title: string;
  description: string;
  toolType: ToolType;
  tags: string[];
}

interface HypothesisTestingHubProps {
  onNavigate: (toolId: ToolType) => void;
}

const demos: DemoCard[] = [
  {
    id: 'story-of-uncertainty',
    title: 'Story of Uncertainty',
    description: 'A short, concept-first walkthrough of why we test hypotheses and what “uncertainty” means in practice.',
    toolType: ToolType.HYPOTHESIS_TEST_STORY,
    tags: ['intuition', 'uncertainty', 'why it works']
  },
  {
    id: 'hypothesis-testing-examples',
    title: 'Hypothesis Testing Examples',
    description: 'Hands-on examples and step-by-step practice using the hypothesis testing tool.',
    toolType: ToolType.HYPOTHESIS_TEST_TOOL,
    tags: ['examples', 'practice', 'z-test']
  }
];

const HypothesisTestingHub: React.FC<HypothesisTestingHubProps> = ({ onNavigate }) => {
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
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Hypothesis Testing</h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Learn the intuition behind testing and then practice with examples.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demos.map((demo) => (
            <div
              key={demo.id}
              className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{demo.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{demo.description}</p>
              </div>

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

              <div className="flex gap-3">
                <button
                  onClick={() => onNavigate(demo.toolType)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink size={16} />
                  Open
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

        <div className="mt-12 text-center">
          <div className="inline-block bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Suggested order:</span> Start with the story, then try the examples.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HypothesisTestingHub;
