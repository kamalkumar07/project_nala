/**
 * GET /api/v1/auth/me — returns current user + role.
 * Auth: JWT required.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    sub: req.user.sub,
    username: req.user.username,
    email: req.user.email,
    groups: req.user.groups,
  });
});

export default router;
