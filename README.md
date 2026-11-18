# Plan déficit — Philou

Site statique (HTML/CSS/JS, sans build) : journal des repas, suivi du poids, plan nutritionnel et tableau des aliments Ciqual 2025.
Plusieurs utilisateurs (e-mail + mot de passe). Chacun a son profil, ses consignes et ses données, isolés par Row Level Security dans Supabase. À la première connexion : création du profil (calcul Mifflin–St Jeor, ou « Plan de Philou » issu du PDF).

## Mise en place
1. Créer un projet Supabase, puis exécuter `schema.sql` dans le SQL Editor.
2. Copier l'URL du projet et la clé **publishable/anon** dans `config.js` (jamais la clé secret/service_role).
3. Supabase > Authentication > Sign In / Providers : désactiver « Confirm email » (l'envoi d'e-mails gratuit de Supabase ne fonctionne que pour les membres de l'équipe).
4. Publier sur GitHub Pages (branche `main`, dossier racine).

## Données
- `data.js` : aliments du plan (tableaux du PDF) et journées types.
- `ciqual.js` : table Ciqual 2025 complète (3 479 aliments), Anses, licence Etalab 2.0, doi:10.57745/RDMHWY. Générée depuis `Table Ciqual 2025_FR_2025_11_03.xlsx`.
