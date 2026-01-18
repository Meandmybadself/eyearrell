import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateDisplayIdParam } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canViewPersonInterests } from '../middleware/authorization.js';
import type { ApiResponse, Person } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format person response
const formatPerson = (person: any): Person => {
  const { deleted, ...personWithoutDeleted } = person;
  void deleted;
  return {
    ...personWithoutDeleted,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString()
  };
};

// GET /api/persons/:displayId/recommendations - Get recommended persons based on shared interests
router.get('/:displayId/recommendations', requireAuth, validateDisplayIdParam, canViewPersonInterests, asyncHandler(async (req, res) => {
  const displayId = req.params.displayId;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

  const person = await prisma.person.findFirst({
    where: { displayId, deleted: false }
  });

  if (!person) {
    throw createError(404, 'Person not found');
  }

  // Check if person has any interests
  const personInterestCount = await prisma.personInterest.count({
    where: { personId: person.id }
  });

  if (personInterestCount === 0) {
    throw createError(400, 'Person has no interests defined');
  }

  // Calculate similarity based on shared interests using cosine similarity
  // Cosine similarity = (A · B) / (||A|| * ||B||)
  // Where A and B are interest level vectors for each person
  const recommendations = await prisma.$queryRawUnsafe<Array<{
    id: number;
    firstName: string;
    lastName: string;
    displayId: string;
    pronouns: string | null;
    imageURL: string | null;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
    similarity: number;
  }>>(
    `WITH target_interests AS (
      SELECT "interestId", level::float as level
      FROM person_interests
      WHERE "personId" = $1
    ),
    target_magnitude AS (
      SELECT SQRT(SUM(level * level)) as magnitude
      FROM target_interests
    ),
    other_persons AS (
      SELECT DISTINCT p.id, p."firstName", p."lastName", p."displayId",
             p.pronouns, p."imageURL", p."userId", p."createdAt", p."updatedAt"
      FROM people p
      INNER JOIN person_interests pi ON pi."personId" = p.id
      WHERE p.id != $1 AND p.deleted = false
    ),
    person_similarities AS (
      SELECT
        op.*,
        COALESCE(
          SUM(ti.level * pi.level::float) / NULLIF(
            (SELECT magnitude FROM target_magnitude) *
            SQRT(SUM(pi.level::float * pi.level::float)),
            0
          ),
          0
        ) as similarity
      FROM other_persons op
      INNER JOIN person_interests pi ON pi."personId" = op.id
      LEFT JOIN target_interests ti ON ti."interestId" = pi."interestId"
      GROUP BY op.id, op."firstName", op."lastName", op."displayId",
               op.pronouns, op."imageURL", op."userId", op."createdAt", op."updatedAt"
    )
    SELECT * FROM person_similarities
    WHERE similarity > 0
    ORDER BY similarity DESC
    LIMIT $2`,
    person.id,
    limit
  );

  const response: ApiResponse<Array<Person & { similarity?: number }>> = {
    success: true,
    data: recommendations.map(rec => ({
      ...formatPerson(rec),
      similarity: Number(rec.similarity)
    }))
  };

  res.json(response);
}));

export default router;




