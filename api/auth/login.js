import { findUserByEmail, verifyPassword, sanitizeUser, updateUser, ensureSuperadmin } from '../_lib/store.js';
import { generateAccessToken, generateRefreshToken } from '../_lib/auth.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    // Check account state
    if (user.accountState === 'pending') {
      return res.status(403).json({
        error: 'Account pending approval',
        message: 'Your account is awaiting admin approval. Please check back later.',
        accountState: 'pending'
      });
    }

    if (user.accountState === 'suspended') {
      return res.status(403).json({
        error: 'Account suspended',
        accountState: 'suspended'
      });
    }

    if (user.accountState === 'rejected') {
      return res.status(403).json({
        error: 'Account rejected',
        accountState: 'rejected'
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
