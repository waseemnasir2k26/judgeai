import { findUserById, findUserByEmail, sanitizeUser } from '../_lib/store.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../_lib/auth.js';

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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Find user - try by ID first, then by email (for serverless cross-instance)
    let user = findUserById(decoded.userId);
    if (!user && decoded.email) {
      user = findUserByEmail(decoded.email);
    }

    // If still not found, the user doesn't exist in this instance
    // For serverless, we can create a minimal user object from token
    if (!user && decoded.email) {
      // This handles the serverless case where user was created in another instance
      user = {
        id: decoded.userId,
        email: decoded.email,
        role: 'user',
        firstName: 'User',
        lastName: '',
        accountState: 'approved',
        isEmailVerified: true,
        stats: { totalAnalyses: 0, documentsProcessed: 0 }
      };
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
}
