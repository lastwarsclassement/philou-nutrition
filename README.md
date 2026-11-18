# Plan déficit — Philou

Site statique (HTML/CSS/JS, sans build) : journal des repas, suivi du poids, plan nutritionnel et tableau des aliments Ciqual 2025.
Pas de connexion : les données sont stockées dans Supabase et accessibles avec la clé publique (toute personne ayant le lien peut les voir et les modifier).

## Mise en place
1. Créer un projet Supabase, puis exécuter `schema.sql` dans le SQL Editor.
2. Copier l'URL du projet et la clé **publishable/anon** dans `config.js` (jamais la clé secret/service_role).
3. Publier sur GitHub Pages (branche `main`, dossier racine).

## Données
- `data.js` : aliments du plan (tableaux du PDF) et journées types.
- `ciqual.js` : table Ciqual 2025 complète (3 479 aliments), Anses, licence Etalab 2.0, doi:10.57745/RDMHWY. Générée depuis `Table Ciqual 2025_FR_2025_11_03.xlsx`.
