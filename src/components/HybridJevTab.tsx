import React, { useState, useMemo } from 'react';
import {
  FileText,
  Cpu,
  Scale,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import {
  HYBRID_CASE_STUDIES,
  HybridCaseStudy,
  JevAtomicJudgment,
  evaluateHybridPipeline,
  UNCERTAINTY_ZONE_MIN,
  UNCERTAINTY_ZONE_MAX,
} from '../engine/hybridJevCatala';

export const HybridJevTab: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<HybridCaseStudy>(
    HYBRID_CASE_STUDIES[0]
  );
  const [judgments, setJudgments] = useState<JevAtomicJudgment[]>(
    structuredClone(HYBRID_CASE_STUDIES[0].jevJudgments)
  );
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  const selectCase = (c: HybridCaseStudy) => {
    setSelectedCase(c);
    setJudgments(structuredClone(c.jevJudgments));
    setSelectedRuleId(null);
  };

  const resetJudgments = () => {
    setJudgments(structuredClone(selectedCase.jevJudgments));
  };

  const updateProbability = (id: string, prob: number) => {
    setJudgments((prev) =>
      prev.map((j) => (j.id === id ? { ...j, probability: prob } : j))
    );
  };

  const evalResult = useMemo(
    () =>
      evaluateHybridPipeline(
        judgments,
        selectedCase.exactFacts,
        selectedCase.rules
      ),
    [judgments, selectedCase]
  );

  const inspectedRule =
    selectedCase.rules.find((r) => r.id === selectedRuleId) ||
    evalResult.winningRule ||
    selectedCase.rules[0];

  return (
    <div className="space-y-6 pb-8">
      {/* En-tête + Sélecteur des 3 dossiers */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              « Jev makes judgments, Catala makes decisions »
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">
              Pipeline Hybride : Modèle Système 1 (Jev) + Langage Formel Système 2 (Catala)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Le modèle neuronal <strong>Jev</strong> ne prend aucune décision : il répond uniquement à des questions fermées avec un score de confiance <code className="font-mono text-indigo-700">p</code>. Puis <strong>Catala</strong> applique la loi de façon 100 % traçable.
            </p>
          </div>

          <button
            onClick={resetJudgments}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser les scores
          </button>
        </div>

        {/* Boutons de sélection de dossier */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {HYBRID_CASE_STUDIES.map((c) => {
            const active = selectedCase.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => selectCase(c)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  active
                    ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-600/15'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                    {c.domain}
                  </span>
                  <span className="text-[11px] font-medium bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {c.badge}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 leading-snug">
                  {c.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PIPELINE EN 4 COLONNES (Exactement comme le schéma de l'utilisateur) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* COLONNE 1 (3 cols) : 1. Faits Bruts (Texte libre & Données exactes) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Faits Bruts (Texte libre)
                </h3>
              </div>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>

            {/* Récit / PV */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="text-xs font-bold text-slate-700 mb-1.5">
                {selectedCase.narrativeTitle}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {selectedCase.narrativeText}
              </p>
            </div>

            {/* Données exactes (Math / Lookup) */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Données exactes (Vérifiées par code)
              </div>
              {selectedCase.exactFacts.map((f) => (
                <div
                  key={f.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{f.label}</div>
                    <div className="text-[11px] text-slate-500">{f.valueDisplay}</div>
                  </div>
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                      f.booleanEval
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {f.booleanEval ? 'vrai' : 'faux'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Entrée du système</span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
          </div>
        </div>

        {/* COLONNE 2 (3 cols) : 2. Système 1 : Modèle 'Jev' (Jugements Atomiques) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Système 1 : Modèle « Jev »
                  </h3>
                </div>
              </div>
              <Cpu className="w-4 h-4 text-indigo-600" />
            </div>

            <p className="text-xs text-slate-500">
              Questions fermées posées au modèle. <strong>Bouge les curseurs</strong> pour voir comment la confiance <code className="font-mono">p</code> influence Catala :
            </p>

            <div className="space-y-3">
              {judgments.map((j) => {
                const isUncertain =
                  j.probability >= UNCERTAINTY_ZONE_MIN &&
                  j.probability <= UNCERTAINTY_ZONE_MAX;
                const isYes = j.probability >= 0.5;

                return (
                  <div
                    key={j.id}
                    className={`rounded-xl border p-3 transition-all ${
                      isUncertain
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-800 leading-snug">
                      {j.question}
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          isUncertain
                            ? 'bg-amber-200/80 text-amber-900'
                            : isYes
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isUncertain
                          ? `→ Indécis (p = ${j.probability.toFixed(2)} ⚠️)`
                          : isYes
                            ? `→ Oui (p = ${j.probability.toFixed(2)})`
                            : `→ Non (p = ${j.probability.toFixed(2)})`}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {j.catalaVar}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={j.probability}
                      onChange={(e) =>
                        updateProbability(j.id, Number(e.target.value))
                      }
                      className="w-full mt-2 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Jugements atomiques</span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
          </div>
        </div>

        {/* COLONNE 3 (3 cols) : 3. Système 2 : Code Formel 'Catala' (La Loi) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                  3
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Système 2 : Code « Catala »
                </h3>
              </div>
              <Scale className="w-4 h-4 text-slate-700" />
            </div>

            <p className="text-xs text-slate-500">
              Arbre des règles et exceptions de la loi. Clique sur un article pour inspecter son code Catala :
            </p>

            <div className="space-y-2.5">
              {selectedCase.rules.map((r) => {
                const st = evalResult.ruleStatuses[r.id];
                const isSelected = st?.status === 'selected';
                const isOverridden = st?.status === 'overridden';

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRuleId(r.id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                        : isOverridden
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[10px] text-slate-500">
                        {r.exceptionOf ? `↳ exception ${r.exceptionOf}` : 'Règle racine'}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          DECIDED ✓
                        </span>
                      )}
                      {isOverridden && (
                        <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                          Écrasée
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      {r.articleTitle}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                      {r.lawSummary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Logique par défaut</span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
          </div>
        </div>

        {/* COLONNE 4 (3 cols) : 4. Résultat Garanti & Explicable */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  4
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Résultat & Trace
                </h3>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>

            {/* Alerte Escalade Humaine si p est dans la zone d'incertitude */}
            {evalResult.requiresHumanReview ? (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Escalade Humaine Requise !
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Catala bloque la décision automatique car le modèle Jev hésite sur une condition décisive :
                </p>
                {evalResult.uncertainDecisiveJudgments.map((uj) => (
                  <div
                    key={uj.id}
                    className="bg-white border border-amber-300 rounded-lg p-2 text-xs font-mono text-amber-950"
                  >
                    {uj.catalaVar} (p = {uj.probability.toFixed(2)})
                  </div>
                ))}
                <p className="text-[11px] text-amber-800 pt-1">
                  Un juriste humain n’a qu’à trancher cette unique question pour débloquer la décision Catala.
                </p>
              </div>
            ) : (
              evalResult.winningRule && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Décision Certifiée
                  </div>
                  <div className="text-base font-extrabold text-slate-900 leading-snug">
                    {evalResult.winningRule.decisionTitle}
                  </div>
                  <div className="text-xs font-semibold text-emerald-900">
                    {evalResult.winningRule.decisionPenalty}
                  </div>
                </div>
              )
            )}

            {/* Trace d'observabilité (Style "Peel off the cap" de TypeSafe) */}
            <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-[11px] space-y-2">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider">
                Trace d’auditabilité complète :
              </div>
              <div className="text-emerald-400 font-bold">
                → {evalResult.winningRule?.label || 'aucune'}
              </div>
              {evalResult.overriddenRules.length > 0 && (
                <div className="text-amber-300">
                  Écrase : {evalResult.overriddenRules.map((r) => r.label).join(', ')}
                </div>
              )}
              <div className="border-t border-slate-800 pt-2 space-y-1">
                <div className="text-slate-400">jugements · Jev :</div>
                {judgments.map((j) => (
                  <div key={j.id} className="flex justify-between">
                    <span className="text-slate-300">{j.catalaVar}</span>
                    <span
                      className={
                        j.probability >= UNCERTAINTY_ZONE_MIN &&
                        j.probability <= UNCERTAINTY_ZONE_MAX
                          ? 'text-amber-400 font-bold'
                          : j.probability >= 0.5
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                      }
                    >
                      {j.probability.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Zéro boîte noire : chaque décision est justifiable devant un juge.
          </div>
        </div>
      </div>

      {/* Panneau inférieur : Code Catala de l'article sélectionné */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Code Catala de l’article inspecté ({inspectedRule.articleTitle})
          </div>
          <p className="text-sm text-slate-700">{inspectedRule.lawSummary}</p>
        </div>
        <pre className="bg-slate-900 text-slate-100 rounded-xl px-4 py-3 font-mono text-xs overflow-x-auto w-full md:w-auto">
          {inspectedRule.catalaCode}
        </pre>
      </div>
    </div>
  );
};
