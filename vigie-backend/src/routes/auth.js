import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tenants, users } from '../db/schema.js';
import { signToken } from '../middleware/auth.js';

export const authRouter = Router();

// Inscription : crée un tenant (l'entreprise) + son premier utilisateur (admin)
authRouter.post('/signup', async (req, res) => {
  const { companyName, email, password, phone } = req.body;

  if (!companyName || !email || !password) {
    return res.status(400).json({ error: 'Nom d\'entreprise, email et mot de passe requis.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
  }

  const tenantId = randomUUID();
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(tenants).values({ id: tenantId, name: companyName, plan: 'decouverte' });
  await db.insert(users).values({
    id: userId, tenantId, email, passwordHash, role: 'admin', phone: phone || null
  });

  const token = signToken({ userId, tenantId, role: 'admin' });
  res.status(201).json({
    token,
    user: { id: userId, email, role: 'admin' },
    tenant: { id: tenantId, name: companyName, plan: 'decouverte' }
  });
});

// Connexion
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId));
  const token = signToken({ userId: user.id, tenantId: user.tenantId, role: user.role });

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
    tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan }
  });
});
