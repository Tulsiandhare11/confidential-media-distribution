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
router.post('/', (req, res) => {
  const p = shareSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  const { photoId, tier, blurFaceIndexes, expiresInHours } = p.data;
  const viewerEmail = p.data.viewerEmail.toLowerCase();

  const photo = db
    .prepare('SELECT id, owner_id, title FROM photos WHERE id = ?AND deleted = 0')
    .get(photoId) as { id: number; owner_id: number; title: string } | undefined;
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  if (photo.owner_id !== req.user!.id) return res.status(403).json({ error: 'Not your photo' });

  if (viewerEmail === req.user!.email) {
    return res.status(400).json({ error: "Can't share with yourself" });
  }

  const existingViewer = db.prepare('SELECT id FROM users WHERE email = ?').get(viewerEmail) as
    | { id: number }
    | undefined;

  const expiresAt = expiresInHours ? Date.now() + expiresInHours * 3600_000 : null;

  db.prepare(
    `INSERT INTO shares (photo_id, viewer_id, viewer_email, tier, blur_faces_json, revoked, expires_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT(photo_id, viewer_id) DO UPDATE SET
       tier = excluded.tier,
       blur_faces_json = excluded.blur_faces_json,
       revoked = 0,
       expires_at = excluded.expires_at`
  ).run(photoId, existingViewer?.id ?? null, viewerEmail, tier, JSON.stringify(blurFaceIndexes ?? []), expiresAt);

  logEvent(photoId, 'shared', req.user!.id, { viewerEmail, tier });
  sendShareNotification(viewerEmail, photo.title);

  res.status(201).json({ message: `Shared with ${viewerEmail} (${tier})` });
});

// Who a photo is shared with (owner only)
router.get('/photo/:photoId', (req, res) => {
  const photo = db
    .prepare('SELECT id, owner_id FROM photos WHERE id = ? AND deleted = 0')
    .get(Number(req.params.photoId)) as { id: number; owner_id: number } | undefined;
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  if (photo.owner_id !== req.user!.id) return res.status(403).json({ error: 'Not your photo' });

  const rows = db
    .prepare(
      `SELECT s.id, s.tier, s.revoked, s.expires_at,
              COALESCE(u.name, '(pending signup)') AS name,
              COALESCE(u.email, s.viewer_email) AS email
       FROM shares s LEFT JOIN users u ON u.id = s.viewer_id
       WHERE s.photo_id = ?`
    )
    .all(photo.id);
  res.json({ shares: rows });
});

// Revoke
router.delete('/:shareId', (req, res) => {
  const share = db
    .prepare(
      `SELECT s.id, s.photo_id, p.owner_id FROM shares s JOIN photos p ON p.id = s.photo_id WHERE s.id = ?`
    )
    .get(Number(req.params.shareId)) as { id: number; photo_id: number; owner_id: number } | undefined;
  if (!share) return res.status(404).json({ error: 'Share not found' });
  if (share.owner_id !== req.user!.id) return res.status(403).json({ error: 'Not your photo' });

  db.prepare('UPDATE shares SET revoked = 1 WHERE id = ?').run(share.id);
  logEvent(share.photo_id, 'revoked', req.user!.id);
  res.json({ message: 'Access revoked' });
});

// Shared with me
router.get('/shared-with-me', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.id AS shareId, p.id AS photoId, p.title, s.tier, s.expires_at
       FROM shares s JOIN photos p ON p.id = s.photo_id
       WHERE (s.viewer_id = ? OR (s.viewer_id IS NULL AND s.viewer_email = ?))
         AND s.revoked = 0
          AND p.deleted = 0
         AND (s.expires_at IS NULL OR s.expires_at > ?)
       ORDER BY s.id DESC`
    )
    .all(req.user!.id, req.user!.email, Date.now());
  res.json({ shared: rows });
});

export default router;