# Vigie — Prototype

Prototype fonctionnel de supervision de sites web : vérifie réellement la
disponibilité de sites en continu, détecte les pannes, et déclenche des
alertes (simulées dans la console pour l'instant — à connecter à WhatsApp
Business API ou Twilio pour la vraie version).

## Lancer le prototype

```bash
npm install
npm start
```

Puis ouvre http://localhost:3000 dans ton navigateur.

## Comment ça marche

- `server.js` contient le moteur de vérification : toutes les 15 secondes,
  chaque site enregistré est appelé via `fetch()`. Le temps de réponse et le
  code HTTP déterminent le statut (`up`, `lent`, `down`).
- Une alerte n'est déclenchée que sur un **changement d'état** (up → down ou
  down → up), pas à chaque vérification — sinon tu serais alerté toutes les
  15 secondes.
- `store.js` sauvegarde tout dans un simple fichier `data.json` (pas besoin de
  base de données pour un prototype). Pour la vraie version multi-clients, il
  faudra migrer vers PostgreSQL ou MongoDB avec un vrai système de comptes.
- `public/index.html` est le dashboard : il interroge l'API toutes les 5
  secondes et affiche l'état de chaque site, avec un historique d'alertes.

## Ce qu'il reste à faire pour une vraie V1

1. **Alertes réelles** : brancher l'API WhatsApp Business (ou Twilio) à
   l'endroit marqué `[ALERTE WHATSAPP - simulation]` dans `server.js`.
2. **Comptes utilisateurs** : chaque client doit avoir son propre espace
   (actuellement tous les sites sont partagés, pas de notion de compte).
3. **Vraie base de données** : remplacer `data.json` par PostgreSQL/MongoDB
   pour supporter plusieurs clients en même temps sans conflit d'écriture.
4. **Paiement** : intégration Wave / Orange Money pour les abonnements.
5. **Vérification SSL** : ajouter un contrôle de la date d'expiration du
   certificat, en plus du simple check HTTP.
6. **Déploiement** : héberger ça sur un vrai serveur (Contabo, comme pour
   GATS) pour qu'il tourne 24/7, pas juste en local.

## Note sur les tests

Ce prototype a été testé avec un vrai site (github.com → détecté "en ligne")
et une URL invalide (→ détectée "en panne", alerte déclenchée). Les
vérifications HTTP nécessitent un accès internet normal — assure-toi que la
machine sur laquelle tu le lances a un accès réseau sortant sans restriction.
