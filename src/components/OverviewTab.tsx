import React, { useState } from 'react';
import {
  BookOpen,
  Scale,
  GitBranch,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  Cpu,
} from 'lucide-react';

interface OverviewProps {
  onNavigate: (tab: 'overview' | 'hybrid' | 'simulator' | 'verifier') => void;
}

interface TokenExplanation {
  id: string;
  keyword: string;
  title: string;
  simpleMeaning: string;
  whyItMatters: string;
}

const TOKEN_EXPLANATIONS: TokenExplanation[] = [
  {
    id: 'champ',
    keyword: "champ d'application CalculAllocations:",
    title: '1. Le Champ d’application (`scope`)',
    simpleMeaning:
      'Définit dans quel chapitre ou mécanisme de la loi on se trouve (ex. Calcul des allocations familiales, Calcul de l’impôt).',
    whyItMatters:
      'Permet de découper un code juridique géant en boîtes autonomes et vérifiables.',
  },
  {
    id: 'etiquette',
    keyword: '  étiquette règle_de_base',
    title: '2. L’Étiquette (`label`)',
    simpleMeaning:
      'Donne un nom à l’alinéa de la loi pour que d’autres articles puissent s’y référer plus loin.',
    whyItMatters:
      'C’est grâce à cette étiquette qu’un article situé 20 pages plus loin pourra dire : « Par exception à règle_de_base... ».',
  },
  {
    id: 'exception',
    keyword: '  exception règle_de_base',
    title: '3. L’Exception (`exception`)',
    simpleMeaning:
      'Indique que cet article est prioritaire sur la règle de base lorsque sa condition est remplie.',
    whyItMatters:
      'Évite d’écrire d’immenses `if / else if / else`. On ajoute un nouvel article sans jamais modifier l’ancien !',
  },
  {
    id: 'definition',
    keyword: '  définition taux_imposition',
    title: '4. La Définition (`definition`)',
    simpleMeaning:
      'Annonce quelle valeur juridique ou quel montant cet alinéa est en train de calculer.',
    whyItMatters:
      'Une même valeur peut être définie plusieurs fois dans la loi (une fois pour le cas général, et une fois par exception).',
  },
  {
    id: 'condition',
    keyword: '  sous condition ménage.nombre_enfants >= 3',
    title: '5. La Condition (`under condition`)',
    simpleMeaning:
      'Traduit le « Si... » juridique de manière lisible par un juriste comme par un ordinateur.',
    whyItMatters:
      'Le compilateur Catala vérifie mathématiquement que deux conditions d’exception ne se chevauchent jamais par erreur.',
  },
  {
    id: 'consequence',
    keyword: '  conséquence égal à 10 %',
    title: '6. La Conséquence (`consequence equals`)',
    simpleMeaning:
      'Donne le résultat qui s’applique lorsque la condition juste au-dessus est vraie.',
    whyItMatters:
      'Chaque résultat calculé pour un citoyen garde la trace exacte de l’article qui l’a produit.',
  },
];

export const OverviewTab: React.FC<OverviewProps> = ({ onNavigate }) => {
  const [selectedToken, setSelectedToken] = useState<TokenExplanation>(
    TOKEN_EXPLANATIONS[2]
  );

  return (
    <div className="space-y-10 pb-8">
      {/* Bannière d'introduction claire et aérée */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Introduction à Catala (Inria)
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Qu’est-ce que Catala, expliqué simplement ?
          </h2>
          <p className="text-base text-slate-600 mt-3 leading-relaxed">
            <strong>Catala</strong> est un langage de programmation créé par des chercheurs en informatique (Inria) et des juristes (Panthéon-Sorbonne) pour résoudre un problème majeur :{' '}
            <span className="text-slate-900 font-semibold">
              traduire les textes de loi en logiciels sans jamais trahir la loi.
            </span>
          </p>
        </div>

        {/* Comparaison Avant / Avec Catala en 2 cartes très simples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-2">
              <XCircle className="w-4 h-4" />
              Le problème des logiciels classiques (et des LLM seuls)
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>
                • <strong>Le téléphone arabe :</strong> Les députés écrivent la loi en français, et des développeurs essaient de la recoder en `if / else` dans leur coin.
              </li>
              <li>
                • <strong>Les réformes cassent tout :</strong> Au bout de 10 ans de réformes, plus personne ne sait quelle ligne de code correspond à quel article de loi.
              </li>
              <li>
                • <strong>La boîte noire :</strong> Impossible d’avoir une garantie à 100 % que le résultat est conforme à la loi.
              </li>
            </ul>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
              <CheckCircle2 className="w-4 h-4" />
              La solution Catala : la programmation formelle du droit
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>
                • <strong>Le code vit dans la loi :</strong> On écrit quelques lignes de Catala juste en dessous de chaque phrase officielle de la loi.
              </li>
              <li>
                • <strong>Lisible par les juristes :</strong> Le code s’écrit en français et suit la logique naturelle du droit (règle de base + exceptions).
              </li>
              <li>
                • <strong>Certifié par les mathématiques :</strong> Le compilateur prouve qu’il n’y a ni contradiction ni vide juridique avant de générer du code Python, C ou Java.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section interactive : Anatomie d'un bloc Catala (Clique sur une ligne pour comprendre) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900">
            Comment lit-on du code Catala ? (Clique sur une ligne de code)
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Voici un article de loi et sa traduction en Catala. Clique sur n’importe quelle ligne à gauche pour voir son explication à droite.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Bloc de code interactif (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 rounded-xl p-5 text-slate-100 flex flex-col justify-between">
            <div className="mb-4 pb-3 border-b border-slate-800">
              <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                Texte de loi (Français)
              </div>
              <p className="text-sm text-slate-200 italic">
                « Par dérogation à l’article 1, si le ménage a 3 enfants ou plus, le taux est réduit à 10 %. »
              </p>
            </div>

            <div className="space-y-1.5 font-mono text-sm">
              <div className="text-xs text-slate-400 mb-2">
                Traduction juste en dessous (Code Catala) :
              </div>
              {TOKEN_EXPLANATIONS.map((item) => {
                const isSelected = selectedToken.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedToken(item)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.keyword}</span>
                    <span className="text-[11px] opacity-75 font-sans">
                      {isSelected ? 'Sélectionné →' : 'Cliquer'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explication de la ligne sélectionnée (5 cols) */}
          <div className="lg:col-span-5 bg-indigo-50/70 border border-indigo-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md">
                Explication de la ligne
              </span>
              <h4 className="text-lg font-bold text-slate-900 mt-3">
                {selectedToken.title}
              </h4>
              <div className="mt-2 font-mono text-xs bg-white border border-indigo-200 text-indigo-900 px-3 py-2 rounded-lg">
                {selectedToken.keyword.trim()}
              </div>
              <p className="text-sm text-slate-700 mt-4 leading-relaxed">
                <strong>En français simple :</strong> {selectedToken.simpleMeaning}
              </p>
              <div className="mt-4 pt-4 border-t border-indigo-200/80 text-sm text-slate-700 leading-relaxed">
                <strong>Pourquoi c’est génial :</strong> {selectedToken.whyItMatters}
              </div>
            </div>

            <div className="mt-6 text-xs text-indigo-800 font-medium">
              💡 Aucun symbole cabalistique : un juriste et un développeur lisent exactement le même document.
            </div>
          </div>
        </div>
      </section>

      {/* Les 3 ateliers de l'application */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-slate-900">
          Explore les 3 démonstrateurs interactifs
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Carte Atelier 1 : Hybride Jev + Catala */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Nouveau • Neuro-Symbolique
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-1">
                1. Hybride IA « Jev » (Système 1) + Catala (Système 2)
              </h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Comment étendre Catala au Droit Pénal et aux litiges : un modèle « Système 1 » répond à des questions fermées avec une probabilité $p$, et Catala prend la décision juridique formelle.
              </p>
            </div>
            <button
              onClick={() => onNavigate('hybrid')}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Ouvrir le pipeline Système 1 + 2
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Carte Atelier 2 : Simulateur Allocations Familiales */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Code de la sécurité sociale
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-1">
                2. Simulateur des Allocations Familiales
              </h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Teste les vrais articles L521-1 et L521-3 sur un foyer : vois en direct quelle règle générale s’active et quand une exception prend le dessus.
              </p>
            </div>
            <button
              onClick={() => onNavigate('simulator')}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Tester le simulateur
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Carte Atelier 3 : Prouveur Formel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Vérification mathématique
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-1">
                3. Détecteur de Bugs Législatifs (`catala proof`)
              </h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Observe comment Catala repère automatiquement deux articles qui se contredisent ou un seuil oublié dans la loi, et corrige-les en un clic.
              </p>
            </div>
            <button
              onClick={() => onNavigate('verifier')}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Explorer les bugs de la loi
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
