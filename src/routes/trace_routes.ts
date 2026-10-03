import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireVerified } from '../middleware/auth';
import { upload } from '../middleware/upload.js';
import { extractId } from '../services/stego_service';

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
      photo_id: number;
      title: string;
      viewerName: string;
      viewerEmail: string;
    }>(
      `SELECT s.photo_id, p.title,
              COALESCE(u.name, '(pending signup)') AS "viewerName",
              COALESCE(u.email, s.viewer_email) AS "viewerEmail"
       FROM shares s
       JOIN photos p ON p.id = s.photo_id
       LEFT JOIN users u ON u.id = s.viewer_id
       WHERE s.id = ?`,
      shareId
    );

    if (!share) {
      return res.json({
        result: 'unknown_share',
        message: 'Watermark found but no matching share record.',
      });
    }

    res.json({
      result: 'traced',
      message: `This copy was shared with ${share.viewerName}.`,
      photoTitle: share.title,
      viewer: { name: share.viewerName, email: share.viewerEmail },
    });
  } catch (e) {
    next(e);
  }
});

export default router;