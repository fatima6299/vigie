# Vigie Backend — Multi-tenant

Backend Node.js/Express avec Drizzle ORM sur PostgreSQL. Gère l'inscription des
entreprises clientes (tenants), l'authentification, la supervision des sites,
et le déclenchement des alertes.

## Démarrer

```bash
# Depuis la racine du projet : lance PostgreSQL en local via Docker
docker compose up -d

cd vigie-backend
npm install
cp .env.example .env
npx drizzle-kit generate   # génère la migration à partir du schéma
npx drizzle-kit migrate    # applique le schéma à la base
npm start                   # ou : node src/server.js
```

Le serveur écoute sur http://localhost:3001 et démarre automatiquement le
moteur de vérification (cycle toutes les 15 secondes).

## Tester rapidement (curl)

```bash
# Inscription
curl -X POST http://localhost:3001/api/auth/signup -H "Content-Type: application/json" \
  -d '{"companyName":"Ma Boutique","email":"moi@exemple.sn","password":"motdepasse123"}'
# → renvoie un token JWT

# Ajouter un site (remplacer TOKEN)
curl -X POST http://localhost:3001/api/sites -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" -d '{"name":"Mon site","url":"https://exemple.sn"}'

# Voir mes sites
curl http://localhost:3001/api/sites -H "Authorization: Bearer TOKEN"
```

## Architecture

| Fichier | Rôle |
|---|---|
| `src/db/schema.js` | Structure des tables : tenants, users, sites, checks, alerts |
| `src/db/client.js` | Connexion PostgreSQL (via `pg` + Drizzle) |
| `src/middleware/auth.js` | Vérifie le JWT et injecte `tenantId` dans chaque requête |
| `src/routes/auth.js` | Inscription / connexion |
| `src/routes/sites.js` | CRUD des sites, **toujours filtré par tenantId** |
| `src/jobs/checker.js` | Boucle de vérification qui tourne sur tous les tenants |

## Principe d'isolation multi-tenant

Chaque route (sauf `/api/auth/*`) exige un token JWT valide. Ce token
contient le `tenantId` de l'entreprise connectée, injecté automatiquement
dans `req.auth.tenantId` par le middleware. **Toutes les requêtes à la base
de données filtrent explicitement sur ce tenantId** — un client A ne peut
jamais voir ou modifier les données du client B, même en connaissant l'ID
d'un site qui ne lui appartient pas (vérifié dans `sitesRouter.delete` et
`.get('/:id/history')`).

Ce principe a été testé : deux entreprises inscrites séparément, chacune
voit strictement ses propres sites, et une requête sans token est rejetée
(401).

## Quotas par plan

Le nombre de sites autorisés dépend du plan réel du tenant (`sitesRouter.post`
dans `src/routes/sites.js`), lu depuis la table `tenants` :

```js
const PLAN_LIMITS = { decouverte: 1, pro: 10, entreprise: Infinity };
```

## Ce qui reste à faire

- Brancher une vraie API d'envoi (WhatsApp Business / Twilio) dans
  `dispatchAlert()` de `src/jobs/checker.js`
- Ajouter la vérification d'expiration SSL
- Passer le checker sur une file d'attente (BullMQ + Redis) quand le nombre
  de sites deviendra important, pour ne pas bloquer un cycle sur un site lent
- Endpoints de gestion du compte (changer le plan, inviter un membre d'équipe)
