import 'dotenv/config';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { sitesRouter, alertsRouter } from './routes/sites.js';
import { trackRouter } from './routes/track.js';
import { startChecker } from './jobs/checker.js';

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/alerts', alertsRouter);
app.use(trackRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Vigie backend en écoute sur http://localhost:${PORT}`);
  startChecker(15000);
  console.log('Moteur de vérification démarré (cycle toutes les 15s).');
});
