import { getUserFromRequest } from '../_lib/auth.js';
import { getAllUsers, findUserById, updateUser } from '../_lib/store.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Auth check - admin only
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      const users = getAllUsers();
      return res.status(200).json({
        users,
        total: users.length
      });
    }

    if (req.method === 'PUT') {
      const { userId, action, role } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const targetUser = findUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent modifying superadmin unless you are superadmin
      if (targetUser.role === 'superadmin' && user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Cannot modify superadmin' });
      }

      let updates = {};

      switch (action) {
        case 'approve':
          updates.accountState = 'approved';
          break;
        case 'reject':
          updates.accountState = 'rejected';
          break;
        case 'suspend':
          updates.accountState = 'suspended';
          break;
        case 'activate':
          updates.accountState = 'approved';
          break;
        case 'changeRole':
          if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
          }
          // Only superadmin can create admins
          if (role === 'admin' && user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmin can assign admin role' });
          }
          updates.role = role;
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      const updatedUser = updateUser(userId, updates);
      return res.status(200).json({
        message: 'User updated',
        user: updatedUser
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users admin error:', error);
    return res.status(500).json({ error: 'Operation failed' });
  }
}
