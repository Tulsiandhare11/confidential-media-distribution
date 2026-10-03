import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireVerified } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { sha256Hex } from '../services/crypto_service';
import { perceptualHash, hammingDistanceHex } from '../services/hash_service';

const router = Router();
router.use(requireAuth, requireVerified);

const MATCH_THRESHOLD = 10; // out of 64 bits; tune if needed

router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    const sha256 = sha256Hex(req.file.buffer);
    const phash = await perceptualHash(req.file.buffer);

    // 1. Exact match: same hash exists in the vault
    const exact = await db.get<{
      id: number;
      title: string;
      ownerName: string;
    }>(
      `SELECT p.id, p.title, u.name AS "ownerName"
       FROM photos p JOIN users u ON u.id = p.owner_id
       WHERE p.sha256 = ? AND p.deleted = 0`,
      sha256
    );

    if (exact) {
      return res.json({
        result: 'exact_match',
        message: 'This is an untouched original from the vault.',
        photoId: exact.id,
        title: exact.title,
        owner: exact.ownerName,
      });
    }

    // 2. Perceptual match: a modified or re-compressed copy of something in the vault
    const all = await db.all<{
      id: number;
      title: string;
      phash: string | null;
      ownerName: string;
    }>(
      `SELECT p.id, p.title, p.phash, u.name AS "ownerName"
       FROM photos p JOIN users u ON u.id = p.owner_id
       WHERE p.deleted = 0`
    );

    let best: { id: number; title: string; distance: number; ownerName: string } | null = null;
    for (const row of all) {
      if (!row.phash) continue;
      const distance = hammingDistanceHex(phash, row.phash);
      if (!best || distance < best.distance) {
        best = { id: row.id, title: row.title, distance, ownerName: row.ownerName };
      }
    }

    if (best && best.distance <= MATCH_THRESHOLD) {
      return res.json({
        result: 'modified_copy',
        message: 'This looks like an edited or re-compressed copy of a vault photo.',
        photoId: best.id,
        title: best.title,
        owner: best.ownerName,
        similarity: `${Math.round(((64 - best.distance) / 64) * 100)}%`,
      });
    }

    res.json({ result: 'no_match', message: 'No matching photo found in the vault.' });
  } catch (e) {
    next(e);
  }
});

export default router;