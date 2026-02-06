import { Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { VerificationCode } from '../models/VerificationCode.js';
import { AuthRequest } from '../types/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';
import { createAuditLog } from '../services/auditService.js';
import { generateRandomCode } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

// Register new user
export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate Gmail
    if (!email.endsWith('@gmail.com')) {
      res.status(400).json({
        success: false,
        message: 'Only Gmail addresses are allowed during beta',
        code: 'GMAIL_REQUIRED',
      });
      return;
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        code: 'EMAIL_EXISTS',
      });
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        code: 'WEAK_PASSWORD',
      });
      return;
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      accountState: 'unverified',
    });

    await user.save();

    // Generate verification code
    const code = generateRandomCode(6);

    // Delete any existing verification codes for this email
    await VerificationCode.deleteMany({ email: user.email, type: 'email_verification' });

    // Create new verification code
    await VerificationCode.create({
      email: user.email,
      code,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send verification email
    await sendVerificationEmail(user.email, code, user.firstName);

    // Audit log
    await createAuditLog({
      userId: user._id,
      userEmail: user.email,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user._id,
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

// Verify email
export const verifyEmail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code } = req.body;

    const verificationCode = await VerificationCode.findOne({
      email: email.toLowerCase(),
      type: 'email_verification',
    });

    if (!verificationCode) {
      res.status(400).json({
        success: false,
        message: 'Verification code expired or not found. Please request a new one.',
        code: 'CODE_NOT_FOUND',
      });
      return;
    }

    // Check attempts
    if (verificationCode.attempts >= 5) {
      await VerificationCode.deleteOne({ _id: verificationCode._id });
      res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new verification code.',
        code: 'TOO_MANY_ATTEMPTS',
      });
      return;
    }

    // Check if code matches
    if (verificationCode.code !== code) {
      await VerificationCode.updateOne(
        { _id: verificationCode._id },
        { $inc: { attempts: 1 } }
      );
      res.status(400).json({
        success: false,
        message: 'Invalid verification code',
        code: 'INVALID_CODE',
      });
      return;
    }

    // Update user
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        isEmailVerified: true,
        accountState: 'pending_approval',
      },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Delete verification code
    await VerificationCode.deleteOne({ _id: verificationCode._id });

    // Audit log
    await createAuditLog({
      userId: user._id,
      userEmail: user.email,
      action: 'USER_VERIFIED',
      resource: 'User',
      resourceId: user._id,
      req,
    });

    res.json({
      success: true,
      message: 'Email verified successfully. Your account is pending approval.',
      data: {
        accountState: user.accountState,
      },
    });
  } catch (error) {
    logger.error('Verification error:', error);
    next(error);
  }
};

// Resend verification code
export const resendVerificationCode = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.isEmailVerified) {
      res.status(400).json({
        success: false,
        message: 'Email already verified',
      });
      return;
    }

    // Generate new code
    const code = generateRandomCode(6);

    await VerificationCode.deleteMany({ email: user.email, type: 'email_verification' });

    await VerificationCode.create({
      email: user.email,
      code,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendVerificationEmail(user.email, code, user.firstName);

    res.json({
      success: true,
      message: 'Verification code sent',
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    next(error);
  }
};

// Login
export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email.toLowerCase());

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Check account state
    if (user.accountState === 'unverified') {
      res.status(403).json({
        success: false,
        message: 'Please verify your email first',
        code: 'EMAIL_NOT_VERIFIED',
        accountState: user.accountState,
      });
      return;
    }

    if (user.accountState === 'pending_approval') {
      res.status(403).json({
        success: false,
        message: 'Your account is pending approval',
        code: 'PENDING_APPROVAL',
        accountState: user.accountState,
      });
      return;
    }

    if (user.accountState === 'suspended') {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended',
        code: 'ACCOUNT_SUSPENDED',
        accountState: user.accountState,
      });
      return;
    }

    if (user.accountState === 'rejected') {
      res.status(403).json({
        success: false,
        message: 'Your account application was not approved',
        code: 'ACCOUNT_REJECTED',
        accountState: user.accountState,
      });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      accountState: user.accountState,
    });

    const refreshToken = generateRefreshToken(user._id.toString());

    // Store refresh token
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    user.lastLogin = new Date();
    await user.save();

    // Audit log
    await createAuditLog({
      userId: user._id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user._id,
      req,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          accountState: user.accountState,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

// Refresh token
export const refreshToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
      return;
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user || !user.refreshTokens.includes(token)) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    // Generate new tokens
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      accountState: user.accountState,
    });

    const newRefreshToken = generateRefreshToken(user._id.toString());

    // Replace old refresh token
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    next(error);
  }
};

// Logout
export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (req.user && token) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { refreshTokens: token } }
      );

      await createAuditLog({
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'USER_LOGOUT',
        resource: 'User',
        resourceId: req.user._id,
        req,
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          accountState: user.accountState,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    next(error);
  }
};

// Forgot password
export const forgotPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset code',
      });
      return;
    }

    const code = generateRandomCode(6);

    await VerificationCode.deleteMany({ email: user.email, type: 'password_reset' });

    await VerificationCode.create({
      email: user.email,
      code,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendPasswordResetEmail(user.email, code, user.firstName);

    await createAuditLog({
      userId: user._id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'User',
      resourceId: user._id,
      req,
    });

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset code',
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    next(error);
  }
};

// Reset password
export const resetPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    const verificationCode = await VerificationCode.findOne({
      email: email.toLowerCase(),
      type: 'password_reset',
    });

    if (!verificationCode) {
      res.status(400).json({
        success: false,
        message: 'Reset code expired or not found',
        code: 'CODE_NOT_FOUND',
      });
      return;
    }

    if (verificationCode.attempts >= 5) {
      await VerificationCode.deleteOne({ _id: verificationCode._id });
      res.status(400).json({
        success: false,
        message: 'Too many failed attempts',
        code: 'TOO_MANY_ATTEMPTS',
      });
      return;
    }

    if (verificationCode.code !== code) {
      await VerificationCode.updateOne(
        { _id: verificationCode._id },
        { $inc: { attempts: 1 } }
      );
      res.status(400).json({
        success: false,
        message: 'Invalid reset code',
        code: 'INVALID_CODE',
      });
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        code: 'WEAK_PASSWORD',
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    await VerificationCode.deleteOne({ _id: verificationCode._id });

    await createAuditLog({
      userId: user._id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'User',
      resourceId: user._id,
      req,
    });

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
};
