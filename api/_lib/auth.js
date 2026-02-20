import jwt from 'jsonwebtoken';
import { findUserById, findUserByEmail } from './store.js';

// SECURITY: Use environment variables, fallback only for local dev
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-key-change-in-production-min-32-chars');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-refresh-secret-key-change-in-production');

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('FATAL: JWT_SECRET or JWT_REFRESH_SECRET not set in production!');
}

// Generate access token (short-lived) - include ALL user info for serverless
export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      accountState: user.accountState,
      isEmailVerified: user.isEmailVerified
    },
    JWT_SECRET,
    { expiresIn: '24h' } // Longer expiry for better UX
  );
}

// Generate refresh token (long-lived)
export function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify access token
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch {
    return null;
  }
}

// Middleware helper: Get user from request (ASYNC version)
// For serverless with Redis, we can optionally verify against DB
export async function getUserFromRequestAsync(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return null;
  }

  // Try to find user in Redis
  let user = await findUserById(decoded.userId);

  // If not found by ID, try by email
  if (!user && decoded.email) {
    user = await findUserByEmail(decoded.email);
  }

  // If still not found but token is valid, construct user from token data
  // This handles cases where user exists but Redis lookup failed
  if (!user && decoded.email) {
    user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      firstName: decoded.firstName || 'User',
      lastName: decoded.lastName || '',
      accountState: decoded.accountState || 'approved',
      isEmailVerified: decoded.isEmailVerified !== false,
      stats: { totalAnalyses: 0, documentsProcessed: 0 }
    };
  }

  return user;
}

// Synchronous version that uses JWT data directly (faster, no DB call)
export function getUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return null;
  }

  // Return user data from JWT (no DB call needed for basic auth checks)
  return {
    id: decoded.userId,
    email: decoded.email,
    role: decoded.role || 'user',
    firstName: decoded.firstName || 'User',
    lastName: decoded.lastName || '',
    accountState: decoded.accountState || 'approved',
    isEmailVerified: decoded.isEmailVerified !== false,
    stats: { totalAnalyses: 0, documentsProcessed: 0 }
  };
}

// Auth middleware for API routes
export function withAuth(handler, options = {}) {
  return async (req, res) => {
    const user = getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check account state
    if (user.accountState !== 'approved') {
      return res.status(403).json({
        error: 'Account not approved',
        accountState: user.accountState
      });
    }

    // Check role if required
    if (options.roles && !options.roles.includes(user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Attach user to request
    req.user = user;

    return handler(req, res);
  };
}

// Admin middleware
export function withAdmin(handler) {
  return withAuth(handler, { roles: ['admin', 'superadmin'] });
}
