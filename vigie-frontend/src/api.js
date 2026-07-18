const TOKEN_KEY = 'vigie_token';

// Origine réelle du backend (pour le snippet à embarquer sur le site du client —
// contrairement aux autres appels API, il ne peut pas passer par le proxy Vite
// puisqu'il tourne sur le domaine du client, pas sur celui du dashboard).
export const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch { /* réponse vide, ex: 204 */ }

  if (!res.ok) {
    throw new Error(data?.error || 'Une erreur est survenue.');
  }
  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  getSites: () => request('/sites'),
  addSite: (payload) => request('/sites', { method: 'POST', body: payload }),
  deleteSite: (id) => request(`/sites/${id}`, { method: 'DELETE' }),
  getSiteHistory: (id) => request(`/sites/${id}/history`),
  getSiteVisitors: (id) => request(`/sites/${id}/visitors`),
  getSiteErrors: (id) => request(`/sites/${id}/errors`),
  getAlerts: () => request('/alerts')
};
