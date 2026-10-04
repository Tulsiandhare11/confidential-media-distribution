import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { config } from './config';
import './db';
import authRoutes from './routes/auth_routes';
import photosRoutes from './routes/photos_routes';
import sharesRoutes from './routes/shares_auth';
import viewRoutes from './routes/view_routes';
import verifyRoutes from './routes/verify_routes';
import traceRoutes from './routes/trace_routes';
import stepupRoutes from './routes/stepup_routes';
import auditRoutes from './routes/audit_routes';

const app = express();

// Render sits behind a proxy; set this before any rate limiter runs
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);
app.use('/photos', photosRoutes);
app.use('/shares', sharesRoutes);
app.use('/view', viewRoutes);
app.use('/verify', verifyRoutes);
app.use('/trace', traceRoutes);
app.use('/step-up', stepupRoutes);
app.use('/audit', auditRoutes);

// One error handler, always last
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('ERROR:', req.method, req.path, err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 40 MB)' });
    }
    return res.status(400).json({ error: err.message });
  }

  // Friendly upload validation messages
  if (/^Only JPG|^Images must/.test(err.message ?? '')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Server error' });
});

// Keep one forgotten "await" from taking the whole server down
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

app.listen(config.port, () => {
  console.log(`Vault API running on http://localhost:${config.port}`);
});