export interface FoyerTest {
  revenu: number;
  nbEnfants: number;
  estEtudiant: boolean;
  estProfesseur: boolean;
}

export type ConditionField = 'toujours_vrai' | 'revenu' | 'nbEnfants' | 'estEtudiant' | 'estProfesseur';
export type ComparisonOp = '<' | '<=' | '=' | '>=' | '>' | 'est_vrai';

export interface AtomicCondition {
  field: ConditionField;
  op: ComparisonOp;
  value: number;
}

export interface CatalaRuleNode {
  id: string;
  label: string; // étiquette Catala
  exceptionOf: string | null; // étiquette parente (null = racine)
  articleTitle: string;
  lawText: string;
  conditions: AtomicCondition[]; // conjonction (ET)
  consequenceValue: number; // ex: taux en % ou montant en €
  unit: '%' | '€';
  enabled: boolean;
}

export interface RuleEvalNodeResult {
  rule: CatalaRuleNode;
  conditionHolds: boolean;
  childrenResults: RuleEvalNodeResult[];
  status: 'selected' | 'overridden' | 'conflict' | 'inactive';
  winningRuleId?: string;
}

export interface DefaultLogicEvalResult {
  outcome: 'success' | 'conflict' | 'empty';
  value?: number;
  winningRule?: CatalaRuleNode;
  overriddenRules: CatalaRuleNode[];
  conflictingRules?: [CatalaRuleNode, CatalaRuleNode];
  treeEval: RuleEvalNodeResult[];
}

export interface ProofViolation {
  type: 'conflict' | 'empty';
  counterexample: FoyerTest;
  description: string;
  conflictingRules?: [CatalaRuleNode, CatalaRuleNode];
  fixSuggestion: string;
}

export interface ProofReport {
  isVerified: boolean;
  statesChecked: number;
  noConflictPassed: boolean;
  completenessPassed: boolean;
  violations: ProofViolation[];
  asciiExceptionTree: string;
}

export function evalAtomicCondition(cond: AtomicCondition, foyer: FoyerTest): boolean {
  if (cond.field === 'toujours_vrai') return true;
  if (cond.field === 'estEtudiant') return foyer.estEtudiant;
  if (cond.field === 'estProfesseur') return foyer.estProfesseur;

  const actual = cond.field === 'revenu' ? foyer.revenu : foyer.nbEnfants;
  switch (cond.op) {
    case '<':
      return actual < cond.value;
    case '<=':
      return actual <= cond.value;
    case '=':
      return actual === cond.value;
    case '>=':
      return actual >= cond.value;
    case '>':
      return actual > cond.value;
    default:
      return false;
  }
}

export function evalRuleConditions(rule: CatalaRuleNode, foyer: FoyerTest): boolean {
  return rule.conditions.every((c) => evalAtomicCondition(c, foyer));
}

export function formatCatalaCondition(cond: AtomicCondition): string {
  if (cond.field === 'toujours_vrai') return 'vrai';
  if (cond.field === 'estEtudiant') return 'individu.est_étudiant';
  if (cond.field === 'estProfesseur') return 'individu.est_professeur';
  const fieldName = cond.field === 'revenu' ? 'ménage.revenu' : 'ménage.nombre_enfants';
  const valStr =
    cond.field === 'revenu'
      ? `${cond.value.toLocaleString('fr-FR')} €`
      : `${cond.value}`;
  return `${fieldName} ${cond.op} ${valStr}`;
}

export function generateCatalaSnippet(rule: CatalaRuleNode, varName: string): string {
  const header = rule.exceptionOf
    ? `  étiquette ${rule.label} exception ${rule.exceptionOf}`
    : `  étiquette ${rule.label}`;
  const isUnconditional =
    rule.conditions.length === 0 ||
    (rule.conditions.length === 1 && rule.conditions[0].field === 'toujours_vrai');

  if (isUnconditional) {
    return `${header}\n  définition ${varName} égal à ${rule.consequenceValue} ${rule.unit}`;
  }

  const condStr = rule.conditions.map(formatCatalaCondition).join(' et ');
  return `${header}\n  définition ${varName}\n  sous condition ${condStr}\n  conséquence égal à ${rule.consequenceValue} ${rule.unit}`;
}

// Évaluation récursive d'un arbre d'exceptions selon la sémantique formelle de Catala (Default Calculus)
export function evaluateDefaultLogic(
  allRules: CatalaRuleNode[],
  foyer: FoyerTest
): DefaultLogicEvalResult {
  const activeRules = allRules.filter((r) => r.enabled);
  const labelSet = new Set(activeRules.map((r) => r.label));

  // Racines : règles sans exceptionOf (ou dont le parent est désactivé)
  const roots = activeRules.filter(
    (r) => !r.exceptionOf || !labelSet.has(r.exceptionOf)
  );

  const overriddenRules: CatalaRuleNode[] = [];
  let detectedConflict: [CatalaRuleNode, CatalaRuleNode] | undefined;

  function evalSubtree(node: CatalaRuleNode): {
    evalNode: RuleEvalNodeResult;
    applicableWinner?: CatalaRuleNode;
  } {
    const children = activeRules.filter((r) => r.exceptionOf === node.label);
    const childEvaluations = children.map((c) => evalSubtree(c));
    const childrenWinners = childEvaluations
      .map((ce) => ce.applicableWinner)
      .filter((w): w is CatalaRuleNode => w !== undefined);

    const selfHolds = evalRuleConditions(node, foyer);

    // En logique par défaut Catala :
    // 1. On regarde d'abord si des exceptions directes (ou leurs sous-exceptions) s'appliquent
    if (childrenWinners.length > 1) {
      // Conflit entre deux exceptions de même niveau si elles donnent des résultats différents (ou même en général dans Catala strict)
      if (!detectedConflict) {
        detectedConflict = [childrenWinners[0], childrenWinners[1]];
      }
      return {
        evalNode: {
          rule: node,
          conditionHolds: selfHolds,
          childrenResults: childEvaluations.map((c) => c.evalNode),
          status: 'conflict',
        },
        applicableWinner: childrenWinners[0],
      };
    }

    if (childrenWinners.length === 1) {
      const winner = childrenWinners[0];
      if (selfHolds) {
        overriddenRules.push(node);
      }
      return {
        evalNode: {
          rule: node,
          conditionHolds: selfHolds,
          childrenResults: childEvaluations.map((c) => c.evalNode),
          status: selfHolds ? 'overridden' : 'inactive',
          winningRuleId: winner.id,
        },
        applicableWinner: winner,
      };
    }

    // Aucune exception ne s'applique : on regarde si le nœud courant s'applique
    if (selfHolds) {
      return {
        evalNode: {
          rule: node,
          conditionHolds: true,
          childrenResults: childEvaluations.map((c) => c.evalNode),
          status: 'selected',
          winningRuleId: node.id,
        },
        applicableWinner: node,
      };
    }

    return {
      evalNode: {
        rule: node,
        conditionHolds: false,
        childrenResults: childEvaluations.map((c) => c.evalNode),
        status: 'inactive',
      },
      applicableWinner: undefined,
    };
  }

  const rootEvaluations = roots.map((r) => evalSubtree(r));
  const rootWinners = rootEvaluations
    .map((re) => re.applicableWinner)
    .filter((w): w is CatalaRuleNode => w !== undefined);

  if (!detectedConflict && rootWinners.length > 1) {
    detectedConflict = [rootWinners[0], rootWinners[1]];
  }

  if (detectedConflict) {
    return {
      outcome: 'conflict',
      conflictingRules: detectedConflict,
      overriddenRules,
      treeEval: rootEvaluations.map((r) => r.evalNode),
    };
  }

  if (rootWinners.length === 1) {
    return {
      outcome: 'success',
      value: rootWinners[0].consequenceValue,
      winningRule: rootWinners[0],
      overriddenRules,
      treeEval: rootEvaluations.map((r) => r.evalNode),
    };
  }

  return {
    outcome: 'empty',
    overriddenRules: [],
    treeEval: rootEvaluations.map((r) => r.evalNode),
  };
}

// Génère l'arbre ASCII identique à la commande `$ catala Exceptions -s Test -v x`
export function buildAsciiExceptionTree(allRules: CatalaRuleNode[]): string {
  const activeRules = allRules.filter((r) => r.enabled);
  const labelSet = new Set(activeRules.map((r) => r.label));
  const roots = activeRules.filter(
    (r) => !r.exceptionOf || !labelSet.has(r.exceptionOf)
  );

  const lines: string[] = [];

  function renderNode(node: CatalaRuleNode, prefix: string, isLast: boolean, isRoot: boolean) {
    const condText =
      node.conditions.length === 0 ||
      (node.conditions.length === 1 && node.conditions[0].field === 'toujours_vrai')
        ? 'vrai (par défaut)'
        : node.conditions.map(formatCatalaCondition).join(' && ');

    if (isRoot) {
      lines.push(`"${node.label}"  → ${node.consequenceValue} ${node.unit}`);
      lines.push(`│ [${condText}]`);
    } else {
      const connector = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${connector}"${node.label}"  → ${node.consequenceValue} ${node.unit}`);
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      lines.push(`${childPrefix}[${condText}]`);
    }

    const children = activeRules.filter((r) => r.exceptionOf === node.label);
    children.forEach((child, idx) => {
      const lastChild = idx === children.length - 1;
      const nextPrefix = isRoot ? '' : prefix + (isLast ? '    ' : '│   ');
      renderNode(child, nextPrefix, lastChild, false);
    });
  }

  roots.forEach((root, idx) => {
    if (idx > 0) lines.push('');
    renderNode(root, '', idx === roots.length - 1, true);
  });

  return lines.join('\n');
}

// Vérificateur formel (simule `catala proof`) en explorant exhaustivement les valeurs critiques et combinaisons
export function runFormalProof(allRules: CatalaRuleNode[]): ProofReport {
  const activeRules = allRules.filter((r) => r.enabled);

  // Extraction dynamique des seuils numériques présents dans les règles + valeurs par défaut
  const revenusCritiques = new Set<number>([0, 8000, 10000, 15000, 50000, 100000, 150000, 200000, 250000]);
  const enfantsCritiques = new Set<number>([0, 1, 2, 3, 4]);

  for (const r of activeRules) {
    for (const c of r.conditions) {
      if (c.field === 'revenu') {
        revenusCritiques.add(Math.max(0, c.value - 1000));
        revenusCritiques.add(c.value);
        revenusCritiques.add(c.value + 1000);
      } else if (c.field === 'nbEnfants') {
        enfantsCritiques.add(Math.max(0, c.value - 1));
        enfantsCritiques.add(c.value);
        enfantsCritiques.add(c.value + 1);
      }
    }
  }

  const boolPairs: Array<[boolean, boolean]> = [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ];

  let statesChecked = 0;
  let firstConflict: ProofViolation | null = null;
  let firstEmpty: ProofViolation | null = null;

  for (const rev of Array.from(revenusCritiques).sort((a, b) => a - b)) {
    for (const enf of Array.from(enfantsCritiques).sort((a, b) => a - b)) {
      for (const [estEtudiant, estProfesseur] of boolPairs) {
        statesChecked++;
        const foyer: FoyerTest = {
          revenu: rev,
          nbEnfants: enf,
          estEtudiant,
          estProfesseur,
        };
        const res = evaluateDefaultLogic(allRules, foyer);

        if (res.outcome === 'conflict' && !firstConflict && res.conflictingRules) {
          const [r1, r2] = res.conflictingRules;
          firstConflict = {
            type: 'conflict',
            counterexample: foyer,
            conflictingRules: [r1, r2],
            description: `Conflit d'exceptions entre "${r1.label}" (${r1.consequenceValue} ${r1.unit}) et "${r2.label}" (${r2.consequenceValue} ${r2.unit}) : les deux règles s'appliquent simultanément sans priorité définie entre elles.`,
            fixSuggestion: `Définir une priorité explicite en faisant de "${r2.label}" une exception de "${r1.label}" (ou inversement) grâce au mot-clé Catala : exception ${r1.label}.`,
          };
        }

        if (res.outcome === 'empty' && !firstEmpty) {
          firstEmpty = {
            type: 'empty',
            counterexample: foyer,
            description: `Vide juridique (EmptyError) : aucune règle ni valeur par défaut ne couvre ce cas précis !`,
            fixSuggestion: `Ajouter une définition par défaut sans condition (ou élargir l'inégalité stricte < / > en <= / >=) pour couvrir toutes les valeurs possibles.`,
          };
        }
      }
    }
  }

  const violations: ProofViolation[] = [];
  if (firstConflict) violations.push(firstConflict);
  if (firstEmpty) violations.push(firstEmpty);

  return {
    isVerified: violations.length === 0,
    statesChecked,
    noConflictPassed: !firstConflict,
    completenessPassed: !firstEmpty,
    violations,
    asciiExceptionTree: buildAsciiExceptionTree(allRules),
  };
}

// Jeux de lois réels / officiels du dépôt Catala pour l'atelier de preuve formelle
export interface PresetLawScenario {
  id: string;
  title: string;
  subtitle: string;
  sourceFile: string;
  variableName: string;
  description: string;
  defaultFoyer: FoyerTest;
  rules: CatalaRuleNode[];
  fixedRules: CatalaRuleNode[];
}

export const PRESET_LAW_SCENARIOS: PresetLawScenario[] = [
  {
    id: 'amendement-conflit-famille-revenu',
    title: 'Scénario 1 : Conflit entre 2 amendements fiscaux (Famille nombreuse vs Bas revenus)',
    subtitle: 'Démonstration du théorème d’unicité des exceptions en Catala',
    sourceFile: 'Inspiré de tests/exception/good/utf8_conditions.catala_fr',
    variableName: 'taux_imposition',
    description:
      'L’Article 1 fixe un taux de base à 20 %. L’Article 2 réduit le taux à 10 % pour les familles de 3 enfants ou plus. L’Article 3 réduit le taux à 0 % pour les bas revenus (≤ 15 000 €). Mais que se passe-t-il pour une famille de 3 enfants qui gagne 12 000 € ? Les deux exceptions s’affrontent !',
    defaultFoyer: {
      revenu: 12000,
      nbEnfants: 3,
      estEtudiant: false,
      estProfesseur: false,
    },
    rules: [
      {
        id: 'r-base',
        label: 'taux_de_base',
        exceptionOf: null,
        articleTitle: 'Article 1 — Taux général d’imposition',
        lawText: 'Par défaut, le taux d’imposition applicable aux revenus du foyer est fixé à 20 %.',
        conditions: [{ field: 'toujours_vrai', op: 'est_vrai', value: 1 }],
        consequenceValue: 20,
        unit: '%',
        enabled: true,
      },
      {
        id: 'r-famille',
        label: 'exception_famille_nombreuse',
        exceptionOf: 'taux_de_base',
        articleTitle: 'Article 2 — Réduction familles nombreuses',
        lawText: 'Par dérogation à l’article 1, les ménages ayant au moins 3 enfants bénéficient d’un taux réduit à 10 %.',
        conditions: [{ field: 'nbEnfants', op: '>=', value: 3 }],
        consequenceValue: 10,
        unit: '%',
        enabled: true,
      },
      {
        id: 'r-modeste',
        label: 'exception_bas_revenus',
        exceptionOf: 'taux_de_base',
        articleTitle: 'Article 3 — Exonération des revenus modestes',
        lawText: 'Par dérogation à l’article 1, lorsque le revenu du ménage n’excède pas 15 000 €, le taux est fixé à 0 %.',
        conditions: [{ field: 'revenu', op: '<=', value: 15000 }],
        consequenceValue: 0,
        unit: '%',
        enabled: true,
      },
    ],
    fixedRules: [
      {
        id: 'r-base',
        label: 'taux_de_base',
        exceptionOf: null,
        articleTitle: 'Article 1 — Taux général d’imposition',
        lawText: 'Par défaut, le taux d’imposition applicable aux revenus du foyer est fixé à 20 %.',
        conditions: [{ field: 'toujours_vrai', op: 'est_vrai', value: 1 }],
        consequenceValue: 20,
        unit: '%',
        enabled: true,
      },
      {
        id: 'r-famille',
        label: 'exception_famille_nombreuse',
        exceptionOf: 'taux_de_base',
        articleTitle: 'Article 2 — Réduction familles nombreuses',
        lawText: 'Par dérogation à l’article 1, les ménages ayant au moins 3 enfants bénéficient d’un taux réduit à 10 %.',
        conditions: [{ field: 'nbEnfants', op: '>=', value: 3 }],
        consequenceValue: 10,
        unit: '%',
        enabled: true,
      },
      {
        id: 'r-modeste',
        label: 'exception_bas_revenus',
        exceptionOf: 'exception_famille_nombreuse',
        articleTitle: 'Article 3 (Corrigé) — Exonération prioritaire des revenus modestes',
        lawText: 'Par dérogation aux articles 1 et 2, lorsque le revenu du ménage n’excède pas 15 000 €, le taux est fixé à 0 %.',
        conditions: [{ field: 'revenu', op: '<=', value: 15000 }],
        consequenceValue: 0,
        unit: '%',
        enabled: true,
      },
    ],
  },
  {
    id: 'trou-seuil-100k',
    title: 'Scénario 2 : Le Vide Juridique sur un seuil exact (< 100 000 € vs > 100 000 €)',
    subtitle: 'Exemple cité dans motivation.tex (Section « Sécurité juridique »)',
    sourceFile: 'catala/doc/out_of_date/motivation.tex & prolala_motivating_example.catala_en',
    variableName: 'taux_marginal',
    description:
      'Comme l’expliquent Denis Merigoux et Liane Huttner dans la documentation Catala : « Si la loi spécifie une règle différente selon que le montant des revenus soit en dessous (< 100 000 €) ou au-dessus (> 100 000 €) d’un certain seuil, que se passe-t-il quand le revenu est exactement égal à 100 000 € ? »',
    defaultFoyer: {
      revenu: 100000,
      nbEnfants: 2,
      estEtudiant: false,
      estProfesseur: false,
    },
    rules: [
      {
        id: 's2-r1',
        label: 'tranche_normale',
        exceptionOf: null,
        articleTitle: 'Article 1 — Revenus inférieurs au seuil de 100 000 €',
        lawText: 'Lorsque le revenu est strictement inférieur à 100 000 €, le taux est de 10 %.',
        conditions: [{ field: 'revenu', op: '<', value: 100000 }],
        consequenceValue: 10,
        unit: '%',
        enabled: true,
      },
      {
        id: 's2-r2',
        label: 'tranche_supérieure',
        exceptionOf: 'tranche_normale',
        articleTitle: 'Article 2 — Revenus supérieurs au seuil de 100 000 €',
        lawText: 'Lorsque le revenu est strictement supérieur à 100 000 €, le taux est porté à 30 %.',
        conditions: [{ field: 'revenu', op: '>', value: 100000 }],
        consequenceValue: 30,
        unit: '%',
        enabled: true,
      },
    ],
    fixedRules: [
      {
        id: 's2-r1',
        label: 'tranche_normale',
        exceptionOf: null,
        articleTitle: 'Article 1 (Corrigé) — Revenus jusqu’à 100 000 € inclus',
        lawText: 'Lorsque le revenu est inférieur ou égal à 100 000 €, le taux est de 10 %.',
        conditions: [{ field: 'revenu', op: '<=', value: 100000 }],
        consequenceValue: 10,
        unit: '%',
        enabled: true,
      },
      {
        id: 's2-r2',
        label: 'tranche_supérieure',
        exceptionOf: 'tranche_normale',
        articleTitle: 'Article 2 — Revenus supérieurs au seuil de 100 000 €',
        lawText: 'Par exception, lorsque le revenu est strictement supérieur à 100 000 €, le taux est porté à 30 %.',
        conditions: [{ field: 'revenu', op: '>', value: 100000 }],
        consequenceValue: 30,
        unit: '%',
        enabled: true,
      },
    ],
  },
  {
    id: 'prolala-etudiant-professeur',
    title: 'Scénario 3 : Le paradoxe Étudiant-Professeur (Fichier prolala_motivating_example)',
    subtitle: 'Vrai test de preuve formelle issu de ton dossier tests-extra/proof/bad/',
    sourceFile: 'catala/tests-extra/proof/bad/prolala_motivating_example.catala_en',
    variableName: 'prime_université',
    description:
      'Tiré directement du fichier prolala_motivating_example.catala_en de ton dossier : l’Article 1 accorde une prime de 500 € à tous les étudiants. L’Article 2 interdit la prime (0 €) aux professeurs. Mais un doctorant qui est à la fois étudiant ET professeur chargé de TD déclenche un conflit, et une personne qui n’est ni étudiant ni professeur tombe dans un vide juridique !',
    defaultFoyer: {
      revenu: 24000,
      nbEnfants: 0,
      estEtudiant: true,
      estProfesseur: true,
    },
    rules: [
      {
        id: 's3-r1',
        label: 'règle_étudiant',
        exceptionOf: null,
        articleTitle: 'Article 1 — Prime étudiante',
        lawText: 'Tous les étudiants sont éligibles à la prime de 500 €.',
        conditions: [{ field: 'estEtudiant', op: 'est_vrai', value: 1 }],
        consequenceValue: 500,
        unit: '€',
        enabled: true,
      },
      {
        id: 's3-r2',
        label: 'règle_professeur',
        exceptionOf: null,
        articleTitle: 'Article 2 — Exclusion des professeurs',
        lawText: 'Les professeurs ne sont pas éligibles à la prime (0 €).',
        conditions: [{ field: 'estProfesseur', op: 'est_vrai', value: 1 }],
        consequenceValue: 0,
        unit: '€',
        enabled: true,
      },
    ],
    fixedRules: [
      {
        id: 's3-r0',
        label: 'défaut_non_éligible',
        exceptionOf: null,
        articleTitle: 'Principe par défaut — Non-éligibilité générale',
        lawText: 'Par défaut, toute personne reçoit 0 €.',
        conditions: [{ field: 'toujours_vrai', op: 'est_vrai', value: 1 }],
        consequenceValue: 0,
        unit: '€',
        enabled: true,
      },
      {
        id: 's3-r1',
        label: 'règle_étudiant',
        exceptionOf: 'défaut_non_éligible',
        articleTitle: 'Article 1 — Exception pour les étudiants',
        lawText: 'Par exception au principe général, les étudiants reçoivent 500 €.',
        conditions: [{ field: 'estEtudiant', op: 'est_vrai', value: 1 }],
        consequenceValue: 500,
        unit: '€',
        enabled: true,
      },
      {
        id: 's3-r2',
        label: 'règle_professeur',
        exceptionOf: 'règle_étudiant',
        articleTitle: 'Article 2 — Exception sur l’exception pour les professeurs',
        lawText: 'Toutefois, par exception à l’article 1, un étudiant qui est également professeur reçoit 0 €.',
        conditions: [{ field: 'estProfesseur', op: 'est_vrai', value: 1 }],
        consequenceValue: 0,
        unit: '€',
        enabled: true,
      },
    ],
  },
];
