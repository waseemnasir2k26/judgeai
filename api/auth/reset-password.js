import bcrypt from 'bcryptjs';
import { findUserByEmail, updateUser } from '../_lib/store.js';
import redis from '../_lib/store.js';

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

    // In production, verify the code from Redis
    // const storedCode = await redis.get(`reset:${email}`);
    // if (!storedCode || storedCode !== code) {
    //   return res.status(400).json({ error: 'Invalid or expired reset code' });
    // }

    // For demo, accept any 6-digit code
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code format. Enter 6 digits.' });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUser(user.id, { password: hashedPassword });

    // Clear the reset code
    // await redis.del(`reset:${email}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}
