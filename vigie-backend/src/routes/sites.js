import { Router } from 'express';
import { randomUUID } from 'crypto';
import { eq, and, desc, gte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sites, checks, alerts, tenants, pageViews, clientErrors } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

export const sitesRouter = Router();
sitesRouter.use(requireAuth); // toutes les routes ci-dessous exigent une session valide

const PLAN_LIMITS = { decouverte: 5, pro: 10, entreprise: Infinity };

sitesRouter.get('/', async (req, res) => {
  const { tenantId } = req.auth;
  const list = await db.select().from(sites)
    .where(eq(sites.tenantId, tenantId))
    .orderBy(desc(sites.createdAt));

  const withUptime = list.map(s => ({
    ...s,
    uptimePercent: s.uptimeChecksTotal
      ? Math.round((s.uptimeChecksOk / s.uptimeChecksTotal) * 1000) / 10
      : null
  }));
  res.json(withUptime);
});

sitesRouter.post('/', async (req, res) => {
  const { tenantId } = req.auth;
  const { name, url, checkIntervalSec } = req.body;

  if (!name || !url) {
    return res.status(400).json({ error: 'Le nom et l\'URL sont requis.' });
  }
  try { new URL(url); } catch {
    return res.status(400).json({ error: 'URL invalide.' });
  }

  // Vérification du quota selon le plan réel du tenant — c'est ici que le
  // modèle économique (Découverte / Pro / Entreprise) devient une vraie
  // contrainte.
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  const currentSites = await db.select().from(sites)
    .where(and(eq(sites.tenantId, tenantId), eq(sites.isActive, true)));

  const limit = PLAN_LIMITS[tenant?.plan] ?? PLAN_LIMITS.decouverte;
  if (currentSites.length >= limit) {
    return res.status(403).json({ error: 'Limite de sites atteinte pour votre offre actuelle.' });
  }

  const site = {
    id: randomUUID(),
    tenantId,
    name,
    url,
    status: 'en_attente',
    checkIntervalSec: checkIntervalSec || 60
  };
  await db.insert(sites).values(site);
  res.status(201).json(site);
});

sitesRouter.patch('/:id', async (req, res) => {
  const { tenantId } = req.auth;
  const { name, url } = req.body;

  const [site] = await db.select().from(sites)
    .where(and(eq(sites.id, req.params.id), eq(sites.tenantId, tenantId)));
  if (!site) return res.status(404).json({ error: 'Site introuvable.' });

  const updates = {};
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Le nom ne peut pas être vide.' });
    updates.name = name;
  }
  if (url !== undefined) {
    try { new URL(url); } catch { return res.status(400).json({ error: 'URL invalide.' }); }
    updates.url = url;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Rien à mettre à jour.' });
  }

  await db.update(sites).set(updates).where(eq(sites.id, site.id));
  const [updated] = await db.select().from(sites).where(eq(sites.id, site.id));
  res.json(updated);
});

sitesRouter.delete('/:id', async (req, res) => {
  const { tenantId } = req.auth;
  const [site] = await db.select().from(sites)
    .where(and(eq(sites.id, req.params.id), eq(sites.tenantId, tenantId)));

  if (!site) return res.status(404).json({ error: 'Site introuvable.' });

  await db.delete(sites).where(eq(sites.id, site.id));
  res.status(204).end();
});

sitesRouter.get('/:id/history', async (req, res) => {
  const { tenantId } = req.auth;
  const [site] = await db.select().from(sites)
    .where(and(eq(sites.id, req.params.id), eq(sites.tenantId, tenantId)));

  if (!site) return res.status(404).json({ error: 'Site introuvable.' });

  const history = await db.select().from(checks)
    .where(eq(checks.siteId, site.id))
    .orderBy(desc(checks.checkedAt))
    .limit(100);

  res.json(history);
});

// Statistiques de fréquentation collectées par le script de tracking embarqué
// (voir src/routes/track.js) — nombre de visiteurs uniques et pages les plus vues
// sur les 7 derniers jours.
sitesRouter.get('/:id/visitors', async (req, res) => {
  const { tenantId } = req.auth;
  const [site] = await db.select().from(sites)
    .where(and(eq(sites.id, req.params.id), eq(sites.tenantId, tenantId)));

  if (!site) return res.status(404).json({ error: 'Site introuvable.' });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent = await db.select().from(pageViews)
    .where(and(eq(pageViews.siteId, site.id), gte(pageViews.viewedAt, since)));

  const uniqueVisitors = new Set(recent.map(v => v.visitorId)).size;
  const pageCounts = {};
  for (const v of recent) pageCounts[v.path] = (pageCounts[v.path] || 0) + 1;
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));

  res.json({ uniqueVisitors, pageViews: recent.length, topPages });
});

// Erreurs JavaScript rencontrées par les visiteurs, remontées par le script de tracking.
sitesRouter.get('/:id/errors', async (req, res) => {
  const { tenantId } = req.auth;
  const [site] = await db.select().from(sites)
    .where(and(eq(sites.id, req.params.id), eq(sites.tenantId, tenantId)));

  if (!site) return res.status(404).json({ error: 'Site introuvable.' });

  const errors = await db.select().from(clientErrors)
    .where(eq(clientErrors.siteId, site.id))
    .orderBy(desc(clientErrors.occurredAt))
    .limit(20);

  res.json(errors);
});

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

alertsRouter.get('/', async (req, res) => {
  const { tenantId } = req.auth;
  const list = await db.select().from(alerts)
    .where(eq(alerts.tenantId, tenantId))
    .orderBy(desc(alerts.sentAt))
    .limit(50);
  res.json(list);
});
