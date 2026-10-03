import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { viewerUrl, fetchTransformedImage } from '../services/cloudinary_service';
import { embedId } from '../services/stego_service';
import { logEvent } from '../services/audit_service';

const router = Router();
router.use(requireAuth, requireVerified);

type PhotoRow = {
  id: number;
  owner_id: number;
  cloud_public_id: string;
  faces_json: string | null;
  deleted: number;
};

// Returns a Cloudinary URL as JSON (used for previews / quick checks)
router.get('/:photoId', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    const viewerId = req.user!.id;

    const photo = await db.get<PhotoRow>(
      'SELECT id, owner_id, cloud_public_id, faces_json, deleted FROM photos WHERE id = ?',
      photoId
    );
    if (!photo || photo.deleted) return res.status(404).json({ error: 'Photo not found' });

    if (photo.owner_id === viewerId) {
      return res.json({ url: viewerUrl(photo.cloud_public_id, {}), tier: 'full' });
    }

    const share = await db.get<{
      tier: string;
      blur_faces_json: string | null;
      revoked: number;
      expires_at: number | null;
    }>(
      `SELECT tier, blur_faces_json, revoked, expires_at FROM shares
       WHERE photo_id = ? AND (viewer_id = ? OR lower(viewer_email) = lower(?))`,
      photoId,
      viewerId,
      req.user!.email
    );

    if (!share || share.revoked) return res.status(403).json({ error: 'Access denied' });
    if (share.expires_at && Date.now() > Number(share.expires_at)) {
      return res.status(403).json({ error: 'Access expired' });
    }

    const faces: number[][] = JSON.parse(photo.faces_json || '[]');
    const blurIndexes: number[] = JSON.parse(share.blur_faces_json || '[]');
    const blurRegions = blurIndexes.length
      ? blurIndexes.map((i) => faces[i]).filter(Boolean)
      : undefined;

    const url = viewerUrl(photo.cloud_public_id, {
      blurAll: ['blurred', 'redacted'].includes(share.tier) && !blurRegions,
      blurRegions,
      lowQuality: share.tier === 'public_safe',
      redactText: share.tier === 'redacted' || share.tier === 'public_safe',
      watermarkName: req.user!.name,
    });

    await db.run('INSERT INTO access_log (photo_id, viewer_id) VALUES (?, ?)', photoId, viewerId);

    res.json({ url, tier: share.tier });
  } catch (e) {
    next(e);
  }
});

// Returns actual watermarked + traceable image bytes
router.get('/:photoId/image', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    const viewerId = req.user!.id;

    const photo = await db.get<PhotoRow>(
      'SELECT id, owner_id, cloud_public_id, faces_json, deleted FROM photos WHERE id = ?',
      photoId
    );
    if (!photo || photo.deleted) return res.status(404).json({ error: 'Photo not found' });

    let tier = 'full';
    let blurRegions: number[][] | undefined;
    let shareId: number;

    if (photo.owner_id === viewerId) {
      shareId = 0;
    } else {
      const share = await db.get<{
        id: number;
        tier: string;
        blur_faces_json: string | null;
        revoked: number;
        expires_at: number | null;
      }>(
        `SELECT id, tier, blur_faces_json, revoked, expires_at FROM shares
         WHERE photo_id = ? AND (viewer_id = ? OR lower(viewer_email) = lower(?))`,
        photoId,
        viewerId,
        req.user!.email
      );

      if (!share || share.revoked) return res.status(403).json({ error: 'Access denied' });
      if (share.expires_at && Date.now() > Number(share.expires_at)) {
        return res.status(403).json({ error: 'Access expired' });
      }

      tier = share.tier;
      shareId = share.id;

      const faces: number[][] = JSON.parse(photo.faces_json || '[]');
      const blurIndexes: number[] = JSON.parse(share.blur_faces_json || '[]');
      blurRegions = blurIndexes.length
        ? blurIndexes.map((i) => faces[i]).filter(Boolean)
        : undefined;
    }

    // Step-up check BEFORE logging a view
    if (tier === 'full' && photo.owner_id !== viewerId) {
      const recentConfirm = await db.get<{ id: number }>(
        `SELECT id FROM step_up_codes
         WHERE user_id = ? AND photo_id = ? AND used = 1 AND expires_at > ?
         ORDER BY id DESC LIMIT 1`,
        viewerId,
        photoId,
        Date.now() - 5 * 60 * 1000 // confirmed within last 5 min
      );
      if (!recentConfirm) {
        return res.status(403).json({ error: 'step_up_required' });
      }
    }

    if (photo.owner_id !== viewerId) {
      await logEvent(photoId, 'viewed', viewerId);
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