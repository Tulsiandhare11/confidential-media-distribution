import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { getTimeline } from '../services/audit_service';

const router = Router();
router.use(requireAuth, requireVerified);

router.get('/:photoId', (req, res) => {
  const photoId = Number(req.params.photoId);
  const photo = db.prepare('SELECT owner_id FROM photos WHERE id = ?').get(photoId) as
    | { owner_id: number }
    | undefined;
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
 const isOwner = photo.owner_id === req.user!.id;
const hasShare = db.prepare(
  `SELECT 1 FROM shares WHERE photo_id = ? AND (viewer_id = ? OR (viewer_id IS NULL AND viewer_email = ?)) AND revoked = 0`
).get(photoId, req.user!.id, req.user!.email);
if (!isOwner && !hasShare) return res.status(403).json({ error: 'Not authorized' });

  res.json({ timeline: getTimeline(photoId) });
});

export default router;