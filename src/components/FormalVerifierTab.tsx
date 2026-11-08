import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Wrench,
  RotateCcw,
  GitBranch,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import {
  PRESET_LAW_SCENARIOS,
  PresetLawScenario,
  CatalaRuleNode,
  FoyerTest,
  evaluateDefaultLogic,
  runFormalProof,
  generateCatalaSnippet,
} from '../engine/formalVerifier';

export const FormalVerifierTab: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<PresetLawScenario>(
    PRESET_LAW_SCENARIOS[0]
  );
  const [rules, setRules] = useState<CatalaRuleNode[]>(
    structuredClone(PRESET_LAW_SCENARIOS[0].rules)
  );
  const [foyerTest, setFoyerTest] = useState<FoyerTest>(
    structuredClone(PRESET_LAW_SCENARIOS[0].defaultFoyer)
  );

  const selectScenario = (scen: PresetLawScenario) => {
    setSelectedScenario(scen);
    setRules(structuredClone(scen.rules));
    setFoyerTest(structuredClone(scen.defaultFoyer));
  };

  const applyFormalFix = () => {
    setRules(structuredClone(selectedScenario.fixedRules));
  };

  const resetBuggyVersion = () => {
    setRules(structuredClone(selectedScenario.rules));
    setFoyerTest(structuredClone(selectedScenario.defaultFoyer));
  };

  const changeExceptionParent = (id: string, parentLabel: string | null) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, exceptionOf: parentLabel } : r))
    );
  };

  const proofReport = useMemo(() => runFormalProof(rules), [rules]);
  const currentEval = useMemo(
    () => evaluateDefaultLogic(rules, foyerTest),
    [rules, foyerTest]
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Choix du scénario en 3 cartes propres */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Choisis un exemple d’erreur législative détectée par `catala proof` :
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRESET_LAW_SCENARIOS.map((scen) => {
            const active = selectedScenario.id === scen.id;
            return (
              <button
                key={scen.id}
                onClick={() => selectScenario(scen)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  active
                    ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/15'
                    : 'bg-slate-50 border-slate-200 hover:bg-white'
                }`}
              >
                <div className="text-xs font-bold text-indigo-700 mb-1">
                  {scen.subtitle}
                </div>
                <div className="text-sm font-bold text-slate-900 leading-snug">
                  {scen.title}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-slate-600 mt-4 pt-3 border-t border-slate-100">
          {selectedScenario.description}
        </p>
      </div>

      {/* Bannière Verdict du Prouveur Formel */}
      <div
        className={`rounded-2xl border p-6 shadow-sm ${
          proofReport.isVerified
            ? 'bg-emerald-50/70 border-emerald-300'
            : 'bg-rose-50/70 border-rose-300'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {proofReport.isVerified ? (
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
            )}

            <div>
              <h3
                className={`text-lg font-extrabold ${
                  proofReport.isVerified ? 'text-emerald-950' : 'text-rose-950'
                }`}
              >
                {proofReport.isVerified
                  ? 'Loi mathématiquement certifiée (Aucun conflit ni vide juridique)'
                  : `${proofReport.violations.length} erreur(s) logique(s) détectée(s) dans la loi !`}
              </h3>

              <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    proofReport.noConflictPassed
                      ? 'text-emerald-800'
                      : 'text-rose-800'
                  }`}
                >
                  {proofReport.noConflictPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertOctagon className="w-3.5 h-3.5" />
                  )}
                  Absence de conflit : {proofReport.noConflictPassed ? 'OK' : 'ÉCHEC'}
                </span>
                <span className="text-slate-400">•</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    proofReport.completenessPassed
                      ? 'text-emerald-800'
                      : 'text-rose-800'
                  }`}
                >
                  {proofReport.completenessPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertOctagon className="w-3.5 h-3.5" />
                  )}
                  Absence de vide juridique :{' '}
                  {proofReport.completenessPassed ? 'OK' : 'ÉCHEC'}
                </span>
              </div>
            </div>
          </div>

          {!proofReport.isVerified ? (
            <button
              onClick={applyFormalFix}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-sm transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Corriger la loi avec Catala (1 clic)
            </button>
          ) : (
            <button
              onClick={resetBuggyVersion}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Remettre la version buggée
            </button>
          )}
        </div>

        {/* Explication du contre-exemple s'il y a un bug */}
        {proofReport.violations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-rose-200 space-y-2">
            {proofReport.violations.map((v, idx) => (
              <div
                key={idx}
                className="bg-white border border-rose-200 rounded-xl p-4 text-xs text-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="font-bold text-rose-700">
                    {v.type === 'conflict'
                      ? '⚡ Contradiction entre deux articles :'
                      : '🕳️ Vide juridique découvert :'}
                  </div>
                  <p>{v.description}</p>
                  <p className="text-emerald-800 font-medium">
                    💡 Solution : {v.fixSuggestion}
                  </p>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 font-mono text-[11px] text-slate-800 shrink-0">
                  Contre-exemple : Revenu = {v.counterexample.revenu.toLocaleString('fr-FR')} €
                  {' | '}Enfants = {v.counterexample.nbEnfants}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grille 2 colonnes : Gauche = Articles | Droite = Arbre des exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Gauche (7 cols) : Les articles */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Articles de la loi (Modifie la priorité avec le menu déroulant)
          </h3>

          {rules.map((rule) => {
            const isWinner =
              currentEval.outcome === 'success' &&
              currentEval.winningRule?.id === rule.id;
            const isConflict =
              currentEval.outcome === 'conflict' &&
              currentEval.conflictingRules?.some((cr) => cr.id === rule.id);

            return (
              <div
                key={rule.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                  isConflict
                    ? 'border-rose-500 ring-2 ring-rose-500/15'
                    : isWinner
                      ? 'border-emerald-500 ring-2 ring-emerald-500/15'
                      : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-900">
                    {rule.articleTitle}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md">
                      étiquette {rule.label}
                    </span>
                    {isConflict && (
                      <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full">
                        ⚡ En conflit
                      </span>
                    )}
                    {isWinner && (
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        ✓ S’applique ({rule.consequenceValue} {rule.unit})
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 italic mb-3">
                  « {rule.lawText} »
                </p>

                <div className="flex flex-wrap items-center gap-2 mb-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    Priorité de cet article :
                  </span>
                  <select
                    value={rule.exceptionOf || '__NONE__'}
                    onChange={(e) =>
                      changeExceptionParent(
                        rule.id,
                        e.target.value === '__NONE__' ? null : e.target.value
                      )
                    }
                    className="bg-white border border-slate-300 text-indigo-700 font-mono text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="__NONE__">
                      Règle de base (Aucune exception)
                    </option>
                    {rules
                      .filter((other) => other.id !== rule.id)
                      .map((other) => (
                        <option key={other.id} value={other.label}>
                          exception {other.label} (Prioritaire sur « {other.label} »)
                        </option>
                      ))}
                  </select>
                </div>

                <pre className="bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-xs overflow-x-auto leading-relaxed">
                  {generateCatalaSnippet(rule, selectedScenario.variableName)}
                </pre>
              </div>
            );
          })}
        </div>

        {/* Droite (5 cols) : Arbre des exceptions & Test sur un cas */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">
                Arbre des Exceptions (`catala Exceptions`)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Visualise quelle règle est une exception de quelle autre :
            </p>
            <pre className="bg-slate-900 text-indigo-200 rounded-xl p-4 font-mono text-xs overflow-x-auto leading-relaxed">
              {proofReport.asciiExceptionTree}
            </pre>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Tester sur un foyer
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-700">Revenu :</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {foyerTest.revenu.toLocaleString('fr-FR')} €
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={150000}
                  step={1000}
                  value={foyerTest.revenu}
                  onChange={(e) =>
                    setFoyerTest((prev) => ({
                      ...prev,
                      revenu: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-slate-700">Enfants :</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {foyerTest.nbEnfants} enfant(s)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={foyerTest.nbEnfants}
                  onChange={(e) =>
                    setFoyerTest((prev) => ({
                      ...prev,
                      nbEnfants: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border text-xs ${
                currentEval.outcome === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              {currentEval.outcome === 'success' && currentEval.winningRule && (
                <div>
                  <div className="font-bold text-sm text-emerald-800">
                    Résultat : {selectedScenario.variableName} = {currentEval.value}{' '}
                    {currentEval.winningRule.unit}
                  </div>
                  <div className="mt-1 text-slate-600">
                    Appliqué grâce à : <strong>{currentEval.winningRule.articleTitle}</strong>
                  </div>
                </div>
              )}
              {currentEval.outcome === 'conflict' && (
                <div className="font-bold text-rose-800">
                  ⚡ Conflit ! Deux règles s’appliquent en même temps à ce foyer sans savoir laquelle choisir.
                </div>
              )}
              {currentEval.outcome === 'empty' && (
                <div className="font-bold text-rose-800">
                  🕳️ Vide juridique ! Aucune règle de la loi ne couvre ce foyer.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
