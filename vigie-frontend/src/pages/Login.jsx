import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-teal shadow-[0_0_0_4px_var(--color-teal-dim)]" />
          <span className="font-display font-semibold text-lg">Vigie</span>
        </div>

        <h1 className="font-display text-2xl font-semibold mb-1 text-center">Connexion</h1>
        <p className="text-text-secondary text-sm mb-8 text-center">
          Accédez au tableau de bord de vos sites surveillés.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email" required placeholder="votre@email.com"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-ink-2 border border-line rounded-md px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-teal"
          />
          <input
            type="password" required placeholder="Mot de passe"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-ink-2 border border-line rounded-md px-3 py-2.5 text-sm placeholder:text-text-muted focus:outline-none focus:border-teal"
          />
          {error && <p className="text-red text-xs">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-teal text-[#08211B] font-medium rounded-md py-2.5 text-sm hover:bg-[#3ABE9E] transition-colors disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Pas encore de compte ? <Link to="/inscription" className="text-teal hover:underline">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
