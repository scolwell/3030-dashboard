
import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart as AreaIcon, 
  Settings, 
  BarChart3, 
  Calculator, 
  Target, 
  Info,
  ExternalLink,
  Sparkles,
  Coins,
  FlaskConical,
  Lightbulb,
  TrendingUp,
  BarChart2,
  Percent,
  ChevronDown,
  Table,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ToolType } from './types';
import NormalCurveTool from './components/NormalCurveTool';
import CoinTossSimulation from './components/CoinTossSimulation';
import HypothesisTestTool from './components/HypothesisTestTool';
import ProbabilityDistributionHub from './components/ProbabilityDistributionHub';
import LawOfLargeNumbers from './components/demos/LawOfLargeNumbers';
import BuildANormal from './components/demos/BuildANormal';
import ZPercentileTranslator from './components/demos/ZPercentileTranslator';
import ProbabilityStatementBuilder from './components/demos/ProbabilityStatementBuilder';
import ConfidenceFunnelChart from './components/ConfidenceFunnelChart';
import StatisticalTablesLookup from './components/StatisticalTablesLookup';

interface Tool {
  id: ToolType;
  name: string;
  icon: any;
  desc: string;
  url: string;
  version: string;
  build: string;
  children?: Tool[];
}

const TOOL_META: Record<ToolType, { version: string; build: string }> = {
  [ToolType.NORMAL_CURVE]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.SAMPLE_SIZE]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.POWER_EFFECT]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.ERRORS_POWER]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.GALTON_BOARD]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.COIN_TOSS]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.CONFIDENCE_FUNNEL_CHART]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.PROBABILITY_DISTRIBUTION_HUB]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.LAW_OF_LARGE_NUMBERS]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.BUILD_A_NORMAL]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.Z_PERCENTILE_TRANSLATOR]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.PROBABILITY_STATEMENT_BUILDER]: { version: '1.0.0', build: '20260123.1' },
  [ToolType.HYPOTHESIS_TEST_TOOL]: { version: '3.0.0', build: '20260123.1' },
  [ToolType.STATISTICAL_TABLES]: { version: '1.0.0', build: '20260123.1' }
};

const App: React.FC = () => {
  const APP_VERSION = '2.3.0';
  const BUILD_NUMBER = '20260123.1';
  const CACHE_BUSTER = '20260123a';
  const LOCAL_STORAGE_KEY = 'tsm-active-tool';
  const [activeToolId, setActiveToolId] = useState<ToolType>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    const validValues = Object.values(ToolType) as string[];
    return stored && validValues.includes(stored) ? (stored as ToolType) : ToolType.NORMAL_CURVE;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedMenuId, setExpandedMenuId] = useState<ToolType | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const probabilitySubmenus: Tool[] = [
    { 
      id: ToolType.STATISTICAL_TABLES, 
      name: 'Statistical Tables Lookup', 
      icon: Table, 
      desc: 'Look up critical values from z, t, chi-square, and F distributions.',
      url: '#',
      version: TOOL_META[ToolType.STATISTICAL_TABLES].version,
      build: TOOL_META[ToolType.STATISTICAL_TABLES].build
    },
    { 
      id: ToolType.NORMAL_CURVE, 
      name: 'Areas Under Normal Curve', 
      icon: AreaIcon, 
      desc: 'Calculate probabilities and shade the normal distribution.',
      url: 'https://thestatisticalmind.com/areas-under-curve/',
      version: TOOL_META[ToolType.NORMAL_CURVE].version,
      build: TOOL_META[ToolType.NORMAL_CURVE].build
    },
    { 
      id: ToolType.COIN_TOSS, 
      name: 'Probability: Coin Flip', 
      icon: Coins, 
      desc: 'Simulate coin flips to explore probability.',
      url: '#',
      version: TOOL_META[ToolType.COIN_TOSS].version,
      build: TOOL_META[ToolType.COIN_TOSS].build
    },
    { 
      id: ToolType.CONFIDENCE_FUNNEL_CHART, 
      name: 'Law of Large Numbers', 
      icon: Percent, 
      desc: 'Visualize how sample means converge to the population mean as sample size grows.',
      url: '#',
      version: TOOL_META[ToolType.CONFIDENCE_FUNNEL_CHART].version,
      build: TOOL_META[ToolType.CONFIDENCE_FUNNEL_CHART].build
    },

  ];

  const tools: Tool[] = [
    { 
      id: ToolType.SAMPLE_SIZE, 
      name: 'A-Priori Sample Size', 
      icon: Calculator, 
      desc: 'Determine the required sample size for your research.',
      url: `https://thestatisticalmind.com/sample-size-calculator/?v=${CACHE_BUSTER}`,
      version: TOOL_META[ToolType.SAMPLE_SIZE].version,
      build: TOOL_META[ToolType.SAMPLE_SIZE].build
    },
    { 
      id: ToolType.POWER_EFFECT, 
      name: 'Statistical Errors and Power', 
      icon: Target, 
      desc: 'Visualize the relationship between sample size and power.',
      url: 'https://thestatisticalmind.com/power-decision/',
      version: TOOL_META[ToolType.POWER_EFFECT].version,
      build: TOOL_META[ToolType.POWER_EFFECT].build
    },
    { 
      id: ToolType.ERRORS_POWER, 
      name: 'Type I and II Errors', 
      icon: BarChart3, 
      desc: 'Interactive Type I, Type II, and Power visualizer.',
      url: 'https://thestatisticalmind.com/statistical-error-power/',
      version: TOOL_META[ToolType.ERRORS_POWER].version,
      build: TOOL_META[ToolType.ERRORS_POWER].build
    },
    { 
      id: ToolType.GALTON_BOARD, 
      name: 'Galton Board', 
      icon: Sparkles, 
      desc: 'Simulate the Galton board to visualize the Central Limit Theorem.',
      url: `https://thestatisticalmind.com/galton-demo/?v=${CACHE_BUSTER}`,
      version: TOOL_META[ToolType.GALTON_BOARD].version,
      build: TOOL_META[ToolType.GALTON_BOARD].build
    },
    { 
      id: ToolType.PROBABILITY_DISTRIBUTION_HUB, 
      name: 'Probability & Distribution', 
      icon: Lightbulb, 
      desc: 'Interactive demos for building probability and distribution understanding.',
      url: '#',
      version: TOOL_META[ToolType.PROBABILITY_DISTRIBUTION_HUB].version,
      build: TOOL_META[ToolType.PROBABILITY_DISTRIBUTION_HUB].build,
      children: probabilitySubmenus
    },
    { 
      id: ToolType.HYPOTHESIS_TEST_TOOL, 
      name: 'Hypothesis Testing', 
      icon: FlaskConical, 
      desc: 'Step-by-step hypothesis testing with one-sample z-test and challenge mode.',
      url: '#',
      version: TOOL_META[ToolType.HYPOTHESIS_TEST_TOOL].version,
      build: TOOL_META[ToolType.HYPOTHESIS_TEST_TOOL].build
    },
  ];

  const activeTool = (() => {
    // First check main tools array
    let tool = tools.find(t => t.id === activeToolId);
    // If not found, check in submenu children
    if (!tool) {
      for (const mainTool of tools) {
        if (mainTool.children) {
          const child = mainTool.children.find(c => c.id === activeToolId);
          if (child) {
            tool = child;
            break;
          }
        }
      }
    }
    return tool || tools[0];
  })();

  // Force iframe reload when active tool changes
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = activeTool.url;
    }
  }, [activeToolId, activeTool.url]);

  // Persist the user's last-selected tool so refreshes stay on the same app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, activeToolId);
    }
  }, [activeToolId]);

  return (
    <div className="flex h-screen overflow-hidden text-gray-900 bg-gray-50">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20 relative`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs font-bold tracking-tight flex-shrink-0">TSM</div>
              <span className="text-sm font-semibold text-gray-900">The Statistical Mind</span>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs font-bold tracking-tight mx-auto">TSM</div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex-shrink-0 ml-2"
            title={isSidebarOpen ? "Collapse menu" : "Expand menu"}
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className={`space-y-${isSidebarOpen ? '1' : '2'}`}>
            {tools.map((tool) => (
              <div key={tool.id}>
                <button
                  onClick={() => {
                    setActiveToolId(tool.id);
                    if (tool.children) {
                      setExpandedMenuId(expandedMenuId === tool.id ? null : tool.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                    activeToolId === tool.id 
                      ? 'text-indigo-700 bg-indigo-50 border-2 border-indigo-600' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={!isSidebarOpen ? tool.name : ''}
                >
                  <div className="flex items-center justify-center gap-3 flex-1">
                    <tool.icon size={20} className={`flex-shrink-0 ${activeToolId === tool.id ? 'text-indigo-600' : 'text-gray-500'}`} />
                    {isSidebarOpen && (
                      <span className={`text-sm text-left flex-1 ${activeToolId === tool.id ? 'font-semibold' : 'font-medium'}`}>
                        {tool.name}
                      </span>
                    )}
                  </div>
                  {tool.children && isSidebarOpen && (
                    <ChevronDown size={18} className={`flex-shrink-0 transition-transform ${expandedMenuId === tool.id ? 'rotate-180' : ''} ${activeToolId === tool.id ? 'text-indigo-600' : 'text-gray-500'}`} />
                  )}
                </button>
                
                {/* Submenu */}
                {tool.children && expandedMenuId === tool.id && isSidebarOpen && (
                  <div className="mt-1 ml-2 pl-4 space-y-1 border-l-2 border-gray-200">
                    {tool.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setActiveToolId(child.id)}
                        className={`w-full flex items-center justify-start gap-3 px-2 py-2 rounded-lg cursor-pointer transition text-sm ${
                          activeToolId === child.id 
                            ? 'text-gray-900 font-medium' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <child.icon size={18} className="text-gray-400 flex-shrink-0" />
                        <span className="text-left">{child.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <div className={`flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition ${!isSidebarOpen ? 'justify-center' : ''}`}
            title={!isSidebarOpen ? 'MCS*3030 Dashboard' : ''}>
            <Info size={18} className="text-gray-400 flex-shrink-0" />
            {isSidebarOpen && (
              <div className="flex-1">
                <div className="text-sm font-medium">MCS*3030 Dashboard</div>
                <div className="text-xs text-gray-500">v{APP_VERSION} · build {BUILD_NUMBER}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 py-4 px-8 flex justify-between items-center shrink-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {activeTool.name}
            </h2>
            <p className="text-gray-600 text-sm">
              {activeTool.desc}
            </p>
            <div className="text-xs text-gray-500 mt-1">Version {activeTool.version} · Build {activeTool.build}</div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 w-full bg-gray-50 relative overflow-auto p-6">
          {activeToolId === ToolType.STATISTICAL_TABLES ? (
            <StatisticalTablesLookup />
          ) : activeToolId === ToolType.NORMAL_CURVE ? (
            <NormalCurveTool />
          ) : activeToolId === ToolType.COIN_TOSS ? (
            <CoinTossSimulation />
          ) : activeToolId === ToolType.CONFIDENCE_FUNNEL_CHART ? (
            <ConfidenceFunnelChart />
          ) : activeToolId === ToolType.PROBABILITY_DISTRIBUTION_HUB ? (
            <ProbabilityDistributionHub onNavigate={setActiveToolId} />
          ) : activeToolId === ToolType.BUILD_A_NORMAL ? (
            <BuildANormal />
          ) : activeToolId === ToolType.Z_PERCENTILE_TRANSLATOR ? (
            <ZPercentileTranslator />
          ) : activeToolId === ToolType.PROBABILITY_STATEMENT_BUILDER ? (
            <ProbabilityStatementBuilder />
          ) : activeToolId === ToolType.HYPOTHESIS_TEST_TOOL ? (
            <HypothesisTestTool />
          ) : (
            <iframe 
              ref={iframeRef}
              key={activeToolId}
              src={activeTool.url} 
              className="w-full h-full border-none rounded-3xl"
              title={activeTool.name}
              allow="fullscreen"
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
