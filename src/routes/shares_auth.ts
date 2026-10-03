import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { logEvent } from '../services/audit_service';
import { sendShareNotification } from '../services/mail_service';

const router = Router();
router.use(requireAuth, requireVerified);

const shareSchema = z.object({
  photoId: z.coerce.number().int(),
  viewerEmail: z.string().email(),
  tier: z.enum(['full', 'blurred', 'redacted', 'public_safe']),
  blurFaceIndexes: z.array(z.number().int()).optional(),
  expiresInHours: z.number().int().positive().optional(),
});

// Create or update a share
router.post('/', async (req, res, next) => {
  try {
    const p = shareSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
    const { photoId, tier, blurFaceIndexes, expiresInHours } = p.data;
    const viewerEmail = p.data.viewerEmail.trim().toLowerCase();

    const photo = await db.get<{ id: number; owner_id: number; title: string }>(
      'SELECT id, owner_id, title FROM photos WHERE id = ? AND deleted = 0',
      photoId
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    if (photo.owner_id !== req.user!.id) return res.status(403).json({ error: 'Not your photo' });

    if (viewerEmail === req.user!.email.toLowerCase()) {
      return res.status(400).json({ error: "Can't share with yourself" });
    }

    const existingViewer = await db.get<{ id: number }>(
      'SELECT id FROM users WHERE lower(email) = ?',
      viewerEmail
    );

    const expiresAt = expiresInHours ? Date.now() + expiresInHours * 3600_000 : null;
   const existingShare = await db.get<{ id: number }>(
  `SELECT id FROM shares WHERE photo_id = ? AND (
     (viewer_id IS NOT NULL AND viewer_id = ?) OR
     (viewer_id IS NULL AND viewer_email = ?)
   )`,
  photoId, existingViewer?.id ?? -1, viewerEmail
);

if (existingShare) {
  await db.run(
    `UPDATE shares SET tier = ?, blur_faces_json = ?, revoked = 0, expires_at = ? WHERE id = ?`,
    tier, JSON.stringify(blurFaceIndexes ?? []), expiresAt, existingShare.id
  );
} else {
  await db.run(
    `INSERT INTO shares (photo_id, viewer_id, viewer_email, tier, blur_faces_json, revoked, expires_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    photoId, existingViewer?.id ?? null, viewerEmail, tier, JSON.stringify(blurFaceIndexes ?? []), expiresAt
  );
}
   
    await logEvent(photoId, 'shared', req.user!.id, { viewerEmail, tier });

    // don't let a mail failure break the share
    Promise.resolve(sendShareNotification(viewerEmail, photo.title)).catch((err) =>
      console.error('share notification failed:', err)
    );

    res.status(201).json({ message: `Shared with ${viewerEmail} (${tier})` });
  } catch (e) {
    next(e);
  }
});

// Who a photo is shared with (owner only)
router.get('/photo/:photoId', async (req, res, next) => {
  try {
    const photo = await db.get<{ id: number; owner_id: number }>(
      'SELECT id, owner_id FROM photos WHERE id = ? AND deleted = 0',
      Number(req.params.photoId)
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    if (photo.owner_id !== req.user!.id) return res.status(403).json({ error: 'Not your photo' });

    const rows = await db.all(
      `SELECT s.id, s.tier, s.revoked, s.expires_at,
              COALESCE(u.name, '(pending signup)') AS name,
              COALESCE(u.email, s.viewer_email) AS email
       FROM shares s LEFT JOIN users u ON u.id = s.viewer_id
       WHERE s.photo_id = ?`,
      photo.id
    );
    res.json({ shares: rows });
  } catch (e) {
    next(e);
  }
});

// Revoke
router.delete('/:shareId', async (req, res, next) => {
  try {
    const share = await db.get<{ id: number; photo_id: number; owner_id: number }>(
      `SELECT s.id, s.photo_id, p.owner_id
       FROM shares s JOIN photos p ON p.id = s.photo_id
       WHERE s.id = ?`,
      Number(req.params.shareId)
    );
    if (!share) return res.status(404).json({ error: 'Share not found' });
    if (share.owner_id !== req.user!.id) return res.status(403).json({ error: 'Not your photo' });

    await db.run('UPDATE shares SET revoked = 1 WHERE id = ?', share.id);
    await logEvent(share.photo_id, 'revoked', req.user!.id);
    res.json({ message: 'Access revoked' });
  } catch (e) {
    next(e);
  }
});

// Shared with me
router.get('/shared-with-me', async (req, res, next) => {
  try {
    const rows = await db.all(
      `SELECT s.id AS shareId, p.id AS photoId, p.title, s.tier, s.expires_at,
       u.name AS "senderName", u.email AS "senderEmail"
       FROM shares s
       JOIN photos p ON p.id = s.photo_id
       JOIN users u ON u.id = p.owner_id
       WHERE (s.viewer_id = ? OR lower(s.viewer_email) = lower(?))
         AND s.revoked = 0
         AND p.deleted = 0
         AND (s.expires_at IS NULL OR s.expires_at > ?)
       ORDER BY s.id DESC`,
      req.user!.id,
      req.user!.email,
      Date.now()
    );
    res.json({ shared: rows });
  } catch (e) {
    next(e);
  }
});

export default router;