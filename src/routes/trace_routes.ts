import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { upload } from '../middleware/upload.js';
import { extractId } from '../services/stego_service';
import { logEvent } from '../services/audit_service';

const router = Router();
router.use(requireAuth, requireVerified);

router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

    const shareId = await extractId(req.file.buffer);
    if (shareId === null) {
      return res.json({ result: 'no_watermark', message: 'No invisible watermark detected.' });
    }
    if (shareId === 0) {
      return res.json({
        result: 'owner_copy',
        message: "This is the owner's own copy, not a shared viewer copy.",
      });
    }

    const share = await db.get<{
      shareId: number;
      photoId: number;
      ownerId: number;
      tier: string;
      title: string;
      viewerName: string;
      viewerEmail: string;
    }>(
      `SELECT s.id AS "shareId", s.photo_id AS "photoId", s.tier,
              p.title, p.owner_id AS "ownerId",
              COALESCE(u.name, '(pending signup)') AS "viewerName",
              COALESCE(u.email, s.viewer_email) AS "viewerEmail"
       FROM shares s
       JOIN photos p ON p.id = s.photo_id
       LEFT JOIN users u ON u.id = s.viewer_id
       WHERE s.id = ?`,
      shareId
    );

    // Only the photo's owner may learn who a copy was issued to
    if (!share || share.ownerId !== req.user!.id) {
      return res.json({
        result: 'unknown_share',
        message: 'Watermark found, but it does not match a share you own.',
      });
    }

    await logEvent(share.photoId, 'traced', req.user!.id, {
      shareId: share.shareId,
      recipient: share.viewerEmail,
    });

    res.json({
      result: 'traced',
      message: `This copy was issued to ${share.viewerName}.`,
      photoTitle: share.title,
      shareId: share.shareId,
      tier: share.tier,
      viewer: { name: share.viewerName, email: share.viewerEmail },
    });
  } catch (e) {
    next(e);
  }
});

export default router;