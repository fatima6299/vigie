import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sites, checks, alerts } from '../db/schema.js';

const SLOW_THRESHOLD_MS = 1500;
const TIMEOUT_MS = 8000;

async function pingSite(url) {
  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'GET', redirect: 'follow', signal: controller.signal,
      headers: { 'User-Agent': 'Vigie-Monitor/0.2' }
    });
    clearTimeout(timeout);
    const responseTimeMs = Date.now() - startedAt;

    if (!res.ok) return { status: 'down', responseTimeMs, detail: `HTTP ${res.status}` };
    if (responseTimeMs > SLOW_THRESHOLD_MS) return { status: 'lent', responseTimeMs, detail: null };
    return { status: 'up', responseTimeMs, detail: null };
  } catch (err) {
    const responseTimeMs = Date.now() - startedAt;
    const detail = err.name === 'AbortError' ? 'délai dépassé' : err.message;
    return { status: 'down', responseTimeMs, detail };
  }
}

// TODO production : remplacer par un envoi réel (API WhatsApp Business / Twilio).
// Pour l'instant, on trace l'alerte en base — le canal d'envoi réel se branche ici.
async function dispatchAlert({ tenantId, siteId, siteName, type, message }) {
  await db.insert(alerts).values({
    id: randomUUID(), tenantId, siteId, siteName, type, message, channel: 'whatsapp'
  });
  console.log(`[ALERTE ${type.toUpperCase()}] tenant=${tenantId} — ${message}`);
}

export async function runCheckCycle() {
  let activeSites;
  try {
    activeSites = await db.select().from(sites).where(eq(sites.isActive, true));
  } catch (err) {
    console.error('[checker] impossible de lire la liste des sites :', err.message);
    return;
  }

  for (const site of activeSites) {
    try {
      const previousStatus = site.status;
      const result = await pingSite(site.url);

      // Le site a pu être supprimé pendant qu'on l'interrogeait (fetch en cours) —
      // ces écritures échoueraient sinon avec une violation de clé étrangère et
      // arrêteraient tout le cycle pour les sites suivants.
      const [updated] = await db.update(sites).set({
        status: result.status,
        responseTimeMs: result.responseTimeMs,
        lastCheckAt: new Date().toISOString(),
        uptimeChecksTotal: site.uptimeChecksTotal + 1,
        uptimeChecksOk: site.uptimeChecksOk + (result.status !== 'down' ? 1 : 0)
      }).where(eq(sites.id, site.id)).returning();
      if (!updated) continue;

      await db.insert(checks).values({
        id: randomUUID(), siteId: site.id, status: result.status,
        responseTimeMs: result.responseTimeMs, detail: result.detail
      });

      if (previousStatus !== 'down' && result.status === 'down') {
        await dispatchAlert({
          tenantId: site.tenantId, siteId: site.id, siteName: site.name, type: 'panne',
          message: `${site.name} est injoignable${result.detail ? ' (' + result.detail + ')' : ''}`
        });
      }
      if (previousStatus === 'down' && result.status !== 'down') {
        await dispatchAlert({
          tenantId: site.tenantId, siteId: site.id, siteName: site.name, type: 'retour',
          message: `${site.name} est de nouveau en ligne`
        });
      }
    } catch (err) {
      console.error(`[checker] échec du cycle pour le site ${site.id} (${site.name}) :`, err.message);
    }
  }
}

export function startChecker(intervalMs = 15000) {
  runCheckCycle();
  return setInterval(runCheckCycle, intervalMs);
}
