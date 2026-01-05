import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, validateIdParam, interestSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { canManageInterests } from '../middleware/authorization.js';
import type { ApiResponse, PaginatedResponse, Interest } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to format interest response
const formatInterest = (interest: any): Interest => {
  const { deleted, ...interestWithoutDeleted } = interest;
  void deleted;
  return {
    ...interestWithoutDeleted,
    createdAt: interest.createdAt.toISOString(),
    updatedAt: interest.updatedAt.toISOString()
  };
};

// GET /api/interests - List all non-deleted interests
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const skip = (page - 1) * limit;

  const where = { deleted: false };

  const [items, total] = await Promise.all([
    prisma.interest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    }),
    prisma.interest.count({ where })
  ]);

  const response: PaginatedResponse<Interest> = {
    success: true,
    data: items.map(formatInterest),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// POST /api/interests - Create new interest (admin only)
router.post('/', requireAuth, canManageInterests, validateBody(interestSchema), asyncHandler(async (req, res) => {
  // Check if interest with same name already exists (non-deleted)
  const existing = await prisma.interest.findFirst({
    where: {
      name: req.body.name,
      deleted: false
    }
  });

  if (existing) {
    throw createError(400, 'An interest with this name already exists');
  }

  const item = await prisma.interest.create({
    data: req.body
  });

  const response: ApiResponse<Interest> = {
    success: true,
    data: formatInterest(item),
    message: 'Interest created successfully'
  };

  res.status(201).json(response);
}));

// PUT /api/interests/:id - Update interest (admin only)
router.put('/:id', requireAuth, canManageInterests, validateIdParam, validateBody(interestSchema), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const interest = await prisma.interest.findUnique({
    where: { id }
  });

  if (!interest) {
    throw createError(404, 'Interest not found');
  }

  if (interest.deleted) {
    throw createError(400, 'Cannot update a deleted interest');
  }

  // Check if another interest with same name already exists
  const existing = await prisma.interest.findFirst({
    where: {
      name: req.body.name,
      deleted: false,
      id: { not: id }
    }
  });

  if (existing) {
    throw createError(400, 'An interest with this name already exists');
  }

  const updated = await prisma.interest.update({
    where: { id },
    data: req.body
  });

  const response: ApiResponse<Interest> = {
    success: true,
    data: formatInterest(updated),
    message: 'Interest updated successfully'
  };

  res.json(response);
}));

// DELETE /api/interests/:id - Soft delete interest (admin only)
router.delete('/:id', requireAuth, canManageInterests, validateIdParam, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);

  const interest = await prisma.interest.findUnique({
    where: { id }
  });

  if (!interest) {
    throw createError(404, 'Interest not found');
  }

  if (interest.deleted) {
    throw createError(400, 'Interest is already deleted');
  }

  await prisma.interest.update({
    where: { id },
    data: { deleted: true }
  });

  const response: ApiResponse<null> = {
    success: true,
    message: 'Interest deleted successfully'
  };

  res.json(response);
}));

export default router;




