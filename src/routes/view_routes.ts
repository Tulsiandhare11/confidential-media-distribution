import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { viewerUrl, fetchTransformedImage } from '../services/cloudinary_service';
import { embedId } from '../services/stego_service';
import { logEvent } from '../services/audit_service';

const router = Router();
router.use(requireAuth, requireVerified);

// Returns a Cloudinary URL as JSON (used for previews / quick checks)
router.get('/:photoId', (req, res) => {
  const photoId = Number(req.params.photoId);
  const viewerId = req.user!.id;

   const photo = db
    .prepare('SELECT id, owner_id, cloud_public_id, faces_json, deleted FROM photos WHERE id = ?')
    .get(photoId) as
    | { id: number; owner_id: number; cloud_public_id: string; faces_json: string; deleted: number }
    | undefined;
  if (!photo || photo.deleted) return res.status(404).json({ error: 'Photo not found' });

  if (photo.owner_id === viewerId) {
    return res.json({ url: viewerUrl(photo.cloud_public_id, {}), tier: 'full' });
  }

   const share = db
    .prepare(
      `SELECT tier, blur_faces_json, revoked, expires_at FROM shares
       WHERE photo_id = ? AND (viewer_id = ? OR (viewer_id IS NULL AND viewer_email = ?))`
    )
    .get(photoId, viewerId, req.user!.email) as
    | { tier: string; blur_faces_json: string; revoked: number; expires_at: number | null }
    | undefined;

  if (!share || share.revoked) return res.status(403).json({ error: 'Access denied' });
  if (share.expires_at && Date.now() > share.expires_at) {
    return res.status(403).json({ error: 'Access expired' });
  }

  const faces: number[][] = JSON.parse(photo.faces_json || '[]');
  const blurIndexes: number[] = JSON.parse(share.blur_faces_json || '[]');
  const blurRegions = blurIndexes.length ? blurIndexes.map((i) => faces[i]).filter(Boolean) : undefined;

  const url = viewerUrl(photo.cloud_public_id, {
  blurAll: ['blurred', 'redacted'].includes(share.tier) && !blurRegions,
  blurRegions,
  lowQuality: share.tier === 'public_safe',
  redactText: share.tier === 'redacted' || share.tier === 'public_safe',
  watermarkName: req.user!.name,
});

  db.prepare('INSERT INTO access_log (photo_id, viewer_id) VALUES (?, ?)').run(photoId, viewerId);

  res.json({ url, tier: share.tier });
});

// Returns actual watermarked+traceable image bytes
router.get('/:photoId/image', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    const viewerId = req.user!.id;

         const photo = db
    .prepare('SELECT id, owner_id, cloud_public_id, faces_json, deleted FROM photos WHERE id = ?')
    .get(photoId) as
    | { id: number; owner_id: number; cloud_public_id: string; faces_json: string; deleted: number }
    | undefined;
  if (!photo || photo.deleted) return res.status(404).json({ error: 'Photo not found' });

    let tier = 'full';
    let blurRegions: number[][] | undefined;
    let shareId: number;

    if (photo.owner_id === viewerId) {
      shareId = 0;
    } else {
            const share = db
        .prepare(
          `SELECT id, tier, blur_faces_json, revoked, expires_at FROM shares
           WHERE photo_id = ? AND (viewer_id = ? OR (viewer_id IS NULL AND viewer_email = ?))`
        )
        .get(photoId, viewerId, req.user!.email) as
        | { id: number; tier: string; blur_faces_json: string; revoked: number; expires_at: number | null }
        | undefined;
      if (!share || share.revoked) return res.status(403).json({ error: 'Access denied' });
      if (share.expires_at && Date.now() > share.expires_at) {
        return res.status(403).json({ error: 'Access expired' });
      }
      tier = share.tier;
      shareId = share.id;

      const faces: number[][] = JSON.parse(photo.faces_json || '[]');
      const blurIndexes: number[] = JSON.parse(share.blur_faces_json || '[]');
      blurRegions = blurIndexes.length ? blurIndexes.map((i) => faces[i]).filter(Boolean) : undefined;

      //.prepare('INSERT INTO access_log (photo_id, viewer_id) VALUES (?, ?)').run(photoId, viewerId);
      logEvent(photoId, 'viewed', viewerId);
    }
     if (tier === 'full' && photo.owner_id !== viewerId) {
      const recentConfirm = db
        .prepare(
          `SELECT id FROM step_up_codes
           WHERE user_id = ? AND photo_id = ? AND used = 1 AND expires_at > ?
           ORDER BY id DESC LIMIT 1`
        )
        .get(viewerId, photoId, Date.now() - 5 * 60 * 1000); // confirmed within last 5 min
      if (!recentConfirm) {
        return res.status(403).json({ error: 'step_up_required' });
      }
    }

    const cloudUrl = viewerUrl(photo.cloud_public_id, {
  blurAll: ['blurred', 'redacted'].includes(tier) && !blurRegions,
  blurRegions,
  lowQuality: tier === 'public_safe',
  redactText: tier === 'redacted' || tier === 'public_safe',
  watermarkName: req.user!.name,
  forcePng: true,
});

    const transformedBytes = await fetchTransformedImage(cloudUrl);
    const marked = await embedId(transformedBytes, shareId);

    res.set('Content-Type', 'image/png');
    res.send(marked);
  } catch (e) {
    next(e);
  }
});

export default router;