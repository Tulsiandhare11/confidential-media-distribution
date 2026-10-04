import { Router } from 'express';
import { createHash } from 'node:crypto';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { upload, MAX_IMAGE_BYTES } from '../middleware/upload.js';
import { uploadPhoto, ownerPreviewUrl, type MediaType } from '../services/cloudinary_service';
import { signRecord, unsealSecretKey } from '../services/crypto_service';
import { perceptualHash } from '../services/hash_service';
import { logEvent } from '../services/audit_service';
import { viewerUrl, fetchTransformedImage } from '../services/cloudinary_service.js';

const router = Router();
router.use(requireAuth, requireVerified);

router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType: MediaType = isVideo ? 'video' : 'image';

    if (!isVideo && req.file.size > MAX_IMAGE_BYTES) {
      return res.status(400).json({ error: 'Images must be under 10 MB' });
    }

    const ownerId = req.user!.id;
    const title = String(req.body.title ?? req.file.originalname).slice(0, 100);
    const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
    // Perceptual hashing works on image pixels only
    const phash = isVideo ? null : await perceptualHash(req.file.buffer);

    const owner = await db.get<{ dsa_secret_enc: string }>(
      'SELECT dsa_secret_enc FROM users WHERE id = ?',
      ownerId
    );
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    // Upload first, so the signed record can reference the Cloudinary asset
    const cloud = await uploadPhoto(req.file.buffer, { ownerId, title, mediaType });

    // Digital signature only (no encryption)
    const dsaSecretKey = unsealSecretKey(owner.dsa_secret_enc);
    const record = JSON.stringify({
      sha256,
      ownerId,
      publicId: cloud.publicId,
      mediaType,
      at: Date.now(),
    });
    const signature = signRecord(dsaSecretKey, record);

    const info = await db.run(
      `INSERT INTO photos (owner_id, title, cloud_public_id, sha256, phash, signature, faces_json, media_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ownerId,
      title,
      cloud.publicId,
      sha256,
      phash,
      signature.toString('base64'),
      JSON.stringify(cloud.faces ?? []),
      mediaType
    );

    await logEvent(Number(info.lastInsertRowid), 'uploaded', ownerId);

    res.status(201).json({
      id: info.lastInsertRowid,
      title,
      mediaType,
      faces: cloud.faces ?? [],
      width: cloud.width,
      height: cloud.height,
      previewUrl: ownerPreviewUrl(cloud.publicId, 500, mediaType),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/mine', async (req, res, next) => {
  try {
    const rows = await db.all<{
      id: number;
      title: string;
      cloud_public_id: string;
      faces_json: string | null;
      media_type: string | null;
      created_at: number;
    }>(
      `SELECT id, title, cloud_public_id, faces_json, media_type, created_at
       FROM photos WHERE owner_id = ? AND deleted = 0 ORDER BY created_at DESC`,
      req.user!.id
    );

    res.json({
      photos: rows.map((r) => {
        const mediaType: MediaType = r.media_type === 'video' ? 'video' : 'image';
        return {
          id: r.id,
          title: r.title,
          mediaType,
          faces: JSON.parse(r.faces_json ?? '[]'),
          createdAt: r.created_at,
          previewUrl: ownerPreviewUrl(r.cloud_public_id, 400, mediaType),
        };
      }),
    });
  } catch (e) {
    next(e);
  }
});
router.get('/:photoId/preview', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    const viewerId = req.user!.id;

    const photo = await db.get<{ id: number; owner_id: number; cloud_public_id: string; faces_json: string | null }>(
      'SELECT id, owner_id, cloud_public_id, faces_json FROM photos WHERE id = ?',
      photoId
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    if (photo.owner_id !== viewerId) return res.status(403).json({ error: 'Not your photo' });

    const tier = (req.query.tier as string) || 'blurred';
    const removeObjectsRaw = (req.query.removeObjects as string) || '';
    const removeObjects = removeObjectsRaw
      ? removeObjectsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const faces: number[][] = JSON.parse(photo.faces_json ?? '[]');
    const blurIndexes = req.query.blurFaceIndexes
      ? String(req.query.blurFaceIndexes).split(',').map(Number).filter((n) => !isNaN(n))
      : [];
    const blurRegions = blurIndexes.length ? blurIndexes.map((i) => faces[i]).filter(Boolean) : undefined;

    const cloudUrl = viewerUrl(photo.cloud_public_id, {
      blurAll: tier === 'blurred' && !blurRegions,
      blurRegions,
      lowQuality: tier === 'public_safe',
      removeObjects: tier === 'redacted' || tier === 'public_safe' ? removeObjects : undefined,
      watermarkName: 'Preview',
      forcePng: true,
      maxWidth: 800,
    });

    const imageBuffer = await fetchTransformedImage(cloudUrl);
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (e) {
    next(e);
  }
});
router.delete('/:photoId', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    const photo = await db.get<{ id: number; owner_id: number }>(
      'SELECT id, owner_id FROM photos WHERE id = ?',
      photoId
    );
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    if (photo.owner_id !== req.user!.id) return res.status(403).json({ error: 'Not your photo' });

    await db.run('UPDATE photos SET deleted = 1 WHERE id = ?', photoId);
    await db.run('UPDATE shares SET revoked = 1 WHERE photo_id = ?', photoId);
    await logEvent(photoId, 'deleted', req.user!.id);

    res.json({ message: 'Asset deleted' });
  } catch (e) {
    next(e);
  }
});

export default router;