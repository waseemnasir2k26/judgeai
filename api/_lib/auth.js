import jwt from 'jsonwebtoken';
import { findUserById } from './store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-min-32-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-change-in-production';

// Generate access token (short-lived)
export function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

// Generate refresh token (long-lived)
export function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, type: 'refresh' },
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

// Middleware helper: Get user from request
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

  const user = findUserById(decoded.userId);
  return user;
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
