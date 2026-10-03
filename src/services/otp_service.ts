import { randomInt } from 'node:crypto';
import { db } from '../db';

export function createStepUpCode(userId: number, photoId: number): string {
  const code = String(randomInt(100000, 1000000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  db.prepare(
    'INSERT INTO step_up_codes (user_id, photo_id, code, expires_at) VALUES (?, ?, ?, ?)'
  ).run(userId, photoId, code, expiresAt);
  console.log(`[step-up] code for user ${userId} on photo ${photoId}: ${code}`);
  return code;
}

export function verifyStepUpCode(userId: number, photoId: number, code: string): boolean {
  const row = db
    .prepare(
      `SELECT id FROM step_up_codes
       WHERE user_id = ? AND photo_id = ? AND code = ? AND used = 0 AND expires_at > ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(userId, photoId, code, Date.now()) as { id: number } | undefined;
  if (!row) return false;
  db.prepare('UPDATE step_up_codes SET used = 1 WHERE id = ?').run(row.id);
  return true;
}