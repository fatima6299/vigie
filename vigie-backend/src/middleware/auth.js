import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-a-changer-en-production';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Tout ce qui suit dans la requête est automatiquement scopé à ce tenant —
    // c'est LA garantie d'isolation : aucune route ne doit jamais faire
    // confiance à un tenantId envoyé dans le corps de la requête par le client.
    req.auth = { userId: payload.userId, tenantId: payload.tenantId, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
}

export function signToken({ userId, tenantId, role }) {
  return jwt.sign({ userId, tenantId, role }, JWT_SECRET, { expiresIn: '7d' });
}
