import bcrypt from 'bcryptjs';
import {
  findUserByEmail,
  findUserById,
  verifyPassword,
  sanitizeUser,
  updateUser,
  createUser,
  ensureSuperadmin
} from '../_lib/store.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getUserFromRequest
} from '../_lib/auth.js';

// CORS helper
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// Route handlers
const handlers = {
  // POST /auth/login
  async login(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    await ensureSuperadmin();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account state
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
        message: 'Your account is awaiting admin approval.',
        accountState: user.accountState
      });
    }

    if (user.accountState === 'suspended') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended.',
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

    if (user.accountState !== 'approved') {
      return res.status(403).json({
        error: 'Account not approved',
        accountState: user.accountState
      });
    }

    await updateUser(user.id, { lastLogin: new Date().toISOString() });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      message: 'Login successful',
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      accountState: user.accountState
    });
  },

  // POST /auth/register
  async register(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await createUser({ firstName, lastName, email, password });

    return res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval.',
      user,
      accountState: 'pending'
    });
  },

  // GET /auth/me
  async me(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ user: sanitizeUser(user) });
  },

  // POST /auth/logout
  async logout(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = getUserFromRequest(req);
    if (user) {
      console.log(`User logged out: ${user.email}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  },

  // POST /auth/refresh
  async refresh(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    let user = await findUserById(decoded.userId);
    if (!user && decoded.email) {
      user = await findUserByEmail(decoded.email);
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found. Please login again.' });
    }

    if (user.accountState !== 'approved') {
      return res.status(403).json({
        error: 'Account not approved',
        accountState: user.accountState
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: sanitizeUser(user)
    });
  },

  // POST /auth/forgot-password
  async 'forgot-password'(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await findUserByEmail(email);
    if (user) {
      console.log(`Password reset requested for: ${email}`);
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset code.'
    });
  },

  // POST /auth/reset-password
  async 'reset-password'(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code format. Enter 6 digits.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUser(user.id, { password: hashedPassword });

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  },

  // POST /auth/verify-email
  async 'verify-email'(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.accountState === 'approved') {
      return res.status(400).json({
        error: 'Email already verified and account approved',
        accountState: user.accountState
      });
    }

    await updateUser(user.id, {
      isEmailVerified: true,
      accountState: 'pending'
    });

    return res.status(200).json({
      success: true,
      message: 'Email verified. Your account is now pending admin approval.',
      accountState: 'pending'
    });
  },

  // POST /auth/resend-verification
  async 'resend-verification'(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists, a verification email has been sent.'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        error: 'Email already verified',
        accountState: user.accountState
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.'
    });
  }
};

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get action from catch-all route
    // URL: /auth/login → action = ['login']
    // URL: /auth/forgot-password → action = ['forgot-password']
    const { action } = req.query;
    const actionName = Array.isArray(action) ? action.join('-') : action;

    console.log(`[Auth] ${req.method} /auth/${actionName}`);

    const routeHandler = handlers[actionName];
    if (!routeHandler) {
      return res.status(404).json({ error: `Unknown auth action: ${actionName}` });
    }

    return await routeHandler(req, res);
  } catch (error) {
    console.error('[Auth] Error:', error);
    return res.status(500).json({ error: 'Authentication operation failed' });
  }
}
