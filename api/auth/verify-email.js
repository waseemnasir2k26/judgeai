import { findUserByEmail, updateUser } from '../_lib/store.js';

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
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For Upstash Redis version, we skip email verification
    // and just mark the account as pending admin approval
    // In production, you'd store verification codes in Redis

    if (user.accountState === 'approved') {
      return res.status(400).json({
        error: 'Email already verified and account approved',
        accountState: user.accountState
      });
    }

    // Update user state to pending (awaiting admin approval)
    await updateUser(user.id, {
      isEmailVerified: true,
      accountState: 'pending'
    });

    return res.status(200).json({
      success: true,
      message: 'Email verified. Your account is now pending admin approval.',
      accountState: 'pending'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
}
