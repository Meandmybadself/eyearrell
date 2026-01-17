import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendInvitationEmail } from '../lib/email.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, invitationSchema } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// POST /api/invitations - Send an invitation to an email address
router.post('/', requireAuth, validateBody(invitationSchema), asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createError(401, 'Authentication required');
  }

  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email is already registered
  const existingUser = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deleted: false
    }
  });

  if (existingUser) {
    throw createError(400, 'This email address is already registered');
  }

  // Send invitation email
  try {
    await sendInvitationEmail(normalizedEmail);
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw createError(500, 'Failed to send invitation email');
  }

  const response: ApiResponse<null> = {
    success: true,
    message: 'Invitation sent successfully'
  };

  res.status(201).json(response);
}));

export default router;
