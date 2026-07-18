import { useState, useEffect, useCallback, Fragment } from 'react';
import { api, API_ORIGIN } from '../api';
import { useAuth } from '../AuthContext';

const STATUS_LABELS = { up: 'En ligne', lent: 'Lent', down: 'En panne', en_attente: 'En attente' };
const STATUS_CLASSES = {
  up: 'text-teal', lent: 'text-amber', down: 'text-red', en_attente: 'text-text-muted'
};
const STATUS_DOT = {
  up: 'bg-teal', lent: 'bg-amber', down: 'bg-red', en_attente: 'bg-text-muted'
};

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.round(diff / 60)} min`;
  return `il y a ${Math.round(diff / 3600)} h`;
}

export default function Dashboard() {
  const { tenant, logout } = useAuth();
  const [sites, setSites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ name: '', url: '' });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [tracking, setTracking] = useState({}); // { [siteId]: { visitors, errors, loading } }

  const refresh = useCallback(async () => {
    try {
      const [sitesData, alertsData] = await Promise.all([api.getSites(), api.getAlerts()]);
      setSites(sitesData);
      setAlerts(alertsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleAddSite(e) {
    e.preventDefault();
    setFormError('');
    try {
      await api.addSite(form);
      setForm({ name: '', url: '' });
      refresh();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleDelete(id) {
    await api.deleteSite(id);
    refresh();
  }

  async function toggleExpand(id) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setTracking(t => ({ ...t, [id]: { ...t[id], loading: true } }));
    try {
      const [visitors, errors] = await Promise.all([api.getSiteVisitors(id), api.getSiteErrors(id)]);
      setTracking(t => ({ ...t, [id]: { visitors, errors, loading: false } }));
    } catch (err) {
      setTracking(t => ({ ...t, [id]: { error: err.message, loading: false } }));
    }
  }

  const upCount = sites.filter(s => s.status === 'up' || s.status === 'lent').length;
  const downCount = sites.filter(s => s.status === 'down').length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal shadow-[0_0_0_4px_var(--color-teal-dim)]" />
          <span className="font-display font-semibold text-lg">Vigie</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">{tenant?.name}</span>
          <button onClick={logout} className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Sites surveillés" value={sites.length} />
        <StatCard label="En ligne" value={upCount} />
        <StatCard label="En panne" value={downCount} />
        <StatCard label="Alertes envoyées" value={alerts.length} />
      </div>

      <section className="bg-ink-2 border border-line rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-line">
          <h2 className="font-display text-sm font-semibold">Sites surveillés</h2>
        </div>

        <form onSubmit={handleAddSite} className="flex gap-2 px-5 py-4 border-b border-line">
          <input
            placeholder="Nom (ex : Boutique en ligne)" required
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="flex-1 bg-ink-3 border border-line rounded-md px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-teal"
          />
          <input
            placeholder="https://exemple.sn" type="url" required
            value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            className="flex-1 bg-ink-3 border border-line rounded-md px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-teal"
          />
          <button type="submit" className="bg-teal text-[#08211B] font-medium rounded-md px-4 text-sm hover:bg-[#3ABE9E] transition-colors whitespace-nowrap">
            Ajouter ↗
          </button>
        </form>
        {formError && <p className="text-red text-xs px-5 pb-2">{formError}</p>}

        {loading ? (
          <p className="px-5 py-8 text-center text-text-muted text-sm">Chargement...</p>
        ) : sites.length === 0 ? (
          <p className="px-5 py-8 text-center text-text-muted text-sm">
            Aucun site surveillé pour l'instant. Ajoutez-en un ci-dessus.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-xs">
                <th className="text-left font-normal px-5 py-2.5">Site</th>
                <th className="text-left font-normal px-5 py-2.5">Statut</th>
                <th className="text-left font-normal px-5 py-2.5">Temps de réponse</th>
                <th className="text-left font-normal px-5 py-2.5">Disponibilité</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {sites.map(s => (
                <Fragment key={s.id}>
                  <tr className="border-t border-line">
                    <td className="px-5 py-3">
                      <button onClick={() => toggleExpand(s.id)} className="text-left hover:opacity-80 transition-opacity">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-text-muted text-xs">{s.url}</div>
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 ${STATUS_CLASSES[s.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s.status]}`} />
                        {STATUS_LABELS[s.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {s.responseTimeMs != null ? `${s.responseTimeMs} ms` : '—'}
                      <div className="text-text-muted text-xs">{timeAgo(s.lastCheckAt)}</div>
                    </td>
                    <td className="px-5 py-3">{s.uptimePercent != null ? `${s.uptimePercent}%` : '—'}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button onClick={() => toggleExpand(s.id)} className="text-text-muted hover:text-text-primary transition-colors mr-3" title="Visiteurs et erreurs">
                        {expandedId === s.id ? '▲' : '📊'}
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="text-text-muted hover:text-red transition-colors" title="Supprimer">✕</button>
                    </td>
                  </tr>
                  {expandedId === s.id && (
                    <tr className="border-t border-line bg-ink-3">
                      <td colSpan={5} className="px-5 py-4">
                        <SiteTracking site={s} data={tracking[s.id]} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-ink-2 border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line">
          <h2 className="font-display text-sm font-semibold">Alertes récentes</h2>
        </div>
        {alerts.length === 0 ? (
          <p className="px-5 py-8 text-center text-text-muted text-sm">Aucune alerte pour l'instant — tout va bien.</p>
        ) : (
          alerts.slice(0, 10).map(a => (
            <div key={a.id} className={`flex gap-3 px-5 py-3 text-sm border-t border-line first:border-t-0 ${a.type === 'panne' ? 'bg-red-dim' : 'bg-teal-dim'}`}>
              <span className="font-mono text-xs text-text-muted whitespace-nowrap">{timeAgo(a.sentAt)}</span>
              <span>{a.message}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-ink-2 border border-line rounded-lg p-4">
      <div className="text-xs text-text-secondary mb-1">{label}</div>
      <div className="font-display text-xl font-semibold">{value}</div>
    </div>
  );
}

function SiteTracking({ site, data }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script async src="${API_ORIGIN}/tracker.js" data-site="${site.id}"></script>`;

  function copySnippet() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="text-xs font-semibold text-text-secondary mb-2">
          Code à installer sur {site.name}
        </h3>
        <p className="text-xs text-text-muted mb-2">
          Collez cette balise juste avant &lt;/body&gt; pour suivre les visiteurs et les
          erreurs de ce site.
        </p>
        <div className="flex gap-2">
          <code className="flex-1 bg-ink-3 border border-line rounded-md px-3 py-2 text-xs overflow-x-auto whitespace-nowrap">
            {snippet}
          </code>
          <button
            onClick={copySnippet}
            className="bg-ink-3 border border-line rounded-md px-3 text-xs hover:border-teal transition-colors whitespace-nowrap"
          >
            {copied ? 'Copié ✓' : 'Copier'}
          </button>
        </div>

        {!data || data.loading ? (
          <p className="text-xs text-text-muted mt-4">Chargement...</p>
        ) : data.error ? (
          <p className="text-xs text-red mt-4">{data.error}</p>
        ) : (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-text-secondary mb-2">
              Fréquentation (7 derniers jours)
            </h3>
            <div className="flex gap-4 mb-2">
              <div>
                <div className="font-display text-lg font-semibold">{data.visitors.uniqueVisitors}</div>
                <div className="text-xs text-text-muted">visiteurs uniques</div>
              </div>
              <div>
                <div className="font-display text-lg font-semibold">{data.visitors.pageViews}</div>
                <div className="text-xs text-text-muted">pages vues</div>
              </div>
            </div>
            {data.visitors.topPages.length > 0 && (
              <ul className="text-xs text-text-secondary">
                {data.visitors.topPages.map(p => (
                  <li key={p.path} className="flex justify-between border-t border-line py-1">
                    <span className="truncate">{p.path}</span>
                    <span className="text-text-muted">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold text-text-secondary mb-2">Erreurs JavaScript récentes</h3>
        {!data || data.loading ? (
          <p className="text-xs text-text-muted">Chargement...</p>
        ) : data.error ? null : data.errors.length === 0 ? (
          <p className="text-xs text-text-muted">Aucune erreur remontée pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {data.errors.map(e => (
              <li key={e.id} className="bg-ink-3 border border-line rounded-md px-3 py-2 text-xs">
                <div className="text-red">{e.message}</div>
                <div className="text-text-muted mt-1">{e.url} — {timeAgo(e.occurredAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
