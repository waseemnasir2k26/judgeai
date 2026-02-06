import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import {
  authLimiter,
  verificationLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, register);
router.post('/verify-email', verificationLimiter, verifyEmail);
router.post('/resend-verification', verificationLimiter, resendVerificationCode);
router.post('/login', authLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
