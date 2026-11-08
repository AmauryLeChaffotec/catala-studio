# Catala Studio — Droit, Programmation Formelle & Architecture Hybride (Système 1 / Système 2)

Application React interactive pour explorer et tester les concepts du langage de programmation **Catala** (Inria) et son hybridation avec des modèles de jugement atomique (**Système 1 / Jev** + **Système 2 / Catala**).

## Fonctionnalités (4 Ateliers)

1. **Comprendre Catala** : Guide visuel et lecteur interactif ligne par ligne de la syntaxe française de Catala (`champ d'application`, `étiquette`, `exception`, `définition`, `sous condition`, `conséquence`).
2. **Pipeline Hybride Jev (Système 1) + Catala (Système 2)** : Démonstrateur neuro-symbolique appliqué au Droit Pénal (Art. 311-3, 311-4, 122-7) et au Droit de la Consommation (*"Jev makes judgments, Catala makes decisions"*), avec gestion formelle du seuil de confiance $p$ et escalade humaine garantie.
3. **Simulateur « Loi Transparente » (Allocations Familiales)** : Simulation en temps réel des articles du Code de la sécurité sociale (`L512-3`, `R512-2`, `L521-1`, `L755-11`, `L521-3`, `D521-1`) avec coloration dynamique des règles appliquées et des exceptions.
4. **Détecteur Formel de Bugs Législatifs (`catala proof`)** : Démonstration de la détection automatique des conflits d'exceptions (`ConflictError`) et des vides juridiques (`EmptyError`) ainsi que de l'arbre des exceptions (`catala Exceptions`).

## Lancer le projet en local

```bash
npm install
npm run dev
```

## Références
- Liane Huttner & Denis Merigoux, *Traduire la loi en code grâce au langage de programmation Catala* (Inria / Université Paris-1 Panthéon-Sorbonne).
- Projet officiel Catala : [https://catala-lang.org](https://catala-lang.org)
