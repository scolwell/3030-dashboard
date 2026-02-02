import React, { useState, useEffect } from 'react';

type TailType = 'right' | 'left' | 'two';

interface Scenario {
  text: string;
  mu0: number;
  xbar: number;
  s: number;
  n: number;
  unit: string;
  defaultTail: TailType;
}

const scenarios: Record<string, Scenario> = {
  loyalty: {
    text: "You're a consumer behavior analyst testing whether a new loyalty program increases repeat purchase amounts. Historical data shows customers spend an average of $85/month. After the loyalty program, you sampled 56 customers and found they spend $91/month on average.",
    mu0: 85,
    xbar: 91,
    s: 15,
    n: 56,
    unit: "$",
    defaultTail: "two"
  },
  training: {
    text: "You're evaluating whether a new training program improves employee productivity. Before training, employees completed an average of 50 tasks/week. After training 40 employees, you measured an average of 52 tasks/week.",
    mu0: 50,
    xbar: 52,
    s: 8,
    n: 40,
    unit: "",
    defaultTail: "two"
  },
  marketing: {
    text: "You're testing whether a redesigned email campaign differs from the current 12% click rate. After sending to 200 subscribers, you observed a 15% click rate.",
    mu0: 0.12,
    xbar: 0.15,
    s: 0.08,
    n: 200,
    unit: "",
    defaultTail: "two"
  },
  quality: {
    text: "You're checking if a new manufacturing process reduces defect rate below the current 3.5%. Testing 100 units showed a 3.3% defect rate.",
    mu0: 3.5,
    xbar: 3.3,
    s: 1.2,
    n: 100,
    unit: "%",
    defaultTail: "two"
  },
  delivery: {
    text: "You're testing whether a new routing system decreases delivery time from the current 45 minutes. Testing 75 deliveries showed an average of 42 minutes.",
    mu0: 45,
    xbar: 42,
    s: 6,
    n: 75,
    unit: " mins",
    defaultTail: "two"
  },
  sports: {
    text: "You're a sports marketing analyst testing if a social media campaign increased game attendance from the historical average of 18,500 fans. After sampling 30 games, you found an average attendance of 19,200 fans.",
    mu0: 18500,
    xbar: 19200,
    s: 1500,
    n: 30,
    unit: " fans",
    defaultTail: "two"
  },
  concert: {
    text: "You're testing whether dynamic pricing differs from the standard $85 ticket price. After analyzing 50 events, you observed an average ticket price of $88.",
    mu0: 85,
    xbar: 88,
    s: 12,
    n: 50,
    unit: "$",
    defaultTail: "two"
  },
  cloud: {
    text: "You're a cloud service engineer testing if server optimization reduced response time from the current 250ms. Testing 100 requests showed an average response time of 235ms.",
    mu0: 250,
    xbar: 235,
    s: 20,
    n: 100,
    unit: "ms",
    defaultTail: "two"
  },
  gaming: {
    text: "You're analyzing whether a marketing campaign increased daily active users from the baseline of 2.4 million. After tracking 45 days, you measured an average of 2.65 million daily active users.",
    mu0: 2.4,
    xbar: 2.65,
    s: 0.3,
    n: 45,
    unit: " M",
    defaultTail: "two"
  },
  charity: {
    text: "You're testing whether an awareness campaign increased food donations from the historical average of 450 lbs per event. After sampling 25 events, you found an average of 520 lbs donated.",
    mu0: 450,
    xbar: 520,
    s: 80,
    n: 25,
    unit: " lbs",
    defaultTail: "two"
  }
};

const criticalValues: Record<TailType, Record<number, number>> = {
  'right': { 0.10: 1.299, 0.05: 1.673, 0.01: 2.396 },
  'left': { 0.10: -1.299, 0.05: -1.673, 0.01: -2.396 },
  'two': { 0.10: 1.984, 0.05: 2.004, 0.01: 2.660 }
};

const HypothesisTestTool: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('loyalty');
  const [tailType, setTailType] = useState<TailType>('right');
  const [alpha, setAlpha] = useState<number>(0.05);
  const [activeTab, setActiveTab] = useState<number>(1);

  const currentScenario = scenarios[selectedScenario];

  useEffect(() => {
    setTailType(currentScenario.defaultTail);
  }, [selectedScenario, currentScenario.defaultTail]);

  // Calculate test statistic
  const { mu0, xbar, s, n, unit } = currentScenario;
  const df = n - 1;
  const se = s / Math.sqrt(n);
  const t = (xbar - mu0) / se;

  // Calculate effect size (Cohen's d)
  const effectSize = (xbar - mu0) / s;

  // Get critical value
  const critValue = criticalValues[tailType][alpha];

  // Calculate p-value (approximation)
  let pValue: number;
  if (tailType === 'right') {
    pValue = t > 3 ? 0.002 : (t > 2 ? 0.02 : 0.05);
  } else if (tailType === 'left') {
    pValue = t < -3 ? 0.002 : (t < -2 ? 0.02 : 0.05);
  } else {
    pValue = Math.abs(t) > 3 ? 0.004 : (Math.abs(t) > 2 ? 0.04 : 0.10);
  }

  // Decision
  let reject: boolean;
  if (tailType === 'right') {
    reject = t > critValue;
  } else if (tailType === 'left') {
    reject = t < critValue;
  } else {
    reject = Math.abs(t) > critValue;
  }

  // Hypothesis text
  let h0Text: string, h1Text: string;
  const formatValue = (val: number, u: string) => u === '$' ? `${u}${val}` : `${val}${u}`;
  if (tailType === 'right') {
    h0Text = `μ = ${formatValue(mu0, unit)}`;
    h1Text = `μ > ${formatValue(mu0, unit)}`;
  } else if (tailType === 'left') {
    h0Text = `μ = ${formatValue(mu0, unit)}`;
    h1Text = `μ < ${formatValue(mu0, unit)}`;
  } else {
    h0Text = `μ = ${formatValue(mu0, unit)}`;
    h1Text = `μ ≠ ${formatValue(mu0, unit)}`;
  }

  const conclusionText = reject
    ? `The test statistic (t = ${t.toFixed(2)}) ${tailType === 'two' ? 'exceeds' : (tailType === 'right' ? 'exceeds' : 'is less than')} the critical value (${critValue.toFixed(3)}). There is sufficient evidence at α = ${alpha} to support the alternative hypothesis.`
    : `The test statistic (t = ${t.toFixed(2)}) does not ${tailType === 'two' ? 'exceed' : (tailType === 'right' ? 'exceed' : 'fall below')} the critical value (${critValue.toFixed(3)}). There is insufficient evidence at α = ${alpha} to support the alternative hypothesis.`;

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex-1 bg-white overflow-hidden grid grid-cols-1 md:grid-cols-[40%_60%]">
        {/* Left Panel */}
        <div className="bg-gray-50 p-8 overflow-y-auto border-r-2 border-gray-200">
          {/* Scenario Box */}
          <div className="bg-yellow-50 p-5 rounded-xl mb-5 border-2 border-[#FFB81C] shadow-md">
            <div className="text-[#FFB81C] font-bold text-lg mb-4">Real-World Context</div>
            <div className="text-gray-700 text-sm leading-relaxed">
              {currentScenario.text}
            </div>
          </div>

          {/* Scenario Selection */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-gray-600 font-semibold text-xs mb-2">
              Preset Scenario <span className="w-4 h-4 bg-[#0066CC] text-white rounded-full inline-flex items-center justify-center text-[10px]">i</span>
            </label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm bg-white cursor-pointer transition-all hover:border-gray-400 focus:outline-none focus:border-[#0066CC] focus:ring-4 focus:ring-[#0066CC]/10"
            >
              <option value="loyalty">Repeat Purchase Amount</option>
              <option value="training">Employee Training Effectiveness</option>
              <option value="marketing">Email Marketing Click Rate</option>
              <option value="quality">Manufacturing Quality Control</option>
              <option value="delivery">Delivery Time Improvement</option>
              <option value="sports">Sports Marketing - Game Attendance</option>
              <option value="concert">Concert Ticket Dynamic Pricing</option>
              <option value="cloud">Cloud Service - Server Response Time</option>
              <option value="gaming">Gaming Console - Daily Active Users</option>
              <option value="charity">Charity Food Drive Donations</option>
            </select>
          </div>

          {/* Tail Type */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-gray-600 font-semibold text-xs mb-2">
              Tail Type <span className="w-4 h-4 bg-[#0066CC] text-white rounded-full inline-flex items-center justify-center text-[10px]">i</span>
            </label>
            <select
              value={tailType}
              onChange={(e) => setTailType(e.target.value as TailType)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm bg-white cursor-pointer transition-all hover:border-gray-400 focus:outline-none focus:border-[#0066CC] focus:ring-4 focus:ring-[#0066CC]/10"
            >
              <option value="right">Right-tailed (&gt;)</option>
              <option value="left">Left-tailed (&lt;)</option>
              <option value="two">Two-tailed (≠)</option>
            </select>
          </div>

          {/* Significance Level */}
          <div className="mb-5">
            <label className="flex items-center gap-2 text-gray-600 font-semibold text-xs mb-2">
              Significance Level (α) <span className="w-4 h-4 bg-[#0066CC] text-white rounded-full inline-flex items-center justify-center text-[10px]">i</span>
            </label>
            <select
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm bg-white cursor-pointer transition-all hover:border-gray-400 focus:outline-none focus:border-[#0066CC] focus:ring-4 focus:ring-[#0066CC]/10"
            >
              <option value="0.10">0.10 (10%)</option>
              <option value="0.05">0.05 (5%)</option>
              <option value="0.01">0.01 (1%)</option>
            </select>
          </div>

          {/* Hypothesis Reminder - shown when not on step 1 */}
          {activeTab !== 1 && (
            <div className="mt-auto pt-4">
              <div className="bg-white border-2 border-gray-200 p-4 rounded-lg shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Hypotheses:</div>
                <div className="text-sm text-gray-700 space-y-2">
                  <div><strong>H₀:</strong> {h0Text}</div>
                  <div><strong>H₁:</strong> {h1Text}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="p-8 overflow-y-auto bg-white">
          <div className="flex flex-col h-full">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-5 border-b-2 border-gray-200 pb-3">
              {[
                { id: 1, label: 'Hypotheses' },
                { id: 2, label: 'Distribution' },
                { id: 3, label: 'Test Statistic' },
                { id: 4, label: 'Decision' },
                { id: 5, label: 'Interpretation' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-t-lg border-2 transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#0066CC] border-[#0066CC] text-white font-semibold'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#0066CC] hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.id}
                  </span>
                  <span className="text-xs">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Tab 1: State Hypotheses */}
              {activeTab === 1 && (
                <div className="mb-6">
                  <div className="bg-[#004080] text-white px-4 py-3 rounded-t-lg font-semibold text-sm flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">1</div>
                    <div>State Hypotheses</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-b-lg border-2 border-gray-200 border-t-0">
                    <div className="bg-white p-4 rounded-md mb-2.5 border-l-4 border-[#0066CC]">
                      <div className="font-semibold text-gray-700 text-xs mb-1">NULL HYPOTHESIS (H₀)</div>
                      <div className="text-gray-600 text-sm font-mono">{h0Text}</div>
                    </div>
                    <div className="bg-white p-4 rounded-md mb-3 border-l-4 border-[#FFB81C]">
                      <div className="font-semibold text-gray-700 text-xs mb-1">ALTERNATIVE HYPOTHESIS (H₁)</div>
                      <div className="text-gray-600 text-sm font-mono">{h1Text}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="text-xs font-semibold text-blue-800 mb-1.5">In Plain Language:</div>
                      <div className="text-xs text-blue-700 leading-relaxed">
                        <strong>H₀:</strong> {
                          selectedScenario === 'loyalty' ? 'The loyalty program has no effect on monthly spending (still $85).' :
                          selectedScenario === 'training' ? 'The training program has no effect on productivity (still 50 tasks/week).' :
                          selectedScenario === 'marketing' ? 'The redesigned email has no effect on click rate (still 12%).' :
                          selectedScenario === 'quality' ? 'The new process has no effect on defect rate (still 3.5%).' :
                          selectedScenario === 'delivery' ? 'The new routing has no effect on delivery time (still 45 minutes).' :
                          selectedScenario === 'sports' ? 'The social media campaign has no effect on attendance (still 18,500 fans).' :
                          selectedScenario === 'concert' ? 'Dynamic pricing has no effect on ticket price (still $85).' :
                          selectedScenario === 'cloud' ? 'Server optimization has no effect on response time (still 250ms).' :
                          selectedScenario === 'gaming' ? 'The marketing campaign has no effect on daily active users (still 2.4M).' :
                          selectedScenario === 'charity' ? 'The awareness campaign has no effect on donations (still 450 lbs).' :
                          'No effect on the baseline.'
                        }
                        <br />
                        <strong>H₁:</strong> {
                          selectedScenario === 'loyalty' && tailType === 'right' ? 'The loyalty program increased monthly spending above $85.' :
                          selectedScenario === 'training' && tailType === 'right' ? 'The training program increased productivity above 50 tasks/week.' :
                          selectedScenario === 'marketing' && tailType === 'two' ? 'The redesigned email changed the click rate from 12%.' :
                          selectedScenario === 'quality' && tailType === 'left' ? 'The new process reduced the defect rate below 3.5%.' :
                          selectedScenario === 'delivery' && tailType === 'left' ? 'The new routing decreased delivery time below 45 minutes.' :
                          selectedScenario === 'sports' && tailType === 'right' ? 'The social media campaign increased attendance above 18,500 fans.' :
                          selectedScenario === 'concert' && tailType === 'two' ? 'Dynamic pricing changed the ticket price from $85.' :
                          selectedScenario === 'cloud' && tailType === 'left' ? 'Server optimization reduced response time below 250ms.' :
                          selectedScenario === 'gaming' && tailType === 'right' ? 'The marketing campaign increased daily active users above 2.4M.' :
                          selectedScenario === 'charity' && tailType === 'right' ? 'The awareness campaign increased donations above 450 lbs.' :
                          tailType === 'right' ? 'There is an increase from the baseline.' :
                          tailType === 'left' ? 'There is a decrease from the baseline.' :
                          'There is a change from the baseline.'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Distribution & Critical Values */}
              {activeTab === 2 && (
                <div className="mb-6">
                  <div className="bg-[#004080] text-white px-4 py-3 rounded-t-lg font-semibold text-sm flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">2</div>
                    <div>Sampling Distribution & Critical Values</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-b-lg border-2 border-gray-200 border-t-0">
                    {/* Visualization */}
                    <div className="bg-white p-6 rounded-lg mb-4 border border-gray-200">
                      <svg viewBox="0 0 600 255" className="w-full h-auto">
                        {/* Define the t-distribution curve */}
                        {(() => {
                          const points: string[] = [];
                          const xScale = 60; // pixels per unit
                          const yScale = 220; // vertical scale
                          const centerX = 300;
                          const centerY = 212;
                          
                          // Generate t-distribution curve points (approximation using normal-like curve)
                          for (let x = -5; x <= 5; x += 0.1) {
                            const y = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
                            points.push(`${centerX + x * xScale},${centerY - y * yScale}`);
                          }
                          
                          return (
                            <>
                              {/* Grid lines */}
                              <line x1="0" y1={centerY} x2="600" y2={centerY} stroke="#e5e7eb" strokeWidth="1" />
                              <line x1={centerX} y1="0" x2={centerX} y2="300" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                              
                              {/* Shaded rejection region(s) */}
                              {tailType === 'right' && (
                                <path
                                  d={`M ${centerX + critValue * xScale} ${centerY} ${points.filter((_, i) => (-5 + i * 0.1) >= critValue).join(' L ')} L ${centerX + 5 * xScale} ${centerY} Z`}
                                  fill="#ef4444"
                                  fillOpacity="0.3"
                                />
                              )}
                              {tailType === 'left' && (
                                <path
                                  d={`M ${centerX - 5 * xScale} ${centerY} ${points.filter((_, i) => (-5 + i * 0.1) <= critValue).join(' L ')} L ${centerX + critValue * xScale} ${centerY} Z`}
                                  fill="#ef4444"
                                  fillOpacity="0.3"
                                />
                              )}
                              {tailType === 'two' && (
                                <>
                                  <path
                                    d={`M ${centerX - 5 * xScale} ${centerY} L ${points.filter((_, i) => (-5 + i * 0.1) <= -critValue).join(' L ')} L ${centerX - critValue * xScale} ${centerY} Z`}
                                    fill="#ef4444"
                                    fillOpacity="0.3"
                                  />
                                  <path
                                    d={`M ${centerX + critValue * xScale} ${centerY} L ${points.filter((_, i) => (-5 + i * 0.1) >= critValue).join(' L ')} L ${centerX + 5 * xScale} ${centerY} Z`}
                                    fill="#ef4444"
                                    fillOpacity="0.3"
                                  />
                                </>
                              )}
                              
                              {/* Main curve */}
                              <polyline
                                points={points.join(' ')}
                                fill="none"
                                stroke="#0066CC"
                                strokeWidth="2.5"
                              />
                              
                              {/* Critical value line(s) */}
                              {tailType === 'right' && (
                                <>
                                  <line
                                    x1={centerX + critValue * xScale}
                                    y1={centerY}
                                    x2={centerX + critValue * xScale}
                                    y2={centerY - 100}
                                    stroke="#FFB81C"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                  />
                                  <text
                                    x={centerX + critValue * xScale}
                                    y={centerY + 20}
                                    textAnchor="middle"
                                    fill="#FFB81C"
                                    fontSize="12"
                                    fontWeight="bold"
                                  >
                                    {critValue.toFixed(3)}
                                  </text>
                                </>
                              )}
                              {tailType === 'left' && (
                                <>
                                  <line
                                    x1={centerX + critValue * xScale}
                                    y1={centerY}
                                    x2={centerX + critValue * xScale}
                                    y2={centerY - 100}
                                    stroke="#FFB81C"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                  />
                                  <text
                                    x={centerX + critValue * xScale}
                                    y={centerY + 20}
                                    textAnchor="middle"
                                    fill="#FFB81C"
                                    fontSize="12"
                                    fontWeight="bold"
                                  >
                                    {critValue.toFixed(3)}
                                  </text>
                                </>
                              )}
                              {tailType === 'two' && (
                                <>
                                  <line
                                    x1={centerX - critValue * xScale}
                                    y1={centerY}
                                    x2={centerX - critValue * xScale}
                                    y2={centerY - 100}
                                    stroke="#FFB81C"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                  />
                                  <line
                                    x1={centerX + critValue * xScale}
                                    y1={centerY}
                                    x2={centerX + critValue * xScale}
                                    y2={centerY - 100}
                                    stroke="#FFB81C"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                  />
                                  <text
                                    x={centerX - critValue * xScale}
                                    y={centerY + 20}
                                    textAnchor="middle"
                                    fill="#FFB81C"
                                    fontSize="12"
                                    fontWeight="bold"
                                  >
                                    {(-critValue).toFixed(3)}
                                  </text>
                                  <text
                                    x={centerX + critValue * xScale}
                                    y={centerY + 20}
                                    textAnchor="middle"
                                    fill="#FFB81C"
                                    fontSize="12"
                                    fontWeight="bold"
                                  >
                                    {critValue.toFixed(3)}
                                  </text>
                                </>
                              )}
                              
                              {/* Test statistic line */}
                              {t >= -5 && t <= 5 && (
                                <>
                                  <line
                                    x1={centerX + t * xScale}
                                    y1={centerY}
                                    x2={centerX + t * xScale}
                                    y2={centerY - 120}
                                    stroke="#10b981"
                                    strokeWidth="3"
                                  />
                                  <circle
                                    cx={centerX + t * xScale}
                                    cy={centerY - 120}
                                    r="5"
                                    fill="#10b981"
                                  />
                                  <text
                                    x={centerX + t * xScale}
                                    y={centerY - 130}
                                    textAnchor="middle"
                                    fill="#10b981"
                                    fontSize="13"
                                    fontWeight="bold"
                                  >
                                    t = {t.toFixed(2)}
                                  </text>
                                </>
                              )}
                              
                              {/* X-axis labels */}
                              <text x={centerX} y={centerY + 35} textAnchor="middle" fill="#6b7280" fontSize="11">0</text>
                              <text x="20" y="20" fill="#6b7280" fontSize="11" fontWeight="600">t-distribution (df = {df})</text>
                              
                              {/* Legend */}
                              <g transform="translate(20, 40)">
                                <rect x="0" y="0" width="15" height="15" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" />
                                <text x="20" y="12" fill="#6b7280" fontSize="10">Rejection Region (α = {alpha})</text>
                                
                                <line x1="0" y1="28" x2="15" y2="28" stroke="#FFB81C" strokeWidth="2" strokeDasharray="3 3" />
                                <text x="20" y="32" fill="#6b7280" fontSize="10">Critical Value</text>
                                
                                <line x1="0" y1="48" x2="15" y2="48" stroke="#10b981" strokeWidth="3" />
                                <text x="20" y="52" fill="#6b7280" fontSize="10">Test Statistic</text>
                              </g>
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Data boxes */}
                    <div className="bg-white p-4 rounded-md mb-2.5 border-l-4 border-[#0066CC]">
                      <div className="font-semibold text-gray-700 text-xs mb-1">DISTRIBUTION</div>
                      <div className="text-gray-600 text-sm font-mono">t-distribution (df = {df})</div>
                    </div>
                    <div className="bg-white p-4 rounded-md mb-2.5 border-l-4 border-[#FFB81C]">
                      <div className="font-semibold text-gray-700 text-xs mb-1">CRITICAL VALUE{tailType === 'two' ? 'S' : ''}</div>
                      <div className="text-gray-600 text-sm font-mono">
                        {tailType === 'two' ? `±${critValue.toFixed(3)}` : `t = ${critValue.toFixed(3)}`}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-md mb-2.5 border-l-4 border-[#10b981]">
                      <div className="font-semibold text-gray-700 text-xs mb-1">TEST STATISTIC</div>
                      <div className="text-gray-600 text-sm font-mono">t = {t.toFixed(2)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-md border-l-4 border-[#0066CC]">
                      <div className="font-semibold text-gray-700 text-xs mb-1">SIGNIFICANCE LEVEL (α)</div>
                      <div className="text-gray-600 text-sm font-mono">{alpha}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Test Statistic */}
              {activeTab === 3 && (
                <div className="mb-6">
                  <div className="bg-[#004080] text-white px-4 py-3 rounded-t-lg font-semibold text-sm flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">3</div>
                    <div>Calculate Test Statistic</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-b-lg border-2 border-gray-200 border-t-0">
                    <div className="bg-white p-4 rounded-md font-mono text-sm leading-loose text-gray-700 mb-3">
                      <div>t = (x̄ - μ₀) / (s / √n)</div>
                      <div>t = ({xbar} - {mu0}) / ({s} / √{n})</div>
                      <div>t = {(xbar - mu0).toFixed(2)} / {se.toFixed(2)}</div>
                      <div className="font-bold">t = {t.toFixed(2)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Sample Mean (x̄)</div>
                        <div className="text-lg font-bold text-gray-800">{unit === '$' ? `${unit}${xbar}` : `${xbar}${unit}`}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Population Mean (μ₀)</div>
                        <div className="text-lg font-bold text-gray-800">{unit === '$' ? `${unit}${mu0}` : `${mu0}${unit}`}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Std Dev (s)</div>
                        <div className="text-lg font-bold text-gray-800">{unit === '$' ? `${unit}${s}` : `${s}${unit}`}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Sample Size (n)</div>
                        <div className="text-lg font-bold text-gray-800">{n}</div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2">
                      <div className="text-xs text-blue-700">
                        <strong>Compare to critical value:</strong> {tailType === 'two' ? `±${critValue.toFixed(3)}` : critValue.toFixed(3)} (at α = {alpha})
                      </div>
                    </div>
                    <div className="bg-blue-50/30 border border-blue-100 rounded-md p-3">
                      <div className="text-xs text-gray-600">
                        <strong>Effect Size (Cohen's d):</strong> {effectSize.toFixed(3)} {Math.abs(effectSize) < 0.2 ? '(small)' : Math.abs(effectSize) < 0.5 ? '(small-medium)' : Math.abs(effectSize) < 0.8 ? '(medium-large)' : '(large)'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Decision */}
              {activeTab === 4 && (
                <div className="mb-6">
                  <div className="bg-[#004080] text-white px-4 py-3 rounded-t-lg font-semibold text-sm flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">4</div>
                    <div>Make Decision</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-b-lg border-2 border-gray-200 border-t-0">
                    <div className="bg-white p-4 rounded-lg mb-3">
                      <div className="font-semibold text-gray-700 mb-2 text-sm">Decision</div>
                      <div className={`text-2xl font-bold mb-2 ${reject ? 'text-red-600' : 'text-green-600'}`}>
                        {reject ? 'Reject H₀' : 'Fail to Reject H₀'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Test Statistic</div>
                        <div className="text-lg font-bold text-gray-800">{t.toFixed(2)}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Critical Value</div>
                        <div className="text-lg font-bold text-gray-800">{tailType === 'two' ? `±${critValue.toFixed(3)}` : critValue.toFixed(3)}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">P-Value</div>
                        <div className="text-lg font-bold text-gray-800">{pValue.toFixed(3)}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Alpha (α)</div>
                        <div className="text-lg font-bold text-gray-800">{alpha}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Interpretation */}
              {activeTab === 5 && (
                <div className="mb-6">
                  <div className="bg-[#004080] text-white px-4 py-3 rounded-t-lg font-semibold text-sm flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs">5</div>
                    <div>Interpret Result</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-b-lg border-2 border-gray-200 border-t-0">
                    <div className="bg-white p-4 rounded-lg">
                      <div className="font-semibold text-gray-700 mb-2 text-sm">Interpretation</div>
                      <div className="text-gray-600 text-sm leading-relaxed">
                        {conclusionText}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HypothesisTestTool;
