import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import './db';
import authRoutes from './routes/auth_routes';
import multer from 'multer';
import photosRoutes from './routes/photos_routes';
import sharesRoutes from './routes/shares_auth';
import viewRoutes from './routes/view_routes';
import verifyRoutes from './routes/verify_routes';
import traceRoutes from './routes/trace_routes';
import stepupRoutes from './routes/stepup_routes';
import auditRoutes from './routes/audit_routes';




const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use('/photos', photosRoutes);
// after app.use('/photos', photosRoutes);
app.use('/shares', sharesRoutes);
app.use('/view', viewRoutes);
app.use('/verify', verifyRoutes);
app.use('/trace', traceRoutes);
app.use('/step-up', stepupRoutes);
app.use('/audit', auditRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError || err.message.startsWith('Only JPG')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(config.port, () => {
  console.log(`Vault API running on http://localhost:${config.port}`);
});