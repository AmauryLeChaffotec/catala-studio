export interface Enfant {
  id: string;
  prenom: string;
  age: number; // en années
  remunerationMensuelle: number; // en € net
}

export interface MenageInput {
  revenuAnnuel: number; // Revenu net catégoriel N-2 en €
  outreMer: boolean; // Résidence en DOM (Art. L755-11)
  gardeAlternee: boolean; // Partage des allocations
  enfants: Enfant[];
}

export type RuleStatus = 'applied' | 'overridden' | 'inactive';

export interface SubConditionEval {
  label: string;
  catalaExpr: string;
  passed: boolean;
  detail: string;
}

export interface ArticleBlockEval {
  id: string;
  articleTitle: string;
  codeReference: string;
  lawText: string;
  labelName: string;
  exceptionOf?: string;
  catalaCode: string;
  status: RuleStatus;
  overriddenBy?: string;
  resultSummary: string;
  subConditions: SubConditionEval[];
}

export interface EnfantEvaluation {
  enfant: Enfant;
  estACharge: boolean;
  motifCharge: string;
  regleChargeAppliquee: string;
  estPlusAgeACharge: boolean;
  droitMajorationAge: boolean;
  motifMajoration: string;
  regleMajorationAppliquee: string;
  montantMajorationBrut: number;
}

export interface SimulationResult {
  BMAF: number;
  smicMensuelNet: number;
  plafondRemunerationEnfant: number;
  enfantsEvalues: EnfantEvaluation[];
  nbEnfantsACharge: number;
  droitOuvert: boolean;
  plafondTranche1: number;
  plafondTranche2: number;
  trancheModulation: 1 | 2 | 3;
  diviseurModulation: 1 | 2 | 4;
  montantBaseBrut: number;
  montantMajorationsAgeBrut: number;
  montantAvantModulation: number;
  montantApresModulation: number;
  complementDegressif: number;
  montantTotalMensuel: number;
  articles: ArticleBlockEval[];
}

// Constantes officielles (Base mensuelle de calcul des allocations familiales - BMAF)
export const BMAF = 462.78; // Base officielle en €
export const SMIC_MENSUEL_NET = 1766.92;
export const PLAFOND_55_SMIC = Math.round(SMIC_MENSUEL_NET * 0.55 * 100) / 100; // 971.81 €

export function evaluerAllocationsFamiliales(menage: MenageInput): SimulationResult {
  // 1. Évaluation de chaque enfant au regard de l'article L512-3 et R512-2 (Enfant à charge)
  const enfantsTriesParAge = [...menage.enfants].sort((a, b) => {
    if (b.age !== a.age) return b.age - a.age;
    return a.id.localeCompare(b.id);
  });

  // Qui est à charge ?
  const chargeMap = new Map<string, { estACharge: boolean; motif: string; regle: string }>();
  let aUnEnfantMoins20Ans = false;
  let aUnEnfantExcluParSalaire = false;
  let aUnEnfantMajeur20AnsOuPlus = false;

  for (const enf of menage.enfants) {
    if (enf.age >= 20) {
      aUnEnfantMajeur20AnsOuPlus = true;
      chargeMap.set(enf.id, {
        estACharge: false,
        motif: `Âgé de ${enf.age} ans (≥ 20 ans, limite d'âge R512-2 dépassée)`,
        regle: 'Article L512-3 (Hors champ)',
      });
    } else if (enf.age >= 16 && enf.remunerationMensuelle > PLAFOND_55_SMIC) {
      aUnEnfantMoins20Ans = true;
      aUnEnfantExcluParSalaire = true;
      chargeMap.set(enf.id, {
        estACharge: false,
        motif: `Âgé de ${enf.age} ans mais rémunération (${enf.remunerationMensuelle} €) > 55 % du SMIC (${PLAFOND_55_SMIC} €)`,
        regle: 'Exception Art. R512-2 al. 2 (Plafond salarial dépassé)',
      });
    } else {
      aUnEnfantMoins20Ans = true;
      chargeMap.set(enf.id, {
        estACharge: true,
        motif:
          enf.remunerationMensuelle > 0
            ? `Âgé de ${enf.age} ans (< 20 ans) et salaire (${enf.remunerationMensuelle} €) ≤ 55 % SMIC`
            : `Âgé de ${enf.age} ans (< 20 ans, sans revenu supérieur au plafond)`,
        regle: 'Règle générale Art. L512-3 & R512-2',
      });
    }
  }

  const enfantsAChargeTries = enfantsTriesParAge.filter(
    (e) => chargeMap.get(e.id)?.estACharge
  );
  const nbEnfantsACharge = enfantsAChargeTries.length;
  const idPlusAgeACharge =
    enfantsAChargeTries.length > 0 ? enfantsAChargeTries[0].id : null;

  // 2. Ouverture du droit (Art. L521-1 vs Exception Outre-Mer Art. L755-11)
  const droitMetropole = nbEnfantsACharge >= 2;
  const droitOutreMerUnEnfant = menage.outreMer && nbEnfantsACharge === 1;
  const droitOuvert = droitMetropole || droitOutreMerUnEnfant;

  // Montant de base brut avant modulation (Art. R521-1)
  // 2 enfants : 32% BMAF | par enfant supplémentaire : 41% BMAF | 1 enfant DOM : 5.88% BMAF
  let montantBaseBrut = 0;
  if (nbEnfantsACharge >= 2) {
    montantBaseBrut =
      BMAF * (0.32 + 0.41 * Math.max(0, nbEnfantsACharge - 2));
  } else if (droitOutreMerUnEnfant) {
    montantBaseBrut = BMAF * 0.0588;
  }

  // 3. Majoration pour âge (Art. L521-3 alinéa 1 et exception alinéa 2)
  // Montant par enfant éligible >= 14 ans : 16% de la BMAF (ou 9.02% en DOM pour 1er enfant)
  const tauxMajoration = menage.outreMer && nbEnfantsACharge === 1 ? 0.0365 : 0.16;
  const montantUnitaireMajoration = BMAF * tauxMajoration;

  let auMoinsUnEnfant14AnsNonAine = false;
  let aUnAine14AnsBloqueAl1 = false;
  let aUnAine14AnsDebloqueAl2 = false;

  const enfantsEvalues: EnfantEvaluation[] = menage.enfants.map((enf) => {
    const infoCharge = chargeMap.get(enf.id)!;
    const estPlusAgeACharge = enf.id === idPlusAgeACharge;
    let droitMajorationAge = false;
    let motifMajoration = '';
    let regleMajorationAppliquee = '';

    if (!infoCharge.estACharge) {
      droitMajorationAge = false;
      motifMajoration = 'Enfant non considéré à charge';
      regleMajorationAppliquee = 'Aucune';
    } else if (!droitOuvert) {
      droitMajorationAge = false;
      motifMajoration = 'Droits aux allocations familiales non ouverts (< 2 enfants en métropole)';
      regleMajorationAppliquee = 'Aucune';
    } else if (enf.age < 14) {
      droitMajorationAge = false;
      motifMajoration = `Âgé de ${enf.age} ans (< 14 ans requis par l'Art. R521-1)`;
      regleMajorationAppliquee = 'Condition d’âge non remplie (< 14 ans)';
    } else {
      // L'enfant est à charge et a >= 14 ans
      if (!estPlusAgeACharge) {
        droitMajorationAge = true;
        auMoinsUnEnfant14AnsNonAine = true;
        motifMajoration = `Éligible (${enf.age} ans ≥ 14 ans, et n'est pas l'aîné du foyer)`;
        regleMajorationAppliquee = 'Art. L521-3 Alinéa 1 (Règle générale)';
      } else {
        // C'est l'enfant le plus âgé à charge et il a >= 14 ans !
        if (nbEnfantsACharge >= 3) {
          droitMajorationAge = true;
          aUnAine14AnsDebloqueAl2 = true;
          motifMajoration = `Éligible bien qu'étant l'aîné, grâce à l'exception famille ≥ 3 enfants (${nbEnfantsACharge} enfants à charge)`;
          regleMajorationAppliquee = 'Art. L521-3 Alinéa 2 (Exception ≥ 3 enfants)';
        } else {
          droitMajorationAge = false;
          aUnAine14AnsBloqueAl1 = true;
          motifMajoration = `Exclu de la majoration car c'est l'enfant le plus âgé d'une famille de moins de 3 enfants (${nbEnfantsACharge} enfants)`;
          regleMajorationAppliquee = 'Art. L521-3 Alinéa 1 (Exclusion de l’aîné)';
        }
      }
    }

    return {
      enfant: enf,
      estACharge: infoCharge.estACharge,
      motifCharge: infoCharge.motif,
      regleChargeAppliquee: infoCharge.regle,
      estPlusAgeACharge,
      droitMajorationAge,
      motifMajoration,
      regleMajorationAppliquee,
      montantMajorationBrut: droitMajorationAge ? montantUnitaireMajoration : 0,
    };
  });

  const montantMajorationsAgeBrut = enfantsEvalues.reduce(
    (acc, e) => acc + e.montantMajorationBrut,
    0
  );

  const facteurGarde = menage.gardeAlternee ? 0.5 : 1;
  const montantAvantModulation =
    (montantBaseBrut + montantMajorationsAgeBrut) * facteurGarde;

  // 4. Modulation selon les ressources (Art. L521-1 al. 3 & D521-1)
  // Plafonds officiels : base 2 enfants + majoration par enfant supplémentaire
  const nbEnfantsPourPlafond = Math.max(2, nbEnfantsACharge);
  const plafondTranche1 = 74966 + (nbEnfantsPourPlafond - 2) * 6247;
  const plafondTranche2 = 99922 + (nbEnfantsPourPlafond - 2) * 6247;

  let trancheModulation: 1 | 2 | 3 = 1;
  let diviseurModulation: 1 | 2 | 4 = 1;

  // Attention : pour l'allocation 1 enfant en DOM (L755-11), pas de modulation par tranche
  const soumisAModulation = nbEnfantsACharge >= 2;
  if (soumisAModulation) {
    if (menage.revenuAnnuel > plafondTranche2) {
      trancheModulation = 3;
      diviseurModulation = 4;
    } else if (menage.revenuAnnuel > plafondTranche1) {
      trancheModulation = 2;
      diviseurModulation = 2;
    }
  }

  const montantApresModulation = montantAvantModulation / diviseurModulation;

  // 5. Complément dégressif (Art. D521-3 : lissage des effets de seuil juste au-dessus du plafond)
  let complementDegressif = 0;
  if (soumisAModulation && droitOuvert) {
    if (trancheModulation === 2) {
      const depassementMensuel = (menage.revenuAnnuel - plafondTranche1) / 12;
      if (depassementMensuel < montantApresModulation) {
        complementDegressif = montantApresModulation - depassementMensuel;
      }
    } else if (trancheModulation === 3) {
      const depassementMensuel = (menage.revenuAnnuel - plafondTranche2) / 12;
      if (depassementMensuel < montantApresModulation) {
        complementDegressif = montantApresModulation - depassementMensuel;
      }
    }
  }

  const montantTotalMensuel =
    Math.round((montantApresModulation + complementDegressif) * 100) / 100;

  // Construction des blocs d'articles littéraires annotés en Catala avec leur statut exact
  const articles: ArticleBlockEval[] = [
    {
      id: 'art-l512-3-base',
      articleTitle: 'Article L512-3 & R512-2 al. 1 — Enfant à charge (Règle de base)',
      codeReference: 'Code de la sécurité sociale',
      lawText:
        'Les prestations familiales sont dues pour tout enfant à charge jusqu’à la fin de l’obligation scolaire, et après la fin de l’obligation scolaire jusqu’à un âge limite fixé par décret à 20 ans.',
      labelName: 'charge_base',
      catalaCode: `champ d'application EnfantÀCharge:
  étiquette charge_base
  règle est_à_charge de enfant
  sous condition
    enfant.âge < 20 an
  conséquence rempli`,
      status: aUnEnfantMoins20Ans
        ? aUnEnfantExcluParSalaire && nbEnfantsACharge === 0
          ? 'overridden'
          : 'applied'
        : 'inactive',
      overriddenBy: aUnEnfantExcluParSalaire
        ? 'Exception Art. R512-2 al. 2 (Plafond de rémunération 55 % SMIC)'
        : undefined,
      resultSummary: `${nbEnfantsACharge} enfant(s) retenu(s) à charge sur ${menage.enfants.length} enfant(s) déclaré(s).`,
      subConditions: [
        {
          label: 'Au moins un enfant a moins de 20 ans',
          catalaExpr: 'enfant.âge < 20 an',
          passed: aUnEnfantMoins20Ans,
          detail: aUnEnfantMoins20Ans
            ? `${menage.enfants.filter((e) => e.age < 20).length} enfant(s) ont moins de 20 ans`
            : aUnEnfantMajeur20AnsOuPlus
              ? 'Tous les enfants ont 20 ans ou plus'
              : 'Aucun enfant dans le foyer',
        },
      ],
    },
    {
      id: 'art-r512-2-exc',
      articleTitle: 'Article R512-2 al. 2 — Exception : Enfant salarié (> 55 % du SMIC)',
      codeReference: 'Code de la sécurité sociale',
      lawText:
        'Toutefois, pour les enfants âgés de plus de 16 ans qui exercent une activité professionnelle, la rémunération mensuelle nette ne doit pas excéder 55 % du SMIC (soit 971,81 € / mois). À défaut, l’enfant cesse d’être considéré à charge.',
      labelName: 'exception_plafond_salaire',
      exceptionOf: 'charge_base',
      catalaCode: `champ d'application EnfantÀCharge:
  étiquette exception_plafond_salaire
  exception charge_base
  règle est_à_charge de enfant
  sous condition
    enfant.âge >= 16 an et
    enfant.rémunération_mensuelle > 55 % * smic_mensuel_net
  conséquence non rempli`,
      status: aUnEnfantExcluParSalaire ? 'applied' : 'inactive',
      resultSummary: aUnEnfantExcluParSalaire
        ? `Exception activée : ${menage.enfants.filter((e) => e.age < 20 && e.age >= 16 && e.remunerationMensuelle > PLAFOND_55_SMIC).map((e) => e.prenom).join(', ')} dépasse le plafond de ${PLAFOND_55_SMIC} € et perd la qualité d'enfant à charge.`
        : `Aucun enfant de 16-19 ans ne dépasse le plafond salarial de ${PLAFOND_55_SMIC} €.`,
      subConditions: [
        {
          label: 'Enfant âgé de 16 à 19 ans',
          catalaExpr: 'enfant.âge >= 16 an et enfant.âge < 20 an',
          passed: menage.enfants.some((e) => e.age >= 16 && e.age < 20),
          detail: menage.enfants.some((e) => e.age >= 16 && e.age < 20)
            ? 'Au moins un adolescent de 16-19 ans présent'
            : 'Aucun enfant entre 16 et 19 ans',
        },
        {
          label: `Rémunération > 55 % du SMIC (${PLAFOND_55_SMIC} €)`,
          catalaExpr: 'enfant.rémunération_mensuelle > 971,81 €',
          passed: aUnEnfantExcluParSalaire,
          detail: aUnEnfantExcluParSalaire
            ? 'Dépassement constaté → l’exception écrase la règle de base'
            : 'Rémunérations inférieures ou égales au plafond',
        },
      ],
    },
    {
      id: 'art-l521-1-base',
      articleTitle: 'Article L521-1 al. 1 — Ouverture du droit (Règle générale : ≥ 2 enfants)',
      codeReference: 'Code de la sécurité sociale',
      lawText:
        'Les allocations familiales sont dues à partir du deuxième enfant à charge résidant en France. Le montant mensuel de base est fixé à 32 % de la BMAF pour 2 enfants, et 41 % par enfant supplémentaire.',
      labelName: 'ouverture_droit_base',
      catalaCode: `champ d'application CalculAllocationsFamiliales:
  étiquette ouverture_droit_base
  définition montant_base
  sous condition nombre de enfants_à_charge >= 2
  conséquence égal à
    BMAF * (32 % + 41 % * (nombre de enfants_à_charge - 2))`,
      status:
        nbEnfantsACharge >= 2
          ? 'applied'
          : droitOutreMerUnEnfant
            ? 'overridden'
            : 'inactive',
      overriddenBy: droitOutreMerUnEnfant
        ? 'Exception Art. L755-11 (Droit ouvert dès le 1er enfant en Outre-mer)'
        : undefined,
      resultSummary:
        nbEnfantsACharge >= 2
          ? `Droit ouvert (${nbEnfantsACharge} enfants à charge) → Base brute = ${montantBaseBrut.toFixed(2)} € / mois`
          : `Moins de 2 enfants à charge (${nbEnfantsACharge}) → 0,00 € selon la règle métropolitaine.`,
      subConditions: [
        {
          label: 'Au moins 2 enfants à charge',
          catalaExpr: 'nombre de enfants_à_charge >= 2',
          passed: nbEnfantsACharge >= 2,
          detail: `${nbEnfantsACharge} enfant(s) à charge`,
        },
      ],
    },
    {
      id: 'art-l755-11-exc',
      articleTitle: 'Article L755-11 — Exception Outre-Mer (Dès le 1er enfant à charge)',
      codeReference: 'Code de la sécurité sociale',
      lawText:
        'Par dérogation à l’article L521-1, dans les départements d’outre-mer (Guadeloupe, Guyane, Martinique, La Réunion), les allocations familiales sont servies dès le premier enfant à charge (au taux spécifique de 5,88 % de la BMAF).',
      labelName: 'exception_outre_mer_1_enfant',
      exceptionOf: 'ouverture_droit_base',
      catalaCode: `champ d'application CalculAllocationsFamiliales:
  étiquette exception_outre_mer_1_enfant
  exception ouverture_droit_base
  définition montant_base
  sous condition
    ménage.résidence_outre_mer et
    nombre de enfants_à_charge = 1
  conséquence égal à BMAF * 5,88 %`,
      status: droitOutreMerUnEnfant ? 'applied' : 'inactive',
      resultSummary: droitOutreMerUnEnfant
        ? `Exception Outre-Mer activée pour 1 enfant à charge → Base = ${montantBaseBrut.toFixed(2)} € / mois`
        : 'Non applicable (foyer en métropole ou nombre d’enfants ≠ 1).',
      subConditions: [
        {
          label: 'Résidence en Outre-Mer (DOM)',
          catalaExpr: 'ménage.résidence_outre_mer',
          passed: menage.outreMer,
          detail: menage.outreMer ? 'Oui (DOM)' : 'Non (Métropole)',
        },
        {
          label: 'Exactement 1 enfant à charge',
          catalaExpr: 'nombre de enfants_à_charge = 1',
          passed: nbEnfantsACharge === 1,
          detail: `${nbEnfantsACharge} enfant(s) à charge`,
        },
      ],
    },
    {
      id: 'art-l521-3-al1',
      articleTitle: 'Article L521-3 Alinéa 1 — Majoration pour âge (≥ 14 ans, sauf l’aîné)',
      codeReference: 'Code de la sécurité sociale (Exemple officiel du README Catala)',
      lawText:
        'Chacun des enfants à charge, à l’exception du plus âgé, ouvre droit à partir d’un âge minimum (14 ans) à une majoration des allocations familiales (16 % de la BMAF, soit 74,04 €).',
      labelName: 'majoration_alinéa_1',
      catalaCode: `champ d'application CalculAllocationsFamiliales:
  étiquette majoration_alinéa_1
  règle majorations_allocations_familiales.droits_ouverts de enfant
  sous condition
    (enfant dans ménage.enfants_à_charge) et
    (enfant != ménage.enfant_plus_âgé) et
    (enfant.âge >= 14 an)
  conséquence rempli`,
      status: aUnAine14AnsDebloqueAl2
        ? 'overridden'
        : auMoinsUnEnfant14AnsNonAine
          ? 'applied'
          : 'inactive',
      overriddenBy: aUnAine14AnsDebloqueAl2
        ? 'Exception Art. L521-3 Alinéa 2 (Famille de 3 enfants ou plus : l’aîné y a droit aussi !)'
        : undefined,
      resultSummary: aUnAine14AnsBloqueAl1
        ? `Attention : L'aîné a ≥ 14 ans mais est EXCLU par cet alinéa car la famille n'a que ${nbEnfantsACharge} enfants (< 3).`
        : auMoinsUnEnfant14AnsNonAine
          ? `Majoration accordée aux enfants ≥ 14 ans (hors aîné).`
          : `Aucun enfant cadet n'a 14 ans ou plus.`,
      subConditions: [
        {
          label: 'Enfant à charge âgé d’au moins 14 ans',
          catalaExpr: 'enfant.âge >= 14 an',
          passed: enfantsAChargeTries.some((e) => e.age >= 14),
          detail: enfantsAChargeTries.some((e) => e.age >= 14)
            ? `${enfantsAChargeTries.filter((e) => e.age >= 14).length} enfant(s) à charge ont ≥ 14 ans`
            : 'Aucun enfant à charge n’a 14 ans ou plus',
        },
        {
          label: 'Exclusion du plus âgé (enfant != enfant_plus_âgé)',
          catalaExpr: 'enfant != ménage.enfant_plus_âgé',
          passed: auMoinsUnEnfant14AnsNonAine,
          detail: aUnAine14AnsBloqueAl1
            ? 'L’aîné est bloqué par cette condition dans une famille de 2 enfants'
            : auMoinsUnEnfant14AnsNonAine
              ? 'Au moins un cadet a ≥ 14 ans'
              : 'Aucun cadet de ≥ 14 ans',
        },
      ],
    },
    {
      id: 'art-l521-3-al2',
      articleTitle: 'Article L521-3 Alinéa 2 — Exception : Famille de 3 enfants ou plus',
      codeReference: 'Code de la sécurité sociale (Exemple officiel du README Catala)',
      lawText:
        'Toutefois, les personnes ayant un nombre déterminé d’enfants à charge (au moins 3 enfants) bénéficient de ladite majoration pour chaque enfant à charge (y compris le plus âgé) à partir de l’âge mentionné au premier alinéa (14 ans).',
      labelName: 'exception_famille_nombreuse',
      exceptionOf: 'majoration_alinéa_1',
      catalaCode: `champ d'application CalculAllocationsFamiliales:
  étiquette exception_famille_nombreuse
  exception majoration_alinéa_1
  règle majorations_allocations_familiales.droits_ouverts de enfant
  sous condition
    (enfant dans ménage.enfants_à_charge) et
    (nombre de ménage.enfants_à_charge >= 3) et
    (enfant.âge >= 14 an)
  conséquence rempli`,
      status: aUnAine14AnsDebloqueAl2 ? 'applied' : 'inactive',
      resultSummary: aUnAine14AnsDebloqueAl2
        ? `Exception activée (${nbEnfantsACharge} enfants ≥ 3) : l'enfant le plus âgé obtient aussi la majoration de ${montantUnitaireMajoration.toFixed(2)} € !`
        : `Non activée (nécessite au moins 3 enfants à charge et un aîné de ≥ 14 ans).`,
      subConditions: [
        {
          label: 'Au moins 3 enfants à charge',
          catalaExpr: 'nombre de ménage.enfants_à_charge >= 3',
          passed: nbEnfantsACharge >= 3,
          detail: `${nbEnfantsACharge} enfant(s) à charge (seuil requis : 3)`,
        },
        {
          label: 'Enfant (y compris l’aîné) âgé de ≥ 14 ans',
          catalaExpr: 'enfant.âge >= 14 an',
          passed: enfantsAChargeTries.some((e) => e.age >= 14),
          detail: enfantsAChargeTries.some((e) => e.age >= 14)
            ? 'Enfant(s) de ≥ 14 ans présent(s)'
            : 'Aucun enfant de ≥ 14 ans',
        },
      ],
    },
    {
      id: 'art-l521-1-modulation-base',
      articleTitle: 'Article L521-1 al. 3 & D521-1 — Modulation selon les revenus (Taux plein par défaut)',
      codeReference: 'Code de la sécurité sociale',
      lawText:
        'Le montant des allocations familiales et de leurs majorations varie en fonction des ressources du ménage. Par défaut, lorsque les ressources n’excèdent pas le premier plafond, l’allocation est versée à taux plein (diviseur = 1).',
      labelName: 'taux_modulation_base',
      catalaCode: `champ d'application ModulationRessources:
  étiquette taux_modulation_base
  définition diviseur_modulation égal à 1`,
      status: !droitOuvert
        ? 'inactive'
        : trancheModulation === 1
          ? 'applied'
          : 'overridden',
      overriddenBy:
        trancheModulation === 2
          ? `Exception Tranche 2 (Revenu > ${plafondTranche1.toLocaleString('fr-FR')} € → divisé par 2)`
          : trancheModulation === 3
            ? `Exception Tranche 3 (Revenu > ${plafondTranche2.toLocaleString('fr-FR')} € → divisé par 4)`
            : undefined,
      resultSummary: !droitOuvert
        ? 'Sans objet (droits non ouverts).'
        : trancheModulation === 1
          ? `Taux plein maintenu (100 %) : revenu (${menage.revenuAnnuel.toLocaleString('fr-FR')} €) ≤ plafond Tranche 1 (${plafondTranche1.toLocaleString('fr-FR')} €).`
          : `Taux plein écrasé par l'exception de modulation (Tranche ${trancheModulation}, division par ${diviseurModulation}).`,
      subConditions: [
        {
          label: `Revenu annuel ≤ Plafond Tranche 1 (${plafondTranche1.toLocaleString('fr-FR')} €)`,
          catalaExpr: `ménage.revenu <= ${plafondTranche1} €`,
          passed: menage.revenuAnnuel <= plafondTranche1,
          detail: `Revenu = ${menage.revenuAnnuel.toLocaleString('fr-FR')} € / Plafond = ${plafondTranche1.toLocaleString('fr-FR')} €`,
        },
      ],
    },
    {
      id: 'art-d521-1-modulation-exc',
      articleTitle: 'Article D521-1 — Exceptions : Réduction de moitié (Tranche 2) ou par quatre (Tranche 3)',
      codeReference: 'Code de la sécurité sociale',
      lawText:
        'Lorsque les ressources annuelles dépassent le premier plafond (74 966 € + 6 247 € par enfant au-delà du 2e), le montant est divisé par 2. Lorsqu’elles dépassent le second plafond (99 922 € + 6 247 € par enfant au-delà du 2e), il est divisé par 4.',
      labelName: 'exception_hauts_revenus',
      exceptionOf: 'taux_modulation_base',
      catalaCode: `champ d'application ModulationRessources:
  étiquette tranche_2 exception taux_modulation_base
  définition diviseur_modulation
  sous condition
    ménage.revenu > plafond_tranche_1 et
    ménage.revenu <= plafond_tranche_2
  conséquence égal à 2

  étiquette tranche_3 exception taux_modulation_base
  définition diviseur_modulation
  sous condition ménage.revenu > plafond_tranche_2
  conséquence égal à 4`,
      status: droitOuvert && trancheModulation > 1 ? 'applied' : 'inactive',
      resultSummary:
        droitOuvert && trancheModulation > 1
          ? `Exception Tranche ${trancheModulation} appliquée : montant divisé par ${diviseurModulation}${complementDegressif > 0 ? ` (+ complément dégressif de lissage de ${complementDegressif.toFixed(2)} €)` : ''}.`
          : 'Exceptions de réduction non activées (foyer en Tranche 1).',
      subConditions: [
        {
          label: `Tranche 2 : Revenu entre ${plafondTranche1.toLocaleString('fr-FR')} € et ${plafondTranche2.toLocaleString('fr-FR')} €`,
          catalaExpr: 'revenu > plafond_1 et revenu <= plafond_2',
          passed: trancheModulation === 2,
          detail:
            trancheModulation === 2
              ? 'Activé → Division par 2'
              : 'Non',
        },
        {
          label: `Tranche 3 : Revenu > ${plafondTranche2.toLocaleString('fr-FR')} €`,
          catalaExpr: 'revenu > plafond_2',
          passed: trancheModulation === 3,
          detail:
            trancheModulation === 3
              ? 'Activé → Division par 4'
              : 'Non',
        },
      ],
    },
  ];

  return {
    BMAF,
    smicMensuelNet: SMIC_MENSUEL_NET,
    plafondRemunerationEnfant: PLAFOND_55_SMIC,
    enfantsEvalues,
    nbEnfantsACharge,
    droitOuvert,
    plafondTranche1,
    plafondTranche2,
    trancheModulation,
    diviseurModulation,
    montantBaseBrut,
    montantMajorationsAgeBrut,
    montantAvantModulation,
    montantApresModulation,
    complementDegressif,
    montantTotalMensuel,
    articles,
  };
}
