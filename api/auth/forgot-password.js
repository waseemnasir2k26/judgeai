import { findUserByEmail } from '../_lib/store.js';

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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await findUserByEmail(email);

    // Always return success to prevent email enumeration
    // In production, send actual reset email via Resend
    if (user) {
      // const code = Math.random().toString().slice(2, 8);
      // Store code in Redis with expiry
      // await redis.setex(`reset:${email}`, 600, code);
      // await sendPasswordResetEmail(email, code);
      console.log(`Password reset requested for: ${email}`);
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset code.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
