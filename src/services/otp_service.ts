import { randomInt } from 'node:crypto';
import { db } from '../db';

export async function createStepUpCode(userId: number, photoId: number): Promise<string> {
  const code = String(randomInt(100000, 1000000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  await db.run(
    'INSERT INTO step_up_codes (user_id, photo_id, code, expires_at) VALUES (?, ?, ?, ?)',
    userId,
    photoId,
    code,
    expiresAt
  );
  console.log(`[step-up] code for user ${userId} on photo ${photoId}: ${code}`);
  return code;
}

export async function verifyStepUpCode(
  userId: number,
  photoId: number,
  code: string
): Promise<boolean> {
  const row = await db.get<{ id: number }>(
    `SELECT id FROM step_up_codes
     WHERE user_id = ? AND photo_id = ? AND code = ? AND used = 0 AND expires_at > ?
     ORDER BY id DESC LIMIT 1`,
    userId,
    photoId,
    code,
    Date.now()
  );
  if (!row) return false;
  await db.run('UPDATE step_up_codes SET used = 1 WHERE id = ?', row.id);
  return true;
}