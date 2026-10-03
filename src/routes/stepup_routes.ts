import { Router } from 'express';
import { requireAuth, requireVerified } from '../middleware/auth';
import { createStepUpCode, verifyStepUpCode } from '../services/otp_service';

const router = Router();
router.use(requireAuth, requireVerified);

router.post('/:photoId/request', (req, res) => {
  createStepUpCode(req.user!.id, Number(req.params.photoId));
  res.json({ message: 'Verification code sent' });
});

router.post('/:photoId/confirm', (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) return res.status(400).json({ error: 'Code required' });

  const ok = verifyStepUpCode(req.user!.id, Number(req.params.photoId), code);
  if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });

  // Short-lived flag the view route checks — simplest approach: reuse step_up_codes
  // table's "used" row as proof; view route re-checks a fresh confirm within 5 min.
  res.json({ confirmed: true, expiresInSeconds: 300 });
});

export default router;