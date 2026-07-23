import { StepScan } from './components/StepScan';
import { StepSelect } from './components/StepSelect';
import { StepAnalyze } from './components/StepAnalyze';
import { StepGenerate } from './components/StepGenerate';
import { StepContent } from './components/StepContent';
import { StepExport } from './components/StepExport';
import { Settings } from './components/Settings';
import { useAppFlow } from './hooks/useFlowStore';
import { useState } from 'react';
import { Settings as SettingsIcon, Package, Target, Wand2, Download, Zap, MessageSquare, RotateCcw } from 'lucide-react';

export default function App() {
  const { state } = useAppFlow();
  const { step } = state;
  const [showSettings, setShowSettings] = useState(false);
  const extensionVersion = chrome.runtime.getManifest().version;

  // ฟังก์ชัน Refresh - ล้างข้อมูลและ reload
  const handleRefresh = () => {
    if (confirm('ต้องการรีเฟรชและล้างข้อมูลทั้งหมดใช่หรือไม่?')) {
      window.location.reload();
    }
  };

  const renderStep = () => {
    if (showSettings) return <Settings onClose={() => setShowSettings(false)} />;

    switch (step) {
      case 'SCAN': return <StepScan />;
      case 'SELECT': return <StepSelect />;
      case 'ANALYZE': return <StepAnalyze />;
      case 'GENERATE': return <StepGenerate />;
      case 'CONTENT': return <StepContent />;
      case 'EXPORT': return <StepExport />;
      default: return <StepScan />;
    }
  };

  const steps = [
    { id: 'SCAN', icon: Target, label: 'SCAN' },
    { id: 'SELECT', icon: Package, label: 'SELECT' },
    { id: 'ANALYZE', icon: Zap, label: 'ANALYZE' },
    { id: 'GENERATE', icon: Wand2, label: 'IMAGE' },
    { id: 'CONTENT', icon: MessageSquare, label: 'CONTENT' },
    { id: 'EXPORT', icon: Download, label: 'EXPORT' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-800 flex items-center gap-1.5">
              Gimi Multi-X
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">v{extensionVersion}</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
            title="รีเฟรช"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-violet-100 text-violet-600' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Stepper Nav */}
      {!showSettings && (
        <nav className="bg-white border-b border-slate-200 px-2 py-3">
          <div className="flex items-center justify-between max-w-md mx-auto relative px-2">
            {/* Progress Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-4 mx-8 z-0" />

            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = steps.findIndex(x => x.id === step) > i;

              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5 z-10">
                  <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                        ${isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 scale-110' :
                      isCompleted ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-400'}
                                    `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase tracking-tighter ${isActive ? 'text-violet-700' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        {renderStep()}
      </main>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}
