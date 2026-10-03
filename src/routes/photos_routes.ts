import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { upload } from '../middleware/upload.js';
import { uploadPhoto, ownerPreviewUrl } from '../services/cloudinary_service';
import { wrapPhotoKey, aesEncrypt, signRecord, unsealSecretKey } from '../services/crypto_service';
import { perceptualHash } from '../services/hash_service';
import { logEvent } from '../services/audit_service';

const router = Router();
router.use(requireAuth, requireVerified);

router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    const ownerId = req.user!.id;
    const title = String(req.body.title ?? req.file.originalname).slice(0, 100);
    const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
    const phash = await perceptualHash(req.file.buffer);

    const owner = await db.get<{ kem_public: string; dsa_secret_enc: string }>(
      'SELECT kem_public, dsa_secret_enc FROM users WHERE id = ?', ownerId
    );
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    const kemPublicKey = Buffer.from(owner.kem_public, 'base64');
    const { wrapped, aesKey } = wrapPhotoKey(kemPublicKey);
    const { ciphertext, iv, tag } = aesEncrypt(req.file.buffer, aesKey);

    const encFilename = `${randomBytes(16).toString('hex')}.enc`;
    const encPath = path.join('storage', encFilename);
    await writeFile(encPath, Buffer.concat([iv, tag, ciphertext]));

    const dsaSecretKey = unsealSecretKey(owner.dsa_secret_enc);
    const record = JSON.stringify({ sha256, ownerId, filename: encFilename, at: Date.now() });
    const signature = signRecord(dsaSecretKey, record);

    const cloud = await uploadPhoto(req.file.buffer, { ownerId, title });

    const info = await db.run(
      `INSERT INTO photos (owner_id, title, cloud_public_id, enc_path, wrapped_key, sha256, phash, signature, faces_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ownerId, title, cloud.publicId,
      encPath, wrapped.toString('base64'), sha256, phash, signature.toString('base64'),
      JSON.stringify(cloud.faces)
    );

    await logEvent(Number(info.lastInsertRowid), 'uploaded', ownerId);

    res.status(201).json({
      id: info.lastInsertRowid,
      title,
      faces: cloud.faces,
      width: cloud.width,
      height: cloud.height,
      previewUrl: ownerPreviewUrl(cloud.publicId),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/mine', async (req, res, next) => {
  try {
    const rows = await db.all<{
      id: number; title: string; cloud_public_id: string; faces_json: string; created_at: number;
    }>(
      `SELECT id, title, cloud_public_id, faces_json, created_at
       FROM photos WHERE owner_id = ? AND deleted = 0 ORDER BY created_at DESC`,
      req.user!.id
    );

    res.json({
      photos: rows.map((r) => ({
        id: r.id,
        title: r.title,
        faces: JSON.parse(r.faces_json ?? '[]'),
        createdAt: r.created_at,
        previewUrl: ownerPreviewUrl(r.cloud_public_id, 400),
      })),
    });
  } catch (e) {
    next(e);
  }
});

router.delete('/:photoId', async (req, res, next) => {
  try {
    const photoId = Number(req.params.photoId);
    const photo = await db.get<{ id: number; owner_id: number }>(
      'SELECT id, owner_id FROM photos WHERE id = ?', photoId
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