import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { sendVerificationEmail, sendMagicLinkEmail } from '../lib/email.js';
import { checkEmailRateLimit } from '../lib/rate-limit.js';
import { asyncHandler, createError } from '../middleware/error-handler.js';
import { validateBody, sendMagicLinkSchema, resendVerificationSchema } from '../middleware/validation.js';
import type { ApiResponse, User, Person } from '@irl/shared';

const router: ReturnType<typeof Router> = Router();

// Helper to exclude sensitive fields
const excludeSensitiveFields = (user: any): User => {
  const { verificationToken, deleted, ...userWithoutSensitive } = user;
  void verificationToken;
  void deleted;
  return {
    ...userWithoutSensitive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
};

const excludePersonSensitiveFields = (person: any): Person => {
  const { deleted, ...personWithoutSensitive } = person;
  void deleted;
  return {
    ...personWithoutSensitive,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString()
  };
};

// POST /api/auth/send-magic-link - Send magic link to user's email
router.post('/send-magic-link', validateBody(sendMagicLinkSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findFirst({
    where: { email, deleted: false }
  });

  // Security: Always return success to prevent email enumeration
  if (!user) {
    const response: ApiResponse<null> = {
      success: true,
      message: 'If the email exists, a sign-in link has been sent'
    };
    res.json(response);
    return;
  }

  // If user email is not yet verified, don't send magic link but don't reveal account exists
  if (user.verificationToken) {
    const response: ApiResponse<null> = {
      success: true,
      message: 'If the email exists, a sign-in link has been sent'
    };
    res.json(response);
    return;
  }

  // Rate limit: max 3 emails per address per 15 minutes
  if (!checkEmailRateLimit(email)) {
    const response: ApiResponse<null> = {
      success: true,
      message: 'If the email exists, a sign-in link has been sent'
    };
    res.json(response);
    return;
  }

  // Create magic link token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  await prisma.authenticationAttempt.create({
    data: { email, token, expiresAt }
  });

  // Send magic link email
  try {
    await sendMagicLinkEmail(email, token);
  } catch (error) {
    console.error('Failed to send magic link email:', error);
  }

  const response: ApiResponse<null> = {
    success: true,
    message: 'If the email exists, a sign-in link has been sent'
  };
  res.json(response);
}));

// GET /api/auth/verify-magic-link - Verify magic link token and log user in
router.get('/verify-magic-link', asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    throw createError(400, 'Token is required');
  }

  // Atomically mark token as used to prevent race conditions
  const updateResult = await prisma.authenticationAttempt.updateMany({
    where: {
      token,
      used: false,
      expiresAt: { gte: new Date() }
    },
    data: { used: true, usedAt: new Date() }
  });

  if (updateResult.count === 0) {
    throw createError(400, 'Invalid or expired sign-in link');
  }

  const attempt = await prisma.authenticationAttempt.findUnique({
    where: { token }
  });

  if (!attempt) {
    throw createError(400, 'Invalid or expired sign-in link');
  }

  const user = await prisma.user.findFirst({
    where: { email: attempt.email, deleted: false }
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  // Log user in via Passport
  await new Promise<void>((resolve, reject) => {
    req.login(user, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Get first person
  let person: Person | null = null;
  const rawPerson = await prisma.person.findFirst({
    where: { userId: user.id, deleted: false },
    orderBy: { createdAt: 'asc' }
  });

  if (rawPerson) {
    req.session.currentPersonId = rawPerson.id;
    person = excludePersonSensitiveFields(rawPerson);
  }

  // Save session
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const response: ApiResponse<{ user: User; person?: Person }> = {
    success: true,
    data: {
      user: excludeSensitiveFields(user),
      person: person || undefined
    },
    message: 'Login successful'
  };

  res.json(response);
}));

// POST /api/auth/logout - Logout user
router.post('/logout', asyncHandler(async (req, res) => {
  req.logout((err) => {
    if (err) {
      throw createError(500, 'Logout failed');
    }

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        throw createError(500, 'Session destruction failed');
      }

      res.clearCookie('connect.sid');

      const response: ApiResponse<null> = {
        success: true,
        message: 'Logout successful'
      };

      res.json(response);
    });
  });
}));

// GET /api/auth/session - Get current session
router.get('/session', asyncHandler(async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    throw createError(401, 'Not authenticated');
  }

  const user = req.user as any;

  // Get person from session if available, otherwise get first person
  let person: Person | null = null;
  let rawPerson;

  if (req.session.currentPersonId) {
    rawPerson = await prisma.person.findFirst({
      where: {
        id: req.session.currentPersonId,
        userId: user.id,
        deleted: false
      }
    });
    if (rawPerson) {
      person = excludePersonSensitiveFields(rawPerson);
    }
  }

  // If no person found from session or person was deleted, get first person and update session
  if (!person) {
    rawPerson = await prisma.person.findFirst({
      where: { userId: user.id, deleted: false },
      orderBy: { createdAt: 'asc' }
    });

    if (rawPerson) {
      req.session.currentPersonId = rawPerson.id;
      person = excludePersonSensitiveFields(rawPerson);

      // Save session if we updated currentPersonId
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  const response: ApiResponse<{ user: User; person?: Person }> = {
    success: true,
    data: {
      user: excludeSensitiveFields(user),
      person: person || undefined
    }
  };

  res.json(response);
}));

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', validateBody(resendVerificationSchema), asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findFirst({
    where: { email, deleted: false }
  });

  if (!user) {
    // Don't reveal if user exists or not for security
    const response: ApiResponse<null> = {
      success: true,
      message: 'If the email exists, a verification link has been sent'
    };
    res.json(response);
    return;
  }

  if (!user.verificationToken) {
    const response: ApiResponse<null> = {
      success: true,
      message: 'Email is already verified'
    };
    res.json(response);
    return;
  }

  // Rate limit: max 3 emails per address per 15 minutes
  if (!checkEmailRateLimit(email)) {
    const response: ApiResponse<null> = {
      success: true,
      message: 'If the email exists, a verification link has been sent'
    };
    res.json(response);
    return;
  }

  try {
    await sendVerificationEmail(user.email, user.verificationToken);
  } catch (error) {
    console.error('Failed to resend verification email:', error);
  }

  const response: ApiResponse<null> = {
    success: true,
    message: 'Verification email sent'
  };

  res.json(response);
}));

export default router;
