import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { config } from '../config';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  verified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
    const row = await db.get<{ id: number; name: string; email: string; verified: number }>(
      'SELECT id, name, email, verified FROM users WHERE id = ?', Number(payload.sub)
    );
    if (!row) return res.status(401).json({ error: 'User not found' });
    req.user = { ...row, verified: row.verified === 1 };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.verified) {
    return res.status(403).json({ error: 'Verify your account first' });
  }
  next();
}