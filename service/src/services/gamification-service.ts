import { prisma } from '../lib/prisma.js';
import type { Achievement, Level, UserStats, AchievementWithCompletion } from '@irl/shared';

export class GamificationService {
  /**
   * Calculate user's total points from point transactions
   */
  async getUserPoints(userId: number): Promise<number> {
    const transactions = await prisma.pointTransaction.findMany({
      where: { userId }
    });

    const totalPoints = transactions.reduce((sum, transaction) => sum + transaction.points, 0);
    return Math.max(0, totalPoints); // Ensure non-negative
  }

  /**
   * Get user's current level based on their total points
   */
  async getUserLevel(userId: number): Promise<Level | null> {
    const totalPoints = await this.getUserPoints(userId);

    // Get all levels ordered by points required (descending)
    const levels = await prisma.level.findMany({
      orderBy: { pointsRequired: 'desc' }
    });

    // Find the highest level the user has reached
    const currentLevel = levels.find(level => totalPoints >= level.pointsRequired);

    if (!currentLevel) return null;

    return {
      ...currentLevel,
      createdAt: currentLevel.createdAt.toISOString(),
      updatedAt: currentLevel.updatedAt.toISOString()
    } as Level;
  }

  /**
   * Get the next level for the user to achieve
   */
  async getNextLevel(userId: number): Promise<Level | null> {
    const totalPoints = await this.getUserPoints(userId);

    // Get all levels ordered by points required (ascending)
    const levels = await prisma.level.findMany({
      orderBy: { pointsRequired: 'asc' }
    });

    // Find the first level with points required greater than current points
    const nextLevel = levels.find(level => level.pointsRequired > totalPoints);

    if (!nextLevel) return null;

    return {
      ...nextLevel,
      createdAt: nextLevel.createdAt.toISOString(),
      updatedAt: nextLevel.updatedAt.toISOString()
    } as Level;
  }

  /**
   * Check if user has already earned a specific achievement
   */
  async hasAchievement(userId: number, achievementKey: string): Promise<boolean> {
    const achievement = await prisma.achievement.findUnique({
      where: { key: achievementKey }
    });

    if (!achievement) {
      return false;
    }

    const userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      }
    });

    return !!userAchievement;
  }

  /**
   * Award an achievement to a user if they haven't already earned it
   * Returns the achievement if awarded, null if already earned
   */
  async awardAchievement(userId: number, achievementKey: string): Promise<Achievement | null> {
    // Check if already earned
    if (await this.hasAchievement(userId, achievementKey)) {
      return null;
    }

    // Get the achievement
    const achievement = await prisma.achievement.findUnique({
      where: { key: achievementKey }
    });

    if (!achievement || !achievement.isActive) {
      return null;
    }

    // Create user achievement and point transaction in a transaction
    await prisma.$transaction([
      prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id
        }
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          achievementId: achievement.id,
          points: achievement.points,
          reason: `Achievement earned: ${achievement.name}`
        }
      })
    ]);

    return {
      ...achievement,
      createdAt: achievement.createdAt.toISOString(),
      updatedAt: achievement.updatedAt.toISOString()
    } as Achievement;
  }

  /**
   * Get all achievements with user's completion status
   */
  async getUserAchievements(userId: number): Promise<AchievementWithCompletion[]> {
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true }
    });

    // Map achievements to include completion status
    const achievementsWithCompletion: AchievementWithCompletion[] = achievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);

      return {
        ...achievement,
        createdAt: achievement.createdAt.toISOString(),
        updatedAt: achievement.updatedAt.toISOString(),
        completed: !!userAchievement,
        completedAt: userAchievement?.completedAt.toISOString()
      } as AchievementWithCompletion;
    });

    return achievementsWithCompletion;
  }

  /**
   * Get comprehensive user statistics for gamification dashboard
   */
  async getUserStats(userId: number): Promise<UserStats> {
    const totalPoints = await this.getUserPoints(userId);
    const currentLevel = await this.getUserLevel(userId);
    const nextLevel = await this.getNextLevel(userId);

    const achievements = await prisma.achievement.findMany({
      where: { isActive: true }
    });

    const completedAchievements = await prisma.userAchievement.findMany({
      where: { userId }
    });

    // Calculate progress to next level
    let progressPercent = 0;
    if (nextLevel && currentLevel) {
      const pointsInCurrentLevel = totalPoints - currentLevel.pointsRequired;
      const pointsNeededForNextLevel = nextLevel.pointsRequired - currentLevel.pointsRequired;
      progressPercent = Math.floor((pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
    } else if (nextLevel) {
      // User is at level 0 (no level yet)
      progressPercent = Math.floor((totalPoints / nextLevel.pointsRequired) * 100);
    } else {
      // User is at max level
      progressPercent = 100;
    }

    return {
      totalPoints,
      currentLevel,
      nextLevel,
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
      achievementCount: achievements.length,
      completedAchievementCount: completedAchievements.length
    };
  }

  /**
   * Get all levels
   */
  async getAllLevels(): Promise<Level[]> {
    const levels = await prisma.level.findMany({
      orderBy: { levelNumber: 'asc' }
    });

    return levels.map(level => ({
      ...level,
      createdAt: level.createdAt.toISOString(),
      updatedAt: level.updatedAt.toISOString()
    })) as Level[];
  }

  /**
   * Check multiple achievements at once
   * Returns array of achievement keys that were newly awarded
   */
  async checkAndAwardMultiple(userId: number, achievementKeys: string[]): Promise<string[]> {
    const awarded: string[] = [];

    for (const key of achievementKeys) {
      const achievement = await this.awardAchievement(userId, key);
      if (achievement) {
        awarded.push(key);
      }
    }

    return awarded;
  }
}

// Export singleton instance
export const gamificationService = new GamificationService();
