import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import {
  viewerUrl,
  viewerVideoUrl,
  fetchTransformedImage,
  fetchTransformedMedia,
} from '../services/cloudinary_service';
import { embedId } from '../services/stego_service';
import { logEvent } from '../services/audit_service';
import { parseRemoveObjects } from '../services/redaction_prompts';

const router = Router();
router.use(requireAuth, requireVerified);

type PhotoRow = {
  id: number;
  owner_id: number;
  title: string | null;
  cloud_public_id: string;
  faces_json: string | null;
  media_type: string | null;
  deleted: number;
};

type ShareRow = {
  id: number;
  tier: string;
  blur_faces_json: string | null;
  revoked: number;
  expires_at: number | string | null;
  remove_prompt: string | null;
};

type ImageOpts = Parameters<typeof viewerUrl>[1];

const TIERS = ['full', 'blurred', 'redacted', 'public_safe'];

const PHOTO_SQL =
  'SELECT id, owner_id, title, cloud_public_id, faces_json, media_type, deleted FROM photos WHERE id = ?';

const SHARE_SQL = `SELECT id, tier, blur_faces_json, revoked, expires_at, remove_prompt FROM shares
   WHERE photo_id = ? AND (viewer_id = ? OR lower(viewer_email) = lower(?))`;

// Text overlays break on commas, slashes and symbols, so keep letters, numbers and spaces
const cleanText = (s: string) => s.replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'viewer';

function isExpired(expiresAt: number | string | null): boolean {
  return expiresAt !== null && expiresAt !== undefined && Date.now() > Number(expiresAt);
}

function pickRegions(faces: number[][], indexes: number[]): number[][] | undefined {
  const regions = indexes.map((i) => faces[i]).filter(Boolean);
  return regions.length ? regions : undefined;
}

// One place that decides what each tier does, shared by real views and owner previews
function imageOptions(
  tier: string,
  blurRegions: number[][] | undefined,
  removeObjects: string[],
  watermarkName: string,
  extra: Partial<ImageOpts> = {}
): ImageOpts {
  const strong = tier === 'redacted' || tier === 'public_safe';
  return {
    blurAll: tier !== 'full' && !blurRegions,
    blurRegions,
    lowQuality: tier === 'public_safe',
    redactText: strong,
    removeObjects: strong ? removeObjects : [],
    watermarkName,
    ...extra,
  };
}

// Metadata only (tier, type, title). Shared viewers never receive a Cloudinary URL.
router.get('/:photoId', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    if (!Number.isInteger(photoId)) return res.status(400).json({ error: 'Invalid photo id' });
    const viewerId = req.user!.id;

    const photo = await db.get<PhotoRow>(PHOTO_SQL, photoId);
    if (!photo || photo.deleted) return res.status(404).json({ error: 'Photo not found' });

    const mediaType = photo.media_type === 'video' ? 'video' : 'image';

    if (photo.owner_id === viewerId) {
      const ownerUrl =
        mediaType === 'video'
          ? viewerVideoUrl(photo.cloud_public_id, {
              tier: 'full',
              watermarkText: cleanText(req.user!.name),
            })
          : viewerUrl(photo.cloud_public_id, {});
      return res.json({
        url: ownerUrl,
        tier: 'full',
        mediaType,
        title: photo.title,
        shareId: 0,
        expiresAt: null,
      });
    }

    const share = await db.get<ShareRow>(SHARE_SQL, photoId, viewerId, req.user!.email);
    if (!share || share.revoked) return res.status(403).json({ error: 'Access denied' });
    if (isExpired(share.expires_at)) return res.status(403).json({ error: 'Access expired' });

    res.json({
      tier: share.tier,
      mediaType,
      title: photo.title,
      shareId: share.id,
      expiresAt: share.expires_at === null ? null : Number(share.expires_at),
    });
  } catch (e) {
    next(e);
  }
});

// Owner-only: render one tier of an image so the owner can compare clearance levels


// Returns the actual watermarked image or video bytes
router.get('/:photoId/image', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    if (!Number.isInteger(photoId)) return res.status(400).json({ error: 'Invalid photo id' });
    const viewerId = req.user!.id;

    const photo = await db.get<PhotoRow>(PHOTO_SQL, photoId);
    if (!photo || photo.deleted) return res.status(404).json({ error: 'Photo not found' });

    const isVideo = photo.media_type === 'video';

    let tier = 'full';
    let blurRegions: number[][] | undefined;
    let removeObjects: string[] = [];
    let shareId = 0;

    if (photo.owner_id !== viewerId) {
      const share = await db.get<ShareRow>(SHARE_SQL, photoId, viewerId, req.user!.email);

      if (!share || share.revoked) return res.status(403).json({ error: 'Access denied' });
      if (isExpired(share.expires_at)) return res.status(403).json({ error: 'Access expired' });

      tier = share.tier;
      shareId = share.id;

      if (!isVideo) {
        const faces: number[][] = JSON.parse(photo.faces_json || '[]');
        const blurIndexes: number[] = JSON.parse(share.blur_faces_json || '[]');
        blurRegions = pickRegions(faces, blurIndexes);
        removeObjects = parseRemoveObjects(share.remove_prompt);
      }

      // Step-up check BEFORE logging a view
      if (tier === 'full') {
        const recentConfirm = await db.get<{ id: number }>(
          `SELECT id FROM step_up_codes
           WHERE user_id = ? AND photo_id = ? AND used = 1 AND expires_at > ?
           ORDER BY id DESC LIMIT 1`,
          viewerId,
          photoId,
          Date.now() - 5 * 60 * 1000
        );
        if (!recentConfirm) return res.status(403).json({ error: 'step_up_required' });
      }

      await logEvent(photoId, 'viewed', viewerId);
    }

    const name = cleanText(req.user!.name);
    res.set('Cache-Control', 'no-store');

    // ---- Video: per-recipient overlays (no invisible watermark) ----
    if (isVideo) {
      const watermarkText = shareId ? `${name} share ${shareId}` : name;
      const url = viewerVideoUrl(photo.cloud_public_id, { tier, watermarkText });
      const bytes = await fetchTransformedMedia(url);
      res.set('Content-Type', 'video/mp4');
      return res.send(bytes);
    }

    // ---- Image: Cloudinary transformation + invisible watermark ----
    // If AI removal fails this throws, so a viewer never gets an unredacted copy
    const cloudUrl = viewerUrl(
      photo.cloud_public_id,
      imageOptions(tier, blurRegions, removeObjects, name, { forcePng: true })
    );
    const transformedBytes = await fetchTransformedImage(cloudUrl);
    const marked = await embedId(transformedBytes, shareId);

    res.set('Content-Type', 'image/png');
    res.send(marked);
  } catch (e) {
    next(e);
  }
});

export default router;