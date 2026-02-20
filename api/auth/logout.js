import { getUserFromRequest } from '../_lib/auth.js';

export default async function handler(req, res) {
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
    // Get user from token (optional - logout should work even if token expired)
    const user = getUserFromRequest(req);

    if (user) {
      console.log(`User logged out: ${user.email}`);
    }

    // In a production app with session management, you'd invalidate the refresh token here
    // For stateless JWT, the client just needs to delete its tokens

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still return success - logout should never fail from user perspective
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}
