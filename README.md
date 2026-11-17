# Plan déficit — Philou

Site statique (HTML/CSS/JS, sans build) : journal des repas, suivi du poids, plan nutritionnel et tableau des aliments Ciqual 2025.
Les données sont stockées dans Supabase (une ligne par utilisateur, protégée par Row Level Security).

## Mise en place
1. Créer un projet Supabase, puis exécuter `schema.sql` dans le SQL Editor.
2. Copier l'URL du projet et la clé **publishable/anon** dans `config.js` (jamais la clé secret/service_role).
3. Dans Supabase > Authentication > URL Configuration, mettre l'URL GitHub Pages en « Site URL ».
4. Publier sur GitHub Pages (branche `main`, dossier racine).
