export interface JevAtomicJudgment {
  id: string;
  question: string;
  catalaVar: string;
  probability: number; // 0.00 to 1.00
  excerptHighlighted: string; // Passage du texte qui justifie ce jugement
}

export interface ExactFact {
  id: string;
  label: string;
  catalaVar: string;
  valueDisplay: string;
  booleanEval: boolean;
}

export interface HybridCatalaRule {
  id: string;
  label: string;
  exceptionOf: string | null;
  articleTitle: string;
  lawSummary: string;
  requiredJudgments: Array<{
    catalaVar: string;
    expectedBool: boolean;
  }>;
  requiredFacts?: Array<{
    catalaVar: string;
    expectedBool: boolean;
  }>;
  decisionTitle: string;
  decisionPenalty: string;
  decisionColor: 'emerald' | 'amber' | 'rose' | 'indigo';
  catalaCode: string;
}

export interface HybridCaseStudy {
  id: string;
  title: string;
  domain: 'Droit Pénal' | 'Droit de la Consommation (Article TypeSafe)';
  badge: string;
  narrativeTitle: string;
  narrativeText: string;
  exactFacts: ExactFact[];
  jevJudgments: JevAtomicJudgment[];
  rules: HybridCatalaRule[];
}

export interface HybridEvaluationResult {
  winningRule: HybridCatalaRule | null;
  overriddenRules: HybridCatalaRule[];
  requiresHumanReview: boolean;
  uncertainDecisiveJudgments: JevAtomicJudgment[];
  ruleStatuses: Record<
    string,
    {
      status: 'selected' | 'overridden' | 'inactive';
      holds: boolean;
      hasLowConfidenceInput: boolean;
    }
  >;
}

export const CONFIDENCE_THRESHOLD_TRUE = 0.6;
export const UNCERTAINTY_ZONE_MIN = 0.35;
export const UNCERTAINTY_ZONE_MAX = 0.78;

export function evaluateHybridPipeline(
  judgments: JevAtomicJudgment[],
  facts: ExactFact[],
  rules: HybridCatalaRule[]
): HybridEvaluationResult {
  const jMap = new Map<string, JevAtomicJudgment>();
  judgments.forEach((j) => jMap.set(j.catalaVar, j));

  const fMap = new Map<string, ExactFact>();
  facts.forEach((f) => fMap.set(f.catalaVar, f));

  // Pour chaque règle, vérifier si ses conditions sont vraies (avec p >= 0.60 pour vrai, p < 0.40 pour faux)
  const ruleHoldsMap = new Map<string, boolean>();
  const ruleLowConfMap = new Map<string, JevAtomicJudgment[]>();

  for (const r of rules) {
    let holds = true;
    const lowConfList: JevAtomicJudgment[] = [];

    for (const reqJ of r.requiredJudgments) {
      const j = jMap.get(reqJ.catalaVar);
      if (!j) {
        holds = false;
        continue;
      }
      const isTrue = j.probability >= 0.5;
      const matches = reqJ.expectedBool ? isTrue : !isTrue;
      if (!matches) {
        holds = false;
      }
      // Est-ce que Jev est dans la zone d'incertitude (ex: p entre 0.35 et 0.78) ?
      if (
        j.probability >= UNCERTAINTY_ZONE_MIN &&
        j.probability <= UNCERTAINTY_ZONE_MAX
      ) {
        lowConfList.push(j);
      }
    }

    if (r.requiredFacts) {
      for (const reqF of r.requiredFacts) {
        const f = fMap.get(reqF.catalaVar);
        if (!f || f.booleanEval !== reqF.expectedBool) {
          holds = false;
        }
      }
    }

    ruleHoldsMap.set(r.id, holds);
    ruleLowConfMap.set(r.id, lowConfList);
  }

  // Résolution de l'arbre d'exceptions Catala (des feuilles les plus spécifiques vers la racine)
  const labelToRule = new Map<string, HybridCatalaRule>();
  rules.forEach((r) => labelToRule.set(r.label, r));

  function evalNode(rule: HybridCatalaRule): HybridCatalaRule | null {
    const children = rules.filter((c) => c.exceptionOf === rule.label);
    for (const child of children) {
      const childWinner = evalNode(child);
      if (childWinner) return childWinner;
    }
    return ruleHoldsMap.get(rule.id) ? rule : null;
  }

  const roots = rules.filter((r) => !r.exceptionOf);
  let winningRule: HybridCatalaRule | null = null;
  for (const root of roots) {
    const w = evalNode(root);
    if (w) {
      winningRule = w;
      break;
    }
  }

  // Quelles règles ont été écrasées par l'exception gagnante ?
  const overriddenIds = new Set<string>();
  if (winningRule) {
    let currParentLabel = winningRule.exceptionOf;
    while (currParentLabel) {
      const parentRule = labelToRule.get(currParentLabel);
      if (parentRule) {
        if (ruleHoldsMap.get(parentRule.id)) {
          overriddenIds.add(parentRule.id);
        }
        currParentLabel = parentRule.exceptionOf;
      } else {
        break;
      }
    }
  }

  // Vérification formelle de la confiance sur les jugements décisifs
  // Un jugement est décisif s'il intervient dans la règle gagnante ou dans une exception directe de la règle gagnante qui a failli s'activer
  const uncertainDecisiveMap = new Map<string, JevAtomicJudgment>();
  if (winningRule) {
    for (const j of ruleLowConfMap.get(winningRule.id) || []) {
      uncertainDecisiveMap.set(j.id, j);
    }
    // Vérifier aussi les exceptions directes qui ont un jugement incertain
    const directExceptions = rules.filter(
      (r) => r.exceptionOf === winningRule!.label
    );
    for (const exc of directExceptions) {
      for (const j of ruleLowConfMap.get(exc.id) || []) {
        uncertainDecisiveMap.set(j.id, j);
      }
    }
  }

  const uncertainDecisiveJudgments = Array.from(uncertainDecisiveMap.values());
  const requiresHumanReview = uncertainDecisiveJudgments.length > 0;

  const ruleStatuses: HybridEvaluationResult['ruleStatuses'] = {};
  for (const r of rules) {
    const holds = ruleHoldsMap.get(r.id) || false;
    const isWinner = winningRule?.id === r.id;
    const isOverridden = overriddenIds.has(r.id);
    ruleStatuses[r.id] = {
      status: isWinner ? 'selected' : isOverridden ? 'overridden' : 'inactive',
      holds,
      hasLowConfidenceInput: (ruleLowConfMap.get(r.id) || []).length > 0,
    };
  }

  return {
    winningRule,
    overriddenRules: rules.filter((r) => overriddenIds.has(r.id)),
    requiresHumanReview,
    uncertainDecisiveJudgments,
    ruleStatuses,
  };
}

export const HYBRID_CASE_STUDIES: HybridCaseStudy[] = [
  {
    id: 'penal-etat-necessite',
    title: 'Cas 1 : Code Pénal — Vol par état de nécessité (Art. 311-3 & 122-7)',
    domain: 'Droit Pénal',
    badge: 'Exception pénale',
    narrativeTitle: 'Procès-verbal d’audition n° 2026-841',
    narrativeText:
      '« Le 14 novembre à 19h10, Mme M., sans ressources depuis la coupure de son allocation et isolée avec son nourrisson de 5 mois fiévreux, a pris deux boîtes de lait infantile et un antipyrétique (valeur totale : 34,50 €) dans la pharmacie sans passer en caisse. Aucune dégradation ni menace n’a été commise envers le personnel. »',
    exactFacts: [
      {
        id: 'f1',
        label: 'Valeur des biens soustraits',
        catalaVar: 'montant_faible',
        valueDisplay: '34,50 € (Biens vitaux)',
        booleanEval: true,
      },
      {
        id: 'f2',
        label: 'Âge de l’enfant menacé',
        catalaVar: 'nourrisson_a_charge',
        valueDisplay: '5 mois',
        booleanEval: true,
      },
    ],
    jevJudgments: [
      {
        id: 'j1',
        question: 'Y a-t-il soustraction d’un bien appartenant à autrui ?',
        catalaVar: 'soustraction_bien',
        probability: 0.99,
        excerptHighlighted: 'a pris deux boîtes de lait infantile (...) sans passer en caisse',
      },
      {
        id: 'j2',
        question: 'Y a-t-il eu violence physique ou menace ?',
        catalaVar: 'violence_physique',
        probability: 0.02,
        excerptHighlighted: 'Aucune dégradation ni menace n’a été commise',
      },
      {
        id: 'j3',
        question: 'Existe-t-il un danger actuel ou imminent pour la personne ou autrui ?',
        catalaVar: 'danger_actuel_imminent',
        probability: 0.94,
        excerptHighlighted: 'isolée avec son nourrisson de 5 mois fiévreux',
      },
      {
        id: 'j4',
        question: 'L’acte était-il strictement proportionné à la sauvegarde de l’enfant ?',
        catalaVar: 'acte_proportionne',
        probability: 0.91,
        excerptHighlighted: 'deux boîtes de lait infantile et un antipyrétique (34,50 €)',
      },
    ],
    rules: [
      {
        id: 'p-base',
        label: 'defaut_relax',
        exceptionOf: null,
        articleTitle: 'Principe de base — Absence d’infraction',
        lawSummary: 'À défaut d’éléments constitutifs, aucune infraction n’est retenue.',
        requiredJudgments: [],
        decisionTitle: 'Aucune poursuite',
        decisionPenalty: '0 € d’amende • 0 an de prison',
        decisionColor: 'emerald',
        catalaCode: `étiquette defaut_relax
définition qualification égal à AucuneInfraction`,
      },
      {
        id: 'p-vol-simple',
        label: 'vol_simple',
        exceptionOf: 'defaut_relax',
        articleTitle: 'Art. 311-1 & 311-3 Code pénal — Règle générale du Vol',
        lawSummary:
          'La soustraction frauduleuse de la chose d’autrui constitue un vol simple.',
        requiredJudgments: [{ catalaVar: 'soustraction_bien', expectedBool: true }],
        decisionTitle: 'Vol simple caractérisé (Art. 311-3)',
        decisionPenalty: 'Jusqu’à 3 ans d’emprisonnement et 45 000 € d’amende',
        decisionColor: 'amber',
        catalaCode: `étiquette vol_simple exception defaut_relax
définition qualification
sous condition jugement.soustraction_bien
conséquence égal à VolSimple`,
      },
      {
        id: 'p-vol-aggrave',
        label: 'vol_aggravé',
        exceptionOf: 'vol_simple',
        articleTitle: 'Art. 311-4 Code pénal — Exception : Vol avec violence',
        lawSummary:
          'Par exception au vol simple, la peine est aggravée lorsque le vol est accompagné de violences.',
        requiredJudgments: [
          { catalaVar: 'soustraction_bien', expectedBool: true },
          { catalaVar: 'violence_physique', expectedBool: true },
        ],
        decisionTitle: 'Vol aggravé par violences (Art. 311-4)',
        decisionPenalty: 'Jusqu’à 5 ans d’emprisonnement et 75 000 € d’amende',
        decisionColor: 'rose',
        catalaCode: `étiquette vol_aggravé exception vol_simple
définition qualification
sous condition
  jugement.soustraction_bien et jugement.violence_physique
conséquence égal à VolAggravé`,
      },
      {
        id: 'p-necessite',
        label: 'état_de_nécessité',
        exceptionOf: 'vol_simple',
        articleTitle: 'Art. 122-7 Code pénal — Exception : État de nécessité',
        lawSummary:
          'N’est pas pénalement responsable la personne qui, face à un danger actuel ou imminent, accomplit un acte nécessaire et proportionné.',
        requiredJudgments: [
          { catalaVar: 'soustraction_bien', expectedBool: true },
          { catalaVar: 'violence_physique', expectedBool: false },
          { catalaVar: 'danger_actuel_imminent', expectedBool: true },
          { catalaVar: 'acte_proportionne', expectedBool: true },
        ],
        decisionTitle: 'Irresponsabilité pénale — État de nécessité (Art. 122-7)',
        decisionPenalty: 'Classement sans suite / Relaxe (0 peine)',
        decisionColor: 'emerald',
        catalaCode: `étiquette état_de_nécessité exception vol_simple
définition qualification
sous condition
  non jugement.violence_physique et
  jugement.danger_actuel_imminent et
  jugement.acte_proportionne
conséquence égal à IrresponsabilitéÉtatDeNécessité`,
      },
    ],
  },
  {
    id: 'penal-incertitude-jev',
    title: 'Cas 2 : Dossier ambigu (p = 0.54 ⚠️) → Escalade Humaine Garantie',
    domain: 'Droit Pénal',
    badge: 'Sécurité p < seuil',
    narrativeTitle: 'Procès-verbal d’intervention n° 2026-912 (Cas limite)',
    narrativeText:
      '« M. D. a fracturé la vitrine d’un magasin d’alimentation de nuit et emporté pour 180 € de conserves et un appareil électronique. Il déclare avoir agi par détresse financière suite à une perte d’emploi il y a deux mois. Le gérant indique que M. D. l’a bousculé en prenant la fuite. »',
    exactFacts: [
      {
        id: 'f1',
        label: 'Montant emporté',
        catalaVar: 'montant_faible',
        valueDisplay: '180,00 € (Alimentaire + Électronique)',
        booleanEval: false,
      },
    ],
    jevJudgments: [
      {
        id: 'j1',
        question: 'Y a-t-il soustraction d’un bien appartenant à autrui ?',
        catalaVar: 'soustraction_bien',
        probability: 0.99,
        excerptHighlighted: 'emporté pour 180 € de conserves et un appareil',
      },
      {
        id: 'j2',
        question: 'Y a-t-il eu violence physique volontaire sur le gérant ?',
        catalaVar: 'violence_physique',
        probability: 0.54,
        excerptHighlighted: 'Le gérant indique que M. D. l’a bousculé en prenant la fuite',
      },
      {
        id: 'j3',
        question: 'Existe-t-il un danger vital actuel ou imminent ?',
        catalaVar: 'danger_actuel_imminent',
        probability: 0.28,
        excerptHighlighted: 'perte d’emploi il y a deux mois',
      },
      {
        id: 'j4',
        question: 'L’acte était-il strictement proportionné ?',
        catalaVar: 'acte_proportionne',
        probability: 0.12,
        excerptHighlighted: 'fracturé la vitrine (...) et un appareil électronique',
      },
    ],
    rules: [
      {
        id: 'p-base',
        label: 'defaut_relax',
        exceptionOf: null,
        articleTitle: 'Principe de base — Absence d’infraction',
        lawSummary: 'À défaut d’éléments constitutifs, aucune infraction n’est retenue.',
        requiredJudgments: [],
        decisionTitle: 'Aucune poursuite',
        decisionPenalty: '0 €',
        decisionColor: 'emerald',
        catalaCode: `étiquette defaut_relax
définition qualification égal à AucuneInfraction`,
      },
      {
        id: 'p-vol-simple',
        label: 'vol_simple',
        exceptionOf: 'defaut_relax',
        articleTitle: 'Art. 311-1 & 311-3 Code pénal — Règle générale du Vol',
        lawSummary:
          'La soustraction frauduleuse de la chose d’autrui constitue un vol simple.',
        requiredJudgments: [{ catalaVar: 'soustraction_bien', expectedBool: true }],
        decisionTitle: 'Vol simple (Art. 311-3)',
        decisionPenalty: 'Jusqu’à 3 ans d’emprisonnement et 45 000 € d’amende',
        decisionColor: 'amber',
        catalaCode: `étiquette vol_simple exception defaut_relax
définition qualification
sous condition jugement.soustraction_bien
conséquence égal à VolSimple`,
      },
      {
        id: 'p-vol-aggrave',
        label: 'vol_aggravé',
        exceptionOf: 'vol_simple',
        articleTitle: 'Art. 311-4 Code pénal — Exception : Vol avec violence',
        lawSummary:
          'La peine est aggravée lorsque le vol est accompagné ou suivi de violences sur autrui.',
        requiredJudgments: [
          { catalaVar: 'soustraction_bien', expectedBool: true },
          { catalaVar: 'violence_physique', expectedBool: true },
        ],
        decisionTitle: 'Vol aggravé par violences (Art. 311-4)',
        decisionPenalty: 'Jusqu’à 5 ans d’emprisonnement et 75 000 € d’amende',
        decisionColor: 'rose',
        catalaCode: `étiquette vol_aggravé exception vol_simple
définition qualification
sous condition
  jugement.soustraction_bien et jugement.violence_physique
conséquence égal à VolAggravé`,
      },
      {
        id: 'p-necessite',
        label: 'état_de_nécessité',
        exceptionOf: 'vol_simple',
        articleTitle: 'Art. 122-7 Code pénal — Exception : État de nécessité',
        lawSummary:
          'Exonération si danger actuel ou imminent et acte strictement proportionné.',
        requiredJudgments: [
          { catalaVar: 'soustraction_bien', expectedBool: true },
          { catalaVar: 'violence_physique', expectedBool: false },
          { catalaVar: 'danger_actuel_imminent', expectedBool: true },
          { catalaVar: 'acte_proportionne', expectedBool: true },
        ],
        decisionTitle: 'Irresponsabilité pénale — État de nécessité (Art. 122-7)',
        decisionPenalty: 'Classement sans suite',
        decisionColor: 'emerald',
        catalaCode: `étiquette état_de_nécessité exception vol_simple
définition qualification
sous condition
  non jugement.violence_physique et
  jugement.danger_actuel_imminent et
  jugement.acte_proportionne
conséquence égal à IrresponsabilitéÉtatDeNécessité`,
      },
    ],
  },
  {
    id: 'typesafe-tucson-card',
    title: 'Cas 3 : L’exemple exact de ton article TypeSafe (Tucson Hardware $240)',
    domain: 'Droit de la Consommation (Article TypeSafe)',
    badge: 'Article TypeSafe Fig. 2',
    narrativeTitle: 'Message Client & Registre Bancaire (Tucson Hardware Supply)',
    narrativeText:
      '« Bonjour, je ne dis pas qu’on m’a volé ma carte, mais il y a un débit de 240 $ dans un magasin de bricolage à Tucson le 14 août alors que je n’ai jamais mis les pieds en Arizona. Pouvez-vous me rembourser cette somme ? »',
    exactFacts: [
      {
        id: 'tf1',
        label: 'Montant ≤ 25 $ (Remboursement auto)',
        catalaVar: 'amount_le_25',
        valueDisplay: '240,00 $ (> 25 $ → faux)',
        booleanEval: false,
      },
      {
        id: 'tf2',
        label: 'Demande de remboursement éligible',
        catalaVar: 'claim_eligible',
        valueDisplay: 'Aucune réclamation ouverte (faux)',
        booleanEval: false,
      },
    ],
    jevJudgments: [
      {
        id: 'tj1',
        question: 'Le client demande-t-il à récupérer son argent (wants money back) ?',
        catalaVar: 'wants_money_back',
        probability: 0.99,
        excerptHighlighted: 'Pouvez-vous me rembourser cette somme ?',
      },
      {
        id: 'tj2',
        question: 'Signale-t-il un débit non autorisé / fraude (unauthorized charge) ?',
        catalaVar: 'unauthorized_charge',
        probability: 0.94,
        excerptHighlighted: 'un débit de 240 $ à Tucson (...) jamais mis les pieds en Arizona',
      },
      {
        id: 'tj3',
        question: 'Menace-t-il d’une action en justice ou demande-t-il un humain ?',
        catalaVar: 'legal_threat_or_human',
        probability: 0.02,
        excerptHighlighted: 'je ne dis pas qu’on m’a volé ma carte',
      },
    ],
    rules: [
      {
        id: 'ts-base',
        label: 'answer_continue',
        exceptionOf: null,
        articleTitle: 'Règle par défaut — Répondre & continuer',
        lawSummary: 'Par défaut, répondre à la question du client sans action sur le compte.',
        requiredJudgments: [],
        decisionTitle: 'Answer & continue',
        decisionPenalty: 'Aucune action sur le compte',
        decisionColor: 'indigo',
        catalaCode: `étiquette answer_continue
définition décision égal à RépondreEtContinuer`,
      },
      {
        id: 'ts-refund-review',
        label: 'refunds_team_review',
        exceptionOf: 'answer_continue',
        articleTitle: 'Règle Remboursement — Examen par l’équipe Remboursements',
        lawSummary:
          'Si le client demande un remboursement',
        requiredJudgments: [{ catalaVar: 'wants_money_back', expectedBool: true }],
        decisionTitle: 'Refunds team reviews (Demande de remboursement)',
        decisionPenalty: 'Routage vers le service commercial',
        decisionColor: 'amber',
        catalaCode: `étiquette refunds_team_review exception answer_continue
définition décision
sous condition jugement.wants_money_back
conséquence égal à ÉquipeRemboursement`,
      },
      {
        id: 'ts-fraud',
        label: 'fraud_team_freeze',
        exceptionOf: 'refunds_team_review',
        articleTitle: 'Art. L133-18 Code monétaire (Priorité Fraude) — Gel & Contestation',
        lawSummary:
          'Par exception prioritaire à toute demande commerciale, tout signalement d’opération non autorisée impose le gel immédiat de la carte et la saisine de l’équipe Fraude.',
        requiredJudgments: [{ catalaVar: 'unauthorized_charge', expectedBool: true }],
        decisionTitle: 'Fraud team: freeze & dispute (Priorité Fraude)',
        decisionPenalty: 'Blocage immédiat de la carte & procédure de rétrofacturation',
        decisionColor: 'rose',
        catalaCode: `étiquette fraud_team_freeze exception refunds_team_review
définition décision
sous condition jugement.unauthorized_charge
conséquence égal à ÉquipeFraudeGelCarte`,
      },
    ],
  },
];
