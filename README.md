KaliFit — PWA Fitness & Nutrition Intelligence
==============================================

KaliFit est une Progressive Web App (PWA) dédiée à la nutrition, la performance sportive et l’optimisation intelligente.
Le nom KaliFit provient de Kalos Fitness (beauté et perfection en grec) combiné avec Fit (fitness et performance).

---

Table des matières
-----------------
1. [Fichiers du projet](#fichiers-du-projet)
2. [Idées d'APIs et Stratégie](#idées-dapis-et-strategie)
3. [APIs et Services utilisés](#apis-et-services-utilises)
4. [Fonctionnalités de KaliFit](#fonctionnalites-de-kalifit)
5. [APIs improbables et inutiles](#apis-improbables-et-inutiles)
6. [Références et Licence](#references-et-licence)

---

Fichiers du projet
------------------

Fichier                | Description
---------------------- | ----------------
manifest.json          | Configuration PWA
sw.js                  | Service Worker
index.html             | Structure principale
style.css              | Styles
script.js              | Logique front-end
api.js                 | Gestion des APIs
favicon.ico            | Icône
README.md              | Résumé du projet
LICENSE                | Licence MIT

---

Idées d'APIs et Stratégie
-------------------------

Statut  | API / Fonctionnalité
------- | --------------------
Refusé  | Site météo + qualité de l'air + autres informations
Refusé  | API de trading
Validé  | Intégration Spotify, Deezer, Soundcharts, YouTube mp3
Potentiel | YouTube, Twitch
Refusé  | IA ? (Explorer des fonctionnalités d'intelligence artificielle)
Potentiel | SMS
Gagnant  | Sports, alimentation (+IA ?)
Refusé  | Plaque d'immatriculation / véhicule
Refusé  | Images
Refusé  | Cybersécurité

Légende : Validé | Potentiel | Refusé | Gagnant

---

APIs et Services utilisés
------------------------

KaliFit repose sur une architecture robuste, privilégiant la sécurité des données et l'absence d'exposition de clés secrètes côté client.

Résumé des services
1. OpenFoodFacts : Recherche & Données nutritionnelles (publique, sans clé)
2. WGER : Exercices & Routines fitness (OAuth2, session utilisateur)
3. Google Gemini : Coach IA & Analyse prédictive (Firebase Auth, via Proxy Serverless)

Détails techniques
- OpenFoodFacts (Nutrition)
  Base de données mondiale.
  Usage : Recherche par nom ou scan code-barres.
  Accès libre.

- WGER (Sport)
  Accès à une bibliothèque d'exercices et suivi des performances.
  Authentification via OAuth2 pour préserver la vie privée.

- Google Gemini (IA)
  Génération de conseils et analyse de stagnation.
  
  Architecture sécurisée :
  - Le front-end envoie la requête à une Firebase Cloud Function
  - Vérification d'identité via Firebase Auth
  - Appel de l'API Gemini via variable d'environnement sécurisée
  - Retour uniquement de la réponse traitée

Note de sécurité : Aucune clé API sensible n'est présente côté client.

---

Fonctionnalités de KaliFit
--------------------------

1. Profil biométrique intelligent : Poids, taille, âge, sexe, objectif, calcul BMR/TDEE
2. Tracker nutrition automatique : Scan, macros, micronutriments et score qualité
3. Recommandations repas (IA) : Adaptées à l'entraînement du jour et aux objectifs
4. Planification hebdomadaire intelligente : Planning repas/entraînement avec ajustement automatique
5. Corrélation globale : Analyse sport/nutrition/sommeil pour éviter le surentraînement
6. Coach IA conversationnel : Réponses contextualisées aux questions utilisateur
7. Score de récupération : Indice 0–100 basé sur la charge et le repos
8. Suggestions d’optimisation : Conseils précis (ex : +15g protéines)
9. Objectifs dynamiques : Ajustement automatique des calories selon la progression
10. Dashboard analytics avancé : Évolution poids, ratio performance/calories, heatmap

---

APIs improbables et inutiles
---------------------------

Improbables :
- API génératrice d'insulte
- API génératrice de contenu à caractère sexuel

Inutiles :
- Recherche d'utilisateur GitHub
- Affichage aléatoire d'animaux

---

Références et Licence
--------------------

- Liste d'APIs gratuites : RapidAPI
- Licence : Ce projet est sous licence MIT
