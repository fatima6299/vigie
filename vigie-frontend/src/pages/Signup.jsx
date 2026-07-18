import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm bg-ink-2 border border-line rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-teal shadow-[0_0_0_4px_var(--color-teal-dim)]" />
          <span className="font-display font-semibold text-lg">Vigie</span>
        </div>

        <h1 className="font-display text-2xl font-semibold mb-1 text-center">Créer un compte</h1>
        <p className="text-text-secondary text-sm mb-8 text-center">
          Commencez à surveiller vos sites en quelques minutes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required placeholder="Nom de votre entreprise"
            value={form.companyName} onChange={update('companyName')}
            className="w-full bg-ink border border-line rounded-md px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal-dim transition-shadow"
          />
          <input
            type="email" required placeholder="votre@email.com"
            value={form.email} onChange={update('email')}
            className="w-full bg-ink border border-line rounded-md px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal-dim transition-shadow"
          />
          <input
            type="tel" placeholder="Téléphone (pour les alertes WhatsApp)"
            value={form.phone} onChange={update('phone')}
            className="w-full bg-ink border border-line rounded-md px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal-dim transition-shadow"
          />
          <input
            type="password" required placeholder="Mot de passe (8 caractères min.)"
            value={form.password} onChange={update('password')}
            className="w-full bg-ink border border-line rounded-md px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal-dim transition-shadow"
          />
          {error && <p className="text-red text-xs">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-teal text-white font-medium rounded-md py-2.5 text-sm hover:bg-teal-strong transition-colors disabled:opacity-60 shadow-sm"
          >
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Déjà un compte ? <Link to="/connexion" className="text-teal hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
