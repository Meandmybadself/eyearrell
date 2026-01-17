import { Router } from 'express';
import { asyncHandler } from '../middleware/error-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { gamificationService } from '../services/gamification-service.js';
import type { ApiResponse, UserStats, AchievementWithCompletion, Level } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// GET /api/gamification/achievements - Get all achievements with user's completion status
router.get('/achievements', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const achievements = await gamificationService.getUserAchievements(userId);

  const response: ApiResponse<AchievementWithCompletion[]> = {
    success: true,
    data: achievements
  };

  res.json(response);
}));

// GET /api/gamification/stats - Get user's comprehensive gamification stats
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const stats = await gamificationService.getUserStats(userId);

  const response: ApiResponse<UserStats> = {
    success: true,
    data: stats
  };

  res.json(response);
}));

// GET /api/gamification/levels - Get all levels
router.get('/levels', requireAuth, asyncHandler(async (_req, res) => {
  const levels = await gamificationService.getAllLevels();

  const response: ApiResponse<Level[]> = {
    success: true,
    data: levels
  };

  res.json(response);
}));

// POST /api/gamification/achievements/check - Check and award achievements
// Body: { achievementKeys: string[] }
router.post('/achievements/check', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { achievementKeys } = req.body;

  if (!Array.isArray(achievementKeys)) {
    res.status(400).json({
      success: false,
      error: 'achievementKeys must be an array of strings'
    });
    return;
  }

  const awarded = await gamificationService.checkAndAwardMultiple(userId, achievementKeys);

  const response: ApiResponse<{ awarded: string[] }> = {
    success: true,
    data: { awarded }
  };

  res.json(response);
}));

export default router;
