import { Router } from 'express';
import { createHash } from 'node:crypto';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { upload } from '../middleware/upload.js';
import { uploadPhoto, ownerPreviewUrl } from '../services/cloudinary_service';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { wrapPhotoKey, aesEncrypt, signRecord, unsealSecretKey } from '../services/crypto_service';
import { perceptualHash } from '../services/hash_service';
import { logEvent } from '../services/audit_service';

const router = Router();
router.use(requireAuth, requireVerified);

// Upload a photo (multipart field name: "photo", optional "title")
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    const ownerId = req.user!.id;
    const title = String(req.body.title ?? req.file.originalname).slice(0, 100);
    const sha256 = createHash('sha256').update(req.file.buffer).digest('hex');
    const phash = await perceptualHash(req.file.buffer);
    const owner = db
  .prepare('SELECT kem_public, dsa_secret_enc FROM users WHERE id = ?')
  .get(ownerId) as { kem_public: string; dsa_secret_enc: string };

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

    const info = db
  .prepare(
    `INSERT INTO photos (owner_id, title, cloud_public_id, enc_path, wrapped_key, sha256, phash, signature, faces_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  .run(
    ownerId, title, cloud.publicId,
    encPath, wrapped.toString('base64'), sha256, phash, signature.toString('base64'),
    JSON.stringify(cloud.faces)
  );
   logEvent(Number(info.lastInsertRowid), 'uploaded', ownerId);
   
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

// My vault
router.get('/mine', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, title, cloud_public_id, faces_json, created_at
       FROM photos WHERE owner_id = ? AND deleted = 0 ORDER BY created_at DESC`
    )
    .all(req.user!.id) as {
      id: number; title: string; cloud_public_id: string; faces_json: string; created_at: number;
    }[];

  res.json({
    photos: rows.map((r) => ({
      id: r.id,
      title: r.title,
      faces: JSON.parse(r.faces_json ?? '[]'),
      createdAt: r.created_at,
      previewUrl: ownerPreviewUrl(r.cloud_public_id, 400),
    })),
  });
});
router.delete('/:photoId', (req, res) => {
  const photoId = Number(req.params.photoId);
  const photo = db.prepare('SELECT id, owner_id FROM photos WHERE id = ?').get(photoId) as
    | { id: number; owner_id: number }
    | undefined;
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  if (photo.owner_id !== req.user!.id) return res.status(403).json({ error: 'Not your photo' });

  db.prepare('UPDATE photos SET deleted = 1 WHERE id = ?').run(photoId);
  db.prepare('UPDATE shares SET revoked = 1 WHERE photo_id = ?').run(photoId);
  logEvent(photoId, 'deleted', req.user!.id);

  res.json({ message: 'Asset deleted' });
});
export default router;