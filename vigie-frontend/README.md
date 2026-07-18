# Vigie Frontend

Tableau de bord React connecté au backend multi-tenant (`vigie-backend`).

## Démarrer

Le backend doit tourner en parallèle sur le port 3001 (voir son propre README).

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173. Les appels `/api/*` sont automatiquement
redirigés vers `http://localhost:3001` (configuré dans `vite.config.js`) —
aucune configuration supplémentaire nécessaire en développement.

## Structure

| Fichier | Rôle |
|---|---|
| `src/api.js` | Client API : gère le token JWT et tous les appels vers le backend |
| `src/AuthContext.jsx` | État global de connexion, persiste la session au rechargement de page |
| `src/pages/Signup.jsx` | Inscription (crée l'entreprise + le compte admin) |
| `src/pages/Login.jsx` | Connexion |
| `src/pages/Dashboard.jsx` | Tableau de bord : sites, ajout, suppression, alertes — rafraîchi toutes les 5s |
| `src/App.jsx` | Routes protégées (redirige vers `/connexion` si non connecté) |

## Design

Reprend l'identité visuelle définie pour Vigie (encre navy, accents teal/ambre
liés au statut des sites), avec Tailwind CSS v4 configuré via `@theme` dans
`src/index.css` pour que les couleurs restent cohérentes avec la landing page
et les maquettes précédentes.

## Testé

- Build de production (`npm run build`) : compile sans erreur
- Proxy `/api` vers le backend : vérifié en conditions réelles (connexion via
  le proxy Vite, token JWT renvoyé correctement)

## Pour le déploiement en production

En production, le frontend et le backend ne tournent généralement pas sur le
même serveur avec un simple proxy Vite. Deux options :
1. Servir le build (`npm run build` → dossier `dist/`) comme fichiers
   statiques depuis le backend Express lui-même (`express.static`).
2. Héberger séparément (ex. Nginx pour le frontend) et configurer une vraie
   URL d'API via une variable d'environnement (`VITE_API_URL`) au lieu du
   proxy — actuellement le code suppose que `/api` est toujours sur la même
   origine, à ajuster si les deux sont hébergés séparément.
