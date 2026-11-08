import React, { useState } from 'react';
import { BookOpen, Cpu, Scale, ShieldCheck } from 'lucide-react';
import { OverviewTab } from './components/OverviewTab';
import { HybridJevTab } from './components/HybridJevTab';
import { SimulatorTab } from './components/SimulatorTab';
import { FormalVerifierTab } from './components/FormalVerifierTab';

export type StudioTab = 'overview' | 'hybrid' | 'simulator' | 'verifier';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StudioTab>('overview');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Barre de navigation supérieure épurée */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                Catala Studio
              </h1>
              <p className="text-xs text-slate-500">
                Droit, Programmation Formelle & IA Système 1 / 2
              </p>
            </div>
          </button>

          {/* Onglets limpides */}
          <nav className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              1. Comprendre Catala
            </button>

            <button
              onClick={() => setActiveTab('hybrid')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'hybrid'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              2. Hybride Jev + Catala
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              3. Simulateur Allocations
            </button>

            <button
              onClick={() => setActiveTab('verifier')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'verifier'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              4. Détecteur de Bugs (`catala proof`)
            </button>
          </nav>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1">
        {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
        {activeTab === 'hybrid' && <HybridJevTab />}
        {activeTab === 'simulator' && <SimulatorTab />}
        {activeTab === 'verifier' && <FormalVerifierTab />}
      </main>
    </div>
  );
};

export default App;
