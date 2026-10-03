import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { getTimeline } from '../services/audit_service';

const router = Router();
router.use(requireAuth, requireVerified);

router.get('/:photoId', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    if (!Number.isInteger(photoId)) {
      return res.status(400).json({ error: 'Invalid photo id' });
    }

    const photo = await db.get<{ owner_id: number }>(
      'SELECT owner_id FROM photos WHERE id = ?', photoId
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const isOwner = photo.owner_id === req.user!.id;

    const hasShare = await db.get<{ one: number }>(
      `SELECT 1 AS one FROM shares
       WHERE photo_id = ?
         AND (viewer_id = ? OR (viewer_id IS NULL AND lower(viewer_email) = lower(?)))
         AND revoked = 0`,
      photoId, req.user!.id, req.user!.email
    );

    if (!isOwner && !hasShare) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ timeline: await getTimeline(photoId) });
  } catch (e) {
    next(e);
  }
});

export default router;