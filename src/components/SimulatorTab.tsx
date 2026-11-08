import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  MapPin,
} from 'lucide-react';
import {
  MenageInput,
  Enfant,
  evaluerAllocationsFamiliales,
  PLAFOND_55_SMIC,
} from '../engine/allocationsFamiliales';

interface PresetHousehold {
  id: string;
  label: string;
  description: string;
  menage: MenageInput;
}

const PRESET_HOUSEHOLDS: PresetHousehold[] = [
  {
    id: 'piege-l521-3',
    label: '1. Cas classique (2 enfants dont l’aîné a 15 ans)',
    description:
      'L’aîné a 15 ans (≥ 14 ans), mais l’Article L521-3 alinéa 1 exclut l’enfant le plus âgé tant qu’il n’y a pas 3 enfants.',
    menage: {
      revenuAnnuel: 42000,
      outreMer: false,
      gardeAlternee: false,
      enfants: [
        { id: 'e1', prenom: 'Lucas (Aîné)', age: 15, remunerationMensuelle: 0 },
        { id: 'e2', prenom: 'Emma', age: 10, remunerationMensuelle: 0 },
      ],
    },
  },
  {
    id: 'famille-nombreuse-3',
    label: '2. Exception Famille ≥ 3 enfants (Art. L521-3 al. 2)',
    description:
      'Avec 3 enfants à charge, l’exception du 2e alinéa de l’Article L521-3 s’active : même l’aîné de 15 ans touche la majoration de 74,04 € !',
    menage: {
      revenuAnnuel: 42000,
      outreMer: false,
      gardeAlternee: false,
      enfants: [
        { id: 'e1', prenom: 'Lucas (Aîné)', age: 15, remunerationMensuelle: 0 },
        { id: 'e2', prenom: 'Emma', age: 14, remunerationMensuelle: 0 },
        { id: 'e3', prenom: 'Léo', age: 4, remunerationMensuelle: 0 },
      ],
    },
  },
  {
    id: 'apprenti-plafond',
    label: '3. Exception Apprenti salarié > 55 % SMIC (Art. R512-2)',
    description:
      'L’adolescent de 18 ans gagne 1 150 €/mois (> 971,81 €). L’exception R512-2 al. 2 lui retire la qualité d’enfant à charge.',
    menage: {
      revenuAnnuel: 38000,
      outreMer: false,
      gardeAlternee: false,
      enfants: [
        { id: 'e1', prenom: 'Hugo (Apprenti)', age: 18, remunerationMensuelle: 1150 },
        { id: 'e2', prenom: 'Chloé', age: 12, remunerationMensuelle: 0 },
      ],
    },
  },
  {
    id: 'outre-mer-1-enfant',
    label: '4. Exception Outre-Mer 1 enfant (Art. L755-11)',
    description:
      'En Outre-Mer, l’exception de l’Article L755-11 écrase la règle générale et ouvre le droit dès le 1er enfant.',
    menage: {
      revenuAnnuel: 32000,
      outreMer: true,
      gardeAlternee: false,
      enfants: [
        { id: 'e1', prenom: 'Maëlys', age: 15, remunerationMensuelle: 0 },
      ],
    },
  },
];

export const SimulatorTab: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    PRESET_HOUSEHOLDS[0].id
  );
  const [menage, setMenage] = useState<MenageInput>(PRESET_HOUSEHOLDS[0].menage);
  const [showOnlyActive, setShowOnlyActive] = useState<boolean>(false);

  const result = useMemo(() => evaluerAllocationsFamiliales(menage), [menage]);
  const activePreset = PRESET_HOUSEHOLDS.find((p) => p.id === selectedPresetId);

  const applyPreset = (preset: PresetHousehold) => {
    setSelectedPresetId(preset.id);
    setMenage(structuredClone(preset.menage));
  };

  const updateEnfant = (id: string, patch: Partial<Enfant>) => {
    setSelectedPresetId('custom');
    setMenage((prev) => ({
      ...prev,
      enfants: prev.enfants.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  };

  const addEnfant = () => {
    setSelectedPresetId('custom');
    const nextNum = menage.enfants.length + 1;
    setMenage((prev) => ({
      ...prev,
      enfants: [
        ...prev.enfants,
        {
          id: `e-${Date.now()}`,
          prenom: `Enfant ${nextNum}`,
          age: 8,
          remunerationMensuelle: 0,
        },
      ],
    }));
  };

  const removeEnfant = (id: string) => {
    setSelectedPresetId('custom');
    setMenage((prev) => ({
      ...prev,
      enfants: prev.enfants.filter((e) => e.id !== id),
    }));
  };

  const visibleArticles = useMemo(() => {
    if (!showOnlyActive) return result.articles;
    return result.articles.filter((a) => a.status !== 'inactive');
  }, [result.articles, showOnlyActive]);

  return (
    <div className="space-y-6 pb-8">
      {/* Barre de cas pré-configurés épurée */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Choisis une situation familiale pour voir la loi réagir :
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_HOUSEHOLDS.map((preset) => {
            const active = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        {activePreset && (
          <p className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100">
            💡 <strong>Ce qu’il faut observer :</strong> {activePreset.description}
          </p>
        )}
      </div>

      {/* Grille 2 colonnes aérée */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLONNE GAUCHE (5 cols) : Montant & Foyer */}
        <div className="lg:col-span-5 space-y-5">
          {/* Carte Résultat claire */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Résultat du calcul Catala
              </span>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {result.nbEnfantsACharge} enfant(s) à charge
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-slate-900">
                {result.montantTotalMensuel.toFixed(2)} €
              </span>
              <span className="text-sm text-slate-500">/ mois</span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Montant de base (Art. L521-1) :</span>
                <span className="font-mono font-semibold text-slate-900">
                  {result.montantBaseBrut.toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between">
                <span>Majorations ≥ 14 ans (Art. L521-3) :</span>
                <span className="font-mono font-semibold text-emerald-700">
                  + {result.montantMajorationsAgeBrut.toFixed(2)} €
                </span>
              </div>
              {result.diviseurModulation > 1 && (
                <div className="flex justify-between text-amber-700">
                  <span>Modulation revenus (÷ {result.diviseurModulation}) :</span>
                  <span className="font-mono font-semibold">
                    {result.montantApresModulation.toFixed(2)} €
                  </span>
                </div>
              )}
              {result.complementDegressif > 0 && (
                <div className="flex justify-between text-indigo-700">
                  <span>Complément dégressif (Art. D521-3) :</span>
                  <span className="font-mono font-semibold">
                    + {result.complementDegressif.toFixed(2)} €
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Paramètres du foyer */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Situation du Foyer
            </h3>

            {/* Revenu */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">Revenu annuel du foyer :</span>
                <span className="font-mono font-bold text-indigo-700">
                  {menage.revenuAnnuel.toLocaleString('fr-FR')} € / an
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={120000}
                step={1000}
                value={menage.revenuAnnuel}
                onChange={(e) => {
                  setSelectedPresetId('custom');
                  setMenage((prev) => ({
                    ...prev,
                    revenuAnnuel: Number(e.target.value),
                  }));
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>0 €</span>
                <span>Plafond : {result.plafondTranche1.toLocaleString('fr-FR')} €</span>
                <span>120 000 €</span>
              </div>
            </div>

            {/* Option Outre-Mer */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-slate-500" />
                <div>
                  <div className="font-semibold text-slate-800">Résidence en Outre-Mer</div>
                  <div className="text-slate-500">Ouvre le droit dès le 1er enfant (Art. L755-11)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={menage.outreMer}
                onChange={() => {
                  setSelectedPresetId('custom');
                  setMenage((prev) => ({ ...prev, outreMer: !prev.outreMer }));
                }}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Liste des enfants épurée */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Enfants ({menage.enfants.length})
                </span>
                <button
                  onClick={addEnfant}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter un enfant
                </button>
              </div>

              {result.enfantsEvalues.map((ev) => {
                const enf = ev.enfant;
                return (
                  <div
                    key={enf.id}
                    className={`rounded-xl border p-3.5 space-y-2.5 ${
                      ev.estACharge
                        ? 'bg-slate-50/70 border-slate-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {enf.prenom}
                        </span>
                        {ev.estPlusAgeACharge && (
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Plus âgé
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            ev.droitMajorationAge
                              ? 'bg-emerald-100 text-emerald-800'
                              : ev.estACharge
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {!ev.estACharge
                            ? 'Non à charge'
                            : ev.droitMajorationAge
                              ? '+ 74,04 € (≥ 14 ans)'
                              : '0 € maj.'}
                        </span>
                        <button
                          onClick={() => removeEnfant(enf.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span>Âge :</span>
                          <span className="font-bold text-slate-900">{enf.age} ans</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={21}
                          value={enf.age}
                          onChange={(e) =>
                            updateEnfant(enf.id, { age: Number(e.target.value) })
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-600 mb-1">
                          <span>Salaire net :</span>
                          <span className="font-bold text-slate-900">
                            {enf.remunerationMensuelle} €
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1400}
                          step={50}
                          value={enf.remunerationMensuelle}
                          onChange={(e) =>
                            updateEnfant(enf.id, {
                              remunerationMensuelle: Number(e.target.value),
                            })
                          }
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {ev.estACharge ? ev.motifMajoration : ev.motifCharge}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (7 cols) : Articles de loi & Code Catala */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Texte de loi & Code Catala en direct
              </h3>
              <p className="text-xs text-slate-500">
                Vert = Règle appliquée • Ambre = Règle écrasée par une exception
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={() => setShowOnlyActive(!showOnlyActive)}
                className="accent-indigo-600 w-4 h-4"
              />
              Masquer les articles inactifs
            </label>
          </div>

          <div className="space-y-4">
            {visibleArticles.map((art) => {
              const isApplied = art.status === 'applied';
              const isOverridden = art.status === 'overridden';

              return (
                <div
                  key={art.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                    isApplied
                      ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                      : isOverridden
                        ? 'border-amber-400 bg-amber-50/20'
                        : 'border-slate-200 opacity-65'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Scale
                        className={`w-4 h-4 ${
                          isApplied
                            ? 'text-emerald-600'
                            : isOverridden
                              ? 'text-amber-600'
                              : 'text-slate-400'
                        }`}
                      />
                      <h4 className="text-sm font-bold text-slate-900">
                        {art.articleTitle}
                      </h4>
                    </div>

                    {isApplied && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Appliqué
                      </span>
                    )}
                    {isOverridden && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Écrasé par exception
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 italic bg-slate-50 border-l-2 border-indigo-400 pl-3 py-2 rounded-r mb-3">
                    « {art.lawText} »
                  </p>

                  <pre className="bg-slate-900 text-slate-100 rounded-xl p-3.5 font-mono text-xs overflow-x-auto leading-relaxed">
                    {art.catalaCode}
                  </pre>

                  <div className="mt-3 text-xs text-slate-600 flex items-center justify-between">
                    <span>{art.resultSummary}</span>
                    {art.overriddenBy && (
                      <span className="font-semibold text-amber-800">
                        ↳ {art.overriddenBy}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
