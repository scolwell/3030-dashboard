
import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart as AreaIcon, 
  Settings, 
  BarChart3, 
  Calculator, 
  Target, 
  Info,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { ToolType } from './types';
import NormalCurveTool from './components/NormalCurveTool';

interface Tool {
  id: ToolType;
  name: string;
  icon: any;
  desc: string;
  url: string;
}

const App: React.FC = () => {
  const [activeToolId, setActiveToolId] = useState<ToolType>(ToolType.NORMAL_CURVE);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const tools: Tool[] = [
    { 
      id: ToolType.NORMAL_CURVE, 
      name: 'Areas Under Normal Curve', 
      icon: AreaIcon, 
      desc: 'Calculate probabilities and shade the normal distribution.',
      url: 'https://thestatisticalmind.com/areas-under-curve/'
    },
    { 
      id: ToolType.SAMPLE_SIZE, 
      name: 'A-Priori Sample Size', 
      icon: Calculator, 
      desc: 'Determine the required sample size for your research.',
      url: 'https://thestatisticalmind.com/sample-size-calculator/' 
    },
    { 
      id: ToolType.POWER_EFFECT, 
      name: 'Power & Effect Decision', 
      icon: Target, 
      desc: 'Visualize the relationship between sample size and power.',
      url: 'https://thestatisticalmind.com/power-decision/'
    },
    { 
      id: ToolType.ERRORS_POWER, 
      name: 'Errors & Power', 
      icon: BarChart3, 
      desc: 'Interactive Type I, Type II, and Power visualizer.',
      url: 'https://thestatisticalmind.com/statistical-error-power/'
    },
    { 
      id: ToolType.GALTON_BOARD, 
      name: 'Galton Board', 
      icon: Sparkles, 
      desc: 'Simulate the Galton board to visualize the Central Limit Theorem.',
      url: 'https://thestatisticalmind.com/galton-demo/'
    },
  ];

  const activeTool = tools.find(t => t.id === activeToolId) || tools[0];

  // Force iframe reload when active tool changes
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = activeTool.url;
    }
  }, [activeToolId, activeTool.url]);

  return (
    <div className="flex h-screen overflow-hidden text-slate-900 bg-slate-50">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-xl`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">SM</div>
              <h1 className="font-bold text-lg tracking-tight">The Statistical Mind</h1>
            </div>
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mx-auto">SM</div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveToolId(tool.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                activeToolId === tool.id 
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tool.icon size={20} className={activeToolId === tool.id ? 'text-indigo-600' : 'text-slate-400'} />
              {isSidebarOpen && (
                <div className="text-left">
                  <span className="block font-medium text-sm">{tool.name}</span>
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className={`flex items-center gap-3 p-3 rounded-xl text-slate-500`}>
              <Info size={20} />
              {isSidebarOpen && <span className="text-sm font-medium">MCS*3030 Dashboard</span>}
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center shrink-0 z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeTool.name}
            </h2>
            <p className="text-slate-500 text-sm">
              {activeTool.desc}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeToolId !== ToolType.NORMAL_CURVE && (
              <a 
                href={activeTool.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
                title="Open in full screen"
              >
                <ExternalLink size={16} />
                Full Screen
              </a>
            )}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Toggle Sidebar"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 w-full bg-slate-100 relative overflow-auto p-6">
          {activeToolId === ToolType.NORMAL_CURVE ? (
            <NormalCurveTool />
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
