import { readFileSync, writeFileSync, existsSync } from 'fs';

const DB_FILE = new URL('./data.json', import.meta.url);

function load() {
  if (!existsSync(DB_FILE)) {
    return { sites: [], alerts: [] };
  }
  return JSON.parse(readFileSync(DB_FILE, 'utf-8'));
}

function save(data) {
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let db = load();

export function getSites() {
  return db.sites;
}

export function addSite({ name, url }) {
  const site = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    url,
    status: 'en_attente',     // en_attente | up | down | lent
    responseTimeMs: null,
    lastCheckAt: null,
    uptimeChecksOk: 0,
    uptimeChecksTotal: 0,
    history: []               // { at, status, responseTimeMs }
  };
  db.sites.push(site);
  save(db);
  return site;
}

export function removeSite(id) {
  db.sites = db.sites.filter(s => s.id !== id);
  save(db);
}

export function updateSiteCheck(id, { status, responseTimeMs }) {
  const site = db.sites.find(s => s.id === id);
  if (!site) return null;

  site.status = status;
  site.responseTimeMs = responseTimeMs;
  site.lastCheckAt = new Date().toISOString();
  site.uptimeChecksTotal += 1;
  if (status === 'up' || status === 'lent') site.uptimeChecksOk += 1;

  site.history.push({ at: site.lastCheckAt, status, responseTimeMs });
  if (site.history.length > 100) site.history.shift(); // garde les 100 derniers checks

  save(db);
  return site;
}

export function addAlert(alert) {
  db.alerts.unshift({ id: Date.now().toString(36), at: new Date().toISOString(), ...alert });
  if (db.alerts.length > 50) db.alerts.pop();
  save(db);
}

export function getAlerts() {
  return db.alerts;
}
