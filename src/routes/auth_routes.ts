import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { db } from '../db';
import { config } from '../config';
import { requireAuth } from '../middleware/auth';
import { sendVerificationCode } from '../services/mail_service';
import { generateKemKeypair, generateDsaKeypair, sealSecretKey } from '../services/crypto_service';

const router = Router();

const signupSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});
const verifySchema = z.object({ email: z.string().email(), code: z.string().length(6) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/signup', async (req, res) => {
  const p = signupSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });

  const { name, password } = p.data;
  const email = p.data.email.toLowerCase();

  const existing = await db.get<{ id: number; verified: number }>(
    'SELECT id, verified FROM users WHERE email = ?', email
  );
  if (existing) {
    if (existing.verified) return res.status(409).json({ error: 'Email already registered' });
    const code = String(randomInt(100000, 1000000));
    const expires = Date.now() + 15 * 60 * 1000;
    await db.run('UPDATE users SET verify_code = ?, verify_expires = ? WHERE id = ?', code, expires, existing.id);
    await sendVerificationCode(email, code);
    return res.status(200).json({ message: 'Still unverified — new code sent.', ...(config.isProd ? {} : { devCode: code }) });
  }

  const hash = await bcrypt.hash(password, 10);
  const code = String(randomInt(100000, 1000000));
  const expires = Date.now() + 15 * 60 * 1000;

  const kem = generateKemKeypair();
  const dsa = generateDsaKeypair();

  await db.run(
    `INSERT INTO users (name, email, password_hash, verify_code, verify_expires, kem_public, kem_secret_enc, dsa_public, dsa_secret_enc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    name, email, hash, code, expires,
    kem.publicKey.toString('base64'),
    sealSecretKey(kem.secretKey),
    dsa.publicKey.toString('base64'),
    sealSecretKey(dsa.secretKey)
  );

  await sendVerificationCode(email, code);

  res.status(201).json({
    message: 'Account created. Enter the verification code we sent you.',
    ...(config.isProd ? {} : { devCode: code }),
  });
});

router.post('/verify', async (req, res) => {
  const p = verifySchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });

  const email = p.data.email.toLowerCase();
  const user = await db.get<{ id: number; verify_code: string | null; verify_expires: number | null }>(
    'SELECT id, verify_code, verify_expires FROM users WHERE email = ?', email
  );

  if (!user || !user.verify_code || user.verify_code !== p.data.code) {
    return res.status(400).json({ error: 'Invalid code' });
  }
  if (!user.verify_expires || Date.now() > user.verify_expires) {
    return res.status(400).json({ error: 'Code expired' });
  }

  await db.run('UPDATE users SET verified = 1, verify_code = NULL, verify_expires = NULL WHERE id = ?', user.id);
  res.json({ message: 'Account verified' });
});

router.post('/resend-verification', async (req, res) => {
  const p = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Valid email is required' });

  const email = p.data.email.toLowerCase();
  const user = await db.get<{ id: number; verified: number }>(
    'SELECT id, verified FROM users WHERE email = ?', email
  );
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.verified) return res.status(400).json({ error: 'Account is already verified' });

  const code = String(randomInt(100000, 1000000));
  const expires = Date.now() + 15 * 60 * 1000;

  await db.run('UPDATE users SET verify_code = ?, verify_expires = ? WHERE id = ?', code, expires, user.id);
  await sendVerificationCode(email, code);

  return res.json({
    message: 'A new verification code was sent.',
    ...(config.isProd ? {} : { devCode: code })
  });
});

router.post('/login', async (req, res) => {
  const p = loginSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });

  const user = await db.get<{ id: number; name: string; email: string; password_hash: string; verified: number }>(
    'SELECT id, name, email, password_hash, verified FROM users WHERE email = ?', p.data.email.toLowerCase()
  );

  if (!user || !(await bcrypt.compare(p.data.password, user.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }

  await db.run('UPDATE shares SET viewer_id = ? WHERE viewer_email = ? AND viewer_id IS NULL', user.id, user.email);

  const token = jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, verified: user.verified === 1 },
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;