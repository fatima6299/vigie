import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getSites, addSite, removeSite, updateSiteCheck,
  addAlert, getAlerts
} from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CHECK_INTERVAL_MS = 15000;   // vérifie chaque site toutes les 15s (démo)
const SLOW_THRESHOLD_MS = 1500;    // au-delà, on considère le site "lent"
const TIMEOUT_MS = 8000;

// --- Le coeur du produit : vérifie un site et renvoie son état ---
async function checkSite(site) {
  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(site.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Vigie-Monitor/0.1' }
    });
    clearTimeout(timeout);

    const responseTimeMs = Date.now() - startedAt;

    if (!res.ok) {
      return { status: 'down', responseTimeMs, detail: `HTTP ${res.status}` };
    }
    if (responseTimeMs > SLOW_THRESHOLD_MS) {
      return { status: 'lent', responseTimeMs, detail: null };
    }
    return { status: 'up', responseTimeMs, detail: null };

  } catch (err) {
    const responseTimeMs = Date.now() - startedAt;
    const detail = err.name === 'AbortError' ? 'délai dépassé' : err.message;
    return { status: 'down', responseTimeMs, detail };
  }
}

// --- La boucle de supervision : tourne en continu pour tous les sites ---
async function runCheckCycle() {
  const sites = getSites();
  for (const site of sites) {
    const previousStatus = site.status;
    const result = await checkSite(site);
    const updated = updateSiteCheck(site.id, {
      status: result.status,
      responseTimeMs: result.responseTimeMs
    });

    // Déclenche une alerte uniquement sur un CHANGEMENT d'état (pas à chaque check)
    if (previousStatus !== 'down' && result.status === 'down') {
      addAlert({
        siteId: site.id,
        siteName: site.name,
        type: 'panne',
        message: `${site.name} est injoignable${result.detail ? ' (' + result.detail + ')' : ''}`
      });
      console.log(`[ALERTE WHATSAPP - simulation] ${site.name} est tombé en panne.`);
    }
    if (previousStatus === 'down' && (result.status === 'up' || result.status === 'lent')) {
      addAlert({
        siteId: site.id,
        siteName: site.name,
        type: 'retour',
        message: `${site.name} est de nouveau en ligne`
      });
      console.log(`[ALERTE WHATSAPP - simulation] ${site.name} est de retour en ligne.`);
    }
  }
}

setInterval(runCheckCycle, CHECK_INTERVAL_MS);
runCheckCycle(); // premier passage immédiat au démarrage

// --- API ---
app.get('/api/sites', (req, res) => {
  const sites = getSites().map(s => ({
    ...s,
    uptimePercent: s.uptimeChecksTotal
      ? Math.round((s.uptimeChecksOk / s.uptimeChecksTotal) * 1000) / 10
      : null
  }));
  res.json(sites);
});

app.post('/api/sites', (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Le nom et l\'URL sont requis.' });
  }
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'URL invalide.' });
  }
  const site = addSite({ name, url });
  res.status(201).json(site);
});

app.delete('/api/sites/:id', (req, res) => {
  removeSite(req.params.id);
  res.status(204).end();
});

app.get('/api/alerts', (req, res) => {
  res.json(getAlerts());
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Vigie prototype en écoute sur http://localhost:${PORT}`);
  console.log(`Vérification toutes les ${CHECK_INTERVAL_MS / 1000}s`);
});
