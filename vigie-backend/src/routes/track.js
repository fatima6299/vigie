import { Router } from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { sites, pageViews, clientErrors } from '../db/schema.js';

export const trackRouter = Router();

// Le script est embarqué sur le site du client (un autre domaine) : CORS ouvert nécessaire.
trackRouter.use(cors());

// Snippet à installer par le client : <script async src=".../tracker.js" data-site="SITE_ID"></script>
const TRACKER_SNIPPET = `(function () {
  var script = document.currentScript;
  var siteId = script && script.getAttribute('data-site');
  if (!siteId) return;
  var apiBase = script.src.replace(/\\/tracker\\.js.*$/, '');

  var VISITOR_KEY = 'vigie_visitor_id';
  var visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(VISITOR_KEY, visitorId);
  }

  function send(path, data) {
    var body = JSON.stringify(Object.assign({ siteId: siteId, visitorId: visitorId }, data));
    if (navigator.sendBeacon) {
      navigator.sendBeacon(apiBase + path, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(apiBase + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true });
    }
  }

  send('/api/track/pageview', { path: location.pathname, referrer: document.referrer || null });

  window.addEventListener('error', function (e) {
    send('/api/track/error', {
      message: e.message || 'Erreur inconnue',
      stack: e.error && e.error.stack ? e.error.stack : null,
      url: location.href
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    send('/api/track/error', {
      message: 'Promesse rejetée : ' + (reason && reason.message ? reason.message : String(reason)),
      stack: reason && reason.stack ? reason.stack : null,
      url: location.href
    });
  });
})();
`;

trackRouter.get('/tracker.js', (req, res) => {
  res.type('application/javascript').send(TRACKER_SNIPPET);
});

trackRouter.post('/api/track/pageview', async (req, res) => {
  const { siteId, visitorId, path, referrer } = req.body || {};
  if (!siteId || !visitorId || !path) return res.status(400).end();

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return res.status(404).end();

  await db.insert(pageViews).values({
    id: randomUUID(), siteId, visitorId, path,
    referrer: referrer || null,
    userAgent: req.headers['user-agent'] || null
  });
  res.status(204).end();
});

trackRouter.post('/api/track/error', async (req, res) => {
  const { siteId, visitorId, message, stack, url } = req.body || {};
  if (!siteId || !message) return res.status(400).end();

  const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
  if (!site) return res.status(404).end();

  await db.insert(clientErrors).values({
    id: randomUUID(), siteId, visitorId: visitorId || null, message,
    stack: stack || null, url: url || null,
    userAgent: req.headers['user-agent'] || null
  });
  res.status(204).end();
});
