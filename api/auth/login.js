import { findUserByEmail, verifyPassword, sanitizeUser, updateUser, ensureSuperadmin } from '../_lib/store.js';
import { generateAccessToken, generateRefreshToken } from '../_lib/auth.js';

// Configure allowed origins - set ALLOWED_ORIGIN in Vercel env vars for production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

export default async function handler(req, res) {
  // Enable CORS with configurable origin
  const corsOrigin = getCorsOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure superadmin exists
    await ensureSuperadmin();

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user (now async)
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account state - handle both naming conventions
    if (user.accountState === 'unverified') {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before logging in.',
        accountState: 'unverified'
      });
    }

    if (user.accountState === 'pending' || user.accountState === 'pending_approval') {
      return res.status(403).json({
        error: 'Account pending approval',
        message: 'Your account is awaiting admin approval. Please check back later.',
        accountState: user.accountState
      });
    }

    if (user.accountState === 'suspended') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.',
        accountState: 'suspended'
      });
    }

    if (user.accountState === 'rejected') {
      return res.status(403).json({
        error: 'Account rejected',
        message: 'Your account application was not approved.',
        accountState: 'rejected'
      });
    }

    // Only allow approved accounts
    if (user.accountState !== 'approved') {
      return res.status(403).json({
        error: 'Account not approved',
        message: 'Your account is not in an approved state.',
        accountState: user.accountState
      });
    }

    // Update last login (now async)
    await updateUser(user.id, { lastLogin: new Date().toISOString() });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      message: 'Login successful',
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      accountState: user.accountState
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
}
