# 🏋️ KaliFit — Wiki <img src="public/images/logo-512.png" alt="KaliFit logo" width="45">


> **KaliFit** est une Progressive Web App (PWA) combinant nutrition et fitness, réalisée dans le cadre du projet NSI Terminale. Le nom est issu de *Kalos* (beauté et perfection en grec) et *Fit* (fitness et performance).

🔗 **Application en ligne :** [kali-fit.vercel.app](https://kali-fit.vercel.app)  
📦 **Dépôt :** [github.com/gtdevrandom/KaliFit](https://github.com/gtdevrandom/KaliFit)  
📄 **Licence :** MIT

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture et fichiers](#2-architecture-et-fichiers)
3. [Fonctionnalités](#3-fonctionnalités)
4. [APIs et services utilisés](#4-apis-et-services-utilisés)
5. [Sécurité](#5-sécurité)
6. [Installation et déploiement](#6-installation-et-déploiement)
7. [PWA — Progressive Web App](#7-pwa--progressive-web-app)
8. [Personnalisation et thèmes](#8-personnalisation-et-thèmes)
9. [Maquette et design](#9-maquette-et-design)
10. [Objectifs du projet (NSI)](#10-objectifs-du-projet-nsi)
11. [Licence](#11-licence)

---

## 1. Présentation du projet

KaliFit est une application web progressive visant à centraliser la gestion de la santé et de la performance physique. Elle permet à l'utilisateur de :

- Suivre son alimentation quotidienne (macronutriments, calories, qualité nutritionnelle)
- Enregistrer et analyser ses séances sportives
- Obtenir des recommandations personnalisées via un coach IA
- Visualiser l'évolution de son poids, de son sommeil et de ses performances dans le temps

Le projet a été réalisé en **HTML / CSS / JavaScript vanilla**, sans framework front-end, et déployé sur **Vercel**.

---

## 2. Architecture et fichiers

```
KaliFit/
┌── index.html            # Structure principale de l'application (SPA)
├── script.js             # Logique front-end (interactions, données, UI)
├── manifest.json         # Manifeste PWA
├── sw.js                 # Service Worker (cache hors-ligne)
├── LICENSE               # Licence MIT
├── README.md             # Résumé du projet
├── api/                  # Fonctions serverless Vercel (proxy API sécurisé)
│   └── ai.js
├── src/
│   └── script.js
├── config/
│   ├── ai-config.js      # Configuration du module IA (Hugging Face)
│   └── openfoodfacts.js  # Configuration du module Openfoodfacts 
├── public/
│   ├── style.css         # Feuille de styles globale
│   └── images/           # Icônes PWA et assets visuels
│      ├── logo-192.png
│      └── logo-512.png
├── maquette_figma/       # Captures de la maquette Figma
│   ├── app.png
└── └── pop_up.png

```

### Rôle des fichiers clés

| Fichier | Description |
|---|---|
| `index.html` | Application monopage (SPA) avec toutes les vues intégrées |
| `script.js` | Gestion des données utilisateur, navigation entre sections, appels API |
| `ai-config.js` | Paramétrage des requêtes envoyées au modèle IA via le proxy Vercel |
| `sw.js` | Service Worker permettant le fonctionnement hors-ligne et la mise en cache |
| `manifest.json` | Déclaration PWA (icônes, thème, mode d'affichage standalone) |
| `api/` | Routes serverless Vercel servant de proxy sécurisé vers Hugging Face |

---

## 3. Fonctionnalités

### 🏠 Accueil — Dashboard

- **Profil biométrique** : affichage du poids actuel et de l'IMC avec indicateur visuel (maigreur → obésité sévère)
- **Nutrition du jour** : résumé des protéines, glucides, lipides et calories consommées
- **Score de récupération** : indice 0-100 basé sur le sommeil et la charge d'entraînement
- **Suggestions IA** : recommandations contextuelles affichées directement sur le dashboard

### 🍎 Nutrition

- **Recherche d'aliments** via l'API OpenFoodFacts (par nom ou code-barres)
- **Ajout de portions** avec quantité personnalisable (en grammes)
- **Calcul automatique** des macronutriments et des calories
- **Score de qualité alimentaire** calculé à partir de la composition des aliments du jour
- **Suggestions IA** adaptées à l'objectif de l'utilisateur (ex. : *"Augmente tes protéines de 15g"*)

### 🏆 Sport

- **Ajout de séances sportives** avec : date, type de sport, durée, intensité (faible / modérée / élevée), calories brûlées et notes libres
- **Types disponibles** : cardio, musculation, yoga/stretching, football/basket, tennis/badminton, CrossFit/HIIT, autre
- **Score de qualité de la séance** calculé selon l'intensité et la durée
- **Historique des séances** consulatable
- **Suggestions IA** sur le type d'entraînement selon l'objectif (masse, perte de graisse…)

### 📊 Statistiques

- **Graphique du poids** : suivi temporel avec possibilité d'ajouter des entrées
- **Graphique du sommeil** : suivi de la durée de sommeil par nuit
- **Ratio performance/calories** : indicateur de l'efficacité de l'entraînement
- **Heatmap des séances** : visualisation sur les 5 dernières semaines (repos / faible / modéré / élevé)
- **Masse grasse et masse musculaire** estimées
- **Encouragements IA** pour progresser

### 👤 Profil

- Saisie des informations personnelles : prénom, nom, taille, année de naissance
- Gestion des objectifs : poids cible, masse grasse, masse musculaire
- Suivi de la progression vers les objectifs
- Ajout du poids courant et du temps de sommeil

### ⚙️ Paramètres

- **Thème** : clair ou sombre
- **Couleur secondaire** personnalisable
- **Format des dates** : JJ/MM/YYYY, MM/DD/YYYY ou YYYY-MM-DD
- **Vider le cache** : réinitialisation complète des données locales

---

## 4. APIs et services utilisés

### OpenFoodFacts

| Propriété | Valeur |
|---|---|
| Usage | Recherche d'aliments et récupération des données nutritionnelles |
| Authentification | Aucune (base de données publique et ouverte) |
| Endpoint | `https://world.openfoodfacts.org/cgi/search.pl` |
| Format | JSON |

OpenFoodFacts est une base de données mondiale collaborative listant des millions de produits alimentaires avec leurs compositions complètes (macronutriments, micronutriments, additifs, Nutri-Score…).

### Hugging Face (IA)

| Propriété | Valeur |
|---|---|
| Usage | Génération de conseils personnalisés et analyse prédictive |
| Authentification | Clé API stockée dans les variables d'environnement Vercel |
| Accès côté client | ❌ Jamais exposée (proxy serverless) |

Le modèle de langage est interrogé via une **Vercel Serverless Function** qui fait office de proxy sécurisé. Le client ne communique jamais directement avec Hugging Face.

---

## 5. Sécurité

L'architecture retenue garantit qu'**aucune clé API sensible n'est exposée côté client**.

```
Navigateur (client)
      │
      │ Requête HTTPS (sans clé)
      ▼
Vercel Edge Function (api/)
      │
      │ Requête authentifiée (clé Hugging Face en variable d'environnement)
      ▼
API Hugging Face
      │
      │ Réponse IA
      ▼
Vercel Edge Function
      │
      │ Réponse traitée
      ▼
Navigateur (client)
```

Les données utilisateur (poids, séances, aliments) sont stockées **localement** dans le navigateur via `localStorage` et ne sont jamais envoyées à un serveur tiers.

---

## 6. Installation et déploiement

### Prérequis

- Un compte [Vercel](https://vercel.com) (pour le déploiement)
- Une clé API [Hugging Face](https://huggingface.co)
- Git / Github

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/gtdevrandom/KaliFit.git
cd KaliFit

# 2. Déployer sur Vercel
vercel deploy
```

### Variables d'environnement à configurer sur Vercel

| Variable | Description |
|---|---|
| `HUGGINGFACE_API_KEY` | Clé d'accès à l'API Hugging Face |

> ⚠️ Ne jamais mettre la clé API dans le code source.

### Utilisation en local (sans IA)

L'application peut être ouverte directement dans un navigateur via `index.html`. Les fonctionnalités IA seront inactives sans le proxy Vercel.

---

## 7. PWA — Progressive Web App

KaliFit est installable sur mobile et desktop comme une application native.

### Fichiers PWA

- **`manifest.json`** : déclare le nom, les icônes, la couleur de thème et le mode `standalone`
- **`sw.js`** : Service Worker gérant la mise en cache des ressources pour un fonctionnement hors-ligne

### Installation

Sur mobile (Chrome / Safari) : appuyer sur *"Ajouter à l'écran d'accueil"*  
Sur desktop (Chrome / Edge) : cliquer sur l'icône d'installation dans la barre d'adresse

---

## 8. Personnalisation et thèmes

KaliFit propose deux thèmes visuels (clair / sombre) et une couleur d'accentuation personnalisable, configurables depuis la section **Paramètres**. Les préférences sont sauvegardées localement.

---

## 9. Maquette et design

La maquette de l'application a été réalisée sur **Figma** avant le développement. Les exports sont disponibles dans le dossier [`maquette_figma/`](maquette_figma/).

Le logo a été créé avec **draw.io** et est fourni en deux résolutions : 192×192 px et 512×512 px (formats requis par le manifeste PWA).

---

## 10. Objectifs du projet (NSI)

Ce projet a été réalisé dans le cadre du cours **Numérique et Sciences Informatiques (NSI) — Terminale**, avec pour objectif d'explorer l'utilisation d'APIs externes dans une application web.

### Objectifs atteints ✅

- [x] Connecter plusieurs APIs différentes (OpenFoodFacts + Hugging Face)
- [x] Différents thèmes (clair / sombre)
- [x] Application téléchargeable (PWA installable)
- [x] Optimisation de l'intégration OpenFoodFacts
- [x] Ajout d'une licence sur le site
- [x] Création d'un logo

### APIs étudiées et évaluées

| Statut | API / Idée |
|---|---|
| ✅ Retenu | OpenFoodFacts - données nutritionnelles |
| ✅ Retenu | Hugging Face - IA conversationnelle |
| ⚠️ Potentiel | Spotify / Deezer / YouTube - musique d'entraînement |
| ❌ Refusé | API météo / qualité de l'air |
| ❌ Refusé | API de trading |
| ❌ Refusé | API de reconnaissance de plaques d'immatriculation |
| ❌ Refusé | APIs d'images |
| ❌ Refusé | APIs de cybersécurité |

---

## 11. Licence

Ce projet est distribué sous licence **MIT**.

```
MIT License — Copyright (c) 2026 gtdevrandom

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.
```

Voir le fichier [LICENSE](LICENSE) pour le texte complet.
